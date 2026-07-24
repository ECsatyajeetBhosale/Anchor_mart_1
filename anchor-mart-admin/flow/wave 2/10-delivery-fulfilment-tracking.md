# Flow 10 — Delivery Fulfilment & Order Tracking

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`10-delivery-fulfilment-tracking-validation.md`](./10-delivery-fulfilment-tracking-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

---

# Executive Summary

| | |
|---|---|
| **Flow Name** | Delivery Fulfilment & Order Tracking |
| **Business Objective** | Move paid goods to the vessel and keep the sailor informed |
| **Flow Type** | Core |
| **Primary Actors** | Delivery Partner · Customer · Admin · Background System |
| **Platforms** | `PARTNER` · `SAILOR` · `ADMIN` · `SYS` · SMTP · FCM |
| **Django Apps** | `partner_app` (`delivery_views.py`) · `orders` (`item_lifecycle`, `slip_service`, `event_handlers`) · `catalog` (`purchase_count`) · `promotion` (gift) |
| **Models** | `DeliveryAssignment`, `ProofOfDelivery`, `Order`, `OrderItem`, `OrderStatusHistory`, `ProductPurchase`, `OrderGift` |
| **State machines** | `Order.Status` (transit ladder) **and** `OrderItem.Status` (per-line delivered/not) |
| **Total APIs** | **10** (8 partner · 1 customer · 1 admin slip, shared) |
| **Previous Flow** | Flow 28 — order reaches `partner_assigned` with an active assignment |
| **Next Flow** | Flow 16/36 — ratings (delivery email carries the prompt) |
| **Documentation Version** | 1.1 — 2026-07-21 (F-01/F-02 fixed post-audit; tables reflect current behaviour) |
| **Documentation Status** | ✅ 10 of 10 routes documented, verified against the running route table |

> **Scope.** The partner *executing* a delivery, plus the sailor *tracking* it. Assignment and
> the admin boards are **Flow 28**; stock verification is **Flow 6**; ratings are **Flow 16**;
> the delta hold that can pause a handover is priced in **Flow 11**.

---

# Phase 1 — Understand the Flow

## The transit ladder

A partner drives their **own active assignment** through a guarded status chain:

```
partner_assigned → items_collected → at_port → at_berth → delivered
                                                        ↘ delivery_failed
                                                        ↘ partially_delivered ⟳ (resumable)
```

- **Intermediate stages** (`items_collected` / `at_port` / `at_berth`) go through **one**
  endpoint (`advance/`) with a whitelist — `delivered` and `delivery_failed` are **deliberately
  not reachable there**, so a partner can't skip the proof step by posting `delivered`.
- Every hop runs through the guarded `transition_order`, so an **out-of-order** stage returns
  **409** (the ladder order is enforced centrally, not by the view).
- Ownership is the **assignment**: every action resolves the partner's *own active*
  `DeliveryAssignment` for the order, so a partner can never act on an order that isn't theirs.

## The delivery outcome — judged across all billable lines

`deliver/` records **one trip**: a mandatory photo + receiver name, and optionally per-line
outcomes. The order status is then judged across **all billable lines** (`UNAVAILABLE` lines
were dropped from the bill and are ignored):

| Outcome across billable lines | Order becomes |
|---|---|
| All delivered | `delivered` |
| None delivered | `delivery_failed` (nothing arrived → the full-refund policy is correct) |
| Some delivered | `partially_delivered` |

Omitting `items` means "everything outstanding was handed over" (the common case).

## Partial delivery is resumable (#13)

`partially_delivered` stays **deliverable** and the **assignment stays active** — the partner
can return with the rest before the vessel sails, and a completing trip flips
`partially_delivered → delivered`. **Each trip records its own `ProofOfDelivery`** (one row per
trip, not per order). The order outcome is re-judged across all lines every trip, so the return
trip that clears the stragglers completes the order.

## The delta hold (#10)

Final handover is **blocked (409)** while the sailor owes an **unpaid delivery surcharge** (a
delta — the ship moved, Flow 11). Earlier stages (collect / at_port / at_berth) stay open,
because a delta can be raised mid-transit and the partner may already be en route. The hold
lifts when the sailor pays the delta (or an admin withdraws it, or none was raised).

## Replay safety (#33)

A repeat `deliver/` POST that would change nothing is treated as a **retry, not a second trip**:
detected *before any write*, it returns the existing proof with `duplicate: true` rather than
writing a second `ProofOfDelivery`, publishing a second `order_delivered`, or appending duplicate
history. This matters because `partially_delivered` deliberately keeps the assignment active.

## What "delivered" triggers (all atomic / idempotent)

Inside the delivery transaction:
- **`order_delivered` is published to the outbox** (#18) — "delivered" and "the sailor must be
  told" commit as one fact; fan-out (in-app + admin + the rating-prompt email) runs on-commit in
  `orders/event_handlers.py`.
- The **assignment closes** centrally (`is_active=False`, `status=delivered`, `completed_at`)
  via `transition_order → assignment_lifecycle` (#31) — **only on a full delivery**; a partial
  keeps the partner on the job.
- The **surprise gift** (if any) is handed over — **only on a full delivery** (#28).

After commit, the `order_delivered` handler **credits purchase counts** (`record_delivered_purchases`
— idempotent per `(user, product)`, so a partial+return can't double-count), sends the in-app
notifications, and — except on a failed delivery — the **delivery email carrying the
rate-delivery / rate-app deep links**.

## Milestones on the assignment (#31)

The assignment stamps `first_action_at` (write-once — the partner's first affirmative act, for
response time), `picked_up_at`, `completed_at`, and `failed_at`. These used to live only in
`OrderStatusHistory`, which the 180-day pruner deletes — recording them on the assignment makes a
partner's record self-describing and permanent (feeds Flow 28 KPIs).

## Customer tracking

The sailor watches the **same milestone ladder** the admin sees (`build_delivery_steps`, shared
builder) via `track/` — steps marked done/active/pending with timestamps, the ETA (`deliver_by`),
the terminal state, and proof(s) once delivered.

---

# Phase 2 — Discover the Complete Flow

```
Flow 28 → order = partner_assigned, active DeliveryAssignment to this partner

PARTNER
  ├─ GET  /partner/orders/                queue (tabs: all|new|in_progress|express|delivered|failed)
  ├─ GET  /partner/orders/detail/         one order
  ├─ GET  /partner/orders/items/          its line items
  ├─ GET  /partner/orders/<id>/slip/      picking-slip PDF (any assignment of theirs)
  │
  ├─ POST /partner/orders/reject/         {order_id, reason}  — only before work starts → admin reassigns
  ├─ POST /partner/orders/advance/        {order_id, to_status ∈ items_collected|at_port|at_berth}
  │        └─ items_collected → assignment PICKED_UP + notify "on the way"
  ├─ POST /partner/orders/deliver/        {order_id, photo, received_by_name, handover_note?, items?}
  │        ├─ 409 unless status ∈ {at_berth, partially_delivered}
  │        ├─ 409 delivery blocked by unpaid delta
  │        ├─ replay (nothing changes) → 200 {duplicate:true}
  │        └─ judge all billable lines → delivered | delivery_failed | partially_delivered
  │             ├─ ProofOfDelivery (per trip) · publish order_delivered (atomic)
  │             ├─ full delivery → close assignment + hand over gift
  │             └─ (on_commit) purchase counts · notifications · delivery email + rating links
  └─ POST /partner/orders/report-failed/  {order_id, reason} → delivery_failed (assignment stays active)

SAILOR
  └─ GET  /orders/<id>/track/             milestone ladder + ETA + proof(s)   (shared builder)

ADMIN
  └─ GET  /superadmin/orders/order/<id>/slip/   same picking-slip PDF (any order)
```

## API sequence table

| Step | Platform | API |
|---|---|---|
| 1 | PARTNER | `GET /api/partner/orders/` |
| 2 | PARTNER | `GET /api/partner/orders/detail/` |
| 3 | PARTNER | `GET /api/partner/orders/items/` |
| 4 | PARTNER | `GET /api/partner/orders/<order_id>/slip/` |
| 5 | PARTNER | `POST /api/partner/orders/reject/` |
| 6 | PARTNER | `POST /api/partner/orders/advance/` |
| 7 | PARTNER | `POST /api/partner/orders/deliver/` |
| 8 | PARTNER | `POST /api/partner/orders/report-failed/` |
| 9 | SAILOR | `GET /api/orders/<order_id>/track/` |
| 10 | ADMIN | `GET /api/superadmin/orders/order/<order_id>/slip/` |

---

# Phase 3 — API Documentation

## Flow-wide conventions

| Header | Notes |
|---|---|
| `Authorization: Token <key>` | All 10 |
| `server-secret-key` | `/api/partner/…` and `/api/orders/…`; **`/api/superadmin/…` exempt** |

- Partner endpoints: `[IsAuthenticated, IsDeliveryPartner]`, scoped to the partner's **own active
  assignment** (`_active_assignment` → 404 if not theirs). The slip uses **any** of their
  assignments (so a delivered order's slip is still downloadable).
- `InvalidOrderTransition` / `InvalidItemTransition` map centrally to **409**.

---

## APIs 1–3 · The partner's delivery queue

| API | Endpoint | View | Notes |
|---|---|---|---|
| 1 | `GET /api/partner/orders/` | `PartnerOrderList` | `?tab=` **`all` · `new` · `in_progress` · `express` · `delivered` · `failed`** (bad tab → 400) · `?search=` (order no / sailor). Header counts per tab; sorted by ship arrival |
| 2 | `GET /api/partner/orders/detail/?order_id=` | `PartnerOrderDetail` | One assigned order |
| 3 | `GET /api/partner/orders/items/?order_id=` | `PartnerOrderItems` | Its line items |

---

## API 4 · Picking-slip PDF (partner)

`GET /api/partner/orders/<order_id>/slip/` · `PartnerDownloadOrderSlipView`. Streams a generated
PDF (`attachment`). Scoped to **any** assignment of the caller's — **404** otherwise. Generated
per request (never stale); a missing PDF backend fails *this* endpoint with a 500, not the app.
*(Admin equivalent: API 10.)*

---

## API 5 · Reject an assignment

`POST /api/partner/orders/reject/` · `RejectAssignmentView` — `{order_id, reason}` (reason
required, non-blank). Allowed **only before work starts** (`partner_verifying` /
`partner_assigned`) — else **400**. Deactivates the assignment (`status=rejected`), keeps the
**order status unchanged** so Flow 28's reassign picks it up, and notifies the assigning admin.

---

## API 6 · Advance a transit stage

`POST /api/partner/orders/advance/` · `AdvanceDeliveryStageView` —
`{order_id, to_status}` where `to_status ∈ {items_collected, at_port, at_berth}` (anything else,
incl. `delivered`/`delivery_failed`/a backward hop → **400**). `items_collected` also stamps the
assignment `picked_up_at`/`PICKED_UP` and notifies the sailor "on the way". An out-of-order stage
→ **409** (via `transition_order`).

**Success — 200** — `{ "message": "Order marked at berth.", "order_status": "at_berth" }`.

---

## API 7 · Record a delivery (proof + outcome)

| Field | Value |
|---|---|
| **Endpoint** | `/api/partner/orders/deliver/` · `POST` |
| **View** | `DeliverOrderView` · serializer `DeliverOrderSerializer` |

**Request Body**
```json
{
  "order_id": "…",
  "photo": "proof_of_delivery/abc.jpg",
  "received_by_name": "First Officer Rao",
  "handover_note": "left with the deck crew",
  "items": [ { "order_item_id": "…", "delivered": true, "note": "" } ]
}
```

| Field | Required | Rules |
|---|---|---|
| `photo` | ✅ | Must start `proof_of_delivery/` (Flow 26 prefix rule) |
| `received_by_name` | ✅ | Non-blank |
| `handover_note` | ✖ | |
| `items` | ✖ | **Omit** → everything outstanding delivered. If given: per-line `{order_item_id, delivered, note?}`, no duplicate ids, ids must be billable lines on this order |

**Preconditions** — 409 unless status ∈ `{at_berth, partially_delivered}`; 409 if an **unpaid
delta** blocks handover; 400 if the order has no billable lines or `items` names a non-billable id.

**Success — 201** (or **200** with `duplicate: true` on a replay):
```json
{
  "message": "3 of 5 items on order AM… were delivered. We'll try to bring the remaining 2 before you sail.",
  "order_status": "partially_delivered",
  "delivered_count": 3, "total_items": 5, "undelivered_count": 2,
  "proof": { "received_by_name": "…", "photo": "https://…", "delivered_at": "2026-07-21T…" }
}
```

**Side effects** (one transaction): per-line `transition_order_item`, order transition,
`ProofOfDelivery`, `publish(order_delivered)`; on a **full** delivery the assignment closes and
the gift is handed over. After commit: purchase counts, notifications, delivery/rating email.

---

## API 8 · Report a failed delivery

`POST /api/partner/orders/report-failed/` · `ReportDeliveryFailedView` — `{order_id, reason}`
(required). Order → `delivery_failed`; the assignment **stays active** and `failed_at` is stamped
(the documented recovery is admin reassign or refund). Sailor and admin are both notified. No
proof needed (nothing arrived).

---

## API 9 · Track order (customer)

`GET /api/orders/<order_id>/track/` · `TrackOrderView` — ownership-scoped.

**Success — 200**
```json
{
  "order_number": "AM…", "current_status": "at_berth", "current_status_display": "At Berth",
  "deliver_by": "July 21, 2026, 03:00 PM",
  "steps": [ { "key": "items_collected", "label": "…", "state": "done", "at": "…" }, … ],
  "terminal_state": null,
  "proof_of_delivery": null,
  "proofs": []
}
```
`steps` is the shared milestone ladder (same builder as Flow 28's admin timeline). Internal
status-history notes are **not** exposed. `proofs` lists every trip's proof once delivered
(`proof_of_delivery` is the latest, kept for backward compatibility).

---

## API 10 · Picking-slip PDF (admin)

`GET /api/superadmin/orders/order/<order_id>/slip/` · `AdminDownloadOrderSlipView`. Same PDF as
API 4, for **any** order (admin scope). One document, two audiences — shared template + service.

---

## Background hooks (SYS)

| Hook | When | Effect |
|---|---|---|
| `handle_order_delivered` | `order_delivered` published (on-commit) | Credit purchase counts · in-app notify (sailor + admins) · delivery email with **rate-delivery / rate-app** deep links (skipped on a failed delivery) |
| `record_delivered_purchases` | inside the handler | One `ProductPurchase` per `(user, product)` + `purchase_count += 1` — **idempotent** (a partial+return trip can't double-credit) |
| `assignment_lifecycle` | `transition_order → delivered` | Closes the assignment (`completed_at`) — full delivery only |
| `mark_gift_delivered` | full delivery | Hands over the surprise gift (#28) |

---

## What happens next

| Outcome | Next |
|---|---|
| `delivered` (terminal) | **Flow 16** — the delivery email prompts a rating; KPIs (Flow 28) update |
| `partially_delivered` | Resumable — the partner returns with the rest |
| `delivery_failed` | Admin reassigns (retry) or refunds (**Flow 12** — full refund, no time gate) |
| Handover blocked by delta | **Flow 11** — sailor pays the surcharge, hold lifts |

---

## Source reference

| Concern | Location |
|---|---|
| Partner delivery views | `partner_app/views/delivery_views.py` |
| Partner queue | `partner_app/views/order_views.py` (`PartnerOrderList`) |
| Slips | `orders/slip_views.py`, `orders/slip_service.py` |
| Proof model | `orders/models.py:864` (`ProofOfDelivery`) |
| Item state machine | `orders/item_lifecycle.py` (`transition_order_item`) |
| Delivered fan-out | `orders/event_handlers.py:191` (`handle_order_delivered`) |
| Purchase counts | `catalog/purchase_count.py` (`record_delivered_purchases`) |
| Milestone builder | `orders/timeline.py` (`build_delivery_steps`, shared with Flow 28) |
| Customer track | `orders/customer_views.py` (`TrackOrderView`) |
| Delta hold | `orders/deltas.py` (`delivery_blocked_by_unpaid_delta`) |
