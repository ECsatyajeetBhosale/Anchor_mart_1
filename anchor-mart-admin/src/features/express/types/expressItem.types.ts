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
  /** Category name, or "-". */
  category: string;
  /** Formatted price, e.g. "$120.00". */
  price: string;
  /** Attribute summary, e.g. "color: red · size: M". */
  attributes: string;
  /**
   * Effective sourceability — the API reports this as product AND variant, so a
   * true here means the item is genuinely orderable.
   */
  adminSourceable: boolean;
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
  /** Literal phrase the API expects: "low to high" | "high to low". */
  sortByPrice?: string;
  /** "newest_first" | "oldest_first". */
  sortByRelevance?: string;
}

/**
 * `GET /superadmin/express/stats/` (Flow 09 API 4) — three aggregate blocks in
 * one payload. Every field is optional so a partial response degrades to 0.
 */
export interface ExpressStats {
  products?: {
    total?: number;
    active?: number;
    sourceable?: number;
    top_rated?: number;
    on_deal?: number;
  };
  variants?: {
    total?: number;
    active?: number;
    /** Effective = product AND variant. */
    sourceable?: number;
  };
  /** Order counts keyed by status token, e.g. `{ delivered: 12 }`. */
  orders_by_status?: Record<string, number>;
}
