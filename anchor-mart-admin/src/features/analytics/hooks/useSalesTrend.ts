import { useMemo } from "react";

import { useGetSalesTrendQuery } from "../api/analyticsApi";
import type { ChartBar } from "../components/AnalyticsBarChart";
import type { AnalyticsParams } from "../types/analytics.types";

/**
 * Sales-trend chart data access. Maps the API `bars` to the design-system bar
 * chart's `{ label, heightPct, title }` shape (x-axis = weekday, height scaled to
 * the window's peak revenue) and exposes loading / error / empty flags. Refetches
 * automatically when `params` change (same params hit the RTK Query cache).
 */
export function useSalesTrend(params: AnalyticsParams) {
  const query = useGetSalesTrendQuery(params);

  const bars = useMemo<ChartBar[]>(() => {
    const src = query.data?.bars ?? [];
    const max = src.reduce((m, b) => Math.max(m, b.revenue), 0);
    return src.map((b) => ({
      label: b.weekday || b.label,
      heightPct: max > 0 ? (b.revenue / max) * 100 : 0,
      title: `${b.weekday || b.label}: $${b.revenue.toLocaleString()}`,
    }));
  }, [query.data?.bars]);

  return {
    bars,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    // Loaded successfully but the window has no buckets.
    isEmpty: !query.isLoading && !query.isError && bars.length === 0,
  };
}
