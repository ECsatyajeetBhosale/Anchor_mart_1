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

/** Row in the "Action Required" card. */
export interface ActionItem {
  icon: ReactNode;
  bg: string;
  color: string;
  title: string;
  sub: string;
  route: string;
  label: string;
}
