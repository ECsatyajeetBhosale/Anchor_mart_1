# Flow 07 — Order Billing & Payment

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`07-order-billing-payment-validation.md`](./07-order-billing-payment-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

---

# Executive Summary

| | |
|---|---|
| **Flow Name** | Order Billing & Payment |
| **Business Objective** | Convert a verified order into a settled payment |
| **Flow Type** | Core |
| **Primary Actors** | Admin · Customer · Background System (Stripe webhook) |
| **Platforms** | `ADMIN` · `SAILOR` · `SYS` · Stripe · SMTP · Twilio · FCM |
| **Django Apps** | `admin_panel` (`payment_views.py`) · `orders` (`payments_service.py`, `stripe_service.py`, `webhook_views.py`, `discounts.py`) · `messaging` · `notifications` |
| **Models** | `Order`, `Payment`, `PaymentAttempt`, `DeltaPayment` (webhook only), `OutboxEvent`, `AuditLog` |
| **Services** | `apply_fees` · `mark_payment_pending` · `create_or_reuse_session` · `cancel_open_sessions` · `settle_free_order` · `redeem_on_payment` / `release_points` (Flow 8) |
| **State Machine** | `Order.Status`: `…pre-confirmation → PAYMENT_PENDING → PAYMENT_RECEIVED → ORDER_CONFIRMED`, every hop through `transition_order` |
| **Total APIs** | **9** (3 admin · 5 customer · 1 webhook) |
| **Previous Flow** | Flow 6 — `substitutions_confirmed_at` stamped with a positive subtotal |
| **Next Flow** | Flow 10 — Delivery Fulfilment (order at `order_confirmed`) |
| **Documentation Version** | 1.1 — 2026-07-21 (findings F-02…F-07 fixed post-audit; see validation report) |
| **Documentation Status** | ✅ 9 of 9 routes documented, verified against the running route table |

> **Behaviour changed 2026-07-21 — six validation findings were fixed after the audit.** Two
> affect what this document describes: **generate-link** now runs under a row lock like its
> siblings (API 3), and a **genuine session expiry now notifies the sailor** (API 9). The
> other four were tests/comments/logging. The one open item (**F-01**, billing before
> verification) is a product decision tracked with Flow 6 FH2 — behaviour is unchanged.

> **Two ways to pay, one settlement.** The admin can either just **create the bill** (order
> → `PAYMENT_PENDING`, customer pays in-app) **or** additionally **generate a Stripe link**
> and send it. Either way, money settles through **one webhook** (`checkout.session.completed`)
> that is shared with flows 9, 11 and 13. Zero-total orders (fully covered by coupon/points)
> settle **without Stripe** through the same state-machine hops.

---

# Phase 1 — Understand the Flow

## Business purpose

An order does not become money until an admin finalises a bill against it and the customer
pays. Billing is deliberately **decoupled** from link generation: the admin sets the fee
breakdown once (`create-bill`), and payment can then happen through a Stripe Checkout link
the admin sends, **or** the customer paying in-app — both mint the same kind of Checkout
session and settle through the same webhook. Nothing in this flow ever charges a card
directly; Stripe hosts the payment page and calls us back.

## Entry / Exit

| | |
|---|---|
| **Entry** | A pre-confirmation order (Flow 6 exit: `substitutions_confirmed_at` set, or an order that never needed substitutions) |
| **Success** | `payment_status = completed`, order at `order_confirmed`, `PAYMENT_RECEIVED` published → receipt fan-out |
| **Zero-total** | Coupon/points cover the total → settled without Stripe, same state hops |
| **Blocked** | Already paid (409) · confirmed or later (400) · unanswered released suggestions (409) · substitutions not confirmed (409) · total ≤ 0 at bill time (400) |

## The billing guard — `_billable_or_error`

Three admin endpoints share **one** guard (`payment_views.py:47-74`). An order is billable
only when **all** hold:

| Check | Failure |
|---|---|
| `payment_status != COMPLETED` | 409 "This order is already paid." |
| `status ∈ PRE_CONFIRMATION_STATUSES` | 400 "Payment can only be requested before the order is confirmed." |
| No pending **released** suggestions | 409 "The customer hasn't responded to all substitution suggestions yet." |
| If `PENDING_CUSTOMER_RESPONSE`: `substitutions_confirmed_at` is set | 409 "The customer hasn't confirmed their substitution choices yet." |

> **`PRE_CONFIRMATION_STATUSES` is broad** (`payment_views.py:27-35`): `intent_received`,
> `pending_intent`, `sourcing`, `partner_verifying`, `verification_submitted`,
> `pending_customer_response`, `payment_pending`. Billing does **not** require that stock
> was ever verified — an admin may bill straight from `intent_received`. The docstring says
> so explicitly: *"Admin may request payment at ANY stage BEFORE the order is confirmed."*
> The consequence for un-verified orders is examined in the validation report (**F-01**).

## Three admin billing endpoints, one purpose split three ways

| Endpoint | Does | Stripe link? | Re-billing |
|---|---|---|---|
| `create-bill` | Set fees, → `PAYMENT_PENDING`, notify | **No** | **409 if already `PAYMENT_PENDING`** — "update it instead" |
| `update-bill` | Recompute the pending bill, void any open link, re-notify | **No** (expires any) | Only while `PAYMENT_PENDING` |
| `generate-link` | Set fees, → `PAYMENT_PENDING`, mint/reuse a Stripe link | **Yes** | Re-generates while pending (reuse-if-open) |

`create-bill` and `generate-link` are **not** interchangeable calls of the same operation:
`create-bill` refuses to run twice (an existing pending bill must be *updated*), while
`generate-link` is idempotent-ish (it reuses an open session for the same amount). This is
why they are separate views with separate URLs.

## The money hops through the state machine

Settlement is **two guarded transitions**, never a direct write:

```
PAYMENT_PENDING ──▶ PAYMENT_RECEIVED ──▶ ORDER_CONFIRMED
```

Both the webhook (`_handle_completed`) and the zero-total path (`settle_free_order`) run
these same two `transition_order` hops inside one row-locked transaction, so the ledger,
the status history, and the coupon redemption all commit together or not at all.

## Fees vs. subtotal — who computes what

`GeneratePaymentLinkSerializer` accepts **only** the fee breakdown (`shipping_fee`,
`tax_amount`, `platform_fee`). It **never** accepts `subtotal` — the system computes that
from the order's products (`sync_order_subtotal`, Flow 6's `compute_subtotal`). `apply_fees`
writes the admin's fee fields, then `recompute_order_totals` (Flow 8) folds in any applied
coupon/points and produces `total_amount`. Coupons and points are **not** part of this
serializer — the sailor applies those separately, at `PAYMENT_PENDING`, through Flow 8.

