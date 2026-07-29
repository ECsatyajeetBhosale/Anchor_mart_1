import { z } from "zod";

/**
 * Validation schema for the loyalty points configuration form. Mirrors the
 * update payload (POST /superadmin/promotion/loyalty/config/update/). Points
 * are whole numbers; `point_value` is kept as a decimal string the API expects.
 */
export const loyaltyConfigSchema = z.object({
  points_per_delivery: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Must be 0 or more"),
  points_per_referral: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Must be 0 or more"),
  point_value: z.string().trim().min(1, "Point value is required"),
});

export type LoyaltyConfigFormData = z.infer<typeof loyaltyConfigSchema>;
