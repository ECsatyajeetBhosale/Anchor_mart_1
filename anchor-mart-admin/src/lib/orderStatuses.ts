import type { BadgeProps } from "@/components/ui/badge";

/**
 * Canonical order/intent status reference — the single source of truth for the
 * 19 lifecycle statuses, mirroring `docs/ORDER_STATUSES.md` (PM-provided).
 *
 * `partially_delivered` joined on 2026-08-19 with per-unit delivery; the four
 * statuses after it were renumbered rather than given a fractional `order`,
 * which the legend would have rendered literally.
 *
 * `key` and `label` are authoritative and must not change. `order` is the
 * canonical display order. `actor` is who the order is waiting on. `meaning` is
 * the plain-language explanation shown in the status legend. `variant` is the
 * StatusBadge/Badge colour.
 *
 * Consume this everywhere order/intent statuses are labelled, ordered, coloured,
 * or explained (Intents, Orders, Assignments, Verification) — never re-declare
 * status keys/labels inline.
 */
export interface OrderStatusInfo {
  order: number;
  key: string;
  label: string;
  actor: string;
  meaning: string;
  variant: BadgeProps["variant"];
}

export const ORDER_STATUSES: OrderStatusInfo[] = [
  {
    order: 1,
    key: "intent_received",
    label: "Intent Received",
    actor: "Admin",
    meaning:
      "The instant the sailor taps Confirm Intent. The order exists but isn't paid, and admin hasn't acted yet. (Default state.)",
    variant: "info",
  },
  {
    order: 2,
    key: "pending_intent",
    label: "Pending Intent",
    actor: "Admin",
    meaning:
      "Intent is parked/on hold. It has been received but hasn't yet moved into active sourcing. (Review queue before an admin picks it up.)",
    variant: "neutral",
  },
  {
    order: 3,
    key: "sourcing",
    label: "Sourcing",
    actor: "Admin",
    meaning:
      "Admin has started working on the intent by checking business/partner stores for the requested items.",
    variant: "teal",
  },
  {
    order: 4,
    key: "partner_verifying",
    label: "Partner Verifying",
    actor: "Delivery Partner",
    meaning:
      "A delivery partner has been assigned and is physically checking item availability at the store.",
    variant: "info",
  },
  {
    order: 5,
    key: "verification_submitted",
    label: "Verification Submitted",
    actor: "Admin",
    meaning:
      "The partner has submitted the availability report. Admin now reviews it to decide whether to bill, suggest substitutes, or reject the request.",
    variant: "teal",
  },
  {
    order: 6,
    key: "pending_customer_response",
    label: "Pending Customer Response",
    actor: "Customer",
    meaning:
      "Some items were unavailable. Admin has released substitute suggestions and is waiting for the sailor to accept or decline them. (Customer action required.)",
    variant: "warning",
  },
  {
    order: 7,
    key: "payment_pending",
    label: "Payment Pending",
    actor: "Customer",
    meaning:
      "Item availability has been finalized and the bill/payment link is ready. Waiting for the sailor to complete payment. (Customer action required.)",
    variant: "warning",
  },
  {
    order: 8,
    key: "payment_received",
    label: "Payment Received",
    actor: "System (auto)",
    meaning:
      "Payment has been successfully received. This is a brief transitional state that automatically advances to Order Confirmed.",
    variant: "success",
  },
  {
    order: 9,
    key: "order_confirmed",
    label: "Order Confirmed",
    actor: "Admin",
    meaning:
      "Payment has been confirmed. The order is now committed and is being prepared while awaiting partner assignment.",
    variant: "success",
  },
  {
    order: 10,
    key: "partner_assigned",
    label: "Partner Assigned",
    actor: "Delivery Partner",
    meaning:
      "Admin has assigned a delivery partner, who is heading to the store to collect the items. (Internal operational stage.)",
    variant: "info",
  },
  {
    order: 11,
    key: "items_collected",
    label: "Items Collected",
    actor: "Delivery Partner",
    meaning:
      "The delivery partner has collected all items and is on the way to the vessel. (Pickup completed; cancellation is no longer allowed.)",
    variant: "teal",
  },
  {
    order: 12,
    key: "at_port",
    label: "At Port",
    actor: "Delivery Partner",
    meaning: "The delivery partner has arrived at the port or terminal with the collected items.",
    variant: "teal",
  },
  {
    order: 13,
    key: "at_berth",
    label: "At Berth",
    actor: "Delivery Partner",
    meaning:
      "The delivery partner has reached the vessel's berth and is ready to hand over the items.",
    variant: "teal",
  },
  {
    order: 14,
    key: "delivered",
    label: "Delivered",
    actor: "—",
    meaning:
      "Delivery has been completed and the handover (including proof of delivery) is finished. (Terminal state.)",
    variant: "success",
  },
  {
    // Added 2026-08-19 with per-unit delivery: a line of 2 with 1 handed over
    // is finally expressible, so this is where such an order sits. Sequenced
    // beside `delivered` because it is the same handover, incomplete.
    order: 15,
    key: "partially_delivered",
    label: "Partially Delivered",
    actor: "Partner",
    meaning:
      "Some items were handed over; the partner can return with the rest until the vessel sails. Once it has, the remainder can never arrive and an admin has to refund the undelivered value.",
    // Needs attention, but it is not a failure — the partner may still finish.
    variant: "warning",
  },
  {
    order: 16,
    key: "delivery_failed",
    label: "Delivery Failed",
    actor: "Admin",
    meaning:
      "Delivery could not be completed. The order now awaits either a retry (partner reassignment) or a refund.",
    variant: "danger",
  },
  {
    order: 17,
    key: "intent_rejected",
    label: "Intent Rejected",
    actor: "—",
    meaning:
      "Admin could not fulfil the request because nothing was sourceable or no substitute was accepted. (Terminal state.)",
    variant: "danger",
  },
  {
    order: 18,
    key: "cancelled",
    label: "Cancelled",
    actor: "— / System",
    meaning:
      "The order was cancelled by the sailor within the allowed window or by admin before completion. If payment was already made, the order proceeds to refund.",
    variant: "danger",
  },
  {
    order: 19,
    key: "refunded",
    label: "Refunded",
    actor: "—",
    meaning:
      "The customer's payment has been returned after a paid cancellation, delivery failure, or a manual admin refund. (Terminal state.)",
    variant: "neutral",
  },
];

/** Lookup a status by its backend key. */
export const ORDER_STATUS_BY_KEY: Record<string, OrderStatusInfo> = Object.fromEntries(
  ORDER_STATUSES.map((s) => [s.key, s]),
);
