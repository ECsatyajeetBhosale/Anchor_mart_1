import { zodResolver } from "@hookform/resolvers/zod";
import { IconCheck, IconSettings } from "@tabler/icons-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MESSAGES } from "@/lib/messages";
import {
  type LoyaltyConfigFormData,
  loyaltyConfigSchema,
} from "../schemas/loyaltyConfig.schema";
import type { LoyaltyConfig } from "../types/reward.types";

const M = MESSAGES.REWARDS;

const DEFAULTS: LoyaltyConfigFormData = {
  points_per_delivery: 0,
  points_per_referral: 0,
  point_value: "",
};

export interface LoyaltyConfigDrawerProps {
  open: boolean;
  /** The current config from the API (seeds the form); `null` while loading. */
  config: LoyaltyConfig | null;
  onClose: () => void;
  onSubmit: (data: LoyaltyConfigFormData) => void;
  /** Disables the submit button while the update request is in flight. */
  isSubmitting?: boolean;
}

/**
 * Right-side drawer for editing the loyalty points configuration. Self-contained
 * (owns its React Hook Form state) and reseeds from the API record whenever it
 * opens; the parent owns the update side effect and passes `isSubmitting`.
 */
export function LoyaltyConfigDrawer({
  open,
  config,
  onClose,
  onSubmit,
  isSubmitting = false,
}: LoyaltyConfigDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoyaltyConfigFormData>({
    resolver: zodResolver(loyaltyConfigSchema),
    defaultValues: DEFAULTS,
  });

  // Seed the form each time the drawer opens with the latest API config.
  useEffect(() => {
    if (!open) return;
    if (config) {
      reset({
        points_per_delivery: config.points_per_delivery,
        points_per_referral: config.points_per_referral,
        point_value: config.point_value,
      });
    } else {
      reset(DEFAULTS);
    }
  }, [open, config, reset]);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={480}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
                <IconSettings size={22} />
              </div>
              <div>
                <SheetTitle className="text-xl">{M.CONFIG.TITLE}</SheetTitle>
                <SheetDescription>{M.CONFIG.SUBTITLE}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            <section>
              <div className="sec-label">{M.CONFIG.SECTION}</div>
              <FormRow>
                <FormField
                  label={M.CONFIG.POINTS_PER_DELIVERY}
                  hint={M.CONFIG.POINTS_PER_DELIVERY_HINT}
                  error={errors.points_per_delivery?.message}
                >
                  <Input
                    type="number"
                    error={!!errors.points_per_delivery}
                    {...register("points_per_delivery")}
                  />
                </FormField>
                <FormField
                  label={M.CONFIG.POINTS_PER_REFERRAL}
                  hint={M.CONFIG.POINTS_PER_REFERRAL_HINT}
                  error={errors.points_per_referral?.message}
                >
                  <Input
                    type="number"
                    error={!!errors.points_per_referral}
                    {...register("points_per_referral")}
                  />
                </FormField>
              </FormRow>
              <FormField
                label={M.CONFIG.POINT_VALUE}
                hint={M.CONFIG.POINT_VALUE_HINT}
                error={errors.point_value?.message}
              >
                <Input
                  type="number"
                  step="0.0001"
                  error={!!errors.point_value}
                  {...register("point_value")}
                />
              </FormField>

              {/* Read-only — supplied by the API, not part of the update payload. */}
              {config?.updated_at && (
                <FormField label={M.CONFIG.UPDATED_AT} hint={M.CONFIG.UPDATED_AT_HINT}>
                  <Input value={config.updated_at} readOnly disabled />
                </FormField>
              )}
            </section>
          </div>

          <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
            <div className="flex justify-end gap-3 w-full">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                {MESSAGES.COMMON.CANCEL}
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                <IconCheck size={15} className="mr-1" />
                {isSubmitting ? MESSAGES.COMMON.LOADING : MESSAGES.COMMON.SAVE_CHANGES}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
