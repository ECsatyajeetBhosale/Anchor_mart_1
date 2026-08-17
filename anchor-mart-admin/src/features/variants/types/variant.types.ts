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
  /**
   * The **parent product's** catalog, read-only and sourced from it.
   *
   * Inherited state rather than the variant's own, and the most useful field the
   * transform used to discard: `set-express/` and deleting the last express
   * variant both rewrite it, so a variant toggle visibly moves its product
   * between shelves and this is where that shows.
   */
  catalogType: string;
  /** Free-text note on the variant. Nullable server-side; "" when absent. */
  aboutProduct: string;
  createdAt: string;
  updatedAt: string;
}

/** Transformed variants list: total count + UI rows. */
export interface VariantListResult {
  count: number;
  variants: ProductVariant[];
}

/**
 * Query params for the variants list.
 *
 * The endpoint also accepts `is_active`, `catalog_type` (all three values,
 * matched on the **parent**) and `is_express` (a legacy alias for the parent's
 * `catalog_type == express`). `admin_sourceable` is **not** a filter — it is
 * silently ignored rather than rejected, so sending it would look like a working
 * filter while returning the unfiltered list.
 *
 * `search` matches **`sku` OR the parent product's name** — unlike products and
 * categories, which are name-only.
 *
 * Pagination is the shared `CustomPagination`: default 10, `page_size` clamped
 * to 50, page past the end → 404.
 */
export interface GetVariantsParams {
  page?: number;
  limit?: number;
  /** Matches SKU or parent product name, case-insensitively. */
  search?: string;
  /** Narrows the list to one product's variants. */
  productId?: string;
  isActive?: boolean;
}

/**
 * Body for `POST add-product-variant/` — **exactly these five**.
 *
 * `is_express`, `admin_sourceable`, `is_active` and `about_product` are silently
 * dropped at create, so none of them can be set here: a variant is always born
 * active, sourceable and not express, and `set-express/` is the only writer of
 * `is_express` at any point in a variant's life.
 *
 * Note `attributes` is **required** here, unlike the inline variant `add-product/`
 * creates from a `sku`, where it defaults to `{}`.
 *
 * The new variant does **not** inherit `admin_sourceable` from its product — it
 * takes the model default `true`, even under a non-sourceable product. Harmless
 * for orderability (the effective rule ANDs both) but it means the two create
 * paths disagree, so the table renders it as inherited state.
 */
export interface AddVariantPayload {
  product: string;
  sku: string;
  price: number;
  attributes: Record<string, unknown>;
  images: string[];
}

/**
 * Body for `PATCH update-product-variant/{id}/`.
 *
 * A true partial on both PUT and PATCH — only present keys are written, unknown
 * ones dropped silently — so **only changed fields are sent**. That matters more
 * here than elsewhere: price changes are **audited** (`PRICE_CHANGED`, recording
 * both sides), so re-sending an unchanged price writes a phantom audit row.
 *
 * Two accepted fields are deliberately absent:
 * - `product` **is** writable, and reparents the variant to a different product
 *   with no catalog-type check — so a regular variant can be moved under a
 *   marine one. Intentional and tested server-side, but far too heavy to sit in
 *   an ordinary edit form; it needs its own deliberate action if ever exposed.
 * - `is_express` is not on the serializer at all; `set-express/` is its only
 *   writer, which is what makes that cascade the single source of truth.
 */
export type UpdateVariantPayload = Partial<{
  sku: string;
  price: number;
  attributes: Record<string, unknown>;
  images: string[];
  admin_sourceable: boolean;
  about_product: string;
  is_active: boolean;
}>;

/**
 * Result of `POST set-express/<variant_id>/`.
 *
 * **The express flag is variant-level; the catalog is product-level, and this
 * one call writes both.** Flagging a variant express up-cascades its product to
 * `catalog_type=express`; un-flagging the *last* express variant demotes the
 * product back — to `regular` or `marine_emergency` depending on its category
 * scope, which the client cannot predict. Hence `productCatalogType`: it is the
 * resulting state, so an honest toast needs no prior-state tracking and no
 * re-fetch.
 */
export interface SetVariantExpressResult {
  message: string;
  /** The variant's resulting flag — what was just set. */
  isExpress: boolean;
  /** The **product's** catalog after the write. Null when the response omits it. */
  productCatalogType: string | null;
  /** True only when *this* call moved the product between catalogs. */
  productCascaded: boolean;
}

/**
 * Result of `DELETE delete-product-variant/<id>/`.
 *
 * Carries the same two cascade fields as `set-express/`, because deleting the
 * last express variant demotes the product exactly as un-flagging it does. Until
 * 2026-08-17 it did not: the same invariant had two write paths and one was
 * broken, leaving a product on the express shelf with nothing express beneath it
 * — invisible on both shelves, since express browse needs a qualifying variant
 * and the regular shelf never had it.
 */
export interface DeleteVariantResult {
  message: string;
  productCatalogType: string | null;
  productCascaded: boolean;
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
