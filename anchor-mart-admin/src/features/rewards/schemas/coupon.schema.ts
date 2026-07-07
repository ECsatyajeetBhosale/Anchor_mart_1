import { z } from "zod";

/**
 * Validation schema for the coupon add/edit form. Mirrors the create payload
 * (POST /superadmin/promotion/coupons/add/). Numbers use `z.coerce.number()`
 * so the text/number inputs round-trip; dates are `YYYY-MM-DD` strings from
 * `type="date"` inputs and are formatted for the API on submit.
 */
export const couponSchema = z.object({
  code: z.string().trim().min(1, "Coupon code is required"),
  title: z.string().trim().default(""),
  description: z.string().trim().default(""),
  image: z.string().trim().default(""),
  discount_type: z.enum(["percentage", "fixed", "free_shipping"]),
  applies_to: z.enum(["delivery", "order_total", "items"]),
  discount_value: z.coerce
    .number({ invalid_type_error: "Discount value must be a number" })
    .min(0, "Must be 0 or more"),
  min_purchase_amount: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .min(0, "Must be 0 or more")
    .default(0),
  valid_from: z.string().trim().min(1, "Start date is required"),
  valid_to: z.string().trim().min(1, "End date is required"),
  // Blank → unlimited. Kept as a string so an empty field maps to null.
  usage_limit: z.string().trim().default(""),
  // Blank allowed (the update contract accepts an empty per-user limit).
  per_user_usage_limit: z.string().trim().default("1"),
  is_public: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

export type CouponFormData = z.infer<typeof couponSchema>;
