/**
 * Which backend-recorded explanation applies to an order that ended on an
 * off-ramp, and when it was recorded.
 *
 * Three different fields answer "why did this end here", one per off-ramp, and
 * every surface that shows a reason — both list rows, both review drawers —
 * has to pick the same one for the same status. Defining that choice once is
 * the point of this module.
 *
 * **Selection only.** Every string returned is the backend's own text. Nothing
 * here derives a reason from the status, from availability, from the timeline
 * or from anything else: an order the backend recorded no reason for reports
 * `""`, and the caller renders nothing rather than inventing a sentence.
 *
 * `refunded` is deliberately absent — the backend has no refund-reason field,
 * so there is nothing to select.
 */

/** A terminal explanation: the backend's text, plus when it was recorded. */
export interface TerminalReason {
  /** The backend's own words. `""` when none was recorded. */
  text: string;
  /** Display-formatted timestamp, already formatted by the API. `""` when absent. */
  at: string;
}

export const NO_TERMINAL_REASON: TerminalReason = { text: "", at: "" };

/**
 * The subset of an order (list row or detail payload) this rule reads. Written
 * structurally so the orders and intents shapes both satisfy it without either
 * feature importing the other.
 */
export interface TerminalReasonSource {
  status?: string;
  /** `cancelled` — sailor's or admin's reason, plus `cancelled_at`. */
  cancellation_reason?: string;
  cancelled_at?: string | null;
  /** `intent_rejected` — the admin's reason, quoted back to the sailor. */
  rejection_reason?: string;
  /** `delivery_failed` — the partner's reason, off the assignment. */
  failure_reason?: string;
  failed_at?: string | null;
}

export function terminalReason(src: TerminalReasonSource): TerminalReason {
  switch (src.status) {
    case "cancelled":
      return { text: src.cancellation_reason ?? "", at: src.cancelled_at ?? "" };
    case "intent_rejected":
      return { text: src.rejection_reason ?? "", at: "" };
    case "delivery_failed":
      return { text: src.failure_reason ?? "", at: src.failed_at ?? "" };
    default:
      return NO_TERMINAL_REASON;
  }
}

/** True when there is something to render — saves every caller the same check. */
export function hasTerminalReason(r: TerminalReason): boolean {
  return !!r.text || !!r.at;
}
