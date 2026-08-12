/**
 * The two kinds of work a delivery partner may be authorised for.
 *
 * A partner profile carries `can_verify` and `can_deliver` independently, and
 * most hold both. Which one an order needs follows from its phase:
 *
 * - **verify** — the pre-payment intent funnel. A partner goes to the shop and
 *   reports what is actually in stock.
 * - **deliver** — post-payment fulfilment. A partner collects the goods and
 *   takes them to the vessel.
 *
 * `payment_pending` sits in neither phase: verification is done, but no delivery
 * partner may be assigned until the order is paid.
 *
 * **This file deliberately holds no status→phase table.** That mapping is owned
 * by `orders/assignment_lifecycle.py` (`VERIFY_PHASE_STATUSES` /
 * `DELIVER_PHASE_STATUSES` / `phase_for`), whose own comment reads: *"this is
 * the only place the mapping exists. Do not re-declare these sets elsewhere."*
 * Each picker instead states the capability its own screen needs — the intents
 * review drawer is always a verification surface, the order and express drawers
 * are always delivery surfaces — which needs no table and cannot drift from the
 * backend when a status moves between phases.
 *
 * Server-side filtering is done by `partner/list/?can_verify=` /
 * `?can_deliver=`; see `getPartnersByCapability` in the assignments feature.
 */
export type PartnerCapability = "verify" | "deliver";
