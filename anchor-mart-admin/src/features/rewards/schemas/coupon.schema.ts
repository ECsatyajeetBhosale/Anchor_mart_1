import { z } from "zod";

/**
 * The coupon `image` is a stored media-root relative path, not a file upload
 * and not a URL — the same contract the category image follows. Mirroring the
 * server-side prefix check here turns a round-trip 400 into an inline message;
 * it is not the safety boundary.
 */
const COUPON_IMAGE_PREFIX = "coupon_images/";

const couponImageSchema = z
  .string()
  .trim()
  .default("")
  .refine((v) => v === "" || v.startsWith(COUPON_IMAGE_PREFIX), {
    message: `Image path must start with "${COUPON_IMAGE_PREFIX}"`,
  });

/** Blank, or a whole number ≥ 1 — a usage limit. Blank means unlimited; `0` is a 400. */
const optionalLimitSchema = z
  .string()
  .trim()
  .default("")
  .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1), {
    message: "Must be 1 or more, or blank for unlimited",
  });

/**
 * Validation schema for the coupon add/edit form. Mirrors the create payload
 * (POST /superadmin/promotion/coupons/add/). Numbers use `z.coerce.number()`
 * so the text/number inputs round-trip; dates are `YYYY-MM-DD` strings from
 * the date pickers and are formatted for the API on submit.
 *
 * Cross-field rules (2026-09-29 backend contract):
 *  - the discount must be > 0 (BUG-014) — except free shipping, whose value
 *    the backend ignores;
 *  - a percentage coupon needs `max_discount_amount` (BUG-038) and ≤ 100%;
 *  - `valid_to` is required unless "No end date" is on (it is then `null`).
 */
export const couponSchema = z
  .object({
    code: z.string().trim().min(1, "Coupon code is required"),
    title: z.string().trim().default(""),
    description: z.string().trim().default(""),
    // Stored image path (e.g. "coupon_images/example.png") — not a file upload.
    image: couponImageSchema,
    discount_type: z.enum(["percentage", "fixed", "free_shipping"]),
    applies_to: z.enum(["delivery", "order_total", "items"]),
    discount_value: z.coerce
      .number({ invalid_type_error: "Discount value must be a number" })
      .min(0, "Must be greater than 0"),
    // Text so it can be blank for fixed/free-shipping coupons, where it is not sent.
    max_discount_amount: z.string().trim().default(""),
    min_purchase_amount: z.coerce
      .number({ invalid_type_error: "Must be a number" })
      .min(0, "Must be 0 or more")
      .default(0),
    valid_from: z.string().trim().min(1, "Start date is required"),
    valid_to: z.string().trim().default(""),
    /** "No end date" — the coupon never expires and `valid_to` is sent as `null`. */
    no_end_date: z.boolean().default(false),
    // Blank → unlimited (`null`). Kept as strings so an empty field maps to null.
    usage_limit: optionalLimitSchema,
    per_user_usage_limit: optionalLimitSchema,
    is_public: z.boolean().default(true),
    is_active: z.boolean().default(true),
  })
  .superRefine((d, ctx) => {
    if (d.discount_type !== "free_shipping" && !(d.discount_value > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discount_value"],
        message: "Must be greater than 0",
      });
    }
    if (d.discount_type === "percentage") {
      if (d.discount_value > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discount_value"],
          message: "A percentage can't exceed 100",
        });
      }
      const cap = Number(d.max_discount_amount);
      if (d.max_discount_amount === "" || !Number.isFinite(cap) || cap <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["max_discount_amount"],
          message: "Max discount is required for percentage coupons",
        });
      }
    }
    if (!d.no_end_date) {
      if (!d.valid_to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["valid_to"],
          message: "End date is required, or choose No end date",
        });
      } else if (d.valid_from && d.valid_to < d.valid_from) {
        // Both are `YYYY-MM-DD`, so a string compare is a date compare.
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["valid_to"],
          message: "End date can't be before the start date",
        });
      }
    }
  });

export type CouponFormData = z.infer<typeof couponSchema>;
