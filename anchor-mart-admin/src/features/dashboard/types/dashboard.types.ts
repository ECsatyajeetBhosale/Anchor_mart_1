import type { OrderTimelineItem } from "@/components/common/OrderDetailDrawer";
import type { ReactNode } from "react";

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

/** Row in the "Top Products" card. */
export interface TopProduct {
  name: string;
  category: string;
  orders: number;
  icon: ReactNode;
}

/** Row in the "Active Partners" card. */
export interface ActivePartner {
  name: string;
  id: string;
  active: number;
  status: string;
  variant: "teal" | "warning" | "success";
}

/** Color tone for an "Action Required" item's icon tile. */
export type ActionTone = "warning" | "danger" | "info" | "purple" | "success";

/** Row in the "Action Required" card. */
export interface ActionItem {
  icon: ReactNode;
  tone: ActionTone;
  title: string;
  sub: string;
  route: string;
  label: string;
}
