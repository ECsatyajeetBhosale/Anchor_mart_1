import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { Input } from "@/components/ui/input";
import { useGetLoyaltyConfigQuery, useUpdateLoyaltyConfigMutation } from "@/features/rewards";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy, IconSettings } from "@tabler/icons-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { type LoyaltyConfigFormData, loyaltyConfigSchema } from "../schemas/settings.schema";

/**
 * Platform Configuration.
 *
 * Only the loyalty values are wired — they map to
 * `promotion/loyalty/config/update/`, the single Platform Configuration
 * endpoint the backend exposes. The operational limits below them (cancellation
 * window, payment timeout, description cap) and the feature toggles have **no
 * endpoint in the API**, so they stay visible but disabled rather than
 * pretending to save. Removing them would hide agreed scope; leaving them
 * editable would silently discard input.
 */
export function PlatformConfigCard() {
  const { data: config, isLoading } = useGetLoyaltyConfigQuery();
  const [updateConfig, { isLoading: isSaving }] = useUpdateLoyaltyConfigMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<LoyaltyConfigFormData>({
    resolver: zodResolver(loyaltyConfigSchema),
    defaultValues: { points_per_delivery: 0, points_per_referral: 0, point_value: 0 },
  });

  useEffect(() => {
    if (!config) return;
    reset({
      points_per_delivery: config.points_per_delivery,
      points_per_referral: config.points_per_referral,
      // Arrives as a decimal string ("0.1000"); edited as a number.
      point_value: Number(config.point_value),
    });
  }, [config, reset]);

  const onSubmit = async (formData: LoyaltyConfigFormData) => {
    try {
      const response = await updateConfig({
        points_per_delivery: formData.points_per_delivery,
        points_per_referral: formData.points_per_referral,
        // The API stores a 4-dp decimal string.
        point_value: formData.point_value.toFixed(4),
      }).unwrap();
      toast.success(getApiMessage(response) ?? MESSAGES.SETTINGS.CONFIG.TOAST.SAVE_SUCCESS);
    } catch (error) {
      toast.error(getApiMessage(error) ?? MESSAGES.SETTINGS.CONFIG.TOAST.SAVE_ERROR);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <IconSettings size={18} className="text-[var(--t3)]" />
        <span className="text-[14.5px] font-extrabold text-[var(--t1)]">
          {MESSAGES.SETTINGS.CONFIG.TITLE}
        </span>
      </div>

      <div className="sec-label">{MESSAGES.SETTINGS.CONFIG.SECTIONS.LOYALTY}</div>
      <FormRow>
        <FormField
          label="Loyalty points per delivery"
          error={errors.points_per_delivery?.message}
          hint={isLoading ? MESSAGES.COMMON.LOADING : undefined}
        >
          <Input
            type="number"
            error={!!errors.points_per_delivery}
            {...register("points_per_delivery")}
          />
        </FormField>
        <FormField label="Referral bonus points" error={errors.points_per_referral?.message}>
          <Input
            type="number"
            error={!!errors.points_per_referral}
            {...register("points_per_referral")}
          />
        </FormField>
      </FormRow>
      <FormField
        label="Point value"
        hint="Cash value of one point, stored to 4 decimal places."
        error={errors.point_value?.message}
      >
        <Input
          type="number"
          step="0.0001"
          error={!!errors.point_value}
          {...register("point_value")}
        />
      </FormField>

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSubmit(onSubmit)}
          disabled={isSaving || isLoading || !isDirty}
        >
          <IconDeviceFloppy size={15} />
          {isSaving ? MESSAGES.SETTINGS.CONFIG.SAVING : MESSAGES.COMMON.SAVE_CHANGES}
        </button>
      </div>

      <div className="sec-label mt-6">{MESSAGES.SETTINGS.CONFIG.SECTIONS.OPERATIONAL}</div>
      <p className="fg-hint mb-3">{MESSAGES.SETTINGS.CONFIG.NO_ENDPOINT_HINT}</p>
      <FormRow>
        <FormField label="Order cancellation window" hint="No API — not saved">
          <Input value="36 hours after ship arrival" disabled readOnly />
        </FormField>
        <FormField label="Payment confirmation timeout" hint="No API — not saved">
          <Input value="48 hours" disabled readOnly />
        </FormField>
      </FormRow>
      <FormRow>
        <FormField label="Max special request description" hint="No API — not saved">
          <Input value="500 characters" disabled readOnly />
        </FormField>
        <FormField label="Feature toggles" hint="No API — not saved">
          <Input value="Express · Auto-assign · Maintenance" disabled readOnly />
        </FormField>
      </FormRow>
    </div>
  );
}
