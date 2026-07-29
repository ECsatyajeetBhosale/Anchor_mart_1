# Flow 08 — Discount Application (Coupons & Loyalty Points)


> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`08-discount-application-validation.md`](./08-discount-application-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)


> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**


---


# Executive Summary


| | |
|---|---|
| **Flow Name** | Discount Application (Coupons & Loyalty Points) |
| **Business Objective** | Let a sailor reduce what they owe, without ever letting a discount be redeemed twice |
| **Flow Type** | Core |
| **Primary Actors** | Customer · Background System |
| **Platforms** | `SAILOR` · `SYS` |
| **Django Apps** | `promotion` (models, customer discovery views) · `orders` (`discounts.py`, customer apply views) |
| **Models** | `Coupon`, `CouponUsage`, `CouponAssignment`, `BonusPoints`, `BonusPointHistory`, `LoyaltyConfig`, `Order`, `DeltaPayment` |
| **Engine** | `orders/discounts.py` — `apply_coupon` · `apply_points` · `recompute_order_totals` · `redeem_on_payment` · `release_points` · `reverse_redemption` |
| **Total APIs** | **10 customer** (4 discovery · 4 order apply/remove · 2 delta apply/remove) + **3 background hooks** |
| **Previous Flow** | Flow 7 — order at `PAYMENT_PENDING` with a finalised bill |
| **Next Flow** | Flow 7 payment → `redeem_on_payment` commits the discount |
| **Documentation Version** | 1.1 — 2026-07-21 (findings F-01…F-04 fixed post-audit; see validation report) |
| **Documentation Status** | ✅ 10 of 10 customer routes documented, verified against the running route table |


> **Behaviour changed 2026-07-21 — all four validation findings fixed.** Two affect what this
> document describes: applying a coupon now **reconciles reserved loyalty points** (refunds
> whatever the coupon no longer allows) instead of dropping them (F-01/F-02), and **free
> shipping is enforced as delivery-only** (a later hardening, FJ4). The others were error
> hygiene and locking. Sections below reflect the current behaviour.


> **Scope.** This chapter is the **sailor's** discount surface. Admin coupon/loyalty
> management (`/api/superadmin/promotion/…` — create/update coupons, assignments, loyalty
> config, bonus-point grants) is a separate **administrative** flow; **Deal of the Day** is
> **Flow 19**; **point earning** (referral / delivery grants) is **Flow 18**. Flow 8 covers
> only *spending* a discount against a bill or a delta.


---


# Phase 1 — Understand the Flow


## Business purpose


A sailor at `PAYMENT_PENDING` may reduce their bill two ways — a **coupon** and **loyalty/
referral points** — subject to a dense rule set whose one non-negotiable is that **a discount
is never redeemed twice**. The engine keeps the rules in one module (`orders/discounts.py`)
and records a coupon as "used" **only on payment success**, re-validating it at that moment.


The module states its own rules (`discounts.py:1-12`):


> *"A coupon's discount is computed against whatever its `applies_to` targets… Loyalty/
> referral points are ALWAYS redeemed against the delivery charge (shipping)… Coupons/points
> are recorded as 'used' only on payment success."*


## Two instruments, two different mechanics


| | **Coupon** | **Loyalty / referral points** |
|---|---|---|
| Base it reduces | `applies_to`: **delivery** (shipping) · **items** (subtotal) · **order_total** | **Always delivery** (shipping) only |
| Cash value | `discount_type`: percentage (capped by `max_discount_amount`) · fixed · free_shipping | `points × LoyaltyConfig.point_value`, capped at remaining shipping |
| Eligibility | `is_valid` — active, in window, usage caps, min-purchase, public-or-assigned, first-order | Just needs a positive balance |
| **When it costs the sailor** | On **payment success** (`redeem_on_payment` writes `CouponUsage`) | **Immediately on apply** — points are deducted from the wallet (reserve-on-apply) |
| Reversal | `reverse_redemption` deletes the usage + decrements `times_used` | Refunded to the wallet on remove / expiry / refund |


**The asymmetry is the crux.** A coupon is a *promise* until payment; points are *spent* the
moment they're applied (and given back if the payment never happens). Every rule below follows
from that.


> **`discount_type` × `applies_to` compatibility (FJ4).** `percentage` and `fixed` may target
> any base; **`free_shipping` may only target `delivery`**. Enforced by
> `Coupon.COMPATIBILITY_MATRIX` in both `Coupon.clean()` and the admin-API serializer, so a
> "free everything" coupon (free shipping applied to items/order-total) cannot be created.


