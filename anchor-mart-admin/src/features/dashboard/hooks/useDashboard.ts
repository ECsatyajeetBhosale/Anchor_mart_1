import { format } from "date-fns";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { useGetDashboardStatsQuery, useGetLiveOrdersQuery } from "../api/dashboardApi";
import type { DashboardPeriod, DashboardStatsParams, TimeRange } from "../types/dashboard.types";

/** Placeholder shown in a stat card while data is loading or unavailable. */
const PLACEHOLDER = "—";

/** Max rows shown in the dashboard Live Orders preview table. */
const LIVE_ORDERS_LIMIT = 5;

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

  // Selecting a period pill clears any active custom range so `period` applies.
  const selectPeriod = (tab: TimeRange) => {
    setActiveTab(tab);
    setDateRange(undefined);
  };

  // Refresh keeps cards and table synchronized.
  const refetch = () => {
    statsQuery.refetch();
    liveOrdersQuery.refetch();
  };

  // Pre-formatted values mapped to the existing dashboard cards.
  const stats = {
    totalSailors: formatStat(statsQuery.data?.total_sailors),
    activePartners: formatStat(statsQuery.data?.active_partners),
    ordersPlaced: formatStat(statsQuery.data?.orders_placed),
    intentReceived: formatStat(statsQuery.data?.intent_received),
    inProgress: formatStat(statsQuery.data?.in_progress),
    cancelled: formatStat(statsQuery.data?.cancelled),
    pendingIntents: formatStat(statsQuery.data?.pending_intents),
    refunded: formatStat(statsQuery.data?.refunded),
  };

  const liveOrders = {
    // Dashboard shows a capped preview; `count` keeps the true total for the footer.
    items: (liveOrdersQuery.data?.results ?? []).slice(0, LIVE_ORDERS_LIMIT),
    count: liveOrdersQuery.data?.count ?? 0,
    isLoading: liveOrdersQuery.isLoading,
    isError: liveOrdersQuery.isError,
    error: liveOrdersQuery.error,
    refetch: liveOrdersQuery.refetch,
  };

  return {
    activeTab,
    selectPeriod,
    dateRange,
    setDateRange,
    stats,
    isError: statsQuery.isError,
    error: statsQuery.error,
    refetch,
    liveOrders,
  };
}
