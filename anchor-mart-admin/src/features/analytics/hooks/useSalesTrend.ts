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

  const granularity = resolveGranularity(query.data?.granularity, query.data?.bars?.[0]);
  const bars = useMemo<ChartBar[]>(() => {
    const raw = query.data?.bars ?? [];
    return raw.map((b) => {
      const { label, fullLabel } = bucketLabels(b, granularity, raw.length);
      return { key: b.from || b.label, label, fullLabel, value: b.revenue };
    });
  }, [query.data?.bars, granularity]);

  return {
    bars,
    /** The bucket width the chart was drawn at — the card's title names it (BUG-015). */
    granularity,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    // Loaded successfully but the window has no buckets.
    isEmpty: !query.isLoading && !query.isError && bars.length === 0,
  };
}
