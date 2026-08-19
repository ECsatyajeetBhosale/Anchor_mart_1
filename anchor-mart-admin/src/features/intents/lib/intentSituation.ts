import { ORDER_STATUS_BY_KEY } from "@/lib/orderStatuses";
import type { IntentBadgeVariant } from "../types/intent.types";

/**
 * Badge colour for a row's **situation**, falling back to its status.
 *
 * Colouring by status alone would hide both splits. `new` and `sourcing` share
 * one status, so they would render identically — and `sourcing` also exists as
 * a raw status with its own colour in the canonical map, which would put two
 * differently-coloured "Sourcing" badges on one screen (the derived filter
 * returns the union of both, so they sit next to each other). `situation` is
 * where the label comes from, so it is where the colour comes from too.
 *
 * Only the four derived values need an entry: every other situation is a status
 * verbatim and resolves through `ORDER_STATUS_BY_KEY`, which stays the single
 * source of truth for the eighteen real statuses.
 */
const SITUATION_VARIANT: Record<string, IntentBadgeVariant> = {
  /** Unclaimed — the pick-up queue. Keeps `intent_received`'s own colour, so a
   *  row that has always been blue does not change appearance for no reason. */
  new: "info",
  /**
   * Claimed and being worked. Matches the raw `sourcing` status's colour
   * deliberately: `?status=sourcing` returns the union of the two, and a filter
   * whose results are one colour above the fold and another below reads as a
   * rendering bug.
   *
   * The distinction from `new` is **ownership, not progress** — claiming an
   * order moves the badge without the lifecycle changing at all — which is why
   * "Managed By" beside it names the admin who now holds it.
   */
  sourcing: "teal",
  /** The sailor is deciding; nothing for this desk to do. */
  awaiting_customer: "warning",
  /** The sailor confirmed — the desk owes the bill. Teal, as `sourcing` is,
   *  because both mean "an admin owns the next move". */
  ready_to_bill: "teal",
};

export function situationVariant(situation: string, status: string): IntentBadgeVariant {
  const derived = SITUATION_VARIANT[situation];
  if (derived) return derived;
  // Then the situation as a status — for every unsplit row the two are the same
  // value — and only then the status itself. That last step is what covers a
  // situation this frontend has not been taught: it must degrade to the row's
  // real colour, not to grey.
  const variant = ORDER_STATUS_BY_KEY[situation]?.variant ?? ORDER_STATUS_BY_KEY[status]?.variant;
  return (variant as IntentBadgeVariant) ?? "neutral";
}

/**
 * The four derived situations, for the status legend.
 *
 * They are **not** statuses, which is why they are here rather than in
 * `ORDER_STATUSES`: that list is the eighteen real lifecycle values, and the
 * sailor and partner apps branch on those. These are read-time splits of two of
 * them, so the legend shows them as their own group.
 */
export interface IntentSituationInfo {
  key: string;
  label: string;
  /** The status it splits, so the legend can say what it is a half of. */
  status: string;
  meaning: string;
  variant: IntentBadgeVariant;
}

export const INTENT_SITUATIONS: IntentSituationInfo[] = [
  {
    key: "new",
    label: "New",
    status: "intent_received",
    meaning: "Nobody has picked this up yet.",
    variant: "info",
  },
  {
    key: "sourcing",
    label: "Sourcing",
    status: "intent_received",
    meaning: "An admin owns it and hasn't sent it for verification.",
    variant: "teal",
  },
  {
    key: "awaiting_customer",
    label: "Awaiting Customer",
    status: "pending_customer_response",
    meaning: "The sailor is deciding on suggested replacements.",
    variant: "warning",
  },
  {
    key: "ready_to_bill",
    label: "Ready to Bill",
    status: "pending_customer_response",
    meaning: "The sailor confirmed; generate the bill.",
    variant: "teal",
  },
];
