/**
 * Flow 13 state-machine gates for the admin console.
 *
 * `pending → sourcing_confirmed ⇄ quote_sent → accepted / rejected`, with
 * `accepted` and `rejected` terminal. The backend enforces every one of these
 * rules itself (verified against the live API — each returns a 400 quoting the
 * current status), so these helpers exist to keep the UI honest, not to keep
 * the data safe: they hide actions that would fail rather than offering buttons
 * that 400.
 */

/** Not-yet-quoted — the only states an admin may bill or reject from. */
const PRE_QUOTE = new Set(["pending", "sourcing_confirmed"]);

/** Closed states: no admin action of any kind is accepted. */
const TERMINAL = new Set(["accepted", "rejected"]);

/**
 * States where raising the rebill cap can actually change anything.
 *
 * The backend is looser — it accepts allow-changes on any non-terminal request,
 * including `pending`. But the cap only limits the sailor's *request-changes*
 * calls, and those are only possible once they hold a quote. On `pending` no
 * quote has ever been sent, `rebill_count` is 0, and raising the ceiling gives
 * the sailor nothing they can use, so the action is hidden there.
 */
const REBILL_RELEVANT = new Set(["sourcing_confirmed", "quote_sent"]);

/**
 * May the admin quote this request? Only before it has been quoted — a second
 * quote goes through the sailor's request-changes rebill loop instead.
 * → 400 "Cannot generate a bill for a request in 'X' status."
 */
export function canGenerateBill(status?: string | null): boolean {
  return PRE_QUOTE.has(status ?? "");
}

/**
 * May the admin reject this request? Only before quoting: once the sailor has
 * a quote in hand, rejecting is *their* decision (they call the customer-side
 * reject endpoint). → 400 "Cannot reject a request in 'X' status."
 */
export function canAdminReject(status?: string | null): boolean {
  return PRE_QUOTE.has(status ?? "");
}

/**
 * Should the admin be offered the raise-the-cap action? Stricter than the
 * backend on purpose — see `REBILL_RELEVANT`. Terminal requests are refused
 * outright: → 400 "Cannot change the rebill cap on a 'accepted' request."
 */
export function canAllowChanges(status?: string | null): boolean {
  return REBILL_RELEVANT.has(status ?? "");
}

/** Is this request closed (paid or withdrawn)? */
export function isTerminal(status?: string | null): boolean {
  return TERMINAL.has(status ?? "");
}

/**
 * Is this a status the Flow 13 state machine defines? A value from outside the
 * set means the backend has moved on without us — the UI offers nothing rather
 * than guessing which actions might be legal.
 */
export function isKnownStatus(status?: string | null): boolean {
  return PRE_QUOTE.has(status ?? "") || TERMINAL.has(status ?? "") || status === "quote_sent";
}

/**
 * Has the sailor hit the delivery-change ceiling? At the cap they can only pay
 * or reject until an admin grants more — the cue for the allow-changes action.
 */
export function isAtRebillCap(count?: number | null, cap?: number | null): boolean {
  if (typeof count !== "number" || typeof cap !== "number" || cap <= 0) return false;
  return count >= cap;
}