## Stacking


A coupon and points stack **only** when the coupon's `stackable_with_loyalty` is true, and
only ever both reduce **delivery**. When both hit shipping, the combined discount is capped at
the shipping fee (`recompute_order_totals:82-83`). If a non-stackable coupon is applied,
points are dropped from the order.


## Reserve-on-apply for points


`apply_points` (`discounts.py:131-177`):


1. Refund anything already reserved on this order (so re-applying isn't limited by it).
2. Cap the request by three things: the amount asked, the wallet balance, and
  `remaining_shipping / point_value` (so no point is wasted on shipping already covered).
3. **Deduct the effective points from the wallet now** (`_deduct_points`) and stamp
  `loyalty_points_redeemed`.


Removing them, an expired payment session, or a refund all call `_refund_points` to return
them to the wallet as a `LOYALTY` `EARNED` history row.


## The min-purchase probe (validate without a cart)


`ValidateCouponView` lets a sailor test a code with no order. Without an `amount`, it probes
`is_valid` using the coupon's **own** `min_purchase_amount` as the cart total — so every check
runs *except* min-purchase (which structurally passes), and the discount preview is skipped.
The card still shows `min_purchase_amount` so the frontend can warn.


## First-order coupons — one definition (#38)


"First order" means the **first paid** order. The rule lives in one place —
`promotion/first_order.py` `has_ordered_before` (keyed on `payment_completed_at`, excluding
cancelled/refunded) — and is shared by both `Coupon.is_valid` and the coupon-list filter, so
the list can never offer a coupon the validator would then refuse. At redemption, the order
being paid is **excluded** from the check (or a first-order coupon would refuse itself).


## Redemption & double-spend defence (#33, #38)


`redeem_on_payment` runs **inside the payment's locked transaction** (the webhook and
`settle_free_order` both hold `select_for_update` on the order):


