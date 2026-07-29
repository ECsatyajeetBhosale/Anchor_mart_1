# Flow 18 — Referral & Loyalty Points Earning


> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`18-referral-loyalty-points-validation.md`](./18-referral-loyalty-points-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint is fully specified.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)


---


# Executive Summary


Two ways a sailor accrues points, both settled **on delivery** by a single background signal:


1. **Loyalty** — the buyer earns `points_per_delivery` on **every** delivered order (once per order).
2. **Referral** — the referrer earns `points_per_referral` when a sailor **they referred** completes
  their **first** successful delivery (once per referred user).


The referral half is a full sub-flow: a new sailor gets a unique `referral_code` at sign-up, sees a
share link/message, invites friends by email (existing accounts are skipped), and an invitee applies the
code (or skips with the `NOREFERRAL` sentinel) on an optional post-OTP screen. Points are **granted by a
`post_save` signal on `Order`** the moment status becomes `delivered`, each grant **idempotent via a
marker `reason` string**, with amounts read from the admin `LoyaltyConfig` singleton (a configured `0`
makes the grant a silent no-op). Balances and a filtered ledger are readable; on **referral** ledger
rows the friend's **order number is hidden** and their **name shown** instead.


| | |
|---|---|
| **Actors** | Customer (referrer + referred) · Background System (grant signal) |
| **Endpoints** | **5** — 3 referral (`/api/v1/user/referral/…`) · 2 points (`bonus-points`, `bonus-points-history`) |
| **Django Apps** | `user` (referral code/share/apply/invite), `promotion` (points models, balance/history, grant), `messaging` (invite email) |
| **Models** | `User` (`referral_code`, `referred_by`), `BonusPoints` (per user+type balance), `BonusPointHistory` (ledger), `LoyaltyConfig` (singleton amounts) |
| **Trigger** | Sign-up (code issued) · apply/invite (referral wiring) · **an order reaching `delivered`** (the actual earning) |
| **Previous Flow** | 2 (Account — sign-up issues the code) · 10 (Delivery — produces the `delivered` that grants) |
| **Next Flow** | 8 (Discounts — points are redeemed against a bill; `point_value` sets their $ worth) |
| **Documentation Version** | 1.0 — 2026-07-27 |
| **Documentation Status** | ✅ 5 routes fully specified here, verified against the running route table + serializers |


> **The load-bearing rule:** points are earned **only on `delivered`**, and each grant is guarded by an
> **idempotent marker `reason`** — loyalty keyed on the *order*, referral keyed on the *referred user*
> (their id is embedded in the reason string) — so replays and re-saves never double-credit. Self-referral
> is blocked (`referred_by == self` is the skip sentinel and is ignored by the grant).


---


# Core concepts


**Referral code.** Issued once at sign-up (`generate_referral_code` — a random unique 8-char code);
`get_or_create_referral_code` self-heals a missing one on first read, so `MyReferral` always has a code.


**`referred_by` (self as sentinel).** A brand-new user's `referred_by` is null. Applying a code sets it
to the referrer; **skipping** (`NOREFERRAL`) sets it to **self**. The grant signal treats
`referred_by == self` as "no referrer". A user can be referred by *someone else* only **once**, but a
self-referred (skipped) user may still later apply a real code.


**`LoyaltyConfig` singleton** — `points_per_delivery`, `points_per_referral`, and `point_value` (the $
worth of one point, used by Flow 8 redemption). Always loaded via `LoyaltyConfig.load()`. Any amount of
`0` makes that grant a no-op.


**`BonusPoints` vs `BonusPointHistory`.** `BonusPoints` is the running **balance**, one row per
`(user, type)` where type ∈ {`loyalty`, `referral`}. `BonusPointHistory` is the **ledger** (earned /
redeemed / deducted / expired). `grant_points()` writes both together so they never drift.


---


# Endpoints — full specification


**Headers:** `Authorization: Token <token>` + `server-secret-key: <SERVER_SECRET_KEY>` on all calls
(these are `/api/v1/` + `/api/promotion/` — not exempt). All are `IsAuthenticated` and scoped to the
caller.


---


## 1 · `GET /api/v1/user/referral/` — My referral code, share payload & referred list


No params. **Response `200`:**
```json
{ "message": "Referral details",
 "referral_code": "A1B2C3D4",
 "share_link": "https://app.anchormart…/signup?ref=A1B2C3D4",
 "share_message": "Join me on Anchor Mart… Use my referral code A1B2C3D4 or sign up here: …",
 "total_referrals": 2,
 "referrals": [ { "email": "friend@x.io", "first_name": "Pat", "joined_at": "July 27, 2026, 03:14 PM" } ] }
```
`share_link` is empty if `FRONTEND_URL` isn't configured. `referrals` lists sailors who applied this
code (the caller's own self-referral is excluded). **Errors** — `401` auth · `500` wrapped generic.


---


## 2 · `POST /api/v1/user/referral/apply/` — Apply a referral code (or skip)


Shown as an optional post-OTP screen. **Request body**


| Field | Type | Required | Rule |
|---|---|---|---|
| `referral_code` | string | ✅ | A real code, **or** the literal `"NOREFERRAL"` to skip. |


**Behaviour & responses**


| Case | Status | Body |
|---|---|---|
| Valid code, caller not yet referred | **200** | `{ "message": "Referral code applied successfully", "referred_by": { "first_name": "...", "referral_code": "..." } }` |
| `"NOREFERRAL"` (skip) | **200** | `{ "message": "Referral code skipped" }` (sets `referred_by = self`) |
| Missing `referral_code` | **400** | `{ "error": "Referral code is required" }` |
| Caller already referred by someone else | **400** | `{ "error": "A referral code has already been applied to your account" }` |
| Unknown code, or the caller's own code (self-referral) | **400** | `{ "error": "Invalid referral code" }` |


The referrer must be an **active** account for the code to resolve. A skipped user may still apply a real
code later (skip = self, which is replaceable).


---


## 3 · `POST /api/v1/user/referral/invite/` — Invite friends by email


**Request body** — one or many addresses:
```json
{ "emails": ["a@x.io", "b@x.io"] }      // or { "email": "a@x.io" }
```
Addresses are normalised (lower-cased, trimmed), validated, and de-duplicated; invalid ones are dropped.
Each address that **doesn't already have an account** is emailed a referral invite (queued through the
messaging subsystem); addresses that already have an account are **skipped**.


