/**
 * The shared reading layer for the standardized stats endpoints.
 *
 * Every one of them answers in the same envelope — a `total`, a `status_counts`
 * map, and (where the screen offers an order-type filter) a `type_counts` map:
 *
 * ```json
 * { "total": 81, "status_counts": { "new": 7, … }, "type_counts": { "all": 81, … } }
 * ```
 *
 * This module knows that envelope and nothing else. It deliberately does **not**
 * know what `new` means: the token appears in the intents, orders and express
 * payloads and stands for a different business state in each, so the meaning
 * stays with the screen that owns the mapping. The flow is
 * `API response → screen-specific card config → StatsGrid → UI`, and this file
 * is only the first arrow.
 *
 * It exists because the same four lines had been written four different ways —
 * `pickStat()`, `stats?.[key] ?? 0`, and two separate `count()` / `formatStat()`
 * helpers that disagreed on whether a missing figure reads as `0` or `—`.
 */

import { MESSAGES } from "./messages";

/**
 * Bucket counts, keyed by the endpoint's own status tokens.
 *
 * Partial rather than complete: a payload that omits a bucket is valid, and a
 * screen must be able to tell "the API sent 0" from "the API sent nothing".
 * Typed per endpoint (not `string`) so a stale or misspelled token is a
 * compile error rather than a card that silently reads 0 forever.
 */
export type StatusCounts<K extends string> = Partial<Record<K, number>>;

/** The `{ total, status_counts }` block every standardized payload carries. */
export interface StatusStats<K extends string> {
  /**
   * The backend's own aggregate for the filtered population.
   *
   * Never recomputed from the buckets: they do not all belong to it. Intents,
   * for instance, counts `cancelled` and `rejected` outside `total` because
   * they left the funnel, so summing the cards would overstate it.
   */
  total?: number;
  status_counts?: StatusCounts<K>;
}

/**
 * …plus the order-type chip counts, where the endpoint provides them.
 *
 * Consumed as given. Deriving `all` from `emergency + regular` would break the
 * day a third type is added, and the backend is the only party that knows
 * whether the options overlap.
 */
export interface TypedStats<S extends string, T extends string> extends StatusStats<S> {
  type_counts?: Partial<Record<T, number>>;
}

/**
 * What a card deck is currently showing. Three states, not two: a failed
 * request and a genuine zero are different facts, and rendering the failure as
 * `0` tells the operator something untrue about their queue.
 */
export type StatsState = "loading" | "error" | "ready";

/** Derives the deck state from an RTK Query result. */
export function statsState(query: { isLoading: boolean; isError: boolean }): StatsState {
  if (query.isLoading) return "loading";
  // Checked after `isLoading` so the first render of a failing query reads as
  // loading rather than flashing an error it has not established yet.
  if (query.isError) return "error";
  return "ready";
}

/**
 * One bucket, or `undefined` when the payload did not carry it.
 *
 * Kept separate from `statText` so a screen can still ask whether a figure
 * exists — the type chips render a bare label for an absent count and
 * `label · 0` for a real zero.
 */
export function statusCount<K extends string>(
  stats: StatusStats<K> | undefined,
  key: K,
): number | undefined {
  return stats?.status_counts?.[key];
}

/**
 * Formats one figure for a card.
 *
 * `undefined` reads as 0 **only once the request has succeeded** — that is a
 * bucket the backend did not mention, which is genuinely none. While loading,
 * and on failure, the card shows a dash instead: stale or absent numbers must
 * not be dressed up as this request's answer.
 */
export function statText(state: StatsState, value: number | undefined): string {
  if (state !== "ready") return MESSAGES.COMMON.STATS.DASH;
  return (value ?? 0).toLocaleString();
}

/** `statText` for a bucket, saving every card site the two-step read. */
export function statusText<K extends string>(
  state: StatsState,
  stats: StatusStats<K> | undefined,
  key: K,
): string {
  return statText(state, statusCount(stats, key));
}

/** The message a deck shows above itself when its request failed, else null. */
export function statsError(state: StatsState): string | null {
  return state === "error" ? MESSAGES.COMMON.STATS.ERROR : null;
}
