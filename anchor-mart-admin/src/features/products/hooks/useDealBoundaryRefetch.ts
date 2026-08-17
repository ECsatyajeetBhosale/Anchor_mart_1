import { useEffect } from "react";

/**
 * Refetches once, exactly when the soonest running deal expires.
 *
 * `on_deal` is a live annotation, not a field: it flips when a clock passes the
 * end of a deal's window, with **no write anywhere** for the cache to invalidate
 * against (C8). So a row can sit in the Deal Products tab long after its deal
 * ended, and no amount of tag invalidation would ever catch it.
 *
 * `deal_ends_at` is what makes this fixable rather than merely mitigable: given
 * the earliest boundary across the rows on screen, one timer at that instant is
 * enough. No polling, and no staleness inside the window — nothing changes until
 * that moment, by definition.
 *
 * Deliberately not a countdown or a re-render loop. The only observable effect
 * is a single refetch at the boundary; everything else about the screen is
 * untouched, which is what keeps this cheap enough to leave running on a tab
 * somebody left open.
 */
export function useDealBoundaryRefetch(
  rows: { deal_ends_at?: string | null }[],
  refetch: () => void,
): void {
  /**
   * The soonest future boundary, as an epoch millisecond value.
   *
   * A primitive rather than a Date so the effect below depends on a value, not
   * an object identity that changes on every render. Past and unparseable
   * timestamps are dropped — a boundary already behind us needs no timer, and
   * the refetch that would have fired has effectively already happened.
   */
  const nextBoundary = rows.reduce<number | null>((soonest, row) => {
    if (!row.deal_ends_at) return soonest;
    const at = Date.parse(row.deal_ends_at);
    if (!Number.isFinite(at) || at <= Date.now()) return soonest;
    return soonest === null || at < soonest ? at : soonest;
  }, null);

  useEffect(() => {
    if (nextBoundary === null) return;
    /**
     * One second past the boundary, so the server has certainly crossed it —
     * firing exactly on the deadline risks racing a clock skew and re-reading
     * the same stale answer, which would then never be corrected.
     *
     * `setTimeout` is capped at a ~24.8-day delay; anything longer wraps and
     * fires immediately, which would turn a distant deal into a refetch loop.
     * Beyond that horizon no timer is set at all — a deal ending next month does
     * not need watching from this mount.
     */
    const delay = nextBoundary - Date.now() + 1_000;
    const MAX_TIMEOUT = 2_147_483_647;
    if (delay <= 0 || delay > MAX_TIMEOUT) return;

    const timer = setTimeout(refetch, delay);
    return () => clearTimeout(timer);
  }, [nextBoundary, refetch]);
}
