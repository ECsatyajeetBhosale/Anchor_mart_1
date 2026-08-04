import { format } from "date-fns";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  useGetActionRequiredQuery,
  useGetActivePartnersQuery,
  useGetDashboardStatsQuery,
  useGetLiveOrdersQuery,
  useGetTopProductsQuery,
} from "../api/dashboardApi";
import type { DashboardPeriod, DashboardStatsParams, TimeRange } from "../types/dashboard.types";

/** Placeholder shown in a stat card while data is loading or unavailable. */
const PLACEHOLDER = "—";

/** Max rows shown in the dashboard Live Orders preview table. */
const LIVE_ORDERS_LIMIT = 5;

/** Max rows shown in the dashboard Top Products widget. */
const TOP_PRODUCTS_LIMIT = 5;

/** Max rows shown in the dashboard Active Partners widget. */
const ACTIVE_PARTNERS_LIMIT = 5;

/** Format a numeric stat with thousands separators; fall back while loading. */
function formatStat(value: number | undefined): string {
  return value === undefined ? PLACEHOLDER : value.toLocaleString();
}

/**
 * `oldest_failed_at` as an age ("3d", "5h", "12m") for the delivery-failed
 * tile's footer. It is a staleness signal, not a count — an absolute timestamp
 * would make the reader do the subtraction, which is the whole point of it.
 *
 * `null` is the normal "nothing is failing" case, so it yields no footer at all
 * rather than a placeholder.
 */
function formatAge(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

/**
 * Dashboard data access + header filter state.
 *
 * Owns the period toggle and custom date range, derives the shared stats query
 * params (a custom range always overrides the period — the two are never sent
 * together), and drives every dashboard section from that single filter so the
 * stat cards and Live Orders table stay in sync. Refreshing refetches both.
 */
export function useDashboard() {
  const [activeTab, setActiveTab] = useState<TimeRange>("Today");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // A complete custom range takes precedence over the period pills.
  const params: DashboardStatsParams =
    dateRange?.from && dateRange?.to
      ? {
          from_date: format(dateRange.from, "yyyy-MM-dd"),
          to_date: format(dateRange.to, "yyyy-MM-dd"),
        }
      : { period: activeTab.toLowerCase() as DashboardPeriod };

  const statsQuery = useGetDashboardStatsQuery(params);
  const liveOrdersQuery = useGetLiveOrdersQuery(params);
  const topProductsQuery = useGetTopProductsQuery(params);
  // Active partners is param-less — no period/date filters are sent.
  const activePartnersQuery = useGetActivePartnersQuery();
  // Action required is param-less — no period/date filters are sent.
  const actionRequiredQuery = useGetActionRequiredQuery();

  // Selecting a period pill clears any active custom range so `period` applies.
  const selectPeriod = (tab: TimeRange) => {
    setActiveTab(tab);
    setDateRange(undefined);
  };

  // Refresh keeps cards and table synchronized.
  const refetch = () => {
    statsQuery.refetch();
    liveOrdersQuery.refetch();
    topProductsQuery.refetch();
    activePartnersQuery.refetch();
    actionRequiredQuery.refetch();
  };

  // Pre-formatted values mapped to the dashboard cards. Grouped by how each
  // field responds to the header filter — see `DashboardStatsResponse`. Only
  // the `period` block below moves when the period toggle changes; everything
  // else is "right now" regardless, so the UI must not imply otherwise.
  const stats = {
    /* ── snapshots — period-independent ──────────────────────────────────── */
    totalSailors: formatStat(statsQuery.data?.total_sailors),
    activePartners: formatStat(statsQuery.data?.active_partners),
    intentReceived: formatStat(statsQuery.data?.intent_received),
    inProgress: formatStat(statsQuery.data?.in_progress),
    pendingIntents: formatStat(statsQuery.data?.pending_intents),
    deliveryFailed: formatStat(statsQuery.data?.delivery_failed),
    /** Age of the oldest still-failing delivery; `null` when none are. */
    oldestFailedAge: formatAge(statsQuery.data?.oldest_failed_at),
    deltaOpen: formatStat(statsQuery.data?.delta_open),
    deltaExpired: formatStat(statsQuery.data?.delta_expired),
    locationReportsPending: formatStat(statsQuery.data?.location_reports_pending),

    /* ── period counts — these follow the header filter ──────────────────── */
    ordersPlaced: formatStat(statsQuery.data?.orders_placed),
    cancelled: formatStat(statsQuery.data?.cancelled),
    refunded: formatStat(statsQuery.data?.refunded),
  };

  /**
   * The window the backend actually resolved, echoed back from the response.
   * Worth surfacing: on a custom range the label is the only confirmation that
   * the server read the same dates the picker sent.
   */
  const period = statsQuery.data?.period ?? null;

  const liveOrders = {
    // Dashboard shows a capped preview; `count` keeps the true total for the footer.
    items: (liveOrdersQuery.data?.results ?? []).slice(0, LIVE_ORDERS_LIMIT),
    count: liveOrdersQuery.data?.count ?? 0,
    isLoading: liveOrdersQuery.isLoading,
    isError: liveOrdersQuery.isError,
    error: liveOrdersQuery.error,
    refetch: liveOrdersQuery.refetch,
  };

  const topProducts = {
    // Same capped-preview pattern as Live Orders; `count` keeps the true total.
    items: (topProductsQuery.data?.results.data ?? []).slice(0, TOP_PRODUCTS_LIMIT),
    count: topProductsQuery.data?.count ?? 0,
    isLoading: topProductsQuery.isLoading,
    isError: topProductsQuery.isError,
    error: topProductsQuery.error,
    refetch: topProductsQuery.refetch,
  };

  const activePartners = {
    // Same capped-preview pattern; `count` keeps the true total.
    items: (activePartnersQuery.data?.results ?? []).slice(0, ACTIVE_PARTNERS_LIMIT),
    count: activePartnersQuery.data?.count ?? 0,
    isLoading: activePartnersQuery.isLoading,
    isError: activePartnersQuery.isError,
    error: activePartnersQuery.error,
    refetch: activePartnersQuery.refetch,
  };

  const actionRequired = {
    // Bounded set of action types — render all; `total` is the aggregate count.
    items: actionRequiredQuery.data?.actions ?? [],
    total: actionRequiredQuery.data?.total ?? 0,
    isLoading: actionRequiredQuery.isLoading,
    isError: actionRequiredQuery.isError,
    error: actionRequiredQuery.error,
    refetch: actionRequiredQuery.refetch,
  };

  return {
    activeTab,
    selectPeriod,
    dateRange,
    setDateRange,
    stats,
    period,
    isStatsLoading: statsQuery.isLoading,
    isError: statsQuery.isError,
    error: statsQuery.error,
    refetch,
    liveOrders,
    topProducts,
    activePartners,
    actionRequired,
  };
}
