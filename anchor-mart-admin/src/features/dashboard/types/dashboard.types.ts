import type { OrderTimelineItem } from "@/components/common/OrderDetailDrawer";

/** Time-range filter shown in the dashboard header. */
export type TimeRange = "Today" | "Week" | "Month";

/** Predefined period values accepted by the stats endpoint. */
export type DashboardPeriod = "today" | "week" | "month";

/**
 * Query parameters for the dashboard stats endpoint. Send EITHER `period`
 * OR `from_date` + `to_date` — never both at once.
 */
export interface DashboardStatsParams {
  period?: DashboardPeriod;
  /** Custom range start, formatted YYYY-MM-DD. */
  from_date?: string;
  /** Custom range end, formatted YYYY-MM-DD. */
  to_date?: string;
}

/** Resolved period window echoed back by the API. */
export interface DashboardPeriodInfo {
  from: string;
  to: string;
  label: string;
}

/** Stats payload returned by `GET /superadmin/dashboard/dashboard/stats/`. */
export interface DashboardStatsResponse {
  period: DashboardPeriodInfo;
  total_sailors: number;
  active_partners: number;
  in_progress: number;
  intent_received: number;
  pending_intents: number;
  orders_placed: number;
  cancelled: number;
  refunded: number;
}

/** Sailor summary embedded in a live order. */
export interface LiveOrderSailor {
  id: string;
  name: string;
  email: string;
}

/** Port summary embedded in a live order. */
export interface LiveOrderPort {
  code: string;
  name: string;
}

/** Delivery partner summary embedded in a live order (null when unassigned). */
export interface LiveOrderPartner {
  id: string;
  name: string;
  assignment_status: string;
}

/** A single row in the dashboard Live Orders table. */
export interface LiveOrder {
  id: string;
  order_number: string;
  sailor: LiveOrderSailor;
  ship: string;
  port: LiveOrderPort;
  partner: LiveOrderPartner | null;
  status: string;
  status_display: string;
  total_amount: string;
  placed_at: string;
}

/** DRF-paginated payload from `GET /superadmin/dashboard/live-orders/`. */
export interface LiveOrdersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LiveOrder[];
}

/** Ship summary in the order details `information` block. */
export interface LiveOrderDetailShip {
  vessel_name: string;
  imo: string;
}

/** Payment summary in the order details `information` block. */
export interface LiveOrderDetailPayment {
  method: string;
  status: string;
}

/** The `information` block of the order details payload. */
export interface LiveOrderInformation {
  sailor: LiveOrderSailor;
  ship: LiveOrderDetailShip;
  terminal: string;
  delivery_partner: { id: string; name: string } | null;
  payment: LiveOrderDetailPayment;
  coupon: string | null;
}

/** A line item in the order details payload. */
export interface LiveOrderDetailItem {
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

/** The `totals` block of the order details payload. */
export interface LiveOrderTotals {
  subtotal: number;
  shipping_fee: number;
  tax_amount: number;
  discount_amount: number;
  platform_fee: number;
  loyalty_discount: number;
  total_amount: number;
}

/** Payload from `GET /superadmin/dashboard/live-orders/{id}/`. */
export interface LiveOrderDetailsResponse {
  id: string;
  order_number: string;
  status: string;
  status_display: string;
  timeline: OrderTimelineItem[];
  information: LiveOrderInformation;
  items: LiveOrderDetailItem[];
  totals: LiveOrderTotals;
}

/** Ranking metric for the top-products endpoint (scalable for future metrics). */
export type TopProductsRankBy = "units" | "revenue";

/** A single row in the "Top Products" widget. */
export interface TopProductItem {
  product_id: string;
  product_name: string;
  category: string;
  units: number;
  revenue: number;
}

/** The `results` envelope of the top-products payload. */
export interface TopProductsResults {
  message: string;
  rank_by: TopProductsRankBy;
  period: string;
  data: TopProductItem[];
}

/** Payload from `GET /superadmin/dashboard/top-products/`. */
export interface TopProductsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TopProductsResults;
}

/** The order a partner is currently delivering (null when free). */
export interface ActivePartnerCurrentOrder {
  id?: string;
  order_number: string;
}

