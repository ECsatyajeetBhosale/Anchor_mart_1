import { zodResolver } from "@hookform/resolvers/zod";
import { IconCheck, IconTicket } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { DropdownSelect } from "@/components/common/DropdownSelect";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MESSAGES } from "@/lib/messages";
import { type CouponFormData, couponSchema } from "../schemas/coupon.schema";
import type { Coupon } from "../types/reward.types";

const M = MESSAGES.REWARDS;

const DISCOUNT_TYPE_OPTIONS = [
  { value: "fixed", label: M.FORM.DISCOUNT_TYPES.FIXED },
  { value: "percentage", label: M.FORM.DISCOUNT_TYPES.PERCENTAGE },
  { value: "free_shipping", label: M.FORM.DISCOUNT_TYPES.FREE_SHIPPING },
];

const APPLIES_TO_OPTIONS = [
  { value: "order_total", label: M.FORM.APPLIES_OPTIONS.ORDER_TOTAL },
  { value: "delivery", label: M.FORM.APPLIES_OPTIONS.DELIVERY },
  { value: "items", label: M.FORM.APPLIES_OPTIONS.ITEMS },
];

/** Today's date as `YYYY-MM-DD` for the default "valid from". */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const CREATE_DEFAULTS: CouponFormData = {
  code: "",
  title: "",
  description: "",
  image: "",
  discount_type: "fixed",
  applies_to: "order_total",
  discount_value: 0,
  min_purchase_amount: 0,
  valid_from: today(),
  valid_to: "",
  usage_limit: "",
  per_user_usage_limit: "1",
  is_public: true,
  is_active: true,
};

export interface CouponFormDrawerProps {
  open: boolean;
  /** The coupon being edited, or `null` when creating a new one. */
  coupon: Coupon | null;
  onClose: () => void;
  onSubmit: (data: CouponFormData) => void;
  /** Disables the submit button while a create/update request is in flight. */
  isSubmitting?: boolean;
}

/**
 * Right-side drawer for creating or editing a coupon. Self-contained (owns its
 * React Hook Form state) and reseeds whenever it opens; the parent owns the
 * create/update side effects and passes `isSubmitting` for the button state.
 */
