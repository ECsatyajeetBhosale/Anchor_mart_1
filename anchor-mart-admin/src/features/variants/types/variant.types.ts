/**
 * A product variant — the actual sellable SKU beneath a product. AnchorMart
 * tracks no numeric stock: a variant is orderable purely on the `admin_sourceable`
 * flags, and the effective rule (Flow 17) is
 * `variant.admin_sourceable AND product.admin_sourceable`, both live.
 */
export interface ProductVariant {
  /** Variant UUID — the row key and the id every write endpoint takes. */
  id: string;
  /** Parent product UUID. */
  productId: string;
  /** Parent product name, when the serializer nests it. */
  productName: string;
  sku: string;
  /** Numeric price, kept raw so the edit form can round-trip it. */
  price: number;
  /** Free-form attribute map, e.g. `{ color: "red", size: "M" }`. */
  attributes: Record<string, unknown>;
  /** Stored relative image paths, e.g. "variant_images/x.png". */
  images: string[];
  /**
   * Absolute URL of the primary image, for display only.
   *
   * Kept separate from `images` because that field is deliberately stripped
   * back to media-root relative paths for the write payload — the serializer
   * rejects a full CDN URL — which leaves nothing renderable.
   */
  imageUrl: string;
  isActive: boolean;
  /** Variant-level express flag (`set-express`). */
  isExpress: boolean;
  /** Variant-level sourceability — only half of the effective rule. */
  adminSourceable: boolean;
}

/** Transformed variants list: total count + UI rows. */
export interface VariantListResult {
  count: number;
  variants: ProductVariant[];
}

/** Query params for the variants list. */
export interface GetVariantsParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Narrows the list to one product's variants. */
  productId?: string;
}

/** Body for `POST add-product-variant/`. */
export interface AddVariantPayload {
  product: string;
  sku: string;
  price: number;
  attributes: Record<string, unknown>;
  images: string[];
}

/**
 * Body for `PATCH update-product-variant/{id}/`. `product` is not re-sent — a
 * variant cannot be moved between products.
 */
export interface UpdateVariantPayload {
  sku: string;
  price: number;
  attributes: Record<string, unknown>;
  images: string[];
  is_active: boolean;
}

/**
 * Result of `POST set-admin-sourceable/<variant_id>/` (Flow 29a §5).
 *
 * Carries the **product master's** resulting state alongside the variant's, so
 * the caller can repaint the product row without a re-fetch. Both extra fields
 * arrived with GA11/GA12 on 2026-07-30; before that the response was only
 * `{ message, admin_sourceable }`, which is why `productAdminSourceable` is
 * nullable rather than defaulted to `false`.
 */
export interface SetVariantSourceableResult {
  /** Server copy, e.g. "Variant marked sourceable." */
  message: string;
  /** The variant's resulting flag — what was just set. */
  adminSourceable: boolean;
  /**
   * The product master's flag after the write. Null when the response omits it
   * (an older deployment) — which means "unknown", not "off".
   */
  productAdminSourceable: boolean | null;
  /**
   * True only when **this call** turned the product master on. The cascade is
   * up-only, so this is never true for a call that set the variant to `false`.
   */
  productCascaded: boolean;
}
