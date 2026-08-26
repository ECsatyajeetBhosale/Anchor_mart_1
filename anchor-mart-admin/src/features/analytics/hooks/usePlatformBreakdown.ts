import { getApiStatus } from "@/lib/apiError";

import { useGetOrdersByPlatformQuery } from "../api/analyticsApi";
import type { AnalyticsParams, OrdersByPlatformRow } from "../types/analytics.types";

/**
 * Traffic-by-platform breakdown data access.
 *
 * The rows are passed through **exactly as they arrive** — not filtered, not
 * sorted, not re-percentaged. The endpoint always returns all three in a fixed
 * order, and every one of those transforms would break something: filtering
 * empties makes a surface that went quiet disappear instead of reading as a
 * visible zero, sorting by volume repaints the chart whenever the ranking
 * changes, and re-deriving `share_pct` gives a different answer from the server
 * because share is computed once over the window total.
 */
export function usePlatformBreakdown(params: AnalyticsParams) {
  const query = useGetOrdersByPlatformQuery(params);

  const rows: OrdersByPlatformRow[] = query.data?.data ?? [];
  const total = query.data?.total_orders_placed;

  // A non-admin token is refused outright. That is a statement about the
  // account, not a failure to retry, so the card hides rather than parking an
  // error where an admin would read it as the panel being broken.
  const isForbidden = getApiStatus(query.error) === 403;

  return {
    rows,
    total,
    /** The server's own statement of the window it measured — rendered verbatim. */
    period: query.data?.period,
    isLoading: query.isLoading,
    isError: query.isError && !isForbidden,
    isForbidden,
    refetch: query.refetch,
    // A window with no orders is a 200 with three zeroed rows, so emptiness is
    // read off the total rather than off the array length, which is always 3.
    isEmpty: !query.isLoading && !query.isError && total === 0,
  };
}

export default usePlatformBreakdown;
