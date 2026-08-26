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

/* ── Traffic by platform ───────────────────────────────── */

/**
 * The surface an order was placed from.
 *
 * **This is the key to render against** — colours, series, table rows. `label`
 * is display text and is free to be reworded server-side; `platform` is not.
 *
 * `unknown` is a real bucket, not an error: orders placed before platform
 * tracking existed, plus anything created outside the customer apps (Django
 * admin, seed data, an admin-raised order). It is reported rather than dropped
 * so these numbers reconcile with the Total Orders card. Expect it to dominate
 * immediately after release and shrink as new traffic accumulates.
 */
export type PlatformKey = "app" | "web" | "unknown";

/** One platform's row in the breakdown. */
export interface OrdersByPlatformRow {
  platform: PlatformKey;
  /** Display name, safe to render as-is. */
  label: string;
  /** The traffic number — counted when the order was **placed**. */
  orders_placed: number;
  /**
   * Share of `total_orders_placed`, 2dp, `0` on an empty window.
   *
   * Server-computed once over the window total. Never re-derive it by summing
   * daily shares from the trend endpoint — that weighs a two-order day the same
   * as a two-hundred-order day, and the numbers stop matching.
   */
  share_pct: number;
  paid_orders: number;
  /** A JSON number, not a string. Format it; do not parse it. */
  gross_revenue: number;
  cancelled_orders: number;
  deliveries: number;
  delivered_revenue: number;
}

/** Payload from `GET /superadmin/analytics/orders-by-platform/`. */
export interface OrdersByPlatformResponse {
  /** The server's statement of the window it measured. Render this, don't re-derive it. */
  period: string;
  /** Guaranteed to equal `sum(data[].orders_placed)`. */
  total_orders_placed: number;
  /**
   * Always exactly three rows, in a fixed order — `app`, `web`, `unknown` —
   * even where a platform had zero orders. Do not filter empties out or
   * reorder: the fixed shape keeps series colours stable across period changes,
   * and a surface that went quiet then reads as a visible `0` rather than
   * silently vanishing from the chart.
   */
  data: OrdersByPlatformRow[];
}

/** One bucket in the platform trend. */
export interface PlatformTrendBar {
  /** Ready-to-render axis label, already shaped for the granularity. */
  label: string;
  /** **Only present on `granularity: "daily"`.** Guard before reading it. */
  weekday?: string;
  from: string;
  to: string;
  /** Bucket total = sum of the `platforms` values. */
  orders_placed: number;
  /** Every key in the response's `platforms` list is present and zero-filled. */
  platforms: Record<string, number>;
}

/** Payload from `GET /superadmin/analytics/platform-trend/`. */
export interface PlatformTrendResponse {
  period: string;
  /** Server-chosen from the window width; not overridable. */
  granularity: string;
  /** The series list, in render order. Build the legend from this, not a constant. */
  platforms: string[];
  /** Covers every bucket in the window, empty ones included. Do not synthesise gaps. */
  bars: PlatformTrendBar[];
}
