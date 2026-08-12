/**
 * Types for the Analytics endpoints (`/superadmin/analytics/*`).
 *
 * All sections share the same filter contract: send EITHER a predefined
 * `period` OR a custom `from_date` + `to_date` range — mirroring the dashboard.
 */

/** Predefined period values accepted by every analytics endpoint. */
export type AnalyticsPeriodParam = "7d" | "30d" | "quarter" | "year";

/**
 * Shared query parameters. Send EITHER `period` OR `from_date` + `to_date` —
 * never both (a complete custom range wins, just like the dashboard).
 */
export interface AnalyticsParams {
  period?: AnalyticsPeriodParam;
  /** Custom range start, formatted YYYY-MM-DD. */
  from_date?: string;
  /** Custom range end, formatted YYYY-MM-DD. */
  to_date?: string;
}

/** Product-sales adds an optional product selector to the shared filters. */
export interface AnalyticsProductParams extends AnalyticsParams {
  product_id?: string;
}

/* ── Summary cards ─────────────────────────────────────── */

/** Payload from `GET /superadmin/analytics/summary/`. */
export interface AnalyticsSummaryResponse {
  period: string;
  monthly_revenue: number;
  total_orders: number;
  active_sailors: number;
}

/* ── Sales trend ───────────────────────────────────────── */

/** A single bucket in the sales-trend timeseries. */
export interface SalesTrendBar {
  label: string;
  from: string;
  to: string;
  deliveries: number;
  units: number;
  revenue: number;
  weekday: string;
}

/** Payload from `GET /superadmin/analytics/sales-trend/`. */
export interface SalesTrendResponse {
  period: string;
  granularity: string;
  bars: SalesTrendBar[];
}

/* ── Orders by category ────────────────────────────────── */

/** A single category slice. */
export interface OrdersByCategoryItem {
  category_id: string;
  category: string;
  units: number;
}

/** Payload from `GET /superadmin/analytics/orders-by-category/`. */
export interface OrdersByCategoryResponse {
  period: string;
  data: OrdersByCategoryItem[];
}

/* ── Product-wise sales ────────────────────────────────── */

/** The selected product's identity in the product-sales payload. */
export interface ProductSalesProduct {
  id: string;
  name: string;
  category: string;
  /** `regular` | `express` | `marine_emergency`. Added 12 Aug 2026. */
  catalog_type?: string;
  is_active?: boolean;
  /**
   * True when the product has been soft-deleted.
   *
   * The endpoint deliberately still reports a delisted product's full history —
   * it reports on the past, and delisting does not undo sales made inside the
   * window. Label it; do not treat it as an error.
   */
  is_deleted?: boolean;
}

/** Period-over-period growth percentages. */
export interface ProductSalesGrowth {
  /**
   * Percentages, and **either may be `null`** — meaning *no baseline* (the
   * previous period sold nothing), which is not the same as zero growth.
   * Render a dash, never "0%".
   */
  units: number | null;
  revenue: number | null;
}

/** A single bucket in the product-sales series. */
export interface ProductSalesSeriesPoint {
  label: string;
  from: string;
  to: string;
  units: number;
  revenue: number;
  weekday: string;
}

/** Payload from `GET /superadmin/analytics/product-sales/`. */
export interface ProductSalesResponse {
  period: string;
  granularity: string;
  product: ProductSalesProduct | null;
  revenue: number;
  units_sold: number;
  growth: ProductSalesGrowth;
  series: ProductSalesSeriesPoint[];
}