export function CouponFormDrawer({
  open,
  coupon,
  onClose,
  onSubmit,
  isSubmitting = false,
}: CouponFormDrawerProps) {
  const isEdit = coupon != null;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: CREATE_DEFAULTS,
  });

  // Seed the form each time the drawer opens: edit → the coupon's full API
  // record (when available), add → blank defaults.
  useEffect(() => {
    if (!open) return;
    const raw = coupon?.raw;
    if (raw) {
      reset({
        code: raw.code,
        title: raw.title ?? "",
        description: raw.description ?? "",
        image: raw.image ?? "",
        discount_type: raw.discount_type as CouponFormData["discount_type"],
        applies_to: raw.applies_to as CouponFormData["applies_to"],
        discount_value: Number(raw.discount_value),
        min_purchase_amount: Number(raw.min_purchase_amount),
        valid_from: raw.valid_from ? raw.valid_from.slice(0, 10) : "",
        valid_to: raw.valid_to ? raw.valid_to.slice(0, 10) : "",
        usage_limit: raw.usage_limit != null ? String(raw.usage_limit) : "",
        per_user_usage_limit:
          raw.per_user_usage_limit != null ? String(raw.per_user_usage_limit) : "",
        is_public: raw.is_public,
        is_active: raw.is_active,
      });
    } else if (coupon) {
      // Locally-added coupon with no API record — seed what we can.
      reset({ ...CREATE_DEFAULTS, code: coupon.code, discount_value: Number(coupon.val) || 0 });
    } else {
      reset({ ...CREATE_DEFAULTS, valid_from: today() });
    }
  }, [open, coupon, reset]);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={520}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
                <IconTicket size={22} />
              </div>
              <div>
                <SheetTitle className="text-xl">
                  {isEdit ? M.FORM.EDIT_TITLE : M.FORM.ADD_TITLE}
                </SheetTitle>
                <SheetDescription>
                  {isEdit ? M.FORM.EDIT_SUBTITLE : M.FORM.ADD_SUBTITLE}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {/* Basic Information */}
            <section>
              <div className="sec-label">{M.FORM.SECTIONS.BASIC}</div>
              <FormRow>
                <FormField label={M.FORM.CODE} error={errors.code?.message}>
                  <Input
                    className="mono"
                    placeholder={M.FORM.CODE_PLACEHOLDER}
                    error={!!errors.code}
                    {...register("code")}
                  />
                </FormField>
                <FormField label={M.FORM.TITLE_FIELD} error={errors.title?.message}>
                  <Input placeholder={M.FORM.TITLE_PLACEHOLDER} {...register("title")} />
                </FormField>
              </FormRow>
              <FormField label={M.FORM.DESCRIPTION} error={errors.description?.message}>
                <Textarea
                  className="h-20"
                  placeholder={M.FORM.DESCRIPTION_PLACEHOLDER}
                  {...register("description")}
                />
              </FormField>
              <FormField label={M.FORM.IMAGE} error={errors.image?.message}>
                <Input
                  className="mono"
                  placeholder={M.FORM.IMAGE_PLACEHOLDER}
                  {...register("image")}
                />
              </FormField>
            </section>

            {/* Discount */}
            <section>
              <div className="sec-label">{M.FORM.SECTIONS.DISCOUNT}</div>
              <FormRow>
                <FormField label={M.FORM.DISCOUNT_TYPE} error={errors.discount_type?.message}>
                  <Controller
                    control={control}
                    name="discount_type"
                    render={({ field }) => (
                      <DropdownSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={DISCOUNT_TYPE_OPTIONS}
                        width="100%"
                      />
                    )}
                  />
                </FormField>
                <FormField label={M.FORM.APPLIES_TO} error={errors.applies_to?.message}>
                  <Controller
                    control={control}
                    name="applies_to"
                    render={({ field }) => (
                      <DropdownSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={APPLIES_TO_OPTIONS}
                        width="100%"
                      />
                    )}
                  />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label={M.FORM.DISCOUNT_VALUE} error={errors.discount_value?.message}>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={M.FORM.DISCOUNT_VALUE_PLACEHOLDER}
                    error={!!errors.discount_value}
                    {...register("discount_value")}
                  />
                </FormField>
                <FormField label={M.FORM.MIN_PURCHASE} error={errors.min_purchase_amount?.message}>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={M.FORM.MIN_PURCHASE_PLACEHOLDER}
                    error={!!errors.min_purchase_amount}
                    {...register("min_purchase_amount")}
                  />
                </FormField>
              </FormRow>
            </section>

            {/* Validity */}
            <section>
              <div className="sec-label">{M.FORM.SECTIONS.VALIDITY}</div>
              <FormRow>
                <FormField label={M.FORM.VALID_FROM} error={errors.valid_from?.message}>
                  <Input type="date" error={!!errors.valid_from} {...register("valid_from")} />
                </FormField>
                <FormField label={M.FORM.VALID_TO} error={errors.valid_to?.message}>
                  <Input type="date" error={!!errors.valid_to} {...register("valid_to")} />
                </FormField>
              </FormRow>
            </section>

            {/* Usage Limits */}
            <section>
              <div className="sec-label">{M.FORM.SECTIONS.LIMITS}</div>
              <FormRow>
                <FormField label={M.FORM.USAGE_LIMIT} error={errors.usage_limit?.message}>
                  <Input
                    type="number"
                    placeholder={M.FORM.USAGE_LIMIT_PLACEHOLDER}
                    {...register("usage_limit")}
                  />
                </FormField>
                <FormField
                  label={M.FORM.PER_USER_LIMIT}
                  error={errors.per_user_usage_limit?.message}
                >
                  <Input
                    type="number"
                    error={!!errors.per_user_usage_limit}
                    {...register("per_user_usage_limit")}
                  />
                </FormField>
              </FormRow>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name="is_public"
                    render={({ field }) => (
                      <Switch
                        id="is-public"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <label htmlFor="is-public" className="text-[13px] font-semibold text-[var(--t2)]">
                    {M.FORM.IS_PUBLIC}
                  </label>
                </div>
                {/* `is_active` is only sent by the update endpoint. */}
                {isEdit && (
                  <div className="flex items-center gap-2">
                    <Controller
                      control={control}
                      name="is_active"
                      render={({ field }) => (
                        <Switch
                          id="is-active"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <label
                      htmlFor="is-active"
                      className="text-[13px] font-semibold text-[var(--t2)]"
                    >
                      {M.FORM.IS_ACTIVE}
                    </label>
                  </div>
                )}
              </div>
            </section>
          </div>

          <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
            <div className="flex justify-end gap-3 w-full">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                {MESSAGES.COMMON.CANCEL}
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                <IconCheck size={15} className="mr-1" />
                {isSubmitting
                  ? MESSAGES.COMMON.LOADING
                  : isEdit
                    ? MESSAGES.COMMON.SAVE_CHANGES
                    : M.CREATE_COUPON}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
