import { useMemo } from "react";

import { getApiStatus } from "@/lib/apiError";

import { useGetPlatformTrendQuery } from "../api/analyticsApi";
import type { StackedBar } from "../components/AnalyticsStackedBarChart";
import { bucketLabels, resolveGranularity } from "../lib/bucketLabel";
import type { AnalyticsParams } from "../types/analytics.types";

/**
 * Platform trend data access — the stacked counterpart to {@link useSalesTrend}.
 *
 * The series list comes from the response's `platforms` array rather than a
 * constant here, so a platform the backend starts reporting appears without a
 * frontend change, and the render order stays the server's.
 *
 * Axis labels reuse the same {@link bucketLabels} the sales trend uses. That is
 * the point of the shared helper: the two charts sit side by side on one screen
 * and bucket identically, so a bar in one has to be labelled the same as the bar
 * beneath it. `weekday` is only sent on a daily window, and the helper already
 * falls back to formatting `from` when it is missing, so no guard leaks up here.
 */
export function usePlatformTrend(params: AnalyticsParams) {
  const query = useGetPlatformTrendQuery(params);

  const platforms = useMemo(() => query.data?.platforms ?? [], [query.data?.platforms]);

  const bars = useMemo<StackedBar[]>(() => {
    const raw = query.data?.bars ?? [];
    const granularity = resolveGranularity(query.data?.granularity, raw[0]);
    return raw.map((b) => {
      const { label, fullLabel } = bucketLabels(b, granularity, raw.length);
      return {
        key: b.from || b.label,
        label,
        fullLabel,
        // Every series key is present and zero-filled by the endpoint, so this
        // is a copy rather than a merge — no `?? 0` needed.
        values: b.platforms,
      };
    });
  }, [query.data?.bars, query.data?.granularity]);

  const isForbidden = getApiStatus(query.error) === 403;

  // Every bucket in the window is returned, empty ones included, so a window
  // with orders always has bars. No bars at all means no window to chart.
  const hasVolume = bars.some((b) => platforms.some((p) => (b.values[p] ?? 0) > 0));

  return {
    bars,
    platforms,
    period: query.data?.period,
    isLoading: query.isLoading,
    isError: query.isError && !isForbidden,
    isForbidden,
    refetch: query.refetch,
    isEmpty: !query.isLoading && !query.isError && !hasVolume,
  };
}

export default usePlatformTrend;