## One open session per order

A `Payment(kind=initial)` row carries the Stripe Checkout session. **At most one may be
`session_status=open`** — enforced both by application logic (`create_or_reuse_session`
locks the order row for the whole reuse-or-create decision) and by a partial unique index
(`uniq_open_initial_payment_per_order`, `models.py:970-974`). The reuse rule:

- Open session, **same** amount, has a URL → **reuse it** (no re-notify).
- Open session, **different** amount → **expire it on Stripe**, create a fresh one.
- No open session → create one.

Links expire after `PAYMENT_LINK_EXPIRY_HOURS`, clamped strictly under Stripe's 24 h limit
(`now + 24h − 5 min`); `payment_due_at` is aligned to the link expiry.

## Zero-total settlement (no Stripe)

If coupon/points drive `total_amount` to `0`, `PayOrderView` calls `settle_free_order`
instead of Stripe (`payments_service.py:60-91`): mark paid, run the same two transitions,
redeem the coupon, and publish `PAYMENT_RECEIVED` **with `zero_total: true`** so the receipt
does not claim money was taken. Row-locked and idempotent.

## The webhook — the single settlement point

`StripeWebhookView` (public, no auth, exempt from `ServerSecurityMiddleware`; authenticity
is the **Stripe signature** only). It handles three event types:

| Event | Handler | Effect |
|---|---|---|
| `checkout.session.completed` | `_handle_completed` | **Delta first** (settle the surcharge, leave order untouched), else confirm the order: mark paid, two transitions, redeem coupon, publish `PAYMENT_RECEIVED` **inside the transaction** |
| `checkout.session.expired` | `_handle_expired` | For a session still **open** on our side (a genuine Stripe expiry): mark it `expired`; if the order is unpaid, **release reserved points** and **notify the sailor** the link expired. A session we already closed ourselves (admin re-bill / customer cancel) is a no-op *(F-04, 2026-07-21)* |
| `payment_intent.payment_failed` | `_handle_failed` | Record a `PaymentAttempt(FAILED)`, mark the `Payment` failed, **notify the sailor** |

