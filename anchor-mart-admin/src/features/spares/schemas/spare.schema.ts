import { z } from "zod";

/**
 * Marine-emergency spare product — add form.
 *
 * Mirrors the live serializer: `category`, `name`, `description` and
 * `base_price` are the four the API rejects as "This field is required."
 * The category must be a **marine_emergency**-scope one; the backend enforces
 * this ("This category belongs to 'general', but a 'marine_emergency' product
 * must use a 'marine_emergency' category."), and the picker only offers valid
 * ones, so no client-side scope check is duplicated here.
 *
 * `sku` and `attributes` are accepted by the endpoint but never returned by the
 * detail response, so they are not collected — a write-only field that vanishes
 * on reopen is worse than no field.
 */
export const spareAddSchema = z.object({
  category: z.string().min(1, "Category is required"),
  name: z.string().trim().min(1, "Product name is required"),
  description: z.string().trim().min(1, "Description is required"),
  base_price: z.coerce
    .number({ invalid_type_error: "Base price must be a number" })
    .min(0, "Base price must be 0 or more"),
  /** Stored image paths/keys (e.g. "product_images/pump.png"), not uploads. */
  images: z.array(z.string()).default([]),
  admin_sourceable: z.boolean().default(true),
  is_top_rated: z.boolean().default(false),
});

export type SpareAddFormData = z.infer<typeof spareAddSchema>;

/** Edit form — the same fields plus the active flag. */
export const spareUpdateSchema = spareAddSchema.extend({
  is_active: z.boolean().default(true),
});

export type SpareUpdateFormData = z.infer<typeof spareUpdateSchema>;
