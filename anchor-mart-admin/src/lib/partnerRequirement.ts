/**
 * What kind of partner an order still needs — read from the backend, never
 * worked out here.
 *
 * `needs_verifier_partner` / `needs_delivery_partner` are the canonical answer
 * (`orders/assignment_lifecycle.partner_requirements`), and at most one is ever
 * true. They exist because the question cannot be answered from the fields the
 * admin panel used to read: an order whose only active assignment is a
 * **finished verification** showed `partner_allocated: true` while nobody was
 * bringing the goods to the vessel. A completed verification is provenance, not
 * a live delivery job — so `partner_allocated`, `partner_name` and
 * `active_assignment.status` must not be used to decide what is outstanding.
 *
 * What these flags do **not** answer is whether the admin *may* assign someone.
 * They say the order is short of a partner. An order at `partner_assigned` has
 * its deliverer and reports `false`, yet swapping that partner is a legitimate
 * action; a `delivery_failed` order also reports `false`, because the failed
 * assignment deliberately stays active, and its documented recovery is exactly a
 * reassignment. So this drives *the requirement and its wording*, and the
 * screens keep their own rules about when a picker is offered.
 */

export type PartnerRequirement =
  /** Needs someone who `can_verify` — the pre-payment sourcing phase. */
  | "verify"
  /** Needs someone who `can_deliver` — post-payment fulfilment. */
  | "deliver"
  /** Nothing outstanding: already served, awaiting payment, or terminal. */
  | "none"
  /** The API did not send the flags — reported, never guessed at. */
  | "unknown";

/**
 * Reads one flag off a payload. `null` means **absent**, which is deliberately
 * distinct from `false`: the backend documents these as booleans that are never
 * null, so a missing one is a contract problem to surface rather than a quiet
 * "nothing needed".
 */
export function readPartnerNeed(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function partnerRequirement(
  needsVerifier: boolean | null | undefined,
  needsDelivery: boolean | null | undefined,
): PartnerRequirement {
  if (typeof needsVerifier !== "boolean" || typeof needsDelivery !== "boolean") return "unknown";
  if (needsVerifier) return "verify";
  if (needsDelivery) return "deliver";
  return "none";
}
