import { z } from "zod";

/**
 * `base_price` as the shared serializer validates it — this endpoint is
 * `AddProductSerializer`, so the same `DecimalField(max_digits=12,
 * decimal_places=2, min_value=0.01)` applies. The floor is **0.01, not 0**.
 */
const basePriceSchema = z.coerce
  .number({ invalid_type_error: "Base price must be a number" })
  .min(0.01, "Base price must be at least 0.01")
  .max(9_999_999_999.99, "Base price is too large")
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-9,
    "Base price can have at most 2 decimal places",
  );

/**
 * Marine-emergency spare product — add form.
 *
 * Mirrors the live serializer: `category`, `name`, `description` and
 * `base_price` are the four the API rejects as "This field is required."
 * The category must be a live **marine_emergency**-scope one; the backend
 * enforces this ("This category belongs to 'general', but a 'marine_emergency'
 * product must use a 'marine_emergency' category."), and an inactive category
 * reads as "Category not found" — so the picker offers only active marine ones.
 */
export const spareAddSchema = z.object({
  category: z.string().min(1, "Category is required"),
  name: z.string().trim().min(1, "Product name is required"),
  description: z.string().trim().min(1, "Description is required"),
  base_price: basePriceSchema,
  /** Stored image paths/keys (e.g. "product_images/pump.png"), not uploads. */
  images: z.array(z.string()).default([]),
  admin_sourceable: z.boolean().default(true),
  is_top_rated: z.boolean().default(false),
  /**
   * **Required here, though the API accepts its absence.**
   *
   * This field was previously omitted on the reasoning that `sku` is write-only
   * — accepted on create, never returned by the detail read — and that a field
   * which vanishes on reopen is worse than no field. The concern was real; the
   * consequence was much worse. `sku` creates the spare's first variant inline,
   * and `browsable_products_qs` requires at least one live variant, so a spare
   * created without one is not merely incomplete — it is **invisible to every
   * sailor**, while sitting in the admin table looking stocked. No error, no
   * warning, no failed order: just emergency stock that silently does not exist.
   *
   * Requiring it makes that state unreachable from this form. Existing
   * variant-less rows are flagged in the table instead.
   */
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required — it creates the spare's first variant")
    .max(100, "SKU must be 100 characters or fewer"),
});

export type SpareAddFormData = z.infer<typeof spareAddSchema>;

/**
 * Edit form — the update contract's eight keys.
 *
 * `sku` is dropped: it belongs to create only (it seeds the first variant), and
 * `UpdateProductSerializer` does not accept it. Variants are managed through
 * their own endpoints afterwards.
 */
export const spareUpdateSchema = spareAddSchema.omit({ sku: true }).extend({
  is_active: z.boolean().default(true),
});

export type SpareUpdateFormData = z.infer<typeof spareUpdateSchema>;
