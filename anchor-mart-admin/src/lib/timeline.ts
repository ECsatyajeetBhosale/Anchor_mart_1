/**
 * Milestone-ladder state resolution — shared by every timeline surface.
 *
 * Two different backend endpoints produce a step ladder, and they do **not**
 * agree on how completion is expressed:
 *
 * | Endpoint | Producer | Completion field |
 * | -------- | -------- | ---------------- |
 * | `GET /superadmin/orders/order-timeline/` | `orders/timeline.py` → `build_delivery_steps` | `status: "done" \| "active" \| "pending"` |
 * | Dashboard live-order details | `admin_panel/serializers/dashboard_serializers.py` | `is_done: boolean` |
 *
 * Both feed the same `Timeline` component and the intents `IntentLifecycleRail`,
 * so the reconciliation lives here rather than being re-derived per view.
 *
 * **Why this module exists.** The order-timeline transform used to read
 * `is_done` — a field that endpoint never sends — and fell back to `!!at`
 * ("it has a timestamp, so it's done"). Because `at` is stamped per milestone
 * from the order's status *history*, a milestone the order skipped had no
 * timestamp while a later one it did reach had one. That rendered a `done`
 * segment *after* the `active` segment and reported the wrong stage number: an
 * order at `verification_submitted` displayed "Stage 2 of 10 — Sourcing" when
 * the backend's own answer was stage 4, "Awaiting your confirmation".
 *
 * The backend already guarantees the correct answer — `build_delivery_steps`
 * rolls each milestone forward by the order's progress rank, and its docstring
 * states the invariant: *"the ladder never shows a `done` step after a
 * `pending` one."* So when `status` is present it is used verbatim and never
 * recomputed.
 */

/** Rendered state of one milestone. */
export type TimelineState = "done" | "active" | "pending";

const VALID_STATES = new Set<TimelineState>(["done", "active", "pending"]);

/**
 * The subset of a timeline step this module needs. Deliberately structural so
 * both `OrderTimelineStep` (order-timeline) and `OrderTimelineItem` (dashboard)
 * satisfy it without either having to import the other.
 */
export interface TimelineStepLike {
  /** Authoritative when present — the order-timeline endpoint's own verdict. */
  status?: string | null;
  /** The dashboard ladder's completion flag; only consulted without `status`. */
  is_done?: boolean;
  /** When the milestone was reached; the last-resort completion signal. */
  at?: string | null;
}

/**
 * True only for the three ladder verdicts.
 *
 * Needed because the `history` fallback rows carry a `status` too — but theirs
 * is an *order status* (`verification_submitted`, …), not a completion verdict.
 * Treating one as the other would mark every history row incomplete.
 */
export function isTimelineState(value: unknown): value is TimelineState {
  return typeof value === "string" && VALID_STATES.has(value as TimelineState);
}

/** Narrows a raw string to a `TimelineState`, or null when unrecognised. */
function asState(value: unknown): TimelineState | null {
  return isTimelineState(value) ? value : null;
}

/**
 * Resolves one state per step, in array order.
 *
 * Prefers the backend's own `status` and returns it untouched — that ladder is
 * already monotonic and already knows which step is active. Only when no step
 * carries a usable `status` does it fall back to deriving from `is_done` (the
 * dashboard shape), marking the first incomplete step active. A ladder whose
 * steps are all complete has no active step, which is correct for a delivered
 * or closed order.
 *
 * Mixed input — some steps with `status`, some without — is treated as the
 * derived case, since a partially-authoritative ladder cannot be trusted to be
 * monotonic.
 */
export function resolveTimelineStates(steps: readonly TimelineStepLike[]): TimelineState[] {
  const declared = steps.map((s) => asState(s.status));
  if (steps.length > 0 && declared.every((s) => s !== null)) {
    return declared as TimelineState[];
  }

  // Derived path. `!!at` is the final fallback for raw history rows, which are
  // records of things that already happened and carry no flag of their own.
  const done = steps.map((s) => (typeof s.is_done === "boolean" ? s.is_done : !!s.at));
  const firstPending = done.indexOf(false);
  return done.map((isDone, i) => (isDone ? "done" : i === firstPending ? "active" : "pending"));
}
