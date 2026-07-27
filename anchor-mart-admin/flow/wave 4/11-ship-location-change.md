# Flow 11 — Ship Location Change & Delta Surcharge


> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`11-ship-location-change-validation.md`](./11-ship-location-change-validation.md).
> This document describes **what the flow does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint below is fully specified —
> request body, params, response, errors — so a frontend can build the screen from **this doc
> alone**. The older [`../DELTA_PAYMENT_API.md`](../DELTA_PAYMENT_API.md) covers the same flow but
> has drifted from the code (it still shows `expected_stay` and a pre-FR1 `due_at`); **prefer this
> doc**. Flow-level context (windows, state machine, money rules) comes first, then the endpoints.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)


> ⚠️ **`#NN` in source comments are issue/decision numbers, not flow numbers.**


---


# Executive Summary


A vessel moves berth **after** the order is placed. What happens next is decided entirely by
**how far the order has progressed** — there are three windows:


1. **Pre-bill (self-service, no charge).** While the order is still in the intent/verification
  funnel (no bill exists yet), the sailor's reported new location is written straight onto the
  order. No admin, no report, no surcharge. `200`.
2. **Billed but unpaid (re-bill).** At `payment_pending` a bill already exists, so the move can't
  be silently rewritten. The sailor files a **`rebill` location report**; an admin **applies** it
  (relocate the order, kill the stale Stripe link, then adjust the bill via update-bill) or
  **dismisses** it. `201` → admin acts.
3. **Paid and in delivery (delta surcharge).** Once paid and en route, a new berth costs more. The
  sailor files a **`delta` location report**; an admin **prices** it into a **`DeltaPayment`**
  (baseline = original shipping + every settled delta), and the order is **immediately relocated**
  so the partner sails to the right berth. The sailor may apply a coupon, then **pays in-app**; the
  Stripe webhook settles the delta and the **delivery hold** lifts.


