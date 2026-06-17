import { useMemo } from "react";

import { MESSAGES } from "@/lib/messages";

import { useGetOrdersByCategoryQuery } from "../api/analyticsApi";
import type { ChartBar } from "../components/AnalyticsBarChart";
import type { AnalyticsParams } from "../types/analytics.types";

const M = MESSAGES.ANALYTICS;

/**
 * Orders-by-category chart data access. Maps the API `data` to the bar chart's
 * `{ label, heightPct, title }` shape (label = category, height scaled to the
 * busiest category) with loading / error / empty flags. Refetches when `params`
 * change.
 */
export function useOrdersByCategory(params: AnalyticsParams) {
  const query = useGetOrdersByCategoryQuery(params);

  const bars = useMemo<ChartBar[]>(() => {
    const src = query.data?.data ?? [];
    const max = src.reduce((m, c) => Math.max(m, c.units), 0);
    return src.map((c) => ({
      label: c.category,
      heightPct: max > 0 ? (c.units / max) * 100 : 0,
      title: `${c.category}: ${M.ORDERS_SUFFIX(c.units)}`,
    }));
  }, [query.data?.data]);

  return {
    bars,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isEmpty: !query.isLoading && !query.isError && bars.length === 0,
  };
}
