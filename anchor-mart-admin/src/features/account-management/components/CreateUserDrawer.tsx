import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useGetDashboardPortsQuery } from "@/features/dashboard";
import { CapabilityFields, useCreatePartnerMutation } from "@/features/partners";
import { getApiMessage, getFieldErrors } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconInfoCircle, IconSend, IconShieldLock, IconUserPlus } from "@tabler/icons-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateUserMutation } from "../api/adminUserApi";
import { ROLE_NOTES, ROLE_OPTIONS } from "../lib/roles";
import { type CreateUserFormData, createUserSchema } from "../schemas/createUser.schema";
import { isAdminTierRole } from "../types/adminUser.types";
import type { UserRole } from "../types/user.types";

const DEFAULTS: CreateUserFormData = {
  first_name: "",
  last_name: "",
  email: "",
  role: "customer",
  // Partner-only. "Both" mirrors the server-side default; no port by default.
  can_verify: true,
  can_deliver: true,
  assigned_port: "",
  country_code: "+91",
  whatsapp_number: "",
};

export interface CreateUserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-select a role and lock the picker — for role-specific entry points. */
  lockedRole?: UserRole;
}

export function CreateUserDrawer({ isOpen, onClose, lockedRole }: CreateUserDrawerProps) {
  const [createUser, { isLoading }] = useCreateUserMutation();
  const [createPartner] = useCreatePartnerMutation();

  /**
   * Flow 31 SEC-1 — creating an `admin` or `super_admin` requires a super-admin
   * caller; a sub-admin gets a 403. The two options are withheld rather than
   * offered-and-refused, so the restriction is visible before the round trip.
   *
   * A UX gate, never a security one: the server remains the authority.
   */
  const { isSuperAdmin } = useAdminAccess();
  const roleOptions = useMemo(
    () => (isSuperAdmin ? ROLE_OPTIONS : ROLE_OPTIONS.filter((o) => !isAdminTierRole(o.value))),
    [isSuperAdmin],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (!isOpen) return;
    // A sub-admin reaching an admin-tier entry point (a stale link, or the row
    // action before this gate existed) would otherwise open on a role the
    // picker no longer offers, leaving the form stuck on a guaranteed 403.
    const requested = lockedRole ?? DEFAULTS.role;
    const allowed = isSuperAdmin || !isAdminTierRole(requested) ? requested : DEFAULTS.role;
    reset({ ...DEFAULTS, role: allowed });
  }, [isOpen, lockedRole, isSuperAdmin, reset]);

  // Each role lands somewhere different in the app; say so before submitting.
  const selectedRole = watch("role");
  const isPartnerRole = selectedRole === "delivery_partner";

  // Ports for the partner picker — fetched only when that role is selected.
  const { data: ports = [] } = useGetDashboardPortsQuery(undefined, {
    skip: !isOpen || !isPartnerRole,
  });
  const portOptions = [
    { value: "", label: MESSAGES.PARTNERS.DETAIL.PORT_NONE },
    ...ports.map((port) => ({ value: port.id, label: port.name })),
  ];

  const note = ROLE_NOTES[watch("role")];

  /** Maps a 400's field errors onto the form, ignoring keys this form has no input for. */
  const applyFieldErrors = (error: unknown) => {
    for (const [field, message] of Object.entries(getFieldErrors(error))) {
      if (field in DEFAULTS) {
        setError(field as keyof CreateUserFormData, { type: "server", message });
      }
    }
  };

  const onSubmit = async (formData: CreateUserFormData) => {
    try {
      /**
       * A delivery partner goes to `partner/create/`, not `admin/create-user/`.
       *
       * `create-user` builds a `User` and nothing else. For every other role
       * that is the whole account, but a delivery partner also needs a
       * `DeliveryPartnerProfile` — which carries the partner code, capabilities,
       * port and availability. Created here before, they arrived without one:
       * two such users exist in the dev database, and they surface in the
       * partner lists with `partner_code: null` and `is_available: null`.
       *
       * `partner/create/` builds the user *and* the profile and sends the
       * invite, so it is the only complete path for this role.
       */
      const isPartner = formData.role === "delivery_partner";
      const response = isPartner
        ? await createPartner({
            email: formData.email,
            role: formData.role,
            first_name: formData.first_name,
            last_name: formData.last_name,
            country_code: formData.country_code,
            whatsapp_number: formData.whatsapp_number,
            can_verify: formData.can_verify ?? true,
            can_deliver: formData.can_deliver ?? true,
            assigned_port: formData.assigned_port || null,
          }).unwrap()
        : await createUser({
            email: formData.email,
            role: formData.role,
            first_name: formData.first_name,
            last_name: formData.last_name,
            country_code: formData.country_code,
            whatsapp_number: formData.whatsapp_number,
          }).unwrap();
      onClose();
      toast.success(
        getApiMessage(response) ?? MESSAGES.ACCOUNT_MANAGEMENT.PROVISION.TOAST.CREATE_SUCCESS,
      );
    } catch (error) {
      // Field errors arrive as bare keys (`{"email": ["…"]}`) since 2026-07-30,
      // having previously been wrapped in `{"errors": {…}}`. Pin each to its
      // input so "already exists" lands on the field rather than only in a
      // toast the operator has to translate back to a form.
      applyFieldErrors(error);
      toast.error(getApiMessage(error) ?? MESSAGES.ACCOUNT_MANAGEMENT.PROVISION.TOAST.CREATE_ERROR);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconUserPlus size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">
                {MESSAGES.ACCOUNT_MANAGEMENT.PROVISION.ADD.TITLE}
              </SheetTitle>
              <SheetDescription>
                {MESSAGES.ACCOUNT_MANAGEMENT.PROVISION.ADD.SUBTITLE}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 pt-4">
          <section>
            <div className="sec-label">{MESSAGES.ACCOUNT_MANAGEMENT.PROVISION.SECTIONS.ROLE}</div>
            <FormField
              label={MESSAGES.ACCOUNT_MANAGEMENT.FIELDS.ROLE}
              error={errors.role?.message}
              hint={lockedRole ? MESSAGES.ACCOUNT_MANAGEMENT.PROVISION.ROLE_LOCKED_HINT : undefined}
            >
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <DropdownSelect
                    options={roleOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    width="100%"
                    disabled={!!lockedRole}
                  />
                )}
              />
            </FormField>
            {/* Say why two options are missing. Silently shortening the list
                reads as a bug; naming the rule reads as a policy. */}
            {!isSuperAdmin && (
              <div className="mt-2 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-2.5">
                <IconShieldLock size={16} className="mt-0.5 shrink-0 text-[var(--warning-icon)]" />
                <p className="text-[12.5px] font-semibold leading-relaxed text-[var(--warning-text)]">
                  {MESSAGES.ACCOUNT_MANAGEMENT.PROVISION.ADMIN_TIER_LOCKED}
                </p>
              </div>
            )}
            {note && (
              <div className="mt-2 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--info-border)] bg-[var(--info-bg)] px-3 py-2.5">
                <IconInfoCircle size={16} className="mt-0.5 shrink-0 text-[var(--info-icon)]" />
                <p className="text-[12.5px] font-semibold leading-relaxed text-[var(--info-text)]">
                  {note}
                </p>
              </div>
            )}
          </section>

          <section>
            <div className="sec-label">
              {MESSAGES.ACCOUNT_MANAGEMENT.PROVISION.SECTIONS.IDENTITY}
            </div>
            <FormRow>
              <FormField
                label={MESSAGES.ACCOUNT_MANAGEMENT.FIELDS.FIRST_NAME}
                error={errors.first_name?.message}
              >
                <Input
                  placeholder={MESSAGES.ACCOUNT_MANAGEMENT.FIELDS.FIRST_NAME_PLACEHOLDER}
                  error={!!errors.first_name}
                  {...register("first_name")}
                />
              </FormField>
              <FormField
                label={MESSAGES.ACCOUNT_MANAGEMENT.FIELDS.LAST_NAME}
                error={errors.last_name?.message}
              >
                <Input
                  placeholder={MESSAGES.ACCOUNT_MANAGEMENT.FIELDS.LAST_NAME_PLACEHOLDER}
                  {...register("last_name")}
                />
              </FormField>
            </FormRow>
            <FormField
              label={MESSAGES.ACCOUNT_MANAGEMENT.FIELDS.EMAIL}
              error={errors.email?.message}
            >
              <Input
                type="email"
                placeholder={MESSAGES.ACCOUNT_MANAGEMENT.FIELDS.EMAIL_PLACEHOLDER}
                error={!!errors.email}
                {...register("email")}
              />
            </FormField>
          </section>

          <section>
            <div className="sec-label">
              {MESSAGES.ACCOUNT_MANAGEMENT.PROVISION.SECTIONS.CONTACT}
            </div>
            <FormRow>
              <FormField
                label={MESSAGES.ACCOUNT_MANAGEMENT.FIELDS.COUNTRY_CODE}
                error={errors.country_code?.message}
              >
                <Input
                  placeholder="+91"
                  error={!!errors.country_code}
                  {...register("country_code")}
                />
              </FormField>
              <FormField
                label={MESSAGES.ACCOUNT_MANAGEMENT.FIELDS.WHATSAPP}
                error={errors.whatsapp_number?.message}
              >
                <Input
                  placeholder={MESSAGES.ACCOUNT_MANAGEMENT.FIELDS.WHATSAPP_PLACEHOLDER}
                  error={!!errors.whatsapp_number}
                  {...register("whatsapp_number")}
                />
              </FormField>
            </FormRow>

            {/* Delivery-partner extras. Shown only for that role because they are
              the fields `partner/create/` needs and no other role has — the
              same capability toggles and port picker as the Delivery Partners
              screen, so a partner created here is complete either way. */}
            {isPartnerRole && (
              <>
                <div className="sec-label mt16">{MESSAGES.PARTNERS.CAPABILITY.SECTION}</div>
                <Controller
                  control={control}
                  name="can_verify"
                  render={({ field: verifyField }) => (
                    <Controller
                      control={control}
                      name="can_deliver"
                      render={({ field: deliverField }) => (
                        <CapabilityFields
                          canVerify={verifyField.value ?? true}
                          canDeliver={deliverField.value ?? true}
                          onChange={({ canVerify, canDeliver }) => {
                            verifyField.onChange(canVerify);
                            deliverField.onChange(canDeliver);
                          }}
                        />
                      )}
                    />
                  )}
                />

                <FormField label={MESSAGES.PARTNERS.DETAIL.PORT}>
                  <Controller
                    control={control}
                    name="assigned_port"
                    render={({ field }) => (
                      <DropdownSelect
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        placeholder={MESSAGES.PARTNERS.DETAIL.PORT_PLACEHOLDER}
                        options={portOptions}
                        width="100%"
                      />
                    )}
                  />
                </FormField>
              </>
            )}
          </section>
        </div>

        <SheetFooter className="border-t border-[var(--border-md)] bg-[var(--surface)] p-6">
          <div className="flex w-full justify-end gap-3">
            <button
              type="button"
              className="btn btn-ghost btn-cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              {MESSAGES.COMMON.CANCEL}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              <IconSend size={16} />
              {isLoading
                ? MESSAGES.ACCOUNT_MANAGEMENT.PROVISION.ADD.SAVING
                : MESSAGES.ACCOUNT_MANAGEMENT.PROVISION.ADD.SUBMIT}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
