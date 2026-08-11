# Flow 30 — Promotion & Loyalty Administration (Coupons → Assignments → Points)

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`30-promotion-loyalty-validation.md`](./30-promotion-loyalty-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint is fully specified.
>
> Index: [`../../BUSINESS_FLOWS.md`](../../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

---

# Executive Summary

The admin's control panel for the **discount and rewards economy** — everything that reduces
what a sailor pays. Three independent surfaces sharing one module:

1. **Coupons** — create, edit, soft-delete and report on discount codes.
2. **Coupon assignments** — hand a *private* coupon to named users.
3. **Loyalty & bonus points** — the platform-wide points rules, manual grants and deductions,
   the per-user ledger, and the programme-wide overview.

Two ideas shape everything here:

- **`ProductVariant.price` decides what things cost; this flow decides what comes off.** A
  coupon's `discount_type` (percentage / fixed / free shipping) says *how much*, and
  `applies_to` (delivery / items subtotal / order total) says *what it comes off*. Those two
  fields together are the entire cost of a coupon.
- **Points are money.** `LoyaltyConfig.point_value` is the dollar worth of one point, so a
  manual grant of 1,000 points at `point_value = 0.50` hands out $500 of purchasing power.
  Points are spent at checkout (Flow 8), and both **loyalty and referral** balances are
  spendable.

| | |
|---|---|
| **Actors** | Admin · Super Admin (identical rights — there is no per-object ownership gate in this flow) |
| **Endpoints** | **15** — 8 coupon · 3 loyalty · 4 bonus points |
| **Django Apps** | `admin_panel` (views + serializers), `promotion` (models) |
| **Models** | `Coupon`, `CouponAssignment`, `CouponUsage`, `LoyaltyConfig`, `BonusPoints`, `BonusPointHistory`, `AuditLog` |
| **Trigger** | Admin opens Promotions / Rewards & Coupons |
| **Previous Flow** | 26 (media upload — the coupon image arrives as a *path*) |
| **Next Flow** | 8 (sailor applies a coupon / points at checkout) · 18 (points earned automatically) |
| **Documentation Version** | 1.2 — 2026-08-07 (`max_discount_amount` now required for percentage coupons on create / switch-to-percentage, shipped 2026-08-07). 1.1 — 2026-07-30 (post-remediation) |
| **Documentation Status** | ✅ 15 routes fully specified. Routes taken from the running route table; **behaviour verified by EXECUTING every endpoint** against a real database (151 calls / observations, 2026-07-30) — not inferred from source. **Revised 2026-07-30** for the GB1 / GB3 / GB4 / GB5 / GB6 / GB7 / GB8 / GB9 / GB10 / GB11 fixes — **10 of the 11 findings**, all locked by permanent tests in `admin_panel/tests/test_promotion_remediation.py` (62 tests; **43 verified red pre-fix**). |

---

## ⚠️ Every route in this flow is mounted **twice**

The same `promotion_urls.py` module is included from two places, so **every** path below
answers at both prefixes, with identical behaviour (verified by execution on the list, config
and overview endpoints):

| Mount | Example |
|---|---|
| **`/api/superadmin/promotion/…`** *(canonical — used throughout this doc)* | `/api/superadmin/promotion/coupons/` |
| `/api/superadmin/orders/…` *(alias)* | `/api/superadmin/orders/coupons/` |

They are the **same view instances**, not copies. Pick one prefix and use it consistently.

**Evidence:** `admin_panel/urls/__init__.py` mounts `promotion_urls` at `promotion/`;
`admin_panel/urls/orders_urls.py` includes the same module at its own root.

---

## Flow boundary — what is *not* here

`promotion_urls.py` also carries **8 Deal-of-the-Day endpoints** (`deals/…`,
`deals-of-day/`). Deals are a separate business journey and are documented in
**[Flow 19 — Deal of the Day](../Wave6/19-deal-of-the-day.md)**, not here.

The **sailor-facing** halves of this economy are elsewhere too:

| Surface | Flow |
|---|---|
| `GET /api/promotion/get-coupons/`, `validate-coupon/`, `my-coupon-usage/` | 8 |
| `apply-coupon` / `remove-coupon` / `apply-points` / `remove-points` on an order | 8 |
| `GET /api/promotion/user/bonus-points/`, `bonus-points-history/` | 18 |
| Automatic point grants on delivery and referral | 18 |

---

# Concepts you need before reading the endpoints

### Reward type × target — the compatibility matrix

`discount_type` and `applies_to` are **both required on create** and are validated against each
other. Not every pairing is legal:

| `discount_type` | Allowed `applies_to` |
|---|---|
| `percentage` | `delivery` · `items` · `order_total` |
| `fixed` | `delivery` · `items` · `order_total` |
| **`free_shipping`** | **`delivery` only** |

A rejected pairing is a **400** keyed on `applies_to`:

```json
{ "applies_to": ["Free Shipping coupons can only apply to: Delivery / Shipping."] }
```

Free shipping is delivery-only by design — pairing it with `items` or `order_total` would zero
the whole subtotal. The rule lives once, on `Coupon.COMPATIBILITY_MATRIX`, and is enforced in
**both** `Coupon.clean()` (Django admin) **and** the serializer (the API path, which never calls
`full_clean()`).

### What each target means at checkout

| `applies_to` | The discount is subtracted from |
|---|---|
| `delivery` | `order.shipping_fee` |
| `items` | `order.subtotal` |
| `order_total` | `subtotal + shipping_fee + tax_amount + platform_fee` |

### Public vs assigned

| `is_public` | Who can redeem |
|---|---|
| `true` *(default)* | Everyone. **Assignments are not consulted at all.** |
| `false` | Only users with a `CouponAssignment` row for that coupon. |

### Points: two types, one wallet

| `BonusPoints.type` | Granted by |
|---|---|
| `loyalty` | Order delivery (Flow 18), refunds of reserved points, manual admin grants |
| `referral` | A referred user's first delivery (Flow 18), manual admin grants |

At checkout **both types are spendable** — `orders.discounts.available_points()` sums every
`BonusPoints` row for the user regardless of type. **Every admin surface counts both types
too** (§11 overview, §15 ledger): they are one wallet, not two currencies. That was settled as
**CROSS-FLOW-7** on 2026-07-30; before it, the overview reported `loyalty` rows only and
understated the platform's obligation by the whole referral balance.

Balances live on `BonusPoints` (one row per user per type). Every change also writes a
`BonusPointHistory` row (`earned` / `redeemed` / `deducted` / `expired`), which is what the
per-user ledger endpoint (§15) reads.

### Coupon images are paths, not uploads

Like every other image in this system, the coupon image is a **relative path string** produced
by the Flow 26 presigned upload — never a file. The directory segment is fixed and validated:

| Object | Required path prefix |
|---|---|
| Coupon image | `coupon_images/` |

`"coupon_images/abc.jpg"` ✅ · `"totally/wrong/x.jpg"` ❌ 400 · `"coupon_images_evil/x.jpg"` ❌ 400.

### Soft delete

Coupons are soft-deleted — all four `GenericModel` fields are set: `is_deleted=True`,
`is_active=False`, `deleted_at`, `deleted_by`. Every list and lookup filters `is_deleted=False`,
so a deleted coupon 404s on update and delete. **Coupon assignments are the exception —
`DELETE assignments/<id>/` is a hard delete**, the row is gone.

---

# Endpoints — full specification

**Headers:** `Authorization: Token <token>` — role `admin` or `super_admin`.
`/api/superadmin/` is **exempt** from the `server-secret-key` middleware — do **not** send it.
All 15 endpoints are `IsAuthenticated + IsAdminUser` (role-based, not `is_staff`).

| Caller | Result |
|---|---|
| No token | **401** `{"detail": "Authentication credentials were not provided."}` |
| Customer / seller / partner token | **403** `{"detail": "You do not have permission to perform this action."}` |
| `admin` (sub-admin) | **200** — same rights as super admin throughout this flow |

**Pagination** (every list endpoint): `page`, `page_size` — default **10**, max **50**. The
envelope is the plain DRF shape — note there is **no** `{message, data}` wrapper here, unlike
the catalog endpoints in Flow 29:

```json
{ "count": 42, "next": "…?page=2", "previous": null, "results": [ /* rows */ ] }
```

An out-of-range or non-numeric `page` returns **404** `{"detail": "Invalid page."}`.
A wrong HTTP verb returns **405** `{"detail": "Method \"POST\" not allowed."}`.

---

## Coupons

## 1 · `GET /api/superadmin/promotion/coupons/` — List coupons

Lists all non-deleted coupons.

| Query param | Type | Allowed values | Default | Meaning |
|---|---|---|---|---|
| `search` | string | free text | — | Case-insensitive match on **`title` OR `code`**. **`description` is NOT searched.** |
| `is_active` | string | `true` `1` `yes` `t` / `false` `0` `no` `f` (case-insensitive); **anything else → 400** | unset = no filter | Filter by the manual on/off switch. Does **not** consider dates. |
| `page` | int | ≥ 1 | 1 | |
| `page_size` | int | 1–50 | 10 | |

Ordered **newest first** (`-created_at`).

**Rejected boolean** — `?is_active=nope`:
```json
{ "is_active": ["Must be a boolean. Expected one of: 0, 1, f, false, no, t, true, yes (case-insensitive). Got 'nope'."] }
```

**Response `200`** — every `Coupon` field (the serializer is `fields = "__all__"`), so rows are
wider than the create/update contract:

```json
{
  "id": "9a2f…",
  "code": "PROBE10",
  "title": "Probe coupon",
  "description": "Food and dry stores",
  "image": "http://localhost:8000/media/coupon_images/abc.jpg",
  "discount_type": "percentage",
  "discount_value": "10.00",
  "applies_to": "delivery",
  "min_purchase_amount": "0.00",
  "max_discount_amount": null,
  "valid_from": "2026-07-29T11:01:20.760930Z",
  "valid_to": "2026-08-29T11:01:20.760930Z",
  "usage_limit": null,
  "per_user_usage_limit": 1,
  "times_used": 0,
  "is_public": true,
  "first_time_user_only": false,
  "is_active": true,
  "stackable_with_loyalty": true,
  "is_deleted": false, "deleted_at": null, "deleted_by": null, "deleted_reason": null,
  "created_at": "July 30, 2026, 11:01 AM",
  "updated_at": "July 30, 2026, 11:01 AM"
}
```

- `image` — absolute URL when `DEBUG=True` (`LOCAL_HOST_URL` + media path), the storage URL
  otherwise; `null` when unset.
- `created_at` / `updated_at` — display strings; every other datetime is raw ISO-8601.
- `times_used` — the number of recorded redemptions, counted from the `CouponUsage` rows.
  **The same derivation the report in §5 uses** (GB11, 2026-07-30) — before that this endpoint
  published the `Coupon.times_used` counter column while the report counted rows, so one field
  name had two sources.
- `first_time_user_only` — writable on create and update since **GB7** (2026-07-30); before
  that it was readable here but silently dropped by both write serializers.

> **There is no coupon-detail endpoint.** To show one coupon, filter this list by its `code`
> (`?search=SUMMER20`) or read the row you already hold. This is a deliberate set-difference
> against the route table, not an omission in this doc.

---

## 2 · `POST /api/superadmin/promotion/coupons/add/` — Create a coupon

| Field | Type | Required | Rule |
|---|---|---|---|
| `code` | string | ✅ | Max 50. **Unique across all coupons, including soft-deleted ones.** Normalised to **UPPER-CASE and stripped before validation** (`" summer 1 "` → `"SUMMER 1"`), so uniqueness is case-insensitive in effect: `summer20` collides with a stored `SUMMER20` and returns a clean `400` (GB4, 2026-07-30). |
| `title` | string | ❌ | Max 100. User-facing name. Defaults to `""`. |
| `description` | string | ❌ | Free text. Defaults to `""`. |
| `image` | string | ❌ | Path must start with **`coupon_images/`**, else 400. Blank allowed. |
| `discount_type` | choice | ✅ | `percentage` · `fixed` · `free_shipping`. **No default — must be chosen.** |
| `applies_to` | choice | ✅ | `delivery` · `items` · `order_total`. **No default — must be chosen.** Checked against `discount_type` (matrix above). |
| `discount_value` | decimal | conditional | Max 12 digits, 2dp. **Required and > 0** for `percentage` and `fixed`; **must be ≤ 100** for `percentage`. **Ignored for `free_shipping`** (send `null` or omit). |
| `min_purchase_amount` | decimal | ❌ | Default `0`. Minimum **items subtotal** before the coupon may be used. **Cannot be negative** (GB9). |
| `max_discount_amount` | decimal \| null | **conditional** | Cap on the discount. **REQUIRED when `discount_type = percentage`** (since 2026-08-07 — see below). **Only valid** when `discount_type = percentage` (400 otherwise) and **must be > 0**. Silently forced to `null` on save for non-percentage coupons. |
| `valid_from` | datetime | ✅ | ISO-8601. |
| `valid_to` | datetime | ✅ | ISO-8601, **must be after `valid_from`**. A **date-only** value (`"2026-08-02"`, exactly 10 chars) is stored as **23:59:59 of that day** in the current timezone. |
| `usage_limit` | int \| null | ❌ | Total redemptions across all users. **`null` is the only spelling of unlimited**; a number must be **≥ 1** (GB9). |
| `per_user_usage_limit` | int | ❌ | Default **1**. How many times one user may redeem it. Must be **≥ 1** — there is no unlimited value (GB9). |
| `is_public` | bool | ❌ | Default **`true`**. `false` = redeemable only by assigned users (§7). |
| `is_active` | bool | ❌ | Default **`true`**. Manual kill switch, independent of the dates. |
| `stackable_with_loyalty` | bool | ❌ | Default **`true`**. Whether the coupon may combine with points on the same order. |
| `first_time_user_only` | bool | ❌ | Default **`false`**. `true` = only users with **no prior paid order** may redeem it. Writable since GB7 (2026-07-30). |
| `times_used` | — | — | **Read-only.** Sending it is silently ignored. |
| `is_deleted` | — | — | **Read-only.** |

> ### A percentage coupon must state its ceiling
>
> **Changed 2026-08-07.** `max_discount_amount` was optional, and was set on **none** of the
> coupons in the database — so a percentage coupon was unbounded on a large order (90% off a
> $38,000 order is a $34,000 discount, and nothing objected). It is now required in exactly two
> situations:
>
> | Request | Cap required? |
> |---|---|
> | **Create** a `percentage` coupon | ✅ Yes |
> | **Update** that changes `discount_type` **to** `percentage` | ✅ Yes — the row cannot be carrying one, since `Coupon.save()` nulls the field for non-percentage types |
> | **Update** any other field on a coupon that is **already** `percentage` | ❌ No |
> | Any `fixed` / `free_shipping` coupon | ❌ No — and sending one is still a 400 |
>
> **Existing uncapped percentage coupons stay editable**, deliberately: this module validates
> *what is being written*, not history, and requiring a cap on every update would make renaming
> one — or changing its dates — impossible. Back-filling caps onto live campaigns is a separate
> business decision.
>
> ⚠️ **Known residual gap, left open by that decision:** raising `discount_value` on an
> already-percentage uncapped coupon (55% → 90%) counts as an unrelated-field edit under this
> rule, so it is allowed and the coupon stays uncapped.
>
> The rule lives on the model as `Coupon.requires_discount_cap()` /
> `Coupon.DISCOUNT_CAP_REQUIRED_MESSAGE` and is enforced in **both** `clean()` and the
> serializer's `validate()` — per CLAUDE.md §4, a rule living only in `clean()` protects the
> Django admin and is silently skipped by every DRF write. The Django admin applies it on
> **create only**, matching the API's grandfathering, so existing uncapped coupons don't become
> read-only there either.

Coupons **may be created entirely in the past** (`valid_from` and `valid_to` both historic) —
this returns `201` and produces an immediately-expired coupon.

```json
{
  "code": "SUMMER20",
  "title": "Summer Sale 20% Off",
  "description": "20% off delivery, capped at $25",
  "image": "coupon_images/summer.jpg",
  "discount_type": "percentage",
  "discount_value": "20.00",
  "applies_to": "delivery",
  "min_purchase_amount": "50.00",
  "max_discount_amount": "25.00",
  "valid_from": "2026-08-01T00:00:00Z",
  "valid_to": "2026-08-31",
  "usage_limit": 500,
  "per_user_usage_limit": 1,
  "is_public": true,
  "stackable_with_loyalty": true
}
```

**Response `201`** — the created coupon, in the **narrower write shape** (20 keys: `id`, `code`,
`title`, `description`, `image`, `discount_type`, `discount_value`, `applies_to`,
`min_purchase_amount`, `max_discount_amount`, `valid_from`, `valid_to`, `usage_limit`,
`per_user_usage_limit`, `times_used`, `is_public`, `first_time_user_only`, `is_active`,
`stackable_with_loyalty`, `is_deleted`). Note it does **not** carry `created_at` or
`updated_at` — re-read via §1 if the screen needs those.

**Errors**

| Status | Body | Cause |
|---|---|---|
| `400` | `{"code": ["Coupon with this code already exists."]}` | Duplicate code, **same case** |
| `400` | `{"discount_type": ["This field is required."], "applies_to": ["This field is required."]}` | Either omitted |
| `400` | `{"valid_from": ["This field is required."], "valid_to": ["This field is required."]}` | Either omitted |
| `400` | `{"discount_value": ["Discount value is required for this discount type."]}` | Percentage/fixed with no value |
| `400` | `{"discount_value": ["Discount value must be greater than 0."]}` | `0` or negative |
| `400` | `{"discount_value": ["Percentage discount value cannot exceed 100."]}` | `> 100` on a percentage coupon |
| `400` | `{"applies_to": ["Free Shipping coupons can only apply to: Delivery / Shipping."]}` | Matrix violation |
| `400` | `{"max_discount_amount": ["A discount cap only applies to percentage coupons."]}` | Cap on a fixed / free-shipping coupon |
| `400` | `{"max_discount_amount": ["Discount cap must be greater than 0."]}` | Cap of `0` |
| `400` | `{"max_discount_amount": ["A maximum discount amount is required for percentage coupons — without one the discount is unbounded on a large order."]}` | **New 2026-08-07** — creating a `percentage` coupon with no cap, or switching a coupon to `percentage` without supplying one |
| `400` | `{"valid_to": ["valid_to must be after valid_from."]}` | Inverted window |
| `400` | `{"image": ["Image must be in the coupons directory."]}` | Wrong path prefix |
| `400` | `{"usage_limit": ["Must be at least 1, or null for unlimited — a limit of 0 would stop the coupon from ever being redeemed."]}` | `0` |
| `400` | `{"per_user_usage_limit": ["Must be at least 1 — a limit of 0 would stop every user from redeeming the coupon."]}` | `0` |
| `400` | `{"min_purchase_amount": ["Minimum purchase amount cannot be negative."]}` | Negative threshold |
| `400` | `{"usage_limit": ["Ensure this value is greater than or equal to 0."]}` | Negative limit |

> **Codes are compared case-insensitively.** `"summer20"`, `"SuMmEr20"` and `"  SUMMER20 "`
> all collide with a stored `SUMMER20` and return the `400` above. (Before GB4, 2026-07-30,
> a case-variant duplicate returned an uncaught **500** — the code was normalised only after
> the uniqueness check had already passed.)

**Audit.** A successful create writes an `AuditLog` entry (`COUPON_CREATED`) recording the
actor, the code, the discount type and the value.

---

## 3 · `PUT` / `PATCH` `/api/superadmin/promotion/coupons/update/<uuid:pk>/` — Update

**Both verbs are partial** — send only what changes; omitted fields are untouched. Every field
listed in §2 is writable here with the same rules, except that all are optional. Cross-field
rules are re-checked against the **stored** values, so `PATCH {"applies_to": "items"}` on a
free-shipping coupon is rejected even though `discount_type` isn't in the payload.

`times_used` and `is_deleted` are **not** writable here.

**Response `200`** — the §2 write shape.

**Errors** — every §2 error, plus:

| Status | Body | Cause |
|---|---|---|
| `404` | `{"detail": "No Coupon matches the given query."}` | Unknown id, **or an already soft-deleted coupon** |
| `400` | `{"code": ["Coupon with this code already exists."]}` | Renaming onto another coupon's code, in **any** case (this coupon is excluded, so re-sending its own code — in any case — is fine) |
| `400` | `{"max_discount_amount": ["A maximum discount amount is required for percentage coupons — …"]}` | **New 2026-08-07** — the payload sets `discount_type` to `percentage` and supplies no cap. **Not** raised when editing a coupon that is already `percentage`; see §2 |

**Audit.** An update writes `COUPON_UPDATED` **only when one of these fourteen fields actually
changed** — the list lives on the model as `Coupon.AUDITED_FIELDS`:

| Group | Fields |
|---|---|
| What it pays out | `code`, `discount_type`, `discount_value`, **`applies_to`**, `min_purchase_amount`, **`max_discount_amount`** |
| When it pays out | `valid_from`, `valid_to`, `is_active` |
| How often, and to whom | `usage_limit`, `per_user_usage_limit`, `is_public`, `first_time_user_only`, `stackable_with_loyalty` |

The entry carries a `{"changed": {"field": {"from": …, "to": …}}}` diff. Cosmetic edits
(`title`, `description`, `image`) write **no** entry — deliberately, so the trail stays a
record of money and eligibility changes.

> `applies_to` and `max_discount_amount` were **missing** from this list until GB6
> (2026-07-30), so switching a 50% coupon from `delivery` to `order_total` used to leave no
> trace at all.

---

## 4 · `DELETE /api/superadmin/promotion/coupons/delete/<uuid:pk>/` — Soft-delete

No body, no query params.

Sets all four `GenericModel` soft-delete fields: `is_deleted=True`, `is_active=False`,
`deleted_at` = now, `deleted_by` = the acting admin. (Only the first two were set before GB10,
2026-07-30, so anything reading the table rather than the audit chain saw `deleted_at: null`.)

**Response `200`:** `{"message": "Coupon deleted successfully."}`

**Side effects and non-effects:**

- The coupon disappears from §1, §5 and every sailor-facing list.
- `CouponAssignment` rows **survive** — nothing cascades.
- Historic `CouponUsage` rows survive, so past redemptions stay attributable.
- **The code is not released.** Codes are unique unconditionally, so re-creating a coupon with
  a deleted coupon's code returns `400`.

**Errors** — `404` `{"detail": "No Coupon matches the given query."}` for an unknown or
already-deleted coupon.

**Audit.** Writes `COUPON_DELETED` with a snapshot of the coupon's money fields.

---

## 5 · `GET /api/superadmin/promotion/coupons/report/` — Coupon-wise usage report

The "how did each coupon perform" table. Aggregates are computed with correlated subqueries
over `CouponUsage` (no JOIN fan-out).

| Query param | Type | Allowed values | Default | Meaning |
|---|---|---|---|---|
| `search` | string | free text | — | Case-insensitive match on **`code` OR `title`**. |
| `page` / `page_size` | int | 1–50 | 10 | |

There is **no** status, date or `is_active` filter — unknown params are ignored and the full
non-deleted set is returned. Ordered by **`used_count` descending, then newest first**.

**Response `200`** — a deliberately narrow presentation row (9 keys), not the §1 shape:

```json
{
  "id": "f0ba…",
  "code": "REPORT1",
  "title": "Report coupon",
  "discount": "10%",
  "applicable_to": "All users",
  "times_used": 2,
  "total_discount_given": "20.00",
  "revenue_impact": "200.00",
  "status": "active"
}
```

| Field | How it is derived |
|---|---|
| `discount` | `"10%"` for percentage · `"$5"` for fixed · `"Free shipping"` for free-shipping. Pre-formatted string, trailing zeros stripped. |
| `applicable_to` | `"All users"` when `is_public`, else `"N assigned user(s)"` (singular/plural handled). |
| `times_used` | **`COUNT(CouponUsage)`** for this coupon. §1 now derives it the same way, so both screens agree by construction (GB11). |
| `total_discount_given` | `SUM(CouponUsage.discount_amount)` — money handed back, snapshotted at redemption. |
| `revenue_impact` | `SUM(CouponUsage.order_amount)` — the **gross order value** of orders where this coupon was used. It is order volume attributed to the coupon, not profit or net. |
| `status` | Derived live, in this order: `inactive` (`is_active=false`) → `expired` (`now > valid_to`) → `scheduled` (`now < valid_from`) → `active`. |

Refunds keep this report honest: `reverse_redemption` deletes the usage rows and decrements the
counter, so a refunded order stops counting toward both `times_used` and the money columns.

---

## 6 · `GET /api/superadmin/promotion/coupons/assignments/` — List assignments

Who holds which private coupon.

| Query param | Type | Allowed values | Default | Meaning |
|---|---|---|---|---|
| `coupon_id` | UUID | a coupon id | — | Filter to one coupon. |
| `user_id` | UUID | a user id | — | Filter to one user. |
| `page` / `page_size` | int | 1–50 | 10 | |

**No `search`.** Ordered by **`assigned_at` descending**. Assignments for **soft-deleted
coupons are still listed** — the queryset is unfiltered.

**Response `200`:**

```json
{
  "id": 1,
  "coupon": "b298…",
  "coupon_code": "PRIVATE1",
  "user": "ebbe…",
  "user_email": "sailor@example.com",
  "assigned_at": "2026-07-30T11:01:21.155670Z"
}
```

> `id` is an **integer**, not a UUID — assignments use the default auto primary key. §8 takes
> that integer.

**Errors** — a malformed id is a **400** keyed on the offending parameter (GB5, 2026-07-30;
previously an uncaught **500**):

```json
{ "coupon_id": ["Must be a valid UUID. Got 'garbage'."] }
```

---

## 7 · `POST /api/superadmin/promotion/coupons/assignments/add/` — Assign a coupon to a user

| Field | Type | Required | Rule |
|---|---|---|---|
| `coupon` | UUID | ✅ | Must be an existing coupon that is **`is_public = false`** and **not soft-deleted**. An **expired** coupon is accepted. |
| `user` | UUID | ✅ | Must be an existing **customer** account that is not soft-deleted. A **blocked** (`is_active=false`) customer is accepted. |

```json
{ "coupon": "b298…", "user": "ebbe…" }
```

**Response `201`** — the §6 row shape.

**Errors**

| Status | Body | Cause |
|---|---|---|
| `400` | `{"coupon": ["This coupon is public — every user can already use it, so assigning it would have no effect. Set is_public=false first."]}` | Public coupon |
| `400` | `{"coupon": ["This coupon has been deleted and cannot be assigned."]}` | Soft-deleted coupon |
| `400` | `{"user": ["Coupons can only be assigned to customer accounts; this account is a 'delivery_partner'."]}` | Seller, partner or admin target |
| `400` | `{"user": ["This account has been deleted and cannot be assigned a coupon."]}` | Soft-deleted user |
| `400` | `{"message": ["The fields coupon, user must make a unique set."]}` | This user already holds this coupon |
| `400` | `{"user": ["This field is required."]}` | Missing |
| `400` | `{"user": ["Invalid pk \"…\" - object does not exist."]}` | Unknown user id |
| `400` | `{"user": ["“abc” is not a valid UUID."]}` | Malformed id |

> **Two things are deliberately still allowed** (GB8, 2026-07-30):
> a **blocked** customer — blocking is temporary and reversible, and a blocked account cannot
> redeem anything meanwhile; and an **expired** coupon — admins assign before extending a
> window, and redemption refuses expiry at the point that matters.
>
> Before GB8 this endpoint validated nothing: assigning a **public** coupon returned `201` and
> changed nobody's eligibility, and any account of any role or state was a legal target.

---

## 8 · `DELETE /api/superadmin/promotion/coupons/assignments/<int:pk>/` — Unassign

No body. `pk` is the **integer** id from §6.

**This is a hard delete** — the row is removed, not soft-deleted, and there is no audit entry.
The user immediately loses access to the private coupon.

**Response `200`:** `{"message": "Coupon assignment removed successfully."}`

**Errors** — `404` `{"detail": "No CouponAssignment matches the given query."}` for an unknown
id; a non-integer path segment does not match the route at all and returns a plain `404`.

---

## Loyalty programme

## 9 · `GET /api/superadmin/promotion/loyalty/config/` — Read the points rules

No params. `LoyaltyConfig` is a **singleton** — the row is created with zero defaults on first
read, so this endpoint never 404s and never returns a list.

**Response `200`:**
```json
{
  "id": 1,
  "points_per_delivery": 25,
  "points_per_referral": 100,
  "point_value": "0.5000",
  "updated_at": "July 30, 2026, 11:01 AM"
}
```

| Field | Meaning |
|---|---|
| `points_per_delivery` | Points granted to the buyer when one of their orders is delivered (Flow 18). |
| `points_per_referral` | Points granted to the **referrer** when a referred sailor's first order is delivered (Flow 18). |
| `point_value` | Dollar value of **one** point, 4 decimal places. Drives the Overview's `total_value` and the checkout redemption maths. |

---

## 10 · `PUT` / `PATCH` `/api/superadmin/promotion/loyalty/config/update/` — Change the rules

No path parameter — it always writes the singleton. **Both verbs are partial**, so one rule can
be changed at a time.

| Field | Type | Required | Rule |
|---|---|---|---|
| `points_per_delivery` | int | ❌ | ≥ 0. |
| `points_per_referral` | int | ❌ | ≥ 0. |
| `point_value` | decimal | ❌ | ≥ 0, **max 4 decimal places, max 6 digits before the point**. |

`id` and `updated_at` are read-only. Unknown keys are ignored. An **empty body is accepted**
and returns `200` unchanged.

**Response `200`** — the §9 shape.

**Errors**

| Status | Body | Cause |
|---|---|---|
| `400` | `{"point_value": ["Ensure this value is greater than or equal to 0."]}` | Negative |
| `400` | `{"point_value": ["Ensure that there are no more than 4 decimal places."]}` | Too precise |
| `400` | `{"point_value": ["Ensure that there are no more than 6 digits before the decimal point."]}` | Too large |
| `400` | `{"points_per_delivery": ["Ensure this value is greater than or equal to 0."]}` | Negative |
| `400` | `{"points_per_delivery": ["A valid integer is required."]}` | Non-numeric |

> **Changing `point_value` re-prices every outstanding point immediately** — it is read live at
> checkout and by §11.

**Audit.** A change to `points_per_delivery`, `points_per_referral` or `point_value` writes a
`LOYALTY_CONFIG_CHANGED` entry to the tamper-evident trail, recording the acting admin and a
`{"changed": {"field": {"from": …, "to": …}}}` diff. A request that changes nothing (an empty
body, or the same values re-sent) writes **no** entry. Added by GB1, 2026-07-30 — before that,
re-pricing every point in the system left no record anywhere.

---

## 11 · `GET /api/superadmin/promotion/loyalty/overview/` — Programme overview cards

No params, no pagination.

**Response `200`:**
```json
{
  "points_issued": 130,
  "points_redeemed": 0,
  "outstanding_points": 90,
  "total_value": "45.00",
  "active_loyalty_users": 3,
  "rules": {
    "points_per_delivery": 25,
    "points_per_referral": 100,
    "point_value": "0.5000"
  }
}
```

| Field | Exactly what it counts |
|---|---|
| `points_issued` | `SUM(BonusPointHistory.points)` where `action = earned` — **both point types**. |
| `points_redeemed` | Same, where `action = redeemed` — **both point types**. |
| `outstanding_points` | `SUM(BonusPoints.points)` across **both types** — the live balance, not `issued − redeemed`. |
| `total_value` | `outstanding_points × point_value`, quantised to 2dp, returned as a **string**. |
| `active_loyalty_users` | Distinct users holding **any** balance **> 0**. Includes non-customer accounts if any hold points. |
| `rules` | A copy of §9, so the screen needs one call, not two. |

> ### ONE WALLET — what "loyalty" means on this screen
>
> **Every figure here covers loyalty *and* referral points** (decision 2026-07-30,
> **CROSS-FLOW-7**). They are one spendable balance: `orders.discounts.available_points()`
> sums both when a sailor pays, and a refund returns spent points as loyalty regardless of
> where they came from. So `outstanding_points` **is** what sailors can collectively spend,
> and `total_value` **is** the platform's outstanding obligation in dollars.
>
> Until 2026-07-30 every aggregate here filtered `type=loyalty`, so the liability was
> understated by the entire referral balance. A permanent test now pins
> `outstanding_points` to `available_points()` so the two definitions cannot drift apart
> again.
>
> The heading "Loyalty Programme" is therefore the name of the whole points economy on this
> screen, not of one of two currencies.

**Two scoping facts a frontend must not paper over:**

1. `issued − redeemed` will **not** equal `outstanding_points` — admin deductions and resets are
   recorded as `deducted`, which no field on this response reports.
2. Blocked and soft-deleted users' balances are still counted.

---

## Bonus points

## 12 · `GET /api/superadmin/promotion/bonus-points/` — Users ranked by points

One row per user **who has at least one `BonusPoints` row**. A user who has never earned or been
granted anything does not appear at all.

| Query param | Type | Allowed values | Default | Meaning |
|---|---|---|---|---|
| `search` | string | free text | — | Case-insensitive match on **`email` OR `first_name` OR `last_name`**. |
| `user_id` | UUID | a user id | — | Narrow to one user. |
| `page` / `page_size` | int | 1–50 | 10 | |

Ordered by **`total_points` descending**. Blocked (`is_active=false`) and soft-deleted users are
**included** — there is no state filter.

**Response `200`:**
```json
{
  "id": "ebbe…",
  "user_id": "ebbe…",
  "user_email": "sailor@example.com",
  "first_name": "", "last_name": "",
  "referral_points": 50,
  "loyalty_points": 70,
  "total_points": 120
}
```

`id` and `user_id` are the same value (the user id) — both are present for backward
compatibility. The three point columns are SQL aggregates over that user's `BonusPoints` rows.

> `?user_id=garbage` returns **`400`** `{"user_id": ["Must be a valid UUID. Got 'garbage'."]}`
> (GB5, 2026-07-30 — previously a `500`).

---

## 13 · `POST /api/superadmin/promotion/bonus-points/add/` — Grant or deduct points

One endpoint for both directions: a **positive** `points` grants, a **negative** `points`
deducts.

| Field | Type | Required | Rule |
|---|---|---|---|
| `user_id` | UUID | ✅ | Must exist. **Any role is accepted** — including admin and delivery-partner accounts. |
| `type` | string | ✅ | **`loyalty`** or **`referral`** only. |
| `points` | int | ✅ | **Non-zero integer.** Positive = grant, negative = deduct. Decimals are rejected; a numeric string (`"10"`) is accepted. |

A deduction is checked against **that type's balance only** — deducting 100 loyalty points from
a user holding 70 loyalty + 50 referral is refused.

```json
{ "user_id": "ebbe…", "type": "loyalty", "points": 100 }
```

**Response `201`** — an echo of the request plus the **resulting balance for that type** in the
`points` key. It does **not** return the `BonusPoints` row id or the other type's balance:

```json
{ "user_id": "ebbe…", "type": "loyalty", "points": 70 }
```

*(Sent `-30` against a balance of 100 → the response says `70`.)*

**Errors**

| Status | Body | Cause |
|---|---|---|
| `400` | `{"points": ["Cannot deduct 5000 points. User only has 70 points."]}` | Deduction exceeds that type's balance |
| `400` | `{"points": ["Points cannot be zero."]}` | `0` |
| `400` | `{"points": ["A valid integer is required."]}` | `10.5`, or non-numeric |
| `400` | `{"type": ["Invalid type."]}` | Anything but `loyalty` / `referral` |
| `400` | `{"user_id": ["User not found."]}` | Unknown user |
| `400` | `{"user_id": ["Must be a valid UUID."]}` | Malformed id |

**Side effects.** Every call writes:

1. a `BonusPointHistory` row — `action = earned` (grant) or `deducted` (deduction), `points` =
   the **absolute** value, a fixed `reason` of `"Bonus points added by admin."` /
   `"Bonus points removed by admin."`, and **`actor` = the admin who made the call**;
2. a `POINTS_ADJUSTED` entry on the tamper-evident audit trail, chained against the **subject
   user**, carrying the actor and `{type, delta, points_before, points_after}`.

Both were added by GB1 (2026-07-30). Before that a manual grant recorded neither the acting
admin nor any audit entry, so "who gave this sailor 50,000 points?" had no answer.

> `actor` is **null** on history rows written by the automatic paths — delivery and referral
> grants, checkout redemptions, refunds. Null means "the system did it", not "unknown".

---

## 14 · `DELETE /api/superadmin/promotion/delete-bonus-points/` — Reset a user's balance to zero

Takes the user as a **query parameter**, not a path segment. There is no body.

| Query param | Type | Required |
|---|---|---|
| `user_id` | UUID | ✅ |

Sets **every** `BonusPoints` row for that user (both types) to `0`, and writes one
`BonusPointHistory` row per non-zero balance: `action = deducted`, `points` = the balance that
was wiped, `reason = "Bonus points reset by admin."`, `actor` = the acting admin.

**This is not reversible through the API** — re-granting is a fresh §13 call.

**Response `200`:** `{"message": "Bonus points reset successfully."}`

**Errors**

| Status | Body | Cause |
|---|---|---|
| `400` | `{"message": "User ID is required."}` | `user_id` omitted |
| `400` | `{"user_id": ["Must be a valid UUID. Got 'abc'."]}` | Malformed id |
| `404` | `{"detail": "No User matches the given query."}` | No such user |

> Note the *required* error uses the key **`message`**, not `detail` — an inconsistency kept
> deliberately for now because the admin panel may parse it.
>
> Since GB5 (2026-07-30) the endpoint **resolves the user**: an unknown id is a `404`, where it
> previously returned `200 "Bonus points reset successfully."` for an account that did not
> exist. A malformed id is a `400`, previously a `500`.

**Audit.** A reset that actually cleared something writes one `POINTS_ADJUSTED` entry with
`{"reset": true, "cleared": {"loyalty": 60, "referral": 40}}`. Resetting an already-empty
wallet writes **no** entry — a no-op is not an event.

Calling it twice is safe — the second call finds every balance already `0`, writes no further
history rows, and records no audit entry.

---

## 15 · `GET /api/superadmin/promotion/bonus-point-history/` — One user's points ledger

Takes the user as a **query parameter**.

| Query param | Type | Required | Meaning |
|---|---|---|---|
| `user_id` | UUID | ✅ | Whose ledger to read. |
| `page` / `page_size` | int | ❌ | 1–50, default 10. |

Ordered **newest first**. Every history row for that user is included, both types and all four
actions.

**Response `200`** — a **customised envelope**: the paginated rows are under **`history`**, not
`results`, and four totals are appended alongside `count` / `next` / `previous`:

```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "total_spent": 0,
  "total_referral_points": 50,
  "total_loyalty_points": 70,
  "total_points": 120,
  "history": [
    {
      "id": "20a3…",
      "user": "ebbe…",
      "user_email": "sailor@example.com",
      "points": 70,
      "action": "deducted",
      "type": "loyalty",
      "reason": "Bonus points removed by admin.",
      "order": null,
      "created_at": "2026-07-30T11:01:21.480912Z",
      "updated_at": "2026-07-30T11:01:21.480919Z",
      "is_active": true, "is_deleted": false,
      "deleted_at": null, "deleted_by": null, "deleted_reason": null
    }
  ]
}
```

| Aggregate | What it sums |
|---|---|
| `total_spent` | History rows with `action = redeemed`, **both point types** — everything this sailor has spent on orders. |
| `total_referral_points` | The user's live **referral** balance (from `BonusPoints`, not history). |
| `total_loyalty_points` | The user's live **loyalty** balance. |
| `total_points` | The two balances added — the full spendable wallet. |

> `total_spent` counted `type = loyalty` only until 2026-07-30. Checkout spends across **both**
> balances and stamps each redemption row with the type it came from, so any order that
> consumed referral points was under-reported here while `total_points` beside it already
> summed both. Same one-wallet decision as §11 (**CROSS-FLOW-7**).

| Row field | Meaning |
|---|---|
| `action` | `earned` · `redeemed` · `deducted` · `expired` |
| `points` | Always a **positive** magnitude; `action` carries the direction |
| `type` | `loyalty` · `referral` |
| `reason` | Free text set by whichever path wrote the row (admin grant, delivery grant, referral, order reservation, refund) |
| `order` | The order id for redemption / refund rows; `null` for manual admin actions |

**Errors**

| Status | Body | Cause |
|---|---|---|
| `400` | `{"message": "User ID is required."}` | `user_id` omitted |
| `400` | `{"user_id": ["Must be a valid UUID. Got 'abc'."]}` | Malformed id (was a `500` before GB5) |
| `404` | `{"detail": "No User matches the given query."}` | Unknown user |

---

# How Flow 30 connects

- **Upstream — Flow 26 (Media Upload):** the coupon image is a **path string** from the
  presigned upload, prefix-validated against `coupon_images/`.
- **Downstream — Flow 8 (Checkout & Payment):** everything configured here is *spent* there.
  `apply-coupon` runs `Coupon.is_valid()` (active · in window · under both usage limits ·
  min-purchase met · assigned if private · first-order rule) and `apply-points` spends the
  wallet across **both** point types. Redemption at payment writes the `CouponUsage` row that
  §5's report aggregates.
- **Downstream — Flow 18 (Referral & Loyalty Earning):** `points_per_delivery` and
  `points_per_referral` from §9/§10 are what the automatic grant signals read.
- **Sideways — Flow 19 (Deal of the Day):** the other half of `promotion_urls.py`; deals are
  variant-level price overrides and never interact with coupons.
- **Downstream — Flow 34 (Audit Trail):** coupon create / update / delete write
  `COUPON_CREATED` / `COUPON_UPDATED` / `COUPON_DELETED`; manual point grants, deductions and
  resets write `POINTS_ADJUSTED` against the **subject sailor**; loyalty-rule changes write
  `LOYALTY_CONFIG_CHANGED` against the new `config` subject. All five are `operational`
  category, so they are pruned after `AUDIT_OPERATIONAL_RETENTION_DAYS` (365 by default) —
  the same retention the coupon actions have always had.
- **Sideways — Flow 31 (User Account Administration):** the `user_id` every points endpoint
  takes comes from the sailor list there.
