import { useMemo } from "react";

import { useGetSalesTrendQuery } from "../api/analyticsApi";
import type { ChartBar } from "../components/AnalyticsBarChart";
import type { AnalyticsParams } from "../types/analytics.types";

/**
 * Sales-trend chart data access. Maps the API `bars` to the chart's
 * `{ key, label, value }` shape (axis = bucket date, label = weekday, value =
 * revenue) and exposes loading / error / empty flags. Refetches automatically
 * when `params` change (same params hit the RTK Query cache).
 */
export function useSalesTrend(params: AnalyticsParams) {
  const query = useGetSalesTrendQuery(params);

  const bars = useMemo<ChartBar[]>(
    () =>
      (query.data?.bars ?? []).map((b) => ({
        key: b.from || b.label,
        label: b.weekday || b.label,
        value: b.revenue,
      })),
    [query.data?.bars],
  );

  return {
    bars,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    // Loaded successfully but the window has no buckets.
    isEmpty: !query.isLoading && !query.isError && bars.length === 0,
  };
}
