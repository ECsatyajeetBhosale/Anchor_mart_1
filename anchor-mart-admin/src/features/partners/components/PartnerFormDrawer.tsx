import { zodResolver } from "@hookform/resolvers/zod";
import { IconCheck, IconUsers } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { getApiMessage, getFieldErrors } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useCreatePartnerMutation } from "../api/partnerApi";
import { type PartnerFormData, partnerFormSchema } from "../schemas/partner.schema";
import type { CreatePartnerPayload } from "../types/partner.types";
import { CapabilityFields } from "./CapabilityFields";

const M = MESSAGES.PARTNERS;

const EMPTY: PartnerFormData = {
  first_name: "",
  last_name: "",
  email: "",
  country_code: "+91",
  whatsapp_number: "",
  // "Both" is the server-side default and by far the common shape, so a new
  // partner starts capable of everything and is narrowed deliberately.
  can_verify: true,
  can_deliver: true,
  // No port by default — an unassigned partner is valid, and guessing one would
  // silently scope them to somewhere they may not work.
  assigned_port: "",
};

export interface PartnerFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Right-side onboard-partner drawer (shadcn `Sheet` + React Hook Form + Zod).
 * Submits to the partner create endpoint; fields map 1:1 to the create payload.
 */
export function PartnerFormDrawer({ isOpen, onClose }: PartnerFormDrawerProps) {
  const [createPartner, { isLoading: isCreating }] = useCreatePartnerMutation();

  // `dashboard/ports/` is the lightweight {id, port_name} list kept for exactly
  // this — a picker that needs names and ids and nothing else.
  const { data: ports = [] } = useGetDashboardPortsQuery(undefined, { skip: !isOpen });
  const portOptions = [
    { value: "", label: M.DETAIL.PORT_NONE },
    ...ports.map((p) => ({ value: p.id, label: p.name })),
  ];

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

  // Reset to a clean form each time the drawer opens.
  useEffect(() => {
    if (isOpen) reset(EMPTY);
  }, [isOpen, reset]);

  const onSubmit = async (form: PartnerFormData) => {
    const payload: CreatePartnerPayload = {
      email: form.email,
      role: "delivery_partner",
      first_name: form.first_name,
      last_name: form.last_name,
      country_code: form.country_code,
      whatsapp_number: form.whatsapp_number,
      can_verify: form.can_verify,
      can_deliver: form.can_deliver,
      // `""` means "no port". The field is a nullable FK, so send null rather
      // than an empty string, which would fail UUID validation.
      assigned_port: form.assigned_port || null,
    };
    try {
      await createPartner(payload).unwrap();
      onClose();
      toast.success(M.TOAST.ADDED);
    } catch (err) {
      // Bare field keys since 2026-07-30 (previously an `{"errors": …}`
      // envelope) — pin "already exists" / "country_code is required" to the
      // input it belongs to rather than only raising a toast.
      for (const [field, message] of Object.entries(getFieldErrors(err))) {
        if (field in EMPTY) {
          setError(field as keyof PartnerFormData, { type: "server", message });
        }
      }
      toast.error(getApiMessage(err) ?? M.TOAST.ADD_ERROR);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={560}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
              <IconUsers size={22} />
            </div>
            <div>
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {M.FORM.ADD_TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {M.FORM.SUBTITLE}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
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

          {/* Home port. Optional, and left blank by default — but it is what
              makes a partner reachable by port-scoped assignment, so without it
              they are capability-matched only. */}
          <FormField label={M.DETAIL.PORT} error={errors.assigned_port?.message}>
            <Controller
              control={control}
              name="assigned_port"
              render={({ field }) => (
                <DropdownSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={M.DETAIL.PORT_PLACEHOLDER}
                  options={portOptions}
                  width="100%"
                />
              )}
            />
          </FormField>

          {/* One Controller drives both switches: the "at least one" rule spans
              the pair, so they have to be written together or a toggle could
              momentarily clear the other's error. */}
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
              disabled={isCreating}
            >
              {MESSAGES.COMMON.CANCEL}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={isCreating}
            >
              <IconCheck size={16} />
              {M.FORM.SUBMIT_ADD}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default PartnerFormDrawer;
