import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { useGetRevenueQuery } from "../api/dashboardApi";
import type {
  RevenueBar,
  RevenueGranularity,
  RevenueParams,
  RevenueTotals,
} from "../types/dashboard.types";

/** A bar mapped for the Recharts dataset (plots `net`). */
export interface RevenueChartDatum {
  /** Formatted x-axis label. */
  label: string;
  /** Plotted value — net revenue for the bucket. */
  net: number;
  gross: number;
  refunded: number;
  /** Second-half buckets are emphasised (navy) — preserves the chart's look. */
  highlight: boolean;
}

/** Format a bucket label from its window start, by granularity. */
function formatBarLabel(bar: RevenueBar, _granularity: RevenueGranularity): string {
  // Both granularities use a short month/day label off the bucket start; weekly
  // buckets read as their week-start date, matching the chart's compact ticks.
  return format(parseISO(bar.from), "MMM d");
}

/**
 * Revenue chart data access + its granularity filter.
 *
 * Owns the daily/weekly toggle and derives the query params from it plus the
 * dashboard's shared custom date range (when a complete range is selected, it is
 * sent as `from_date`/`to_date` alongside `granularity`). Maps the API `bars` to
 * the chart dataset and exposes the aggregated `totals`. Changing the
 * granularity or the range re-derives the params, which RTK Query refetches
 * automatically (same params hit the cache — no duplicate calls).
 */
export function useRevenue(dateRange?: DateRange) {
  const [granularity, setGranularity] = useState<RevenueGranularity>("daily");

  // A complete custom range scopes the window; granularity is always sent.
  const params: RevenueParams =
    dateRange?.from && dateRange?.to
      ? {
          granularity,
          from_date: format(dateRange.from, "yyyy-MM-dd"),
          to_date: format(dateRange.to, "yyyy-MM-dd"),
        }
      : { granularity };

  const query = useGetRevenueQuery(params);

  const bars = useMemo(() => query.data?.bars ?? [], [query.data?.bars]);

  const data = useMemo<RevenueChartDatum[]>(() => {
    const midpoint = Math.floor(bars.length / 2);
    return bars.map((bar, i) => ({
      label: formatBarLabel(bar, granularity),
      net: bar.net,
      gross: bar.gross,
      refunded: bar.refunded,
      highlight: i >= midpoint,
    }));
  }, [bars, granularity]);

  const totals: RevenueTotals | undefined = query.data?.totals;

  return {
    granularity,
    setGranularity,
    data,
    totals,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    // Loaded successfully but the window has no buckets.
    isEmpty: !query.isLoading && !query.isError && data.length === 0,
  };
}
