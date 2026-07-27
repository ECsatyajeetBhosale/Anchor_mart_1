# Flow 12 — Order Cancellation & Refund


> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> 	[`12-order-cancellation-refund-validation.md`](./12-order-cancellation-refund-validation.md).
> This document describes **what the flow does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint below is fully specified —
> request body, params, headers, response, errors — so a frontend can build the screen from
> **this doc alone**.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)


> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**


---


# Executive Summary


Unwind an order and return money under **one universal, status-keyed policy** — the same rule for
every order type (regular / express / marine / special-request all converge on one `Order` status
tail). The **pickup boundary** is decisive:


- **Before pickup** (`payment_received` / `order_confirmed` / `partner_assigned`) → **cancel + full
 refund** (initial payment **plus every settled delta**), auto-approved while still inside the
 arrival-lead window; an admin can `override` past it.
- **On the way** (`items_collected` / `at_port` / `at_berth`) → **no cancel, no refund — for anyone,
 at any cost.** The goods are moving.
- **`delivery_failed`** (goods never reached the sailor) → **full refund, no time gate** (admin-initiated).
- **`partially_delivered`** → **partial refund only** — an admin refunds the undelivered value with an
 explicit `amount`; the order stays partially-delivered and the sailor keeps the benefit on what they
 received. **Requires an `Idempotency-Key` header.**
- **`delivered`** → the return/replacement flow — **not built yet** (returns TODO).


A refund runs **under the order lock**: Stripe refund per payment (initial + each settled delta) →
reverse redeemed loyalty points + release the coupon → transition to `refunded` → audit. An **unpaid**
cancellation instead moves the still-available items **back into the cart** (so cancelling isn't a
dead end) and transitions to `cancelled`.


| | |
|---|---|
| **Actors** | Customer (sailor) · Admin · Background System · Stripe |
| **Endpoints** | **4** — 1 customer (cancel) · 3 admin (cancel / refund-quote / refund) — fully specified below |
| **Django Apps** | `orders` (`refunds.py`, `idempotency.py`, `cart_service.py`) · `admin_panel` · `promotion` |
| **Core service** | `orders/refunds.py` (the policy lives here, in one place) |
| **Models** | `Order`, `Payment`, `DeltaPayment`, `IdempotencyKey`, `CouponUsage`, `BonusPoints`, `Cart`, `CartItem`, `AuditLog` |
| **Previous Flow** | 7 (pay), 10 (delivery — sets the status the policy keys off), 11 (deltas — refunded too) |
| **Next Flow** | Terminal: `cancelled` or `refunded`. (Delivered → returns flow, not built.) |
| **Documentation Version** | 1.1 — 2026-07-23 (FS1: full refund now retry-safe via a shared keyed primitive; FS2: honest express-cancel message) |
| **Documentation Status** | ✅ 4 routes fully specified here, verified against the running route table + views |


> **Two carve-outs the code applies that the "universal" framing doesn't:** (1) **express orders are
> blocked from self-cancel** before any status check (see §1); (2) admin **cancel** is pre-payment
> only — a paid order is never "cancelled", it's **refunded** (§2 vs §4). Both are called out in the
> validation report.


---


# The policy — decided by `Order.status`


Computed by `refund_quote(order, override=False)` in `orders/refunds.py` (pure, no side effects — the
admin preview at §3 and the executor at §4 both call it, so there is one definition):


| Order status | Refundable? | What |
|---|---|---|
| `payment_received`, `order_confirmed`, `partner_assigned` (before pickup) | ✅ (within window; else `override`) | **Full** — initial + every completed delta |
| `items_collected`, `at_port`, `at_berth` (on the way) | ❌ | "picked up and on its way — no refund" |
| `delivery_failed` | ✅ (no time gate) | **Full** — initial + every completed delta |
| `partially_delivered` | ⚠️ partial only | admin `amount` via §4 (no full refund) |
| `delivered` | ❌ | returns/replacement flow (not built) |
| not paid / already `refunded` / `refunded_at` set | ❌ | "isn't a refundable paid order" |


**Time gate (before-pickup only):** auto-approved while `now ≤ ship_arrival_date −
CUSTOMER_CANCEL_LEAD_HOURS`. Past that, the quote is denied unless `override=true`. **No arrival date
→ no time gate.** `delivery_failed` is never time-gated.


**On a full refund the order is settled:** each `Payment` → `REFUNDED`, `order.payment_status` →
`REFUNDED`, `order.status` → `REFUNDED`, `refunded_at` stamped, **loyalty points returned + coupon
released** (`reverse_redemption`). **A partial refund settles nothing** — it only moves the `amount`
against the initial payment and records it (the order stays `partially_delivered`, coupon/points
untouched).


