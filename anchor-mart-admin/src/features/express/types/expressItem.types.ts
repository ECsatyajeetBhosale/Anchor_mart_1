/**
 * An express order row as returned by GET /superadmin/express/orders/.
 * Dates arrive pre-formatted from the backend (e.g. "June 23, 2026, 02:18 AM").
 */
export interface ExpressOrder {
  id: string;
  order_number: string;
  /** Machine status, e.g. "delivered". */
  status: string;
  /** Human status label, e.g. "Delivered". */
  status_display: string;
  customer_name: string;
  customer_email: string;
  /** Decimal string, e.g. "2027.42". */
  total_amount: string;
  item_count: number;
  port_name: string | null;
  anchorage_name: string | null;
  /** Pre-formatted timestamp, e.g. "June 23, 2026, 02:18 AM". */
  ship_arrival_date: string | null;
  payment_completed_at: string | null;
  is_fastest_delivery: boolean;
  is_express: boolean;
  is_emergency: boolean;
  partner_allocated: boolean;
  partner_name: string | null;
  has_location_request: boolean;
  created_at: string | null;
}

/** DRF paginated envelope for the express orders list (plain `results` array). */
export interface ExpressOrderListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ExpressOrder[];
}

/**
 * A row of the express variant catalog (`GET /superadmin/express/items/`).
 * The endpoint returns `ProductVariantSerializer` records under `data`, so the
 * flat shape below is produced by the API transform.
 */
export interface ExpressItem {
  /** Variant UUID — the row key. */
  id: string;
  /** Parent product UUID. */
  productId: string;
  /** Product name. */
  name: string;
  /** Variant SKU. */
  sku: string;
  /** Primary image URL (falls back to the first), or "" when none. */
  imageUrl: string;
  /** Formatted price, e.g. "$120.00". */
  price: string;
  /** Attribute summary, e.g. "color: red · size: M". */
  attributes: string;
  /** Long description, or "" — shown as the row's hover title. */
  about: string;
  /**
   * Effective sourceability — the API reports this as product AND variant, so a
   * true here means the item is genuinely orderable.
   */
  adminSourceable: boolean;
  /**
   * The **variant-level** express flag. Not redundant with the row's presence
   * in this list: the list is scoped by the parent product's `catalog_type`, so
   * a variant of an express product appears here whether or not it is itself
   * flagged for express. `false` means it ships in the express catalog's
   * product but is not express-orderable on its own.
   */
  isExpress: boolean;
  isActive: boolean;
}

/** Transformed express-items result: total count + UI rows. */
export interface ExpressItemListResult {
  count: number;
  items: ExpressItem[];
}

/** Query params for the express variant catalog (Flow 09 API 3). */
export interface GetExpressCatalogParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  productId?: string;
  minPrice?: string;
  maxPrice?: string;
  /**
   * `"true"` / `"false"`, filtering on the **effective** sourceable value —
   * product AND variant, not the raw variant column. `"false"` therefore means
   * "either flag is off", which is the correct notion of "not orderable" and is
   * exactly what express checkout rejects a line for.
   */
  adminSourceable?: string;
  /** `"true"` / `"false"` — variant liveness, independent of sourceability. */
  isActive?: string;
  /** Literal phrase the API expects: "low to high" | "high to low". */
  sortByPrice?: string;
  /** Same phrases as `sortByPrice`, ranked by average rating. */
  sortByPopularity?: string;
  /** "newest_first" | "oldest_first". */
  sortByRelevance?: string;
}

/**
 * Catalog half of the express stats payload. The flow doc describes products
 * and variants as two separate aggregates, but the API returns them flattened
 * into one `items` object with prefixed keys — so they are modelled as sent.
 */
export interface ExpressItemStats {
  total_products?: number;
  active_products?: number;
  /** Products whose master sourceable switch is on. */
  sourceable_products?: number;
  top_rated?: number;
  on_deal?: number;
  total_variants?: number;
  active_variants?: number;
  /** Effective sourceable — product AND variant, not the raw variant column. */
  sourceable_variants?: number;
}

/**
 * Order-volume half. `total_orders` is the aggregate the backend computes; the
 * sibling keys are its per-status breakdown, so the two must never be summed
 * together — `total_orders` already counts them.
 */
export interface ExpressOrderStats {
  total_orders?: number;
  /** Paid but not yet worked — the head of the express queue. */
  new?: number;
  in_progress?: number;
  delivered?: number;
  delivery_failed?: number;
  cancelled?: number;
  refunded?: number;
}

/**
 * `GET /superadmin/express/stats/` (Flow 09 API 4) — catalog counts and order
 * volume in one call, under two top-level keys. Every field is optional so a
 * partial response degrades to 0 rather than blanking a card.
 */
export interface ExpressStats {
  items?: ExpressItemStats;
  orders?: ExpressOrderStats;
}
