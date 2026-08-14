import { z } from "zod";

/**
 * Flow 13 API 10 — generate-bill (the quote).
 *
 * Mirrors the live serializer exactly. `product_name`, `quoted_price`,
 * `fast_delivery_charge` and `admin_response` are the four the backend rejects
 * as "This field is required."; `description` and `category_id` are optional
 * (the flow doc marks `description` required — the API does not, and the API
 * wins). `quoted_price` is per unit and must be at least 0.01.
 */
export const generateBillSchema = z.object({
  product_name: z.string().trim().min(1, "Product name is required").max(200, "Max 200 characters"),
  description: z.string().trim().max(1000, "Max 1000 characters").default(""),
  quoted_price: z.coerce
    .number({ invalid_type_error: "Quoted price must be a number" })
    .min(0.01, "Quoted price must be at least 0.01"),
  fast_delivery_charge: z.coerce
    .number({ invalid_type_error: "Fast delivery charge must be a number" })
    .min(0, "Fast delivery charge cannot be negative"),
  admin_response: z.string().trim().min(1, "A message to the sailor is required"),
  /**
   * The general-scope catalog category the quoted item is filed under.
   *
   * Required *in the form*, which is not the same as always being sent. The
   * dialog prefills it from the request's own `category`, so on a filed request
   * this is already satisfied and the value is left out of the payload unless
   * the admin actually changes it. On a legacy row carrying no category the
   * field starts empty and the admin must pick one — which is exactly when the
   * API answers `category_id: This field is required (the request has no
   * category).`
   *
   * Before the detail returned `category` there was no way to tell those two
   * cases apart, so every quote re-sent this and a re-quote could silently
   * re-file the request.
   */
  category_id: z.string().trim().min(1, "Category is required"),
});

export type GenerateBillFormData = z.infer<typeof generateBillSchema>;

/**
 * Flow 13 API 11 — admin reject. The backend requires a non-blank
 * `admin_response` ("This field is required.") and keeps it as the reason
 * shown to the sailor.
 */
export const rejectSpecialRequestSchema = z.object({
  admin_response: z.string().trim().min(1, "A reason is required"),
});

export type RejectSpecialRequestFormData = z.infer<typeof rejectSpecialRequestSchema>;

/**
 * Flow 13 API 12 — allow more delivery changes. `additional` is bounded 1–10
 * server-side ("Must be between 1 and 10.") and is added to the current cap.
 */
export const allowChangesSchema = z.object({
  additional: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .int("Must be a whole number")
    .min(1, "Must be between 1 and 10")
    .max(10, "Must be between 1 and 10"),
});

export type AllowChangesFormData = z.infer<typeof allowChangesSchema>;