Design guarantees, each load-bearing:

- **Idempotent.** An already-`COMPLETED` order acks and returns; a redelivered failure is a
  no-op (`get_or_create` on the intent id). Any handler exception returns **500 so Stripe
  retries** — safe because the handlers are idempotent.
- **Delta before order-paid.** A delta payment is settled *before* the order-paid
  short-circuit, or the "order already completed" guard would swallow the surcharge
  (`webhook_views.py:91-102`).
- **Receipt owed atomically (#18).** `PAYMENT_RECEIVED` is published to the outbox **inside**
  the same transaction as the confirmation, so "paid" and "receipt owed" are one fact; the
  actual fan-out (in-app + admin inbox + email + WhatsApp) runs `on_commit` in
  `orders/event_handlers.py` — a failing send can never 500 the webhook and lose the receipt.
- **Attempt trail (#34).** The winning attempt is recorded too, so the trail reads "declined,
  declined, succeeded" rather than only listing the failures. The failure handler resolves
  the `Payment` via **intent metadata** (copied onto the PaymentIntent at session creation),
  because `stripe_payment_intent_id` is written only on success.

---

# Phase 2 — Discover the Complete Flow

```
Flow 6 exit ──▶ order pre-confirmation (substitutions_confirmed, or none needed)

ADMIN  (all three writes gated by manage_gate — 409 unclaimed / 403 wrong owner)
  ├─ POST /superadmin/payments/create-bill/     set fees → PAYMENT_PENDING, notify (NO link)
  │    ├─ 409 already paid / already has a pending bill
  │    ├─ 400 confirmed-or-later / total ≤ 0
  │    └─ 409 unanswered or unconfirmed substitutions
  ├─ PUT/PATCH /superadmin/payments/update-bill/  recompute, expire open link, re-notify
  └─ (Note: If this is requirement from client then we should implement this): POST /superadmin/payments/generate-link/    set fees → PAYMENT_PENDING + Stripe link
       └─ reuse OPEN same-amount session, else expire + create   (502 on Stripe error) 

SAILOR  (all scoped to request.user)
  ├─ GET  /orders/<id>/bill/                     fee breakdown + available points
  ├─ GET  /orders/<id>/payment-summary/          bill + items + delivery snapshot
  ├─ (Flow 8) apply/remove coupon + points       only at PAYMENT_PENDING, no open session
  ├─ POST /orders/<id>/pay/                       in-app pay
  │     ├─ total ≤ 0 → settle_free_order (no Stripe) → ORDER_CONFIRMED
  │     └─ else create/reuse session → checkout_url        (502 on Stripe error)
  ├─ GET  /orders/<id>/payment-status/           pollable: paid | pending | expired | refunded
  └─ POST /orders/<id>/cancel-payment/           expire the open session (to change coupon/points)
  │
  ▼  customer completes Stripe Checkout (hosted)
STRIPE ──▶ POST /payments/stripe/webhook/   (signature-verified)
  ├─ checkout.session.completed ─┬─ delta?  → settle DeltaPayment (order untouched)
  │                              └─ else    → ── transaction.atomic (order row-locked) ──┐
  │                                             mark paid · PAYMENT_RECEIVED · ORDER_CONFIRMED │
  │                                             redeem coupon · publish PAYMENT_RECEIVED (#18) │
  │                                          ───────────────────────────────────────────────┘
  │                                             └─ on_commit: receipt fan-out (in-app/admin/email/WA)
  ├─ checkout.session.expired    → session expired; if unpaid → release reserved points
  └─ payment_intent.payment_failed → PaymentAttempt(FAILED) + notify sailor "Payment unsuccessful"
```

## API sequence table

| Step | Platform | API |
|---|---|---|
| 1 | ADMIN | `POST /api/superadmin/payments/create-bill/` |
| 2 | ADMIN | `PUT/PATCH /api/superadmin/payments/update-bill/` |
| 3 | ADMIN |(Note: If this is requirement from client then we should implement this for now do not implement it): `POST /api/superadmin/payments/generate-link/` |
| 4 | SAILOR | `GET /api/orders/<order_id>/bill/` |
| 5 | SAILOR | `GET /api/orders/<order_id>/payment-summary/` |
| 6 | SAILOR | `POST /api/orders/<order_id>/pay/` |
| 7 | SAILOR | `GET /api/orders/<order_id>/payment-status/` |
| 8 | SAILOR | `POST /api/orders/<order_id>/cancel-payment/` |
| 9 | SYS | `POST /api/payments/stripe/webhook/` |

> Coupon / loyalty-point application (`apply-coupon`, `apply-points`, and their removes) sit
> **between steps 5 and 6** but are documented in **Flow 8**, not here — they have their own
> `/api/promotion/` discovery surface and also apply to deltas.

---

# Phase 3 — API Documentation

## Flow-wide conventions

| Header | Notes |
|---|---|
| `Authorization: Token <key>` | All except the webhook |
| `server-secret-key` | `/api/orders/…`; **`/api/superadmin/…` is exempt**; **the webhook is exempt** (Stripe can't send it) |

- Admin endpoints: `[IsAuthenticated, IsAdminUser]` **+ `manage_gate`** (order ownership).
- Customer endpoints: `[IsAuthenticated]`, scoped by `_my_order` (owner-or-404).
- Webhook: `authentication_classes = []`, `AllowAny` — trust comes from `construct_event`
  verifying the Stripe signature. An unverifiable payload is **400**.

---

## API 1 · Create the payment bill (no link)

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/payments/create-bill/` · `POST` |
| **Permissions** | `IsAuthenticated`, `IsAdminUser`, `manage_gate` |
| **View** | `admin_panel/views/payment_views.py` · `CreatePaymentBillView` |

Sets the fee breakdown, moves the order to `PAYMENT_PENDING`, notifies the customer —
**without** a Stripe link. The customer then applies any coupon/points and pays in-app.
Runs under a **row lock** (`select_for_update(of="self")`).

**Request Body**
```json
{ "order_id": "3c9a…", "shipping_fee": "20.00", "tax_amount": "5.00", "platform_fee": "2.00" }
```

| Field | Required | Rules |
|---|---|---|
| `order_id` | ✅ | UUID |
| `shipping_fee` | ✖ | Decimal ≥ 0 |
| `tax_amount` | ✖ | Decimal ≥ 0 |
| `platform_fee` | ✖ | Decimal ≥ 0 |
| `subtotal` | — | **Not accepted** — system-computed from the order's products |

**Success — 200**
```json
{ "message": "Payment bill created. The customer has been notified to pay.",
  "order_id": "…", "order_number": "AM…", "status": "payment_pending", "amount": "97.45" }
```

**Error Responses**

| Status | Condition |
|---|---|
| 400 | Bad/missing `order_id`; total ≤ 0 after fees; order confirmed-or-later |
| 403 | `manage_gate` — order owned by another admin |
| 409 | `manage_gate` — order unclaimed · already paid · **already has a pending bill** ("update it instead") · unanswered/unconfirmed substitutions |
| 404 | Unknown / soft-deleted order |

**Side effects** (one transaction): `sync_order_subtotal`, `apply_fees` + recompute,
`transition_order → PAYMENT_PENDING`, `AuditLog(BILL_GENERATED)`. **After commit:**
`notify_payment_pending.delay` (in-app + email + WhatsApp, no link).

---

## API 2 · Update the pending bill

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/payments/update-bill/` · `PUT` / `PATCH` (both partial) |
| **Permissions** | `IsAuthenticated`, `IsAdminUser`, `manage_gate` |
| **View** | `UpdatePaymentBillView` |

Recomputes the total for the **existing** pending bill, **expires any open payment link**
(the amount may have changed), and re-notifies. Row-locked. Only valid while the order is
`PAYMENT_PENDING`.

**Request Body** — same shape as API 1 (all fields optional; omitted fees are left as-is).

**Success — 200** — same shape as API 1, message "Payment bill updated."

**Error Responses**

| Status | Condition |
|---|---|
| 400 | Total ≤ 0; **order is not `PAYMENT_PENDING`** ("No pending bill to update. Create the bill first.") |
| 403 / 409 | `manage_gate` (wrong owner / unclaimed) |
| 409 | Already paid |

**Side effects:** `apply_fees` + recompute, **`cancel_open_sessions`** (expire every open
Stripe session), `AuditLog(BILL_UPDATED)`, then `notify_payment_pending.delay`.

---

## API 3 · Generate (or reuse) the Stripe link 
Note: For now do not implement it.

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/payments/generate-link/` · `POST` |
| **Permissions** | `IsAuthenticated`, `IsAdminUser`, `manage_gate` |
| **View** | `GenerateOrderPaymentLinkView` |

The "request payment" step. Sets fees, moves the order to `PAYMENT_PENDING`, and mints a
Stripe Checkout link — or **reuses** an open, same-amount one. Sends the link to the
customer via email + WhatsApp + in-app (async, best-effort).

**Request Body** — same as API 1.

**Success — 201** (new link) / **200** (reused)
```json
{ "message": "Payment link generated and sent to the customer.",
  "reused": false, "order_id": "…", "order_number": "AM…",
  "amount": "97.45",
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_…",
  "expires_at": "2026-07-22T09:41:00+00:00" }
```

**Error Responses**

| Status | Condition |
|---|---|
| 400 | Bad `order_id`; total ≤ 0; confirmed-or-later |
| 403 / 409 | `manage_gate` |
| 409 | Already paid; unanswered/unconfirmed substitutions |
| **502** | Stripe provider error (`stripe.StripeError` → "Payment provider error: …") |

**Reuse rule** (`create_or_reuse_session`): open + same `amount` + has `checkout_url` →
reuse (no re-notify); amount changed → expire the old Stripe session, create a new one;
expiry clamped `< 24h`.

> Like API 1, this view wraps its guard + fee-write + transition in a row lock
> (`transaction.atomic` + `select_for_update(of="self")`); the Stripe call and the audit run
> **after** that block, so the session mint keeps its own lock (`create_or_reuse_session`,
> backstopped by `uniq_open_initial_payment_per_order`) and a `StripeError` returns 502 before
> anything is audited. *(Brought in line with its siblings 2026-07-21 — validation F-03.)*

---

## API 4 · The bill (customer)

| Field | Value |
|---|---|
| **Endpoint** | `/api/orders/<order_id>/bill/` · `GET` |
| **Permissions** | `IsAuthenticated` (owner-or-404) |
| **View** | `orders/customer_views.py` · `OrderBillView` |

**Success — 200** — the fee breakdown the admin finalised:
```json
{ "order_id": "…", "order_number": "AM…", "status": "payment_pending",
  "subtotal": "70.45", "shipping_fee": "20.00", "tax_amount": "5.00", "platform_fee": "2.00",
  "coupon_code": null, "coupon_discount": "0.00",
  "loyalty_points_redeemed": 0, "loyalty_discount": "0.00",
  "total_amount": "97.45",
  "available_points": 140, "has_open_payment_session": false }
```

> The docstring says "available once `PAYMENT_PENDING`", but there is **no status guard** —
> reading before billing returns all-zero fees (fields default to `0`). Harmless; see
> validation **F-06**.

---

## API 5 · Payment summary (customer)

| Field | Value |
|---|---|
| **Endpoint** | `/api/orders/<order_id>/payment-summary/` · `GET` |
| **Permissions** | `IsAuthenticated` (owner-or-404) |
| **View** | `PaymentSummaryView` |

The full payment-summary screen: everything in API 4, **plus** `shipping_address`, `port`,
`anchorage`, `is_fastest_delivery`, `ship_arrival_date`, `expected_departure`, and `items`
(each rendered by `CustomerOrderItemSerializer`, including any accepted **substitute** and a
reconciling `line_total`). Prefetches items + variants + suggestions to avoid N+1.

---

## API 6 · Pay in-app (customer)

| Field | Value |
|---|---|
| **Endpoint** | `/api/orders/<order_id>/pay/` · `POST` |
| **Permissions** | `IsAuthenticated` (owner-or-404) |
| **View** | `PayOrderView` |

Creates (or reuses) the Stripe session for the current total and returns the link — the
customer's own path, not requiring the admin to have generated one.

**Preconditions**

| Status | Condition |
|---|---|
| 409 | Already paid |
| 400 | Not `PAYMENT_PENDING` ("This order is not ready for payment."); total not set |

**Success — zero-total (`total_amount <= 0`) — 200** — no Stripe:
```json
{ "settled": true, "amount": "0.00", "order_id": "…",
  "message": "Your order is fully covered — no payment required. Order confirmed." }
```
Runs `settle_free_order` → order `ORDER_CONFIRMED`, coupon redeemed, `PAYMENT_RECEIVED`
published (`zero_total: true`).

**Success — positive total — 201** (new) / **200** (reused):
```json
{ "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_…",
  "reused": false, "amount": "97.45",
  "expires_at": "2026-07-22T09:41:00+00:00", "order_id": "…" }
```

**502** — `stripe.StripeError` → "Payment provider error: …".

---

## API 7 · Payment status (pollable)

| Field | Value |
|---|---|
| **Endpoint** | `/api/orders/<order_id>/payment-status/` · `GET` |
| **Permissions** | `IsAuthenticated` (owner-or-404) |
| **View** | `PaymentStatusView` |

The frontend polls this after the Stripe redirect (or while waiting on the webhook).

**Success — 200**
```json
{ "order_id": "…", "order_number": "AM…",
  "payment_status": "completed",      // pending | completed | failed | refunded
  "order_status": "order_confirmed",
  "is_paid": true, "is_confirmed": true,
  "is_refunded": false, "refund_amount": null, "refunded_at": null,
  "has_open_session": false,
  "session_status": "complete",       // open | complete | expired (latest INITIAL payment)
  "checkout_url": null }               // the live link, only while a session is open
```

`refund_amount` is the summed `refund_amount` across `REFUNDED` payments, present only when
the order itself is `REFUNDED`.

---

## API 8 · Cancel the payment link (customer)

| Field | Value |
|---|---|
| **Endpoint** | `/api/orders/<order_id>/cancel-payment/` · `POST` |
| **Permissions** | `IsAuthenticated` (owner-or-404) |
| **View** | `CancelPaymentView` |

Expires the open Checkout session so the customer can change coupon/points (Flow 8's
`_guard_editable` blocks discount edits while a session is open).

**Success — 200** — `{"message": "Payment link cancelled."}` or `"No active payment link."`

> `cancel_open_sessions` expires **every** open session on the order (initial **and** delta).
> The two windows don't overlap in practice; see validation **F-05**.

---

## API 9 · Stripe webhook

| Field | Value |
|---|---|
| **Endpoint** | `/api/payments/stripe/webhook/` · `POST` |
| **Permissions** | `AllowAny`, no auth, **exempt** from `ServerSecurityMiddleware` |
| **View** | `orders/webhook_views.py` · `StripeWebhookView` |
| **Auth** | The **Stripe signature** (`construct_event`) — invalid → **400** |

Shared by flows 7, 9, 11, 13. Handles `checkout.session.completed` (delta-first, then order
confirmation), `checkout.session.expired` (on a still-open session: release points if unpaid
**+ notify the sailor**), and `payment_intent.payment_failed` (record + notify). **Any handler
exception → 500 so Stripe retries**; handlers are idempotent.

**Responses**

| Status | Meaning |
|---|---|
| 200 | Handled (including deliberate idempotent no-ops and unhandled event types) |
| 400 | Signature verification failed |
| 500 | Handler raised — Stripe will retry with backoff |

**On `checkout.session.completed` for an order** (one row-locked transaction): mark the
`Payment` complete + record the winning `PaymentAttempt`, mark the order `COMPLETED` + stamp
`transaction_id`, `transition_order → PAYMENT_RECEIVED → ORDER_CONFIRMED`,
`redeem_on_payment`, and `publish_event(PAYMENT_RECEIVED, {zero_total: false})` inside the
transaction.

---

## What happens next

| Outcome | Next |
|---|---|
| `order_confirmed` | **Flow 10** — partner assignment & delivery |
| Receipt fan-out | **Flow 22** — transactional messaging (email + WhatsApp) |
| Failed / expired | Customer retries `pay/`, or the admin re-generates the link |
| Refund later | **Flow 12** — cancellation & refund |
| Later re-location | **Flow 11** — delta surcharge (same webhook) |

---

## Source reference

| Concern | Location |
|---|---|
| Admin billing views | `admin_panel/views/payment_views.py` |
| Billing guard | `payment_views.py:47-74` (`_billable_or_error`) |
| Session helpers | `orders/payments_service.py` (`create_or_reuse_session`, `cancel_open_sessions`, `settle_free_order`, `mark_payment_pending`, `apply_fees`) |
| Stripe wrapper | `orders/stripe_service.py` |
| Webhook | `orders/webhook_views.py` (`StripeWebhookView`) |
| Customer views | `orders/customer_views.py` (`OrderBillView`, `PaymentSummaryView`, `PaymentStatusView`, `PayOrderView`, `CancelPaymentView`) |
| Discounts / points | `orders/discounts.py` (`recompute_order_totals`, `redeem_on_payment`, `release_points`) |
| Input serializer | `admin_panel/serializers/payment_serializers.py` |
| Payment model + constraints | `orders/models.py:901-975` |
| Receipt fan-out | `orders/event_handlers.py` (Flow 22) |