While an unpaid delta is open, **final delivery is held** (the partner's handover 409s) — but
collection and transit stay open, because the delta is raised mid-delivery. Unpaid deltas are
reminded, then expired; an admin can withdraw one at any time. **One open report and one open delta
per order.**


| | |
|---|---|
| **Actors** | Customer (sailor) · Admin · Background System (Celery) · Stripe |
| **Endpoints** | **17** — fully specified below (13 delta/location endpoints + 4 embedded read surfaces) |
| **Django Apps** | `orders` (`deltas.py` — the core service) · `admin_panel` (admin actions) |
| **Core service** | `orders/deltas.py` |
| **Models** | `LocationReport`, `DeltaPayment`, `Payment`, `Order`, `ShipmentAddress` (+ `OrderStatusHistory`, `AuditLog`) |
| **State machines** | `LocationReport.Status` (pending → priced/dismissed) · `DeltaPayment.Status` (pending → initiated → completed/expired/withdrawn) |
| **Previous Flow** | 6 (place) · 7 (pay) — the order must already exist |
| **Next Flow** | Delta paid → 10 (delivery resumes) · re-bill applied → 7 (re-pay) |
| **Documentation Version** | 1.2 — 2026-07-23 (Phase-3: all 17 endpoints inlined + fully specified so the doc is self-sufficient; corrected `expected_stay`→`expected_departure` and the post-FR1 `due_at` that the old companion still had wrong) |
| **Documentation Status** | ✅ 17 routes fully specified here, verified against the running route table + serializers |


> **Two locked decisions the code names explicitly:** **#3** — the baseline a new delta is measured
> against is *base shipping + every COMPLETED delta*, so repeated moves stay truthful
> (`effective_shipping`). **#4** — a delta accepts **coupons only** (never loyalty points), and an
> items-only coupon is rejected (a delta is a pure delivery surcharge).


---


# The three windows — decided by `Order.status`


The customer always calls **one** endpoint — `POST /orders/<id>/report-location/` — and the backend
routes by the order's current status:


| Window | Order status | What happens | Result |
|---|---|---|---|
| **Self-service** (pre-bill) | `intent_received`, `pending_intent`, `sourcing`, `partner_verifying`, `verification_submitted`, `pending_customer_response` | Location written **directly** onto the order (port, anchorage, address, arrival, departure, fastest flag). No report, no admin, no charge. | **200** |
| **Re-bill** (billed, unpaid) | `payment_pending` | A **`rebill`** `LocationReport` is filed for admin review. | **201** |
| **Delta** (paid, in delivery) | `order_confirmed`, `partner_assigned`, `items_collected`, `at_port`, `at_berth`, `partially_delivered`, `delivery_failed` | A **`delta`** `LocationReport` is filed for admin review. | **201** |
| **Closed** | anything else (`delivered`, `cancelled`, `refunded`, `intent_rejected`) | Rejected. | **400** |


*(Constants: `LOCATION_SELF_SERVICE_STATUSES`, `LOCATION_REBILL_STATUSES`, `DELTA_RAISEABLE_STATUSES`
in `orders/deltas.py`.)*


---


# Endpoints — full specification


**Headers (every call):** `Authorization: Token <token>` · `Content-Type: application/json` ·
`server-secret-key: <SERVER_SECRET_KEY>` on customer (`/api/orders/…`) calls only — the
`/api/superadmin/…` admin calls are exempt. **All money fields are decimal strings** (`"25.00"`).
Path params are UUIDs. Field errors → `{"<field>": ["…"]}`; business errors → `{"detail": "…"}`.


> **Admin write gate.** Every admin write (`raise-delta`, `apply`, `dismiss`, `withdraw`) passes
> `manage_gate`: a `super_admin` always may; the order's assigned admin may; an **unassigned** order
> returns **409** ("claim it first"); **another** admin's order returns **403**.


---


## 1 · `POST /api/orders/<order_id>/report-location/` — Customer reports a move 🧑‍✈️


One lifecycle-aware endpoint; the window (self-service / rebill / delta) is chosen by the order's
status per [the three-windows table above](#the-three-windows--decided-by-orderstatus). No query params.


**Request body**


| Field | Type | Required | Rule |
|---|---|---|---|
| `port_id` | UUID | ✅ | Must be an **active** `PortAddress`. |
| `anchorage_id` | UUID | ✅ | Must **belong to `port_id`** (else 400). |
| `shipping_address` | object | ✅ | Inner **required**: `full_name`, `phone`, `port_name`, `vessel_name`. Optional: `email`, `imo_number`, `deck`, `cabin_number`, `section`, `delivery_instructions`. |
| `expected_arrival` | datetime (ISO-8601) | ✅ | **Not in the past.** |
| `expected_departure` | datetime (ISO-8601) | ✅ | **Must be after `expected_arrival`.** *(This replaces the old free-text `expected_stay` — do not send `expected_stay`.)* |
| `is_fastest_delivery` | bool | ❌ | Default `false`. |


```json
{
 "port_id": "0d4b8b3a-…", "anchorage_id": "77af5e21-…",
 "shipping_address": {"full_name": "John Sailor", "phone": "+919812345678",
                      "port_name": "Mumbai Port", "vessel_name": "MV Anchor"},
 "expected_arrival": "2026-07-05T10:00:00Z",
 "expected_departure": "2026-07-08T06:00:00Z",
 "is_fastest_delivery": false
}
```


**Response `200`** — pre-bill self-service (location updated directly, no report, no charge):
```json
{ "message": "Delivery location updated.", "port": "Mumbai Port", "anchorage": "Anchorage A" }
```
**Response `201`** — a report was filed (payment_pending → `kind:"rebill"`; in-delivery → `kind:"delta"`):
```json
{ "id": "3a1f-…", "kind": "delta", "status": "pending",
 "location": {"port": {"id": "0d4b-…", "name": "Mumbai Port", "code": "INMUM"},
              "anchorage": {"id": "77af-…", "name": "Anchorage A"}},
 "shipping_address": {"full_name": "John Sailor", "…": "…"},
 "expected_arrival": "2026-07-05T10:00:00Z", "expected_departure": "2026-07-08T06:00:00Z",
 "is_fastest_delivery": false, "dismiss_reason": "", "reviewed_at": null }
```


**Errors** — `400` closed/terminal order · `409` `"You already have a location change under review…"`
(one-open-report) · `400` `{"anchorage_id": ["That anchorage doesn't belong to the selected port."]}`
· `400` `{"expected_arrival": ["Expected arrival can't be in the past."]}` · `400`
`{"expected_departure": ["Expected departure must be after the arrival."]}` · `400` missing inner
address field · `404` order not owned by caller.


---


## 2 · `GET /api/superadmin/orders/location-reports/` — Admin review queue 🛠️


**Query params**


| Param | Type | Notes |
|---|---|---|
| `order_id` | UUID | Optional. **Omitted** → cross-order queue, defaults to `pending` only. **Present** → that order's full history (all statuses), newest first. Malformed → 400. |
| `status` | enum | `pending` (default when no `order_id`), `priced`, `dismissed`. |
| `page` | int | Page number. |
| `page_size` | int | Default 10, max 50. |


**Response `200`** — paginated (`count`/`next`/`previous`/`results[]`); each row:
```json
{ "id": "3a1f-…", "order": "1111-…", "order_number": "AM-100245", "sailor_name": "John Sailor",
 "kind": "delta", "status": "pending",
 "port": {"id": "0d4b-…", "name": "Mumbai Port", "code": "INMUM"},
 "anchorage": {"id": "77af-…", "name": "Anchorage A"},
 "shipping_address": {"…": "…"}, "expected_arrival": "2026-07-05T10:00:00Z",
 "expected_departure": "2026-07-08T06:00:00Z", "is_fastest_delivery": false,
 "dismiss_reason": "", "reviewed_at": null, "created_at": "June 30, 2026, 02:15 PM" }
```
Route by `kind`: `delta` → §3 (raise) or §4 (dismiss); `rebill` → §5 (apply) or §4 (dismiss).
**Errors** — `400` `{"status": "Invalid status. …"}`.


---


## 3 · `POST /api/superadmin/orders/order/<order_id>/raise-delta/` — Admin prices the delta 🛠️


Prices the order's pending **`delta`** report (auto-found + linked). The admin gives only the amount +
a note; the location comes from the report.


**Request body**


| Field | Type | Required | Rule |
|---|---|---|---|
| `delta_amount` | decimal string | ✅ | **> 0** (min `0.01`). The surcharge itself, not a new total. |
| `note` | string | ✅ | Shown to the customer + recorded on the delta and order history. |


**Response `201`**
```json
{ "id": "9c2e-…", "order": "1111-…", "status": "pending",
 "original_shipping": "50.00", "new_shipping": "75.00", "delta_amount": "25.00",
 "applied_coupon": null, "coupon_discount": "0.00", "final_delta_amount": "25.00",
 "new_location": {"port_id": "0d4b-…", "port_name": "Mumbai Port", "port_code": "INMUM",
                  "anchorage_id": "77af-…", "anchorage_name": "Anchorage A",
                  "shipping_address": {"…": "…"}, "expected_arrival": "2026-07-05T10:00:00Z",
                  "expected_departure": "2026-07-08T06:00:00Z"},
 "note": "Ship moved to a farther anchorage.",
 "due_at": "2026-07-01T14:20:00Z", "paid_at": null, "transaction_id": null,
 "created_at": "June 30, 2026, 02:20 PM" }
```
- `original_shipping` = base shipping + every **completed** delta (cumulative baseline);
 `new_shipping` = `original_shipping + delta_amount`; `final_delta_amount` = `delta_amount −
 coupon_discount` (no coupon yet at raise).
- **`due_at` is set at raise** (the pay window is armed now, not only at Pay — FR1). Re-armed when the
 sailor taps Pay.
- **Side effect — the move goes live immediately:** the order's `port` / `anchorage` /
 `shipping_address` are rewritten to the reported location right now, so the partner sees the new
 berth without waiting for payment. Payment settles the *cost*, not the *location*.


**Errors** — `409` order unpaid · `409` one-open-delta · `409` `"No new delivery location reported…"`
(no pending `delta` report → the customer must do §1 first) · `400` order not in a delivery status ·
`400` `{"delta_amount": ["…greater than zero."]}` · `400` `{"note": ["This field is required."]}`.


---


## 4 · `POST /api/superadmin/orders/order/<order_id>/location-reports/<report_id>/dismiss/` — Dismiss 🛠️


For **either** kind — no change warranted. Notifies the customer.


**Request body** — `{"reason": "Duplicate report — same anchorage."}` · `reason` optional, ≤255 chars.
**Response `200`** — the report with `status:"dismissed"`, `dismiss_reason`, `reviewed_at` set (same
shape as a §2 row). **Errors** — `409` `"This report is already 'Priced'."` · `404` order/report mismatch.


---


## 5 · `POST /api/superadmin/orders/order/<order_id>/location-reports/<report_id>/apply/` — Apply a rebill 🛠️


**`rebill` reports only** (a `payment_pending` order → nothing paid → no surcharge). Repoints the
order's `port`/`anchorage`/`shipping_address`/`ship_arrival_date`/`expected_departure`/
`is_fastest_delivery`, **expires the open Stripe session**, and marks the report `priced`. The admin
then re-prices via the **update-bill** endpoint (Flow 7) and the customer re-pays. **No request body.**


**Response `200`** — the report with `status:"priced"` (same shape as §2). **Errors** — `400` `"This
action is only for re-bill reports…"` (report is a `delta`) · `409` already resolved.


---


## 6 · `GET /api/orders/<order_id>/deltas/` — Customer lists deltas 🧑‍✈️


No params. Bounded per order → returned in full, no pagination. **Response `200`:**
```json
{ "order_id": "1111-…", "deltas": [
 { "id": "9c2e-…", "status": "pending", "original_shipping": "50.00", "new_shipping": "75.00",
   "delta_amount": "25.00", "coupon_code": null, "coupon_discount": "0.00",
   "final_delta_amount": "25.00",
   "new_location": {"port_name": "Mumbai Port", "anchorage_name": "Anchorage A", "…": "…"},
   "note": "Ship moved …", "due_at": "2026-07-01T14:20:00Z" } ] }
```
**Errors** — `404` order not owned by caller.


## 7 · `GET /api/orders/<order_id>/deltas/<delta_id>/` — Customer gets one delta 🧑‍✈️


No params/body. **Response `200`** — one delta, same shape as a §6 item. **Errors** — `404` not owned.


---


## 8 · `POST /api/orders/<order_id>/deltas/<delta_id>/apply-coupon/` — Apply a coupon 🧑‍✈️


Only while `status == pending`. Coupon must apply to delivery/order-total (**items-only rejected**).
**Body** — `{"code": "SHIP10"}` (`code` required, case-insensitive). **Response `200`** — the
recomputed delta (`coupon_code`, `coupon_discount`, reduced `final_delta_amount`), plus
`"message": "Coupon applied."`. **Errors** — `400` delta not `pending` · `400` `"Coupon not found."` ·
`400` items-only coupon · `400` `<eligibility message>` (expired / min-purchase / usage-limit) · `404`.


## 9 · `POST /api/orders/<order_id>/deltas/<delta_id>/remove-coupon/` — Remove the coupon 🧑‍✈️


No body. **Response `200`** — recomputed delta, coupon cleared, `final_delta_amount` back to full,
`"message": "Coupon removed."`. **Errors** — `400` delta not `pending`.


---


## 10 · `POST /api/orders/<order_id>/deltas/<delta_id>/pay/` — Pay the delta 🧑‍✈️


No body. Mints (or reuses) a Stripe session for `final_delta_amount`, flips `pending → initiated`.
If a coupon covers it fully (`final_delta_amount ≤ 0`) it settles with **no Stripe**.


**Response `201`** (new link) / **`200`** (reused open link):
```json
{ "checkout_url": "https://checkout.stripe.com/c/pay/cs_…", "reused": false, "amount": "15.00",
 "expires_at": "2026-07-01T14:20:00Z", "id": "9c2e-…", "status": "initiated",
 "coupon_code": "SHIP10", "final_delta_amount": "15.00", "due_at": "2026-07-01T14:20:00Z" }
```
→ redirect the customer to `checkout_url`. **Response `200`** (fully covered by coupon, no payment):
`{"message": "No payment needed — the charge is fully covered.", "status": "completed", …}`.
**Errors** — `400` delta not `pending`/`initiated` (already paid/expired/withdrawn) · `502` Stripe
failure (safe to retry) · `404` not owned.


## 11 · `GET /api/orders/<order_id>/deltas/<delta_id>/payment-status/` — Poll status 🧑‍✈️


No params/body. Poll after the Stripe return (settlement is server-side via webhook, idempotent).
**Response `200`:**
```json
{ "delta_id": "9c2e-…", "order_id": "1111-…", "status": "completed", "is_paid": true,
 "amount": "15.00", "has_open_session": false, "session_status": "complete", "checkout_url": null }
```
`is_paid:true` → stop polling. `checkout_url` is the live resume link (non-null only while
`has_open_session`).


## 12 · `POST /api/orders/<order_id>/deltas/<delta_id>/cancel-payment/` — Cancel an open payment 🧑‍✈️


No body. Expires the open link and flips `initiated → pending` (coupon editable again). If not
`initiated`, it's a `200` no-op (`"No active payment link to cancel."`). **Errors** — `404` not owned.


---


## 13 · `POST /api/superadmin/orders/order/<order_id>/deltas/<delta_id>/withdraw/` — Admin withdraws 🛠️


Retracts an **open** (`pending`/`initiated`) delta (raised in error / team absorbs it). Kills any open
Stripe link, frees the order (hold lifts, a new delta can be raised), notifies the customer.
**Body** — `{"reason": "Raised by mistake."}` (`reason` optional, ≤255). **Response `200`** — the delta
with `status:"withdrawn"`. **Errors** — `409` `"Only an open (unpaid) delta can be withdrawn…"`.


---


## 14–17 · Read surfaces that embed delta data (owned by the admin Orders screen)


These are **admin reads specified in full under the Orders-screen flow** (they exist independent of
this flow); here is only how they surface delta/location state:


| # | Endpoint | Delta-relevant content |
|---|---|---|
| 14 | `GET /api/superadmin/orders/orders/<order_id>/` | Admin order detail. **Embeds** `deltas[]` (full `DeltaPayment` shape incl. `due_at`, `paid_at`, `transaction_id`) and `location_reports[]` — render the whole history without calling §2/§6. |
| 16 | `GET /api/superadmin/orders/orders/stats/` | Post-payment stat cards. No delta fields. |
| 17 | `GET /api/superadmin/orders/orders/` | Post-payment list. Carries **`has_location_request`** (bool) — `true` only while an **unactioned `pending` report** exists; the row-level "needs attention" badge, self-clearing once the admin raises/dismisses. Filters: `status` (post-payment only), `date_from`/`date_to`, `partner_id`, `search`, `page`/`page_size`. |
| 15 | `GET /api/orders/saved-addresses/` (customer) | Recent addresses (most-recent 5) to pre-fill the §1 form: `port.id → port_id`, `anchorage.id → anchorage_id`, vessel/contact fields → `shipping_address`. Written automatically on order creation and on a confirmed delta move. |


**The `location_change` hint on list rows.** The intents/history lists (customer and admin) each carry
a compact `location_change` object per row so the app knows the state + which endpoint to call next —
no extra fetch:


| `state` | Meaning | Next call (with `delta_id` / `report_id`) |
|---|---|---|
| `delta_pending` | open delta, coupon editable | §8 apply-coupon / §10 pay (has `amount`) |
| `delta_initiated` | payment started | §11 payment-status / §12 cancel-payment (resume) |
| `report_pending` | report awaiting admin review | show "under review" (no action) |
| `report_dismissed` | admin dismissed it | show "no change / no charge" |


`null` when there's nothing to act on. An open delta takes precedence over a report; otherwise the
**latest** report's state is shown.


---


# The delta lifecycle (state machine)


```
                     admin raise-delta (prices a pending DELTA report)
                                    │
                                    ▼
  report(DELTA, pending) ─────► DeltaPayment.PENDING ──── coupon covers it ──► COMPLETED
       │  (customer)          (order relocated NOW)  │                        (settle_delta)
       │                                             │ customer taps Pay
       │                                             ▼
       │                                    DeltaPayment.INITIATED ── webhook ──► COMPLETED
       │                                    (Stripe session, due_at set)          │ hold lifts
       │                                             │                            │
       │                              window lapses (Celery expire_deltas)        │
       │                                             ▼                            ▼
       │                                     DeltaPayment.EXPIRED         delivery resumes
       └─ admin withdraw ──────────────► DeltaPayment.WITHDRAWN  (any open delta; hold lifts)
```


**`DeltaPayment.Status`:** `pending` → `initiated` → `completed` / `expired` / `withdrawn`.
**Open** = `{pending, initiated}` (this set is what holds delivery). **No `failed` state** — a
declined charge is recorded on a `PaymentAttempt`, not by moving the delta (decision #36).


**`LocationReport.Status`:** `pending` → `priced` (an admin raised/applied it) / `dismissed`.
**Kind:** `delta` (paid window) or `rebill` (payment_pending window). **Open** = `{pending}`.


---


# Money rules


- **Cumulative baseline (decision #3).** A new delta is priced against
 `effective_shipping(order) = base shipping_fee + Σ(COMPLETED deltas)`, and the `DeltaPayment`
 records `original_shipping`, `new_shipping` (= baseline + surcharge) and `delta_amount`. So after
 three moves the fourth is measured from the third, and the before/after record stays truthful.
- **The admin enters the surcharge directly** (`delta_amount`, `> 0`), not a new shipping total; the
 baseline is computed server-side.
- **Coupon on a delta (decision #4).** Coupons only — no loyalty points. An **items-only** coupon is
 rejected (a delta is a pure delivery charge). The discount is computed against the surcharge and
 capped so `final_delta_amount ≥ 0`. The coupon is **recorded as used only on payment success**
 (`settle_delta` → `coupon.redeem`), mirroring the order flow.
- **Zero-amount short-circuit.** If a coupon covers the surcharge fully (`final_delta_amount ≤ 0`),
 `pay` settles the delta **without Stripe** (`settle_delta`) — no checkout link.
- **The order is relocated immediately at raise-delta** (port, anchorage, shipping_address written
 now) — the ship *is* there; the partner must sail to the right berth whether or not the surcharge
 is paid yet. Payment settles the *money*, not the *location*.


---


# The delivery hold (#10)


While an order has an **open** delta (`pending` or `initiated`), the partner's **final handover** is
blocked — the deliver endpoint returns **409**. Everything up to handover (collect → at_port →
at_berth) stays open, because the delta is raised mid-delivery and the partner may already be en
route. The hold is **implicit**: it keys off `has_open_delta`, so it lifts the moment the delta
becomes `completed`, `expired` or `withdrawn` — no separate "unhold" call.


- `delivery_blocked_by_unpaid_delta(order)` — the per-order guard the deliver endpoint calls.
- `delivery_on_hold(order)` — the prefetch-aware sibling for list serializers (no per-row query).


---


# One-open-at-a-time


- **One open delta per order** — enforced both in app code (`has_open_delta`) **and** by a DB partial
 unique index `uniq_open_delta_per_order` (`Q(status in {pending, initiated})`).
- **One open report per order** — enforced both in app code (`has_open_location_report`) **and** by a
 DB partial unique index `uniq_open_location_report_per_order` (`Q(status="pending")`), so a race
 can't file two open reports. *(FR2 — added 2026-07-23 to match the delta's backstop.)*
- **One open Stripe session per delta** — DB partial unique `uniq_open_delta_payment_per_delta`
 (`Q(kind=delta, session_status=open)`), so a double-tap can't mint two live links.


---


# Reminders & expiry (Celery)


| Task | Beat | Selects | Does |
|---|---|---|---|
| `send_delta_reminders` | hourly (:15) | any **open** delta (`pending`/`initiated`) with a `due_at`, past halfway of the window, not yet reminded | one "surcharge still pending" push; stamps `reminder_sent_at` |
| `expire_deltas` | hourly (:20) | any **open** delta with a `due_at` that has lapsed | → `EXPIRED`, expire any Stripe session, notify sailor + admins |


The pay window (`due_at`) is **armed when the admin raises the delta** and re-started when the sailor
taps Pay (the session is minted). So a delta the sailor never opens is still on the clock — it is
reminded, then expired, and its delivery hold lifts. *(FR1 — before 2026-07-23, `due_at` was set only
at Pay, so a never-opened delta stayed `pending` unswept and held delivery indefinitely.)*


---


# Data model touchpoints


| Model | Role |
|---|---|
| `LocationReport` | The customer's reported move. `kind` = `rebill` (payment_pending) or `delta` (paid). Carries the new port/anchorage/address/dates. `status` = pending → priced/dismissed. |
| `DeltaPayment` | The priced surcharge. `original_shipping` / `new_shipping` / `delta_amount`, `applied_coupon` / `coupon_discount` / `final_delta_amount`, `new_location` snapshot, `due_at`, `paid_at`. `status` drives the delivery hold. |
| `Payment` (`kind=delta`) | The Stripe charge for a delta; one open session per delta (DB-guarded). |
| `Order` | Relocated in place — `port`, `anchorage`, `shipping_address` (and, on rebill-apply, `ship_arrival_date`, `expected_departure`, `is_fastest_delivery`). `current_location` is **deprecated / no longer written**. |


---


# How Flow 11 connects


- **Upstream:** the order comes from Flow 6 (place) / Flow 7 (pay). The window is chosen by the
 order's lifecycle status (Flow 5/10).
- **Re-bill window:** applying a `rebill` report kills the stale Stripe link and hands off to the
 admin's **update-bill** (Flow 7) to re-price, then the sailor re-pays (Flow 7).
- **Delta window:** paying a delta rides the **shared Stripe webhook** (Flow 7) — the webhook routes
 a `kind=delta` completion to `settle_delta` *before* the order-paid idempotency check.
- **Delivery:** the hold is enforced by the partner deliver endpoint (Flow 10); it lifts implicitly
 when no open delta remains.
- **Coupons:** delta coupons reuse the promotion engine (Flow 8), restricted to non-items coupons.



