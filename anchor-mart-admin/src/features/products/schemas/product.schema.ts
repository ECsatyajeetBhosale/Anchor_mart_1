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
  name: z
    .string()
    .min(1, "Product name is required")
    // 255 in the database, uncapped in the serializer — over-long is a 500.
    .max(255, "Product name must be 255 characters or fewer"),
  description: z.string().min(1, "Description is required"),
  base_price: basePriceSchema,
  /**
   * Express-only, and only while the product **is** express — this endpoint
   * cannot move it between shelves, so the product's current type decides.
   *
   * Unlike `base_price`, which is a product-level "from" figure no order reads,
   * this **cascades to the primary variant's** `express_price`: the sailor is
   * charged the variant's figure, so writing only the product row would show one
   * price on the shelf and take another at checkout.
   *
   * `0` is the empty state (the floor is 0.01). The required/rejected rule needs
   * the product's catalog type, which the schema does not have, so it lives in
   * the drawer's submit alongside the dirty-field check.
   */
  express_price: z.coerce.number().default(0),
  images: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  is_top_rated: z.boolean().default(false),
  admin_sourceable: z.boolean().default(true),
});

export type ProductUpdateFormData = z.infer<typeof productUpdateSchema>;

/**
 * Free-form attributes for the product's first variant, as **rows** the operator
 * edits — `[{key: "diameter", value: "24mm"}]`.
 *
 * The API takes an arbitrary object (`{"diameter": "24mm"}`); this form used to
 * hard-code an apparel schema instead — gender, fit, rise, closure type, pockets,
 * a nested material block and a second price with its own currency. None of that
 * is in the create contract, and none of it describes ship chandlery. Rows are
 * flattened to that object on submit; a row with a blank key is dropped.
 *
 * Duplicate keys would silently collapse in the object, so they are rejected
 * here rather than being resolved by whichever row happened to be last.
 */
const attributeRowsSchema = z
  .array(
    z.object({
      key: z.string().trim().default(""),
      value: z.string().trim().default(""),
    }),
  )
  .default([])
  .superRefine((rows, ctx) => {
    const seen = new Set<string>();
    rows.forEach((row, i) => {
      if (!row.key) return;
      const k = row.key.toLowerCase();
      if (seen.has(k)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [i, "key"],
          message: "Duplicate attribute name",
        });
      }
      seen.add(k);
    });
  });

/**
 * Validation schema for creating a product (add-product API).
 * Only the top-level identity/pricing fields are required; the rich attribute
 * object is optional metadata, so its members default to empty values.
 */
export const productAddSchema = z
  .object({
    category: z.string().min(1, "Category is required"),
    name: z
      .string()
      .min(1, "Product name is required")
      // Column is 255; the serializer does not cap it, so an over-long value
      // reaches Postgres and comes back a 500 rather than a 400.
      .max(255, "Product name must be 255 characters or fewer"),
    description: z.string().min(1, "Description is required"),
    images: z.array(z.string()).default([]),
    base_price: basePriceSchema,
    /**
     * The express shelf is a separate price list, so an express product carries
     * **both** prices — and a regular one must not carry this at all.
     *
     * `0` is the empty state, not a price: the floor is 0.01, so it cannot be a
     * real value and an untouched number input reads as "not provided". The
     * required/rejected rule is in the `superRefine` below, because it depends
     * on `catalog_type`.
     */
    express_price: z.coerce.number().default(0),
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
      // Column is 100 chars; over-long values surface as a 500, not a 400.
      .max(100, "SKU must be 100 characters or fewer"),
    // Named catalog, not an express boolean. Sent explicitly so the endpoint
    // never has to fall back to reading `is_express`, whose junk values 400.
    catalog_type: z.string().min(1, "Catalog is required").default("regular"),
    admin_sourceable: z.boolean().default(true),
    is_top_rated: z.boolean().default(false),
    attributes: attributeRowsSchema,
  })
  /**
   * The conditional express price, mirrored from the server rule so the operator
   * finds out before the round-trip rather than after it.
   *
   * The server reports both halves on **`express_base_price`** even when the
   * body said `express_price`; the drawer maps that key back onto this field, so
   * client and server errors land in the same slot.
   */
  .superRefine((data, ctx) => {
    const isExpress = data.catalog_type === "express";
    const provided = data.express_price > 0;
    if (isExpress && !provided) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["express_price"],
        message: "An express product needs an express price",
      });
    }
    if (!isExpress && provided) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["express_price"],
        message: "Only an express product has an express price",
      });
    }
    if (provided && data.express_price < 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["express_price"],
        message: "Price must be at least 0.01",
      });
    }
  });

export type ProductAddFormData = z.infer<typeof productAddSchema>;
