import { z } from "zod";

/**
 * `base_price` as the backend validates it: `DecimalField(max_digits=12,
 * decimal_places=2, min_value=0.01)`. The floor is **0.01, not 0** — a free
 * product is a 400, as is a third decimal place. Both were reachable from this
 * form and only discoverable by submitting.
 */
const basePriceSchema = z.coerce
  .number({ invalid_type_error: "Price must be a number" })
  .min(0.01, "Price must be at least 0.01")
  .max(9_999_999_999.99, "Price is too large")
  .refine(
    (n) => Number.isInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-9,
    {
      message: "Price can have at most 2 decimal places",
    },
  );

/**
 * The editable subset of a product — **exactly the eight keys update-product
 * accepts**: category, name, description, images, base_price, admin_sourceable,
 * is_active, is_top_rated.
 *
 * `is_express` and `on_deal` are deliberately absent. Neither is a writable
 * product field: `is_express` is a serializer alias for `catalog_type ==
 * express` (moved with set-catalog-type), and `on_deal` is a live annotation
 * over the promotion module's deal rows. The API drops unknown keys silently
 * rather than 400ing, so sending either returned a cheerful 200 having changed
 * nothing — there was no error to notice.
 */
export const productUpdateSchema = z.object({
  category: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  base_price: basePriceSchema,
  images: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  is_top_rated: z.boolean().default(false),
  admin_sourceable: z.boolean().default(true),
});

export type ProductUpdateFormData = z.infer<typeof productUpdateSchema>;

/** Nested attribute schemas for the add-product payload. */
const materialSchema = z.object({
  primary: z.string().default(""),
  secondary: z.string().default(""),
  elastane: z.string().default(""),
});

const priceDetailsSchema = z.object({
  amount: z.coerce.number({ invalid_type_error: "Amount must be a number" }).min(0).default(0),
  currency: z.string().default("INR"),
  discounted: z.boolean().default(false),
});

const attributesSchema = z.object({
  id: z.string().default(""),
  product_name: z.string().default(""),
  category: z.string().default(""),
  subcategory: z.string().default(""),
  gender: z.string().default(""),
  brand: z.string().default(""),
  color: z.string().default(""),
  material: materialSchema,
  fit: z.string().default(""),
  rise: z.string().default(""),
  length: z.string().default(""),
  closure_type: z.string().default(""),
  pockets: z.array(z.string()).default([]),
  care_instructions: z.string().default(""),
  season: z.string().default(""),
  price: priceDetailsSchema,
});

/**
 * Validation schema for creating a product (add-product API).
 * Only the top-level identity/pricing fields are required; the rich attribute
 * object is optional metadata, so its members default to empty values.
 */
export const productAddSchema = z.object({
  category: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  images: z.array(z.string()).default([]),
  base_price: basePriceSchema,
  /**
   * Required, and load-bearing: a `sku` makes add-product create the product's
   * **first variant** in the same transaction (price from `base_price`, these
   * attributes, sourceable inherited, images copied). Without one the product is
   * created with no variants and is unorderable until a variant is added
   * separately — so this form always sends it. Globally unique across all
   * variants; a collision comes back as a 400 on `sku`.
   */
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required")
    // Column is 100 chars; over-long values used to surface as a 500.
    .max(100, "SKU must be 100 characters or fewer"),
  // Named catalog, not an express boolean — `is_express_item` was on neither
  // add-product nor any other endpoint in the products contract.
  catalog_type: z.string().min(1, "Catalog is required").default("regular"),
  admin_sourceable: z.boolean().default(true),
  is_top_rated: z.boolean().default(false),
  attributes: attributesSchema,
});

export type ProductAddFormData = z.infer<typeof productAddSchema>;
