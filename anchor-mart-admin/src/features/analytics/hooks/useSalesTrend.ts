import { useMemo } from "react";

import { useGetSalesTrendQuery } from "../api/analyticsApi";
import type { ChartBar } from "../components/AnalyticsBarChart";
import { bucketLabels, resolveGranularity } from "../lib/bucketLabel";
import type { AnalyticsParams } from "../types/analytics.types";

/**
 * Sales-trend chart data access. Maps the API `bars` to the chart's
 * `{ key, label, fullLabel, value }` shape (axis = bucket date, value = revenue)
 * and exposes loading / error / empty flags. Refetches automatically when
 * `params` change (same params hit the RTK Query cache).
 *
 * Tick labels follow the bucket width the response came back with — weekdays
 * across a week, dates across a month, months across a year — because a weekday
 * repeated four times over a 30-day window identifies nothing.
 */
export function useSalesTrend(params: AnalyticsParams) {
  const query = useGetSalesTrendQuery(params);

  const bars = useMemo<ChartBar[]>(() => {
    const raw = query.data?.bars ?? [];
    const granularity = resolveGranularity(query.data?.granularity, raw[0]);
    return raw.map((b) => {
      const { label, fullLabel } = bucketLabels(b, granularity, raw.length);
      return { key: b.from || b.label, label, fullLabel, value: b.revenue };
    });
  }, [query.data?.bars, query.data?.granularity]);

  return {
    bars,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    // Loaded successfully but the window has no buckets.
    isEmpty: !query.isLoading && !query.isError && bars.length === 0,
  };
}
