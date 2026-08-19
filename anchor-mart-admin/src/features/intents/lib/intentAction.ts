import type { IntentAction } from "../types/intent.types";

/**
 * Derives what the admin should do next for an intent, from its status plus the
 * Flow 06 substitution signal. Ownership (claim first) is handled separately by
 * the drawer's `canClaim`/`canManage`; this is purely the order-state action.
 *
 * The pivotal case is `verification_submitted`: if any line is unavailable or
 * short (`substitutionNeeded`), the admin must suggest replacements before
 * billing; otherwise everything is available and the order is ready to bill.
 */
/**
 * Statuses from which the terminal reject action is still legal (Flow 05 API 6).
 *
 * The backend's rule is "only before substitutions are released": once the
 * order reaches `pending_customer_response` the sailor has been shown
 * replacements, and the correct terminal action becomes admin cancel (Flow 12).
 * `payment_pending` and every closed status are out for the same reason.
 * Rejecting outside this set returns a 400 quoting the current status.
 */
const REJECTABLE_STATUSES = new Set([
  "intent_received",
  "sourcing",
  "partner_verifying",
  "verification_submitted",
]);

/** May this order still be rejected, or has it moved past the rejectable stage? */
export function canRejectIntent(status: string): boolean {
  return REJECTABLE_STATUSES.has(status);
}

/**
 * Statuses from which an intent can be cancelled (Flow 1 §4.3).
 *
 * The terminal action pairs with reject rather than competing with it: reject
 * is the supply-side verdict and is legal only *before* substitutions are
 * released, so past that point cancel is the way an order ends. Both are legal
 * on the earlier statuses, but offering two terminal buttons on one row invites
 * picking the wrong one — and the backend's own recipe is "reject there,
 * otherwise cancel".
 *
 * Cancel is **unpaid-only**. Every order on this screen is unpaid by
 * definition; past payment it is the refund flow, which is the orders screen's.
 */
const CANCELLABLE_STATUSES = new Set(["pending_customer_response", "payment_pending"]);

/** May this intent be cancelled from where it is? */
export function canCancelIntent(status: string): boolean {
  return CANCELLABLE_STATUSES.has(status);
}

/**
 * Statuses from which a report can be sent back to the partner (§4.3b).
 *
 * The state machine allows six, but the other four are pre-verification — there
 * the answer is to assign a partner, not to re-ask one — and `payment_pending`
 * is the add-items path. These two are the only ones that occur in practice.
 */
const REVERIFIABLE_STATUSES = new Set(["verification_submitted", "pending_customer_response"]);

/**
 * May this order be sent back for re-verification?
 *
 * @param needsVerifierPartner The row's own flag. `true` means no partner is
 *   assigned, which the endpoint answers with a 409 telling the admin to assign
 *   one instead — so the control is withheld rather than offered and refused.
 *   `null` (the field was absent) is not read as "no partner".
 */
export function canRequestReverification(
  status: string,
  needsVerifierPartner: boolean | null,
): boolean {
  return REVERIFIABLE_STATUSES.has(status) && needsVerifierPartner !== true;
}

/**
 * @param situation The row's `situation` — the sub-state behind the status.
 *   Only `pending_customer_response` carries one, and only `ready_to_bill`
 *   changes the action. An absent or unrecognised value keeps the safe reading
 *   ("still waiting on the sailor"), so a new sub-state the frontend has not
 *   been taught cannot offer a write the backend would refuse.
 */
export function deriveIntentAction(
  status: string,
  substitutionNeeded: boolean,
  situation = "",
): IntentAction {
  switch (status) {
    // `new` and `sourcing` are both this status — unclaimed and claimed. The
    // action is the same either way: what it needs next is a verifier.
    case "intent_received":
    case "sourcing":
      return "assign";
    case "partner_verifying":
      return "waiting_partner";
    case "verification_submitted":
      return substitutionNeeded ? "suggest" : "bill";
    // One status, two situations. The sailor has either answered the released
    // substitutions or not, and `status` alone cannot tell them apart — the
    // split is `substitutions_confirmed_at` server-side, surfaced as
    // `situation`. Confirmed means the basket is settled and the desk can bill.
    case "pending_customer_response":
      return situation === "ready_to_bill" ? "bill" : "waiting_customer";
    case "payment_pending":
      return "awaiting_payment";
    case "intent_rejected":
      return "rejected";
    default:
      return "none";
  }
}
