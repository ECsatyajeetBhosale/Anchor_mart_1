# Order / Intent Status Reference

> Source of truth for order (intent) lifecycle statuses, provided by the PM.
> Use these **exact** status keys and display labels when implementing any
> order/intent feature (Intents, Orders, Assignments, Verification, etc.).
> Do not invent new labels or keys — map UI to this list.

The `status` key (in parentheses) is the backend value. The number is the
canonical display order. "Actor" is who the order is waiting on in that state.

| # | Status key | Display label | Actor / who acts next | Meaning |
|---|---|---|---|---|
| 1 | `intent_received` | Intent Received | Admin | The instant the sailor taps **Confirm Intent**. Order exists but isn't paid and admin hasn't acted yet. **Default state.** |
| 2 | `pending_intent` | Pending Intent | Admin | Intent is parked/on hold — received but not yet moved into active sourcing. Review queue before an admin picks it up. |
| 3 | `sourcing` | Sourcing | Admin | Admin has started working the intent, checking business/partner stores for the requested items. |
| 4 | `partner_verifying` | Partner Verifying | Delivery Partner | A delivery partner has been assigned and is physically checking item availability at the store. |
| 5 | `verification_submitted` | Verification Submitted | Admin | Partner submitted the availability report. Admin reviews it to decide whether to bill, suggest substitutes, or reject. |
| 6 | `pending_customer_response` | Pending Customer Response | **Customer** | Some items were unavailable. Admin released substitute suggestions and is waiting for the sailor to accept/decline. |
| 7 | `payment_pending` | Payment Pending | **Customer** | Availability finalized and the bill/payment link is ready. Waiting for the sailor to complete payment. |
| 8 | `payment_received` | Payment Received | System (auto) | Payment successfully received. Brief transitional state that auto-advances to Order Confirmed. |
| 9 | `order_confirmed` | Order Confirmed | Admin | Payment confirmed. Order is committed and being prepared while awaiting partner assignment. |
| 10 | `partner_assigned` | Partner Assigned | Delivery Partner | Admin assigned a delivery partner who is heading to the store to collect items. Internal operational stage. |
| 11 | `items_collected` | Items Collected | Delivery Partner | Partner collected all items and is on the way to the vessel. Pickup completed; **cancellation is no longer allowed.** |
| 12 | `at_port` | At Port | Delivery Partner | Partner arrived at the port/terminal with the collected items. |
| 13 | `at_berth` | At Berth | Delivery Partner | Partner reached the vessel's berth and is ready to hand over the items. |
| 14 | `delivered` | Delivered | — | Delivery completed and handover (incl. proof of delivery) finished. **Terminal state.** |
| 15 | `delivery_failed` | Delivery Failed | Admin | Delivery could not be completed. Awaits either a retry (partner reassignment) or a refund. |
| 16 | `intent_rejected` | Intent Rejected | — | Admin could not fulfil the request — nothing sourceable or no substitute accepted. **Terminal state.** |
| 17 | `cancelled` | Cancelled | — / System | Cancelled by the sailor within the allowed window, or by admin before completion. If already paid, proceeds to refund. |
| 18 | `refunded` | Refunded | — | Payment returned after a paid cancellation, delivery failure, or manual admin refund. **Terminal state.** |

## Groupings (for badges, filters, KPI cards)

- **Customer action required:** `pending_customer_response`, `payment_pending`
- **Auto/transitional:** `payment_received` (auto-advances to `order_confirmed`)
- **Cancellation cutoff:** allowed up to (but not including) `items_collected`; once `items_collected`, cancellation is blocked.
- **Terminal states:** `delivered`, `intent_rejected`, `refunded` (and `cancelled` when no payment was made).
- **Recoverable failure:** `delivery_failed` → retry (reassign partner) or `refunded`.

## Suggested StatusBadge variant mapping

Render every status through `StatusBadge` (per `DESIGN_RULES.md` / CLAUDE.md — never a bare colored span):

| Variant | Statuses |
|---|---|
| `success` (green) | `payment_received`, `order_confirmed`, `delivered` |
| `warning` (amber) | `pending_intent`, `sourcing`, `partner_verifying`, `partner_assigned`, `items_collected`, `at_port`, `at_berth` |
| `info` (blue) | `intent_received`, `verification_submitted` |
| `purple` / attention | `pending_customer_response`, `payment_pending` (customer action required) |
| `danger` (red) | `delivery_failed`, `intent_rejected`, `cancelled` |
| `neutral` | `refunded` |

> The variant mapping is a recommendation to keep badges consistent — confirm
> against `DESIGN_RULES.md` and adjust if the design system dictates otherwise.
> The **status keys and labels above are authoritative and must not change.**
