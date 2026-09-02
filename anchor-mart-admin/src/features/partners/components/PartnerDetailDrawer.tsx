import { zodResolver } from "@hookform/resolvers/zod";
import { IconCheck, IconUsers } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getApiMessage, getFieldErrors } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { useGetPartnerDetailQuery, useUpdatePartnerMutation } from "../api/partnerApi";
import { type PartnerFormData, partnerFormSchema } from "../schemas/partner.schema";
import type { CapabilityChange, PartnerData, UpdatePartnerPayload } from "../types/partner.types";
import { CapabilityChangeDialog } from "./CapabilityChangeDialog";
import { CapabilityFields } from "./CapabilityFields";

const M = MESSAGES.PARTNERS;

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/** Status → badge colour (On Duty = teal, Available = green, else neutral). */
function statusVariant(status: string): BadgeVariant {
  switch (status.toLowerCase()) {
    case "on duty":
      return "teal";
    case "available":
      return "success";
    default:
      return "neutral";
  }
}

const EMPTY: PartnerFormData = {
  first_name: "",
  last_name: "",
  email: "",
  country_code: "+91",
  whatsapp_number: "",
  can_verify: true,
  can_deliver: true,
  assigned_port: "",
};

export interface PartnerDetailDrawerProps {
  /** Clicked row — gives instant context + the user id for the detail fetch. */
  partner: PartnerData | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Right-side partner detail/edit drawer built on the shared `Sheet`. Fetches the
 * partner detail by user id, prefills the form, and submits changes to the
 * partner_detail_update endpoint (React Hook Form + Zod).
 */
export function PartnerDetailDrawer({ partner, isOpen, onClose }: PartnerDetailDrawerProps) {
  const { data: detail } = useGetPartnerDetailQuery(partner?.userId ?? "", {
    skip: !isOpen || !partner?.userId,
  });
  const [updatePartner, { isLoading: isSaving }] = useUpdatePartnerMutation();
  // Set when the save revoked a capability. Held after the drawer closes: the
  // list of still-running assignments is the point, and dismissing it with the
  // drawer would hide the one thing the admin needs to act on.
  const [capabilityChange, setCapabilityChange] = useState<CapabilityChange | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PartnerFormData>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: EMPTY,
  });

  // Prefill from the detail response (falling back to the clicked row) each open.
  useEffect(() => {
    if (!isOpen) return;
    const fullName = detail?.name ?? partner?.n ?? "";
    const [first, ...rest] = fullName.trim().split(/\s+/).filter(Boolean);
    reset({
      first_name: detail?.first_name ?? first ?? "",
      last_name: detail?.last_name ?? rest.join(" "),
      email: detail?.email ?? "",
      country_code: detail?.country_code ?? "+91",
      whatsapp_number: detail?.whatsapp_number ?? "",
      // `?? true`, never `=== true`: a detail payload predating 2026-08-03 omits
      // these, and reading absent as `false` would present a fully capable
      // partner as having none — and then save that.
      can_verify: detail?.can_verify ?? partner?.canVerify ?? true,
      can_deliver: detail?.can_deliver ?? partner?.canDeliver ?? true,
      // Seeded from the record, or an edit that never touches the picker would
      // save `null` back over an existing port.
      assigned_port: detail?.assigned_port ?? "",
    });
  }, [isOpen, detail, partner, reset]);

  const onSubmit = async (form: PartnerFormData) => {
    if (!partner?.userId) return;
    const payload: UpdatePartnerPayload = {
      user_id: partner.userId,
      email: form.email,
      role: "delivery_partner",
      first_name: form.first_name,
      last_name: form.last_name,
      country_code: form.country_code,
      whatsapp_number: form.whatsapp_number,
      can_verify: form.can_verify,
      can_deliver: form.can_deliver,
      assigned_port: form.assigned_port || null,
    };
    try {
      const change = await updatePartner({
        userId: partner.userId,
        body: payload,
      }).unwrap();
      onClose();
      toast.success(M.TOAST.UPDATED);
      // Non-null only when this request turned a capability off. Revoking is
      // rostering, not an emergency stop — work in hand runs to completion — so
      // the server hands back what it did *not* affect, and it must be shown.
      if (change) setCapabilityChange(change);
    } catch (err) {
      for (const [field, message] of Object.entries(getFieldErrors(err))) {
        if (field in EMPTY) {
          setError(field as keyof PartnerFormData, { type: "server", message });
        }
      }
      toast.error(getApiMessage(err) ?? M.TOAST.UPDATE_ERROR);
    }
  };

  const displayName = detail?.name ?? partner?.n ?? "-";
  const status = partner?.s ?? "-";
  const avatarKey = partner?.id ?? detail?.partner_id ?? detail?.id ?? "partner";

  return (
    <>
      {/* A sibling of the drawer, not a child: a successful save closes the
          drawer, and the revoke warning — the list of assignments the revoke did
          NOT stop — must outlive it rather than vanish with the form. */}
      <CapabilityChangeDialog change={capabilityChange} onClose={() => setCapabilityChange(null)} />

      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          adjustable
          className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
        >
          <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
                <IconUsers size={22} />
              </div>
              <div>
                {/* Titled as the edit step, not "Profile" — the read-only
                  profile is now PartnerHistoryDrawer, which hands off here. */}
                <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                  {M.FORM.EDIT_TITLE}
                </SheetTitle>
                <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                  {partner?.id ?? M.DETAIL.SUBTITLE}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Summary */}
            <div className="mb-5 flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--navy-25)] p-4">
              <div className="av av-xl av-img">
                <img src={getFallbackAvatar(avatarKey)} alt={displayName} />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-bold text-[var(--t1)]">{displayName}</div>
                <div className="text-[11px] text-[var(--t4)]">{M.DETAIL.ROLE}</div>
              </div>
              <Badge variant={statusVariant(status)}>{status}</Badge>
            </div>

            {/* Editable details */}
            <div className="sec-label">{M.DETAIL.SECTION}</div>
            <FormRow>
              <FormField label={M.DETAIL.FIRST_NAME} error={errors.first_name?.message}>
                <Input
                  placeholder={M.DETAIL.FIRST_NAME_PLACEHOLDER}
                  error={!!errors.first_name}
                  {...register("first_name")}
                />
              </FormField>
              <FormField label={M.DETAIL.LAST_NAME}>
                <Input placeholder={M.DETAIL.LAST_NAME_PLACEHOLDER} {...register("last_name")} />
              </FormField>
            </FormRow>
            <FormField label={M.DETAIL.EMAIL} error={errors.email?.message}>
              <Input
                type="email"
                placeholder={M.DETAIL.EMAIL_PLACEHOLDER}
                error={!!errors.email}
                {...register("email")}
              />
            </FormField>
            <FormRow>
              <FormField label={M.DETAIL.COUNTRY_CODE} error={errors.country_code?.message}>
                <Input
                  placeholder={M.DETAIL.COUNTRY_CODE_PLACEHOLDER}
                  error={!!errors.country_code}
                  {...register("country_code")}
                />
              </FormField>
              <FormField label={M.DETAIL.WHATSAPP} error={errors.whatsapp_number?.message}>
                <Input
                  className="mono"
                  placeholder={M.DETAIL.WHATSAPP_PLACEHOLDER}
                  error={!!errors.whatsapp_number}
                  {...register("whatsapp_number")}
                />
              </FormField>
            </FormRow>

            <Controller
              control={control}
              name="can_verify"
              render={({ field: verifyField }) => (
                <Controller
                  control={control}
                  name="can_deliver"
                  render={({ field: deliverField }) => (
                    <CapabilityFields
                      canVerify={verifyField.value}
                      canDeliver={deliverField.value}
                      error={errors.can_verify?.message}
                      onChange={({ canVerify, canDeliver }) => {
                        verifyField.onChange(canVerify);
                        deliverField.onChange(canDeliver);
                      }}
                    />
                  )}
                />
              )}
            />
          </div>

          <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
            <div className="flex justify-end gap-3 w-full">
              <button
                type="button"
                className="btn btn-ghost btn-cancel"
                onClick={onClose}
                disabled={isSaving}
              >
                {MESSAGES.COMMON.CANCEL}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit(onSubmit)}
                disabled={isSaving}
              >
                <IconCheck size={16} />
                {M.DETAIL.SAVE}
              </button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default PartnerDetailDrawer;
