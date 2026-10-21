import { useGetExpressOrdersQuery } from "@/features/express";
import { useGetOrderStatsQuery } from "@/features/orders";
import { useGetOrderConfigQuery } from "@/features/settings";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { formatDateRange } from "@/lib/dates";
import { statusCount } from "@/lib/stats";
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
import { isOverdue } from "../lib/overdue";
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

  // A complete, valid custom range takes precedence over the period pills.
  // FROM after TO is a 400 from every endpoint here (BUG-001), so it is never
  // sent — the picker blocks it too.
  const hasRange = !!(dateRange?.from && dateRange?.to && dateRange.from <= dateRange.to);
  const params: DashboardStatsParams =
    hasRange && dateRange?.from && dateRange?.to
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

  /**
   * BUG-021 — paid orders whose ship has sailed but which are still open. The
   * stats endpoint filters on departure server-side, so the count is exact.
   */
  const sailedQuery = useGetOrderStatsQuery({ departed: true });

  /**
   * BUG-065 — express orders past their delivery deadline. The two open
   * buckets (`order_confirmed`, and the derived `in_progress`) at a full page
   * each; the deadline is checked here because no endpoint filters on it.
   * Settings supplies the express SLA for a row without a `deliver_by`.
   */
  const expressConfirmedQuery = useGetExpressOrdersQuery({
    page: 1,
    limit: API_MAX_PAGE_SIZE,
    status: "order_confirmed",
  });
  const expressInProgressQuery = useGetExpressOrdersQuery({
    page: 1,
    limit: API_MAX_PAGE_SIZE,
    status: "in_progress",
  });
  const { data: orderConfig } = useGetOrderConfigQuery();

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
    sailedQuery.refetch();
    expressConfirmedQuery.refetch();
    expressInProgressQuery.refetch();
  };

  const sailedOpen =
    sailedQuery.data === undefined
      ? undefined
      : (statusCount(sailedQuery.data, "new") ?? 0) +
        (statusCount(sailedQuery.data, "in_progress") ?? 0);

  const expressQueries = [expressConfirmedQuery, expressInProgressQuery];
  const expressLoaded = expressQueries.every((q) => q.data !== undefined);
  const overdueExpressCount = expressLoaded
    ? expressQueries
        .flatMap((q) => q.data?.results ?? [])
        .filter((order) => isOverdue(order, orderConfig?.sla_express_hours)).length
    : undefined;
  // A full page means older rows were not read, so the count is a floor.
  const overdueTruncated = expressQueries.some(
    (q) => (q.data?.count ?? 0) > (q.data?.results.length ?? 0),
  );

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
    /** Paid orders still open after their ship sailed (BUG-021). */
    sailedOpen: formatStat(sailedOpen),
    /** Express orders past their deadline (BUG-065); "N+" when not every row was read. */
    overdueExpress:
      overdueExpressCount && overdueTruncated
        ? `${formatStat(overdueExpressCount)}+`
        : formatStat(overdueExpressCount),

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
  // `currentData`, not `data`: after a failed request `data` still holds the
  // previous window, so the label described a period nothing on screen was
  // showing (BUG-001). A custom range is labelled from the picked dates rather
  // than the server's `2026-09-01..2026-09-25` (BUG-024).
  const serverPeriod = statsQuery.currentData?.period ?? null;
  const period =
    serverPeriod && hasRange && dateRange?.from && dateRange?.to
      ? { ...serverPeriod, label: formatDateRange(dateRange.from, dateRange.to) }
      : serverPeriod;

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
