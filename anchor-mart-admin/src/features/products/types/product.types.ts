export interface ProductImage {
  id?: string;
  // Stored relative path used by the update payload, e.g. "product_images/x.png"
  image?: string;
  image_url?: string;
  is_primary?: boolean;
}

/**
 * A variant as nested on the **product-detail** payload (`get-product/<id>/`).
 *
 * Deliberately separate from `features/variants`' `ProductVariant`: this shape
 * carries `price` as a decimal string, and — importantly — has **no
 * `is_sourceable`**. That field is the effective product-AND-variant badge; its
 * absence here means orderability must be computed against the parent product's
 * own `admin_sourceable`, never read off the variant flag alone.
 */
export interface ProductDetailVariant {
  id: string;
  sku: string;
  /** Decimal string, e.g. "25.00". */
  price: string;
  attributes: Record<string, unknown>;
  images: unknown[];
  is_active: boolean;
  /** Variant half of the sourceable rule — only half. */
  admin_sourceable: boolean;
  is_express: boolean;
  about_product: string | null;
  catalog_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  // UUIDs needed to pre-populate / submit the update form
  category?: string;
  shop?: string;
  category_name: string;
  base_price: number;
  average_rating: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  images: ProductImage[];
  /** Single thumbnail URL returned by the list serializer (may be null). */
  image?: string | null;
  is_featured?: boolean;
  /** The product's catalog: `regular` | `express` | `marine_emergency`. */
  catalog_type?: string;
  /**
   * **Read-only, list rows only, and not a stored field.** The serializer
   * computes it as `catalog_type === "express"`, which is why the detail read
   * omits it — there is no column to serialise. Move a product with
   * `set-catalog-type/`; never send this back.
   *
   * Distinct from `ProductDetailVariant.is_express`, which *is* a real column
   * with its own endpoint — per-variant express eligibility, not catalog scope.
   */
  is_express?: boolean;
  /**
   * **Read-only, list rows only, computed live per request.** True when the
   * product has at least one variant with a currently-running `DealOfTheDay`
   * (active, inside its start/end window). Deals are variant-level, so a product
   * can be partly on deal, and they carry a price, a window and terms that no
   * boolean can set — the writers are under `promotion/deals/`.
   */
  on_deal?: boolean;
  /**
   * ISO timestamp when the running deal's window closes; `null` when not on
   * deal. The **earliest** end when deals overlap.
   *
   * Machine-readable on purpose — its only job is arithmetic. `on_deal` changes
   * when a clock passes, with no write to invalidate a cache against (C8), so
   * this is what lets the screen schedule a single refetch at the boundary
   * instead of polling or going stale.
   */
  deal_ends_at?: string | null;
  is_top_rated?: boolean;
  admin_sourceable?: boolean;
  /** List rows only; on the detail read, count `variants` instead. */
  variant_count?: number;
  purchase_count?: number;
  /** Detail read only. Internal products are kept out of the customer catalogue. */
  is_internal?: boolean;
  /**
   * Nested on the detail read only — the list serializer omits it. Saves the
   * edit drawer a second request to show a product's SKUs.
   */
  variants?: ProductDetailVariant[];
}

export interface ProductListResponseData {
  message: string;
  data: Product[];
}

/**
 * Payload contract for PATCH update-product/{id}/ — **these eight keys and no
 * others**, every one optional, with PUT and PATCH both partial.
 *
 * Only changed fields are sent. The endpoint drops unrecognised keys silently
 * instead of 400ing, so an unsupported field is indistinguishable from an
 * accepted one at the call site: `{"on_deal": true}` returns 200 having changed
 * nothing. Narrowing this type is the only thing that catches it.
 *
 * Not here, and not writable through this endpoint:
 * - `catalog_type` — silently dropped; `set-catalog-type/` is the sole writer.
 * - `is_express` — not a column at all, a serializer alias for
 *   `catalog_type == express`.
 * - `on_deal` — a live annotation over the promotion module's deal rows.
 * - `shop` — not part of the contract per the Postman collection.
 */
export type UpdateProductPayload = Partial<{
  category: string;
  name: string;
  description: string;
  images: string[];
  base_price: number;
  admin_sourceable: boolean;
  is_active: boolean;
  is_top_rated: boolean;
}>;

/**
 * Result of `POST set-catalog-type/{id}/`.
 *
 * **The express invariant is now maintained asymmetrically, by design** (C3):
 *
 * - **Leaving** express clears `is_express` on every live variant in the same
 *   transaction. That kills both the stale per-variant label and the silent
 *   resurrection that used to happen when a product was moved back onto the
 *   express shelf and its old flags reappeared.
 * - **Entering** express flags nothing — a machine cannot know which SKUs are
 *   genuinely express-deliverable. Instead the response reports the counts, so
 *   the stranded state (`flagged: 0` on an express product) is named at the
 *   moment of the move rather than discovered later on the Express screen.
 */
export interface SetCatalogTypeResult {
  message?: string;
  express_variants?: {
    /** Live variants currently flagged express — `0` here is the stranded state. */
    flagged: number;
    live_total: number;
    /** How many this call un-flagged; non-zero only when leaving express. */
    unflagged_by_this_call: number;
  };
}

/**
 * Aggregate KPI counts for the products page from GET product-stats/.
 * Keys confirmed against a live response.
 */
export interface ProductStats {
  total: number;
  active: number;
  regular: number;
  express: number;
  emergency: number;
  top_rated: number;
  on_deal: number;
  deal_of_the_day: number;
  total_categories: number;
  general_categories: number;
  marine_emergency_categories: number;
}

/** Nested material composition inside a product's attributes. */
export interface ProductMaterial {
  primary: string;
  secondary: string;
  elastane: string;
}

/** Nested price details inside a product's attributes. */
export interface ProductPriceDetails {
  amount: number;
  currency: string;
  discounted: boolean;
}

/** Rich, denormalized product attributes (sent as a nested object). */
export interface ProductAttributes {
  id: string;
  product_name: string;
  category: string;
  subcategory: string;
  gender: string;
  brand: string;
  color: string;
  material: ProductMaterial;
  fit: string;
  rise: string;
  length: string;
  closure_type: string;
  pockets: string[];
  care_instructions: string;
  season: string;
  price: ProductPriceDetails;
}

/** Payload contract for POST add-product/. */
/**
 * Payload contract for POST add-product/.
 *
 * `catalog_type` and `is_top_rated` are part of it; `is_express_item` — which
 * this payload used to carry — is not, and appears in no endpoint on the
 * products contract. A new product's catalog is chosen here by name, not by an
 * express boolean.
 */
export interface AddProductPayload {
  category: string;
  name: string;
  description: string;
  images: string[];
  base_price: number;
  catalog_type: string;
  admin_sourceable: boolean;
  is_top_rated: boolean;
  sku: string;
  attributes: ProductAttributes;
}

export interface ProductListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProductListResponseData;
}
