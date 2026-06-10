import { z } from "zod";

/**
 * Validation schema for the editable subset of a product.
 * These are exactly the fields accepted by the update-product API; any other
 * field shown in the form is read-only and never reaches this schema.
 */
export const productUpdateSchema = z.object({
  category: z.string().min(1, "Category is required"),
  shop: z.string().min(1, "Shop is required"),
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  base_price: z.coerce
    .number({ invalid_type_error: "Price must be a number" })
    .min(0, "Price must be 0 or more"),
  images: z.array(z.string()).default([]),
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
  base_price: z.coerce
    .number({ invalid_type_error: "Price must be a number" })
    .min(0, "Price must be 0 or more"),
  sku: z.string().min(1, "SKU is required"),
  admin_sourceable: z.boolean().default(true),
  is_express_item: z.boolean().default(false),
  attributes: attributesSchema,
});

export type ProductAddFormData = z.infer<typeof productAddSchema>;
