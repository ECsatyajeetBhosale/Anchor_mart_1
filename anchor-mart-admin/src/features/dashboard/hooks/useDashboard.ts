import { format } from "date-fns";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { useGetDashboardStatsQuery } from "../api/dashboardApi";
import type { DashboardPeriod, DashboardStatsParams, TimeRange } from "../types/dashboard.types";

/** Placeholder shown in a stat card while data is loading or unavailable. */
const PLACEHOLDER = "—";

/** Format a numeric stat with thousands separators; fall back while loading. */
function formatStat(value: number | undefined): string {
  return value === undefined ? PLACEHOLDER : value.toLocaleString();
}

/**
 * Dashboard data access + header filter state.
 *
 * Owns the period toggle and custom date range, derives the stats query
 * params (a custom range always overrides the period — the two are never sent
 * together), and exposes the API stats pre-formatted for the existing cards.
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

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetDashboardStatsQuery(params);

  // Selecting a period pill clears any active custom range so `period` applies.
  const selectPeriod = (tab: TimeRange) => {
    setActiveTab(tab);
    setDateRange(undefined);
  };

  // Pre-formatted values mapped to the existing dashboard cards.
  const stats = {
    totalSailors: formatStat(data?.total_sailors),
    activePartners: formatStat(data?.active_partners),
    ordersPlaced: formatStat(data?.orders_placed),
    intentReceived: formatStat(data?.intent_received),
    inProgress: formatStat(data?.in_progress),
    cancelled: formatStat(data?.cancelled),
    pendingIntents: formatStat(data?.pending_intents),
    refunded: formatStat(data?.refunded),
  };

  return {
    activeTab,
    selectPeriod,
    dateRange,
    setDateRange,
    stats,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
}