---


# Endpoints — full specification


**Headers (every call):** `Authorization: Token <token>` · `Content-Type: application/json` ·
`server-secret-key: <SERVER_SECRET_KEY>` on the customer (`/api/orders/…`) call only — the
`/api/superadmin/…` admin calls are exempt. Money fields are decimal strings (`"25.00"`).


> **Admin write gate.** Every admin write (`cancel`, `refund`) passes `manage_gate`: `super_admin`
> always; the order's assigned admin; **unassigned** → 409 ("claim it first"); **another** admin's
> order → 403. `refund-quote` (a read) is not gated.


---


## 1 · `POST /api/orders/<order_id>/cancel/` — Customer cancels 🧑‍✈️


Self-service cancel. **Paid → auto full refund** (before pickup, in window); **unpaid → plain cancel +
items restored to the cart.**


**Request body**


| Field | Type | Required | Rule |
|---|---|---|---|
| `reason` | string | ✅ | Why you're cancelling. Trimmed; **stored truncated to 50 chars**. |


**Guards, in order** — `400` already cancelled/refunded · `400` **express** (`"Express orders can't be
cancelled here — they're dispatched immediately. Contact support to request a refund."` — the money-back
path for express is an admin refund; whether express should be self-cancellable is a parked product
decision) · `400` picked up
(`items_collected`/`at_port`/`at_berth`/`partially_delivered`/`delivered`/`delivery_failed`) · `400`
past the cancel window (`"… only … up to {N}h before the ship's arrival."`) · `400` missing `reason` ·
`404` order not owned by caller.


**Response `200` — paid order (cancelled + refunded):**
```json
{ "message": "Order cancelled and refunded.", "status": "refunded", "refund_amount": "616.68" }
```
**Response `200` — unpaid order (cancelled + items returned to cart):**
```json
{ "message": "Order cancelled successfully.", "status": "cancelled",
 "restored_to_cart": ["Mooring Rope", "Deck Brush"],
 "unavailable": ["Custom Winch (special request)"] }
```
- `restored_to_cart` — product names moved back into the matching-type cart (merged with existing
 lines, capped at 999).
- `unavailable` — items that couldn't be restored (no longer sourceable, or special-request lines with
 no catalog variant).


**Paid-path errors** — `400` refund not allowed under policy (`RefundNotAllowed` message) · `502`
`{"detail": "Refund could not be processed: …"}` (Stripe failure).


---


## 2 · `POST /api/superadmin/orders/order/<order_id>/cancel/` — Admin cancels (pre-payment only) 🛠️


For a **pre-payment** order stuck in the intent funnel (sailor ghosted). **A paid order is never
cancelled here — use §4 refund.**


**Request body** — `{"reason": "…"}` (**required**, stored truncated to 50 chars).


**Response `200`:**
```json
{ "message": "Order cancelled.", "order_id": "1111-…", "status": "cancelled" }
```
**Errors** — `409` `"This order is already paid — use the refund flow to cancel it."` (paid) · `400`
not a pre-payment intent-funnel status · `400` transition not allowed · `400` missing `reason` · `403`/`409`
`manage_gate` · `404` unknown order.


---


## 3 · `GET /api/superadmin/orders/order/<order_id>/refund-quote/` — Preview a refund 🛠️


Pure preview — **no side effects.** Shows exactly what §4 would refund.


**Query params** — `override` (optional): `true`/`1`/`yes` previews a forced refund past the auto
window.


**Response `200`:**
```json
{ "allowed": true, "reason": "within policy", "policy": "before pickup — full refund",
 "initial_refund": "500.00",
 "delta_refunds": [ { "delta_id": "9c2e-…", "amount": "25.00" } ],
 "total_refund": "525.00" }
```
- `allowed` — whether §4 would proceed as-is. When `false`, `reason` says why (past window / on the
 way / delivered / partially delivered / not paid) and the amounts still show what *would* be
 refunded (for the preview).
- `policy` — `"before pickup — full refund"` / `"delivery failed — full refund"` / `""` when denied.


---


## 4 · `POST /api/superadmin/orders/order/<order_id>/refund/` — Refund a paid order 🛠️


Two modes, chosen by whether `amount` is present:


**A · Full refund** (no `amount`) — the status+time policy; refunds initial + every settled delta,
reverses points + coupon, moves the order to `refunded`.