/** A delivery partner row from the active-partners endpoint. */
export interface ActivePartner {
  id: string;
  name: string;
  email: string;
  partner_code: string | null;
  is_available: boolean | null;
  work_status: string;
  current_order: ActivePartnerCurrentOrder | null;
}

/** Payload from `GET /superadmin/dashboard/active-partners/` (takes no params). */
export interface ActivePartnersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ActivePartner[];
}

/** Color tone for an "Action Required" item's icon tile. */
export type ActionTone = "warning" | "danger" | "info" | "purple" | "success";

/** A single actionable item from the action-required endpoint. */
export interface ActionRequiredItem {
  key: string;
  label: string;
  count: number;
  /** Backend resource link; may be absent. */
  link: string | null;
}

/** Payload from `GET /superadmin/dashboard/action-required/` (takes no params). */
export interface ActionRequiredResponse {
  actions: ActionRequiredItem[];
  total: number;
}

/** Bucketing granularity for the revenue timeseries. */
export type RevenueGranularity = "daily" | "weekly";

/**
 * Query parameters for the revenue endpoint. `granularity` is always sent; a
 * complete custom range adds `from_date` + `to_date` (the two range keys are
 * sent together or not at all).
 */
export interface RevenueParams {
  granularity: RevenueGranularity;
  from_date?: string;
  to_date?: string;
}

/** Resolved window echoed back by the revenue endpoint. */
export interface RevenueWindow {
  from: string;
  to: string;
  granularity: RevenueGranularity;
}

/** Aggregated revenue totals for the resolved window. */
export interface RevenueTotals {
  gross: number;
  refunded: number;
  net: number;
}

/** A single bucket (bar) in the revenue timeseries. */
export interface RevenueBar {
  label: string;
  from: string;
  to: string;
  gross: number;
  refunded: number;
  net: number;
}

/** Payload from `GET /superadmin/dashboard/revenue/`. */
export interface RevenueResponse {
  window: RevenueWindow;
  totals: RevenueTotals;
  bars: RevenueBar[];
}

/**
 * A port option from `GET /superadmin/dashboard/ports/`. The orders list filters
 * by port **name**, so `name` — not `id` — is what gets sent as `filter_by_port`.
 */
export interface DashboardPort {
  id: string;
  name: string;
}

/**
 * Order statuses accepted by the dashboard orders list's `order_status` param.
 * Sending anything outside this set is a client bug, so the union is exhaustive
 * rather than a bare string.
 */
export type DashboardOrderStatus =
  | "intent_received"
  | "intent_rejected"
  | "sourcing"
  | "payment_pending"
  | "confirmed"
  | "partner_assigned"
  | "items_collected"
  | "at_port"
  | "at_berth"
  | "delivered"
  | "cancelled"
  | "refunded";

/** Query params for `GET /superadmin/dashboard/orders/`. */
export interface DashboardOrdersParams {
  page?: number;
  limit?: number;
  /** Matches customer email / first name / last name, or an order id. */
  search?: string;
  /** Omit for "all statuses". */
  order_status?: DashboardOrderStatus;
  /** Port **name**, sourced from `GET /superadmin/dashboard/ports/`. */
  filter_by_port?: string;
  from_date?: string;
  to_date?: string;
}

/**
 * A row of the dashboard orders list, flattened by the API transform.
 *
 * This endpoint publishes no sample response and does **not** return the same
 * fields as `live-orders/` — notably `status_display` may be absent. Every
 * field here is therefore guaranteed present by the transform, so the table can
 * render it without null checks.
 */
export interface DashboardOrderRow {
  /** Order UUID — the row key and the detail lookup id. */
  id: string;
  orderNumber: string;
  sailorName: string;
  /** Composed "ship · port" label, or "—". */
  shipPort: string;
  partnerName: string;
  /** Human status label, falling back to the raw token then "—". */
  status: string;
  /** Formatted total, e.g. "$120.00". */
  total: string;
}

/** DRF-paginated payload from `GET /superadmin/dashboard/orders/`, transformed. */
export interface DashboardOrdersResponse {
  count: number;
  rows: DashboardOrderRow[];
}
