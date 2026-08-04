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
