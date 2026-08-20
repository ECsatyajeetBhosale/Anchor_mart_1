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
  /**
   * Every image's read URL — the display counterpart to the whole of `images`.
   *
   * `imageUrl` alone covers a row's thumbnail, but the edit form needs one per
   * path or its gallery renders filenames where the pictures should be.
   *
   * ⚠️ **Not index-aligned with `images`**: this is ordered for display
   * (primary first, then `display_order`) while `images` keeps the raw order the
   * write payload expects. Pair them by `toStoredPath(url)`, never by index.
   */
  imageUrls: string[];
  isActive: boolean;
  /** Variant-level express flag (`set-express`). */
  isExpress: boolean;
  /**
   * **The authoritative express charge for this SKU** — what the express cart
   * shows and the express order bills. `null` when the SKU is not sold as
   * express.
   *
   * Express is a second price list, not a delivery option on `price`: a SKU on
   * an express product with no express price is **pending** — hidden from the
   * express shelf and refused by the express cart *and* again at the till. So
   * `isExpress && expressPrice` is the only combination a sailor can buy, and
   * the flag alone means nothing.
   */
  expressPrice: number | null;
  /**
   * The product's **default SKU** — the one a product-level price edit writes
   * to. Exactly one live variant per product carries it.
   *
   * Set automatically on a product's first variant, moved with
   * `update-product-variant/ {is_primary: true}` (which demotes the incumbent in
   * the same call), and re-pointed by the backend when the primary is deleted.
   */
  isPrimary: boolean;
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
  /**
   * Whether a sailor can **see** this variant, computed server-side from
   * `ProductVariant.catalog_visibility_blockers()` — the same helper the express
   * screen reads, so the two cannot disagree.
   *
   * Not derivable here: `product.is_active`, `product.is_deleted` and
   * `product.is_internal` are all inputs and none is on this payload.
   */
  isSailorVisible: boolean;
  /** Why not. Stable, add-only keys — an unmapped one is rendered raw. */
  visibilityBlockers: string[];
  /**
   * Whether a sailor could **buy** it — a different question. Sourcing switched
   * off leaves an item browsable-but-unavailable, so visible and not orderable
   * is a real state, and this gate ignores the express flag entirely.
   */
  isSailorOrderable: boolean;
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
  /**
   * **Express parents only, and its presence is the decision**: with it the SKU
   * is created Express-ready (`is_express` derived from the price, never sent);
   * without it the SKU is created **pending** — on the shelf and refused by the
   * express cart until someone quotes it.
   *
   * Sending it under a regular or marine parent is a 400: an express price with
   * no shelf to belong to.
   */
  express_price?: number;
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
  /**
   * Re-prices an **already-flagged** SKU. A 400 on an unflagged one, pointing at
   * `set-express/` — so this is the re-pricing path, never the enabling one.
   * Audited like `price`.
   */
  express_price: number;
  /**
   * Promotes this SKU to the product's default, demoting the incumbent in the
   * same call. **`false` is refused** — a product must have a primary, so the
   * way to clear one is to promote another.
   */
  is_primary: boolean;
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
  /** The SKU's resulting express price. `null` after un-flagging, which clears it. */
  expressPrice: number | null;
  /** The **product's** catalog after the write. Null when the response omits it. */
  productCatalogType: string | null;
  /**
   * The product's express "from" figure after the write.
   *
   * The up-cascade fills it from this SKU's price when the product has none, so
   * a product can never end up express-but-unpriced. Cleared when the last
   * Express-ready SKU is un-flagged.
   */
  productExpressBasePrice: number | null;
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
/**
 * The `cascades` block on `update-product-variant/` — always present.
 *
 * Three writable fields on that endpoint move a **second** object: deactivating
 * the last express-ready SKU demotes its product off the express shelf, and a
 * re-parent can demote *and* re-primary the SKU's former product. Without this
 * the form could move a product between catalogs while reporting only "Variant
 * updated".
 *
 * Nested rather than flattened because the response is the variant object, and a
 * bare `product_catalog_type` beside the variant's own `catalogType` would read
 * as a field of the SKU.
 */
export interface VariantUpdateCascades {
  /** The variant's parent **after** the write. */
  productId: string | null;
  productCatalogType: string | null;
  /** This call moved that product's shelf. */
  productCascaded: boolean;
  /** Re-parent only — null when the SKU did not move. */
  sourceProductId: string | null;
  sourceProductCatalogType: string | null;
  sourceProductCascaded: boolean;
  /** The SKU promoted in the *former* product when the mover was its primary. */
  sourceNewPrimaryVariantId: string | null;
}

export interface UpdateVariantResult {
  cascades: VariantUpdateCascades;
}

export interface DeleteVariantResult {
  message: string;
  productCatalogType: string | null;
  productCascaded: boolean;
  /**
   * The SKU promoted in place of the deleted one, when the deleted SKU was the
   * product's **primary**. `null` otherwise.
   *
   * Worth reporting rather than absorbing: the primary is what a product-level
   * express-price edit writes to, so one delete silently re-pointed where a
   * later edit will land.
   */
  newPrimaryVariantId: string | null;
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
