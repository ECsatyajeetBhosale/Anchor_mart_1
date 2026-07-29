import { useMemo } from "react";

import { useGetOrdersByCategoryQuery } from "../api/analyticsApi";
import type { ChartBar } from "../components/AnalyticsBarChart";
import type { AnalyticsParams } from "../types/analytics.types";

/**
 * Orders-by-category chart data access. Maps the API `data` to the chart's
 * `{ key, label, value }` shape (axis = category id, label = category name,
 * value = units) with loading / error / empty flags. Refetches when `params`
 * change.
 */
export function useOrdersByCategory(params: AnalyticsParams) {
  const query = useGetOrdersByCategoryQuery(params);

  const bars = useMemo<ChartBar[]>(
    () =>
      (query.data?.data ?? []).map((c) => ({
        key: c.category_id,
        label: c.category,
        value: c.units,
      })),
    [query.data?.data],
  );

  return {
    bars,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isEmpty: !query.isLoading && !query.isError && bars.length === 0,
  };
}
