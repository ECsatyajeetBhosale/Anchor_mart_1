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

    /* ── catalog / workload counters — also snapshots ─────────────────────── */
    products: formatStat(statsQuery.data?.products),
    marineEmergencySpares: formatStat(statsQuery.data?.marine_emergency_spares),
    expressItems: formatStat(statsQuery.data?.express_items),
    assignments: formatStat(statsQuery.data?.assignments),
    verifications: formatStat(statsQuery.data?.verifications),
    specialRequests: formatStat(statsQuery.data?.special_requests),
    specialRequestCancellations: formatStat(statsQuery.data?.special_request_cancellations),
    rewards: formatStat(statsQuery.data?.rewards),

    /* ── exception work — unactioned items needing an admin ──────────────── */
    // Returned by the endpoint since before this screen shipped and never
    // mapped, so 15 items of outstanding work were invisible on the screen
    // whose job is to surface them.
    deliveryFailed: formatStat(statsQuery.data?.delivery_failed),
    /** Staleness qualifier for `deliveryFailed` — the oldest unattended failure. */
    oldestFailedAt: statsQuery.data?.oldest_failed_at ?? null,
    deltaOpen: formatStat(statsQuery.data?.delta_open),
    deltaExpired: formatStat(statsQuery.data?.delta_expired),
    /** Customer location reports awaiting an admin decision. The legacy
     *  `silent_alerts_count` was the same number under a different name. */
    locationReportsPending: formatStat(statsQuery.data?.location_reports_pending),

    /**
     * Unformatted counts for the hero sentence.
     *
     * The formatted values above are localised strings (and "—" while loading),
     * which cannot be pluralised — that is why the hero read "1 verifications".
     */
    raw: {
      verifications: statsQuery.data?.verifications,
      inProgress: statsQuery.data?.in_progress,
    },

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