| Field | Type | Required | Rule |
|---|---|---|---|
| `reason` | string | ✅ | Recorded on the refund + shown to the sailor. |
| `override` | bool-ish | ❌ | `true`/`1`/`yes` forces a refund past the auto window. |


**Response `200`:**
```json
{ "message": "Order refunded.", "order_id": "1111-…", "status": "refunded",
 "total_refund": "525.00", "policy": "before pickup — full refund" }
```


**B · Partial refund** (`amount` present) — **`partially_delivered` orders only.** Refunds the
undelivered value against the initial payment; the order **stays** `partially_delivered`, coupon/points
untouched.


| Field / Header | Type | Required | Rule |
|---|---|---|---|
| `reason` | string | ✅ | Recorded + shown to the sailor. |
| `amount` | decimal string | ✅ (triggers partial) | **> 0**, and **≤ the still-refundable remainder** on the initial payment. |
| `Idempotency-Key` (header) | string | ✅ | **Required for a partial refund.** Same key + same body → replays the stored result (no second charge). Same key + different body → **409**. New key → issues a **further** refund. |


**Response `200`:**
```json
{ "message": "Partial refund issued.", "order_id": "1111-…", "status": "partially_delivered",
 "refunded": "40.00", "total_refunded_on_payment": "40.00" }
```


**Errors (both modes)** — `400` missing `reason` · `400` `{"amount": ["Must be a valid decimal
amount."]}` · `400` partial on a non-partially-delivered order · `400` `amount` ≤ 0 or exceeds the
remaining refundable · `400` full refund denied by policy (past window without `override`, on the way,
delivered, not paid) · `400` (partial) missing `Idempotency-Key` · `409` `Idempotency-Key` reused with
a different body · `403`/`409` `manage_gate` · `502` Stripe failure · `404` unknown order.


---


# Cancel vs refund — who does what


| Situation | Endpoint | Result |
|---|---|---|
| Sailor, unpaid order, before pickup, in window | §1 customer cancel | `cancelled` + items restored to cart |
| Sailor, **paid** order, before pickup, in window | §1 customer cancel | `refunded` (auto full refund) |
| Admin, **pre-payment** stuck order | §2 admin cancel | `cancelled` (no money) |
| Admin, paid order, before pickup / delivery_failed | §4 refund (full) | `refunded` |
| Admin, paid order, **past** the window | §4 refund (`override=true`) | `refunded` |
| Admin, **partially delivered** order | §4 refund (`amount` + `Idempotency-Key`) | partial refund, status unchanged |
| Anyone, **on the way** (`items_collected`…`at_berth`) | — | **blocked** (no money-back until `delivery_failed` or returns) |


---


# What a full refund reverses (`reverse_redemption`)


On a full refund (not partial):
- **Loyalty points** redeemed on the order are **credited back** to the sailor's wallet.
- The **applied coupon** is **released** (its usage is reversed, freeing it for reuse where the
 coupon's own rules allow).
- Every `Payment` (initial + each settled delta) is marked `REFUNDED` with its `refund_amount` and
 `refunded_at`; the order-level total is derived from those.


---


# Data model touchpoints


| Model | Role |
|---|---|
| `Order` | The target. `status` drives the policy; a full refund sets `status=refunded`, `payment_status=refunded`, `refunded_at`. A cancel sets `status=cancelled`, `cancellation_reason`, `cancelled_at`. |
| `Payment` | Refunded per row (initial + each `kind=delta`). `refund_amount` accumulates (partial refunds add to it); `status=REFUNDED` once fully back. |
| `IdempotencyKey` | Guards the **partial** refund — `begin`/`complete`/`release` around the Stripe call; a replay returns the stored body. |
| `CouponUsage` / `BonusPoints` | Reversed on a full refund (`reverse_redemption`); untouched on a partial. |
| `Cart` / `CartItem` | An **unpaid** cancel restores still-available lines back here (backwards flow from Flow 4). |


---


# How Flow 12 connects


- **Upstream:** the order's `status` comes from Flow 7 (pay), Flow 10 (delivery — sets
 `items_collected` … `delivery_failed`), and Flow 11 (settled deltas that a full refund also returns).
- **Stripe:** refunds call the Stripe Refund API per payment (Flow 7's provider); a mid-sequence
 failure surfaces as `502`.
- **Coupons / points:** a full refund reverses Flow 8's redemptions.
- **Cart:** an unpaid cancel feeds Flow 4 (the items reappear in the cart).
- **Not built:** the `delivered` return/replacement flow (returns TODO) — the only money-back route
 once goods are handed over.



