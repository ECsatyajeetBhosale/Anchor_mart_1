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
export function deriveIntentAction(status: string, substitutionNeeded: boolean): IntentAction {
  switch (status) {
    case "intent_received":
    case "pending_intent":
    case "sourcing":
      return "assign";
    case "partner_verifying":
      return "waiting_partner";
    case "verification_submitted":
      return substitutionNeeded ? "suggest" : "bill";
    case "pending_customer_response":
      return "waiting_customer";
    case "payment_pending":
      return "awaiting_payment";
    case "intent_rejected":
      return "rejected";
    default:
      return "none";
  }
}