- **Re-validates** the coupon before writing the usage (#38) — a sailor can't attach one
 coupon to several unpaid carts and redeem it N times.
- A coupon gone invalid at redemption is **dropped, not fatal** — the payment already landed;
 the discount already given stands, and the reason is logged.
- The `CouponUsage` row snapshots the discount + order revenue (so the coupon report is a
 simple aggregate), and a partial unique index `uniq_coupon_usage_per_order` (#33) makes a
 second redemption against one order **impossible at the DB level** — defence in depth behind
 the row lock.


Points need no redemption step — they were already deducted at apply time.


---


# Phase 2 — Discover the Complete Flow


```
DISCOVERY (any time)
 ├─ GET  /promotion/get-coupons/          usable coupons (mirrors is_valid at the DB layer)
 ├─ POST /promotion/validate-coupon/      dry-run a code (never redeems); 200 valid:false on bad codes
 ├─ GET  /promotion/my-coupon-usage/      redemption history
 └─ GET  /promotion/user/bonus-points/    wallet balance (loyalty + referral)


APPLY  (order at PAYMENT_PENDING, no open Stripe session — else 400/409 via _guard_editable)
 ├─ POST /orders/<id>/apply-coupon/    is_valid(subtotal) → attach; reconcile points (refund what the coupon no longer allows)
 ├─ POST /orders/<id>/remove-coupon/   detach → recompute
 ├─ POST /orders/<id>/apply-points/    refund prior reservation → cap → DEDUCT from wallet → reserve
 └─ POST /orders/<id>/remove-points/   refund to wallet → recompute
       every apply/remove ends in recompute_order_totals(order):
         discount_amount = capped coupon discount
         loyalty_discount = min(points×value, shipping − coupon_on_delivery)
         total = subtotal + shipping + tax + platform − discount − loyalty   (floored at 0)


APPLY TO A DELTA  (delta at PENDING — before paying the surcharge; Flow 11 owns delta pricing)
 ├─ POST /orders/<id>/deltas/<delta_id>/apply-coupon/    → deltas.apply_coupon_to_delta
 └─ POST /orders/<id>/deltas/<delta_id>/remove-coupon/


SETTLEMENT (background, inside the payment's locked txn — Flow 7)
 ├─ payment success  → redeem_on_payment(order):  re-validate → write CouponUsage (+times_used)
 │                     (points already spent at apply; nothing to deduct)
 ├─ session expired  → release_points(order):     refund reserved points → recompute
 └─ refund (Flow 12) → reverse_redemption(order): refund points + delete usage + times_used−1
```


## API sequence table


| Step | Platform | API |
|---|---|---|
| 1 | SAILOR | `GET /api/promotion/get-coupons/` |
| 2 | SAILOR | `POST /api/promotion/validate-coupon/` |
| 3 | SAILOR | `GET /api/promotion/my-coupon-usage/` |
| 4 | SAILOR | `GET /api/promotion/user/bonus-points/` |
| 5 | SAILOR | `POST /api/orders/<order_id>/apply-coupon/` |
| 6 | SAILOR | `POST /api/orders/<order_id>/remove-coupon/` |
| 7 | SAILOR | `POST /api/orders/<order_id>/apply-points/` |
| 8 | SAILOR | `POST /api/orders/<order_id>/remove-points/` |
| 9 | SAILOR | `POST /api/orders/<order_id>/deltas/<delta_id>/apply-coupon/` |
| 10 | SAILOR | `POST /api/orders/<order_id>/deltas/<delta_id>/remove-coupon/` |
| — | SYS | `redeem_on_payment` · `release_points` · `reverse_redemption` |


---


# Phase 3 — API Documentation


## Flow-wide conventions


| Header | Notes |
|---|---|
| `Authorization: Token <key>` | All 10 |
| `server-secret-key` | Required — none of these are `/api/superadmin/` |


- All customer endpoints are `[IsAuthenticated]`; order/delta endpoints scope by `_my_order`
 / `_my_delta` (owner-or-404).
- The four order apply/remove endpoints share `_guard_editable` (`customer_views.py:391-403`):
 the order must be `PAYMENT_PENDING` (**400** otherwise) with **no open Stripe session**
 (**409** — "Cancel it to change the coupon/points").
- The apply/remove helpers return `(ok, message)`; the view maps `ok=False` to **400
 `{"detail": msg}`** and echoes the fresh `bill` on success.


---


## API 1 · Browse usable coupons


| Field | Value |
|---|---|
| **Endpoint** | `/api/promotion/get-coupons/` · `GET` |
| **View** | `promotion/views.py` · `GetCoupons` |
| **Query** | `page`, `page_size` |


The sailor's **currently-usable** coupons — mirrors `Coupon.is_valid` at the DB layer (no
per-row calls): active, inside `[valid_from, valid_to]`, global cap not reached, this sailor's
per-user cap not reached, public-or-assigned, and `first_time_user_only` hidden once the
sailor has a paid order. The **only** check left to apply-time is min-purchase (needs a cart);
the `min_purchase_amount` is still shown per card.


**Success — 200** — paginated `CouponSerializer` list (code, title, discount type/value,
`applies_to`, min-purchase, validity, image).


---


## API 2 · Validate a code (dry-run)


| Field | Value |
|---|---|
| **Endpoint** | `/api/promotion/validate-coupon/` · `POST` |
| **View** | `ValidateCouponView` |


**Request Body**


| Field | Required | Rules |
|---|---|---|
| `code` | ✅ | Coupon code (upper-cased/trimmed by the serializer) |
| `amount` | ✖ | Decimal — the base to preview the discount against |


**Never redeems.** Unknown/invalid codes return **200** with `valid: false` + a reason (not
404/400) so the frontend shows an inline message.


**Success — 200**
```json
{ "valid": true, "reason": "Coupon is valid.", "code": "SUMMER20",
 "title": "Summer Sale", "discount_type": "percentage", "discount_value": "20.00",
 "min_purchase_amount": "100.00", "max_discount_amount": "50.00",
 "valid_to": "August 31, 2026, 11:59 PM",
 "discount_amount": "40.00" }   // only when `amount` was supplied and valid
```


---


## API 3 · My coupon usage


| Field | Value |
|---|---|
| **Endpoint** | `/api/promotion/my-coupon-usage/` · `GET` |
| **View** | `MyCouponUsageView` |


The caller's redemption history (coupon, order, discount saved), paginated, newest first.


---


## API 4 · Bonus-point balance


| Field | Value |
|---|---|
| **Endpoint** | `/api/promotion/user/bonus-points/` · `GET` (also `/api/v1/user/bonus-points/<type>/`) |
| **View** | `GetBonusPoints` |
| **Query / path** | `bonus_type` = `loyalty` \| `referral` (optional — omitted = combined) |


**Success — 200** — `{ "total_points": 140, "bonus_points": [ … per-row … ] }`. An invalid
`bonus_type` is **400** with the allowed set. *(Point-earning history is Flow 18.)*


---


## APIs 5–8 · Apply / remove on the order bill


| API | Endpoint · `POST` | View | Effect |
|---|---|---|---|
| 5 | `/orders/<id>/apply-coupon/` | `ApplyCouponView` | `is_valid` against the items subtotal → attach; **reconcile reserved points — refund whatever the coupon no longer allows (FJ1)** |
| 6 | `/orders/<id>/remove-coupon/` | `RemoveCouponView` | Detach → recompute |
| 7 | `/orders/<id>/apply-points/` | `ApplyPointsView` | Refund prior reservation → cap → **deduct from wallet** → reserve |
| 8 | `/orders/<id>/remove-points/` | `RemovePointsView` | Refund to wallet → recompute |


**Request bodies:** apply-coupon `{ "code": "SUMMER20" }`; apply-points `{ "points": 30 }`.


**Success — 200** — `{ "message": "...", "bill": { …full breakdown… } }` (the same `_bill`
shape as Flow 7 API 4).


**Errors**


| Status | Condition |
|---|---|
| 400 | Order not `PAYMENT_PENDING`; coupon invalid (`is_valid` reason); points not a positive int / no balance / no shipping left / redemption unavailable |
| 409 | An open Stripe session exists — cancel it first |
| 404 | Not the caller's order |


> **Points are spent the instant API 7 succeeds** — they leave the wallet immediately and come
> back via remove-points, an expired session, a refund, **or when a later coupon renders them
> unusable**: applying a coupon now reconciles the reservation and refunds whatever the coupon
> no longer allows (a non-stackable coupon → all of it). Fixed 2026-07-21 (validation **F-01/F-02**).


---


## APIs 9–10 · Apply / remove on a delta surcharge


| API | Endpoint · `POST` | View |
|---|---|---|
| 9 | `/orders/<id>/deltas/<delta_id>/apply-coupon/` | `ApplyDeltaCouponView` |
| 10 | `/orders/<id>/deltas/<delta_id>/remove-coupon/` | `RemoveDeltaCouponView` |


A coupon on a delivery surcharge, **before** paying it (delta must be `PENDING` — **400**
otherwise). Recomputes `final_delta_amount`; the coupon is redeemed only on the delta's
payment success. **Points do not apply to deltas** — coupon only. Delta pricing itself is
**Flow 11**; these two endpoints are here because they are the discount surface.


**Success — 200** — `{ "message": "...", …CustomerDeltaSerializer… }`.


---


## Background hooks (SYS)


| Hook | When | Effect |
|---|---|---|
| `redeem_on_payment(order)` | Payment success (Flow 7, inside the locked txn) | Re-validate the coupon → write `CouponUsage` + `times_used += 1`. Points already spent |
| `release_points(order)` | Stripe session expired while unpaid (Flow 7) | Refund reserved points → recompute (drops the loyalty discount) |
| `reverse_redemption(order)` | Refund (Flow 12) | Refund points to the wallet + delete the `CouponUsage` + `times_used −= 1` (coupon reusable) |


---


## What happens next


| Outcome | Next |
|---|---|
| Coupon/points applied | **Flow 7** — the bill total reflects them; sailor pays |
| Payment success | `redeem_on_payment` commits the coupon usage |
| Session expired / refund | Points returned; usage reversed |
| Delta discount | **Flow 11** — delta payment |


---


## Source reference


| Concern | Location |
|---|---|
| Discount engine | `orders/discounts.py` |
| Coupon model + rules | `promotion/models.py:18-218` (`is_valid`, `get_discount_amount`, `redeem`) |
| Usage + double-spend index | `promotion/models.py:221-266` (`CouponUsage`, `uniq_coupon_usage_per_order`) |
| First-order definition | `promotion/first_order.py` (`has_ordered_before`, `qualifying_orders`) |
| Customer discovery views | `promotion/views.py` (`GetCoupons`, `ValidateCouponView`, `MyCouponUsageView`, `GetBonusPoints`) |
| Order apply/remove | `orders/customer_views.py:391-455` (`_guard_editable`, `Apply/Remove Coupon/Points`) |
| Delta apply/remove | `orders/customer_views.py:750-788` |
| Loyalty config | `promotion/models.py:370-395` (`point_value`) |