**Response `200`:**
```json
{ "message": "Invitations processed", "referral_code": "A1B2C3D4",
 "sent": ["b@x.io"], "skipped_existing_users": ["a@x.io"] }
```
**Errors** — `400` `{ "error": "Provide at least one valid email address" }` (none valid) · `401` · `500`.


---


## 4 · `GET /api/v1/user/bonus-points/<bonus_type>/` — Points balance


`<bonus_type>` ∈ {`loyalty`, `referral`} (also accepted as `?bonus_type=`; **omit for the combined
balance across both types**). Also reachable at `GET /api/promotion/user/bonus-points/`.


**Response `200`:**
```json
{ "message": "Loyalty bonus points", "total_points": 120,
 "bonus_points": [ { "id": "…", "points": 120, "type": "loyalty", … } ] }
```
**Errors** — `400` `{ "detail": "Invalid bonus_type. Allowed values: referral, loyalty." }` · `401`.


---


## 5 · `GET /api/promotion/user/bonus-points-history/` — Points ledger


Paginated (`page` / `page_size`, default 10 / max 50), newest first. **Query params** (optional):
`bonus_type` = `loyalty|referral`; `action` = `earned` | `spent` (`spent` = redeemed + deducted +
expired).


**Response `200`** — paginated; each row:
```json
{ "id": "…", "points": 20, "direction": "+", "action": "earned", "action_display": "Earned",
 "type": "referral", "reason": "Referral reward — referred user …'s first delivery.",
 "order_number": null, "referred_user": "Pat Kereszturi", "created_at": "July 27, 2026, 03:14 PM" }
```
- `direction` is `+` for credits (earned/refunded), `-` for debits.
- **Refunds** (logged as EARNED with a `Refund…` reason) surface as `action: "refunded"`.
- **Privacy:** on **referral** rows `order_number` is `null` and `referred_user` carries the friend's
 name — the referrer sees *who* they earned from, never the friend's order number. On non-referral rows
 `order_number` is the tied order and `referred_user` is `null`.


**Errors** — `401` auth.


---


# The earning mechanism — `grant_points_on_delivery` (background)


A `post_save` receiver on `Order` (`dispatch_uid="points_on_delivery"`), fires on **every** save and
early-returns unless `status == delivered`:


1. **Loyalty → buyer, once per order.** Idempotency: a `BonusPointHistory` keyed on
  `(order, LOYALTY, EARNED, reason="Loyalty points for delivered order.")` must not already exist.
2. **Referral → referrer, once per referred user's first delivery.** Skipped if the buyer has no
  referrer or is self-referred (`referred_by == self`). Idempotency: a `BonusPointHistory` keyed on
  `(referrer, REFERRAL, EARNED, reason="Referral reward — referred user {buyer.id}'s first delivery.")`
  — the buyer's id in the reason makes it once-per-referred-user, across all their orders.


`grant_points()` credits the `BonusPoints` balance (`F("points") + n`) **and** appends the
`BonusPointHistory` row in one place, so balance and ledger never diverge. Amounts come from
`LoyaltyConfig.load()`; `points <= 0` is a no-op.


---


# Data model touchpoints


| Model | Role |
|---|---|
| `User` | `referral_code` (unique, issued at sign-up), `referred_by` (FK to the referrer; **self = skipped**; `related_name="referrals"`). |
| `BonusPoints` | Running balance, one row per `(user, type)`; `type` ∈ {loyalty, referral}. |
| `BonusPointHistory` | Append-only ledger (`earned`/`redeemed`/`deducted`/`expired`), `reason` (the idempotency marker), optional `order` FK (`SET_NULL`). |
| `LoyaltyConfig` | Singleton amounts: `points_per_delivery`, `points_per_referral`, `point_value` ($/point for Flow 8). |


**Django admin:** `LoyaltyConfig` (delivery/referral/point_value), `BonusPoints`, `BonusPointHistory`
are all registered under `promotion/admin.py`.


---


# How Flow 18 connects


- **Upstream — Flow 2 (Account):** sign-up issues the `referral_code` and shows the optional
 apply-a-code screen (`show_referral_screen` = new user without a referrer).
- **Upstream — Flow 10 (Delivery):** the transition to `delivered` is the *only* thing that grants —
 both loyalty and referral points settle there via the `post_save` signal.
- **Downstream — Flow 8 (Discounts):** earned points are redeemed against a bill; `LoyaltyConfig.
 point_value` sets their monetary worth. See [[rewards-loyalty-rules]].
- **Sibling — messaging:** the invite email is queued through the messaging subsystem (retried, logged).



