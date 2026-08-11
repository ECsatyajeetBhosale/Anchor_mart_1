# Flow 16 — Post-Delivery Feedback & Ratings

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`16-post-delivery-feedback-ratings-validation.md`](./16-post-delivery-feedback-ratings-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint is fully specified.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

---

# Executive Summary

Two independent, sailor-facing feedback surfaces:

1. **Delivery rating** — one 1–5★ rating **per delivered order**, with quick tags and an optional
   comment. Only a **delivered** or **partially-delivered** order is rateable; a second attempt is
   rejected (**409**). Crucially, the **delivering partner is snapshotted onto the rating at submit
   time** — an order can be reassigned over its life, so the rating records *who actually delivered*
   so the partner-KPI rollups (Flow 28/analytics) credit the right person.
2. **App rating** — one **revisable** rating of the app itself, **per user** (a `OneToOne`, so
   re-submitting *revises* rather than appends — the average can't be skewed by repeat submissions).
   Product ratings are deliberately **out of scope** here.

Both are read-first: the client asks "is this rateable / already rated?" to decide whether to show the
prompt, then submits.

| | |
|---|---|
| **Actors** | Customer (sailor) · Admin (Ratings & Reviews screen) · Background System (KPI rollups consume the snapshot) |
| **Endpoints** | **8** — 3 delivery-rating (`/api/orders/…`) · 2 app-rating (`/api/v1/user/…`) · **3 admin** (`/api/superadmin/ratings/…`) |
| **Django Apps** | `orders` (delivery rating), `user` (app rating), `analytics` (KPI rollups consume it) |
| **Models** | `DeliveryRating` (OneToOne order), `AppRating` (OneToOne user), `DeliveryAssignment` (source of the partner snapshot), `DailyPartnerMetrics` (rollup) |
| **Trigger** | Delivery-email deep link, or an in-app prompt after `delivered` / `partially_delivered` |
| **Previous Flow** | 10 (delivery — produces the rateable status + the assignment that's snapshotted) |
| **Next Flow** | 28 / analytics (the snapshot feeds partner KPIs) |
| **Documentation Version** | 1.0 — 2026-07-27 |
| **Documentation Status** | ✅ 5 routes fully specified here, verified against the running route table + serializers |

> **The load-bearing idea:** the delivery rating snapshots `delivery_partner` at submit time (from the
> `DELIVERED` assignment, else the active one). Without that, a later reassignment would misattribute
> the rating to whichever partner is active when the KPI job runs.

---

# Delivery rating — quick tags & rateable statuses

**Quick tags** (`DeliveryRating.QuickTag`, the *only* accepted `tags` values — anything else is a 400):
`on_time`, `correct_items`, `careful_handling`, `friendly`, `late`, `wrong_items`.

**Rateable statuses:** `delivered` **and** `partially_delivered` (a sailor who received *part* of an
order still has a real opinion, and the order may never reach `delivered` if the vessel sails).
`delivery_failed` is **not** rateable — nothing arrived.

---

# Endpoints — full specification

**Headers:** `Authorization: Token <token>` + `server-secret-key: <SERVER_SECRET_KEY>` on all calls.
All are `IsAuthenticated` and scoped to the caller (a sailor can only rate/read their own orders).

---

## 1 · `POST /api/orders/<order_id>/rate-delivery/` — Submit a delivery rating

**Request body**

| Field | Type | Required | Rule |
|---|---|---|---|
| `rating` | int | ✅ | **1–5**. |
| `tags` | array of string | ❌ | Each must be a `QuickTag` value (list above); **no duplicates**; empty/omitted → `[]`. |
| `comment` | string | ❌ | Free text, **≤ 200 chars**. |

```json
{ "rating": 5, "tags": ["on_time", "correct_items"], "comment": "Smooth handover at the berth." }
```

**Response `201`:**
```json
{ "id": "…", "order": "…-uuid", "order_number": "AM202607270018", "rating": 5,
  "tags": ["on_time", "correct_items"], "comment": "Smooth handover at the berth.",
  "partner_name": "Davy Jones", "created_at": "July 27, 2026, 03:14 PM",
  "updated_at": "July 27, 2026, 03:14 PM" }
```
`partner_name` is the snapshotted delivering partner (or `null` if none could be resolved).

**Errors** — `400` order not `delivered`/`partially_delivered` (`"You can only rate an order once it
has been delivered."`) · `400` `rating` out of 1–5 / unknown or duplicate `tag` · `409` already rated
(`"You have already rated this delivery."`) · `404` order not found or not the caller's · `401`/`403`
auth.

---

## 2 · `GET /api/orders/<order_id>/delivery-rating/` — Rateable / rated state (drives the prompt)

No body. **Response `200`:**
```json
{ "rateable": true, "rated": false, "rating": null }
```
`rateable` = status is delivered/partially-delivered; `rated` = a rating exists; `rating` = the full
rating object (as §1) when rated, else `null`. **Errors** — `404` not the caller's order.

---

## 3 · `GET /api/orders/my-delivery-ratings/` — The caller's ratings

No params. Paginated (`page` / `page_size`, default 10 / max 50), newest first. **Response `200`:**
standard paginated envelope of the §1 rating shape.

---

## 4 · `POST /api/v1/user/app-rating/submit/` — Submit or revise the app rating

One per user — re-submitting **revises** (upsert on the caller). **Request body**

| Field | Type | Required | Rule |
|---|---|---|---|
| `rating` | int | ✅ | **1–5**. |
| `feedback` | string | ❌ | Free text. |
| `app_version` | string | ❌ | ≤ 30 chars. |
| `platform` | string | ❌ | Client surface (web / app). |

**Response `201`** (first time) / **`200`** (revision) — so the client can tell which happened:
```json
{ "id": "…", "rating": 4, "feedback": "Love the delta flow.", "app_version": "3.2.0",
  "platform": "app", "created_at": "…", "updated_at": "…" }
```
**Errors** — `400` `rating` out of 1–5.

---

## 5 · `GET /api/v1/user/app-rating/` — The caller's current app rating (drives the prompt)

No body. **Response `200`:** `{ "rated": true|false, "rating": <object>|null }`.

---

# Admin — Ratings & Reviews screen

**Headers:** `Authorization: Token <token>` (admin/super_admin role). These are under
`/api/superadmin/`, which is **exempt from the `server-secret-key` middleware** — do **not** send
that header. All three are `IsAdminUser` (role-based, not `is_staff`).

The admin sees **every** review (not just the caller's) plus a platform-wide averages tile. The
per-partner delivery leaderboard is **not** here — it already lives in the partner-KPI reads
(Flow 28/analytics); this screen is the individual reviews + the platform headline.

---

## 6 · `GET /api/superadmin/ratings/delivery/` — Every delivery review

Newest first, paginated (`page` / `page_size`, default 10 / max 50).

**Query params** (all optional): `rating` (int **1–5**; else **400**) · `partner_id` (UUID; else
**400**) · `search` (matches order number / sailor email / comment) · `page`, `page_size`.

**Response `200`** — standard paginated envelope; each result:
```json
{ "id": "…", "order": "…-uuid", "order_number": "AM202607270018",
  "sailor_email": "sailor@x.io", "sailor_name": "Sai Lor",
  "delivery_partner": "…-uuid", "partner_email": "pat@x.io", "partner_name": "Pat",
  "rating": 4, "tags": ["on_time"], "comment": "Smooth berth handover.",
  "created_at": "July 27, 2026, 03:14 PM" }
```
`delivery_partner` / `partner_email` / `partner_name` are `null` when the rating never resolved a
partner (the FU2 edge).

---

## 7 · `GET /api/superadmin/ratings/app/` — Every app review

Newest first, paginated. **Query params** (optional): `rating` (1–5; else **400**) · `platform`
(case-insensitive exact, e.g. `ios`) · `app_version` (exact) · `search` (user email / feedback) ·
`page`, `page_size`.

**Response `200`** — paginated; each result:
```json
{ "id": "…", "user": "…-uuid", "user_email": "u@x.io", "user_name": "Sai Lor",
  "rating": 5, "feedback": "Love the delta flow.", "platform": "ios",
  "app_version": "3.2.0", "created_at": "July 27, 2026, 03:14 PM" }
```

---

## 8 · `GET /api/superadmin/ratings/summary/` — Platform-wide averages tile

**Query params:** none. **Always all-time.**

> **Changed 2026-07-29 — the rolling `?days=N` window was removed**, and with it the `window` key
> from the response. A stray `days` from an older client is now **ignored, not rejected** (it
> means nothing, so 400-ing on it would break a caller for asking a harmless question).

**Response `200`:**
```json
{ "delivery": { "average": 4.32, "count": 1240, "tag_counts": { "on_time": 900, "late": 60 } },
  "app": { "average": 4.10, "count": 560 } }
```

> ⚠️ **"All-time" means different things for the two halves.** `app` is a direct aggregate over
> `AppRating`, so it genuinely covers every rating ever. `delivery` is served from the
> `DailyPartnerMetrics` rollup (settled days) plus a live query for today — so it reaches back only
> as far as the rollup does, and delivery ratings from before the rollup existed do not appear.
`average` is `null` (not `0`) when there are no ratings in the window — *nobody rated* and
*everybody rated zero* are different facts. **Scale:** the delivery average is read from the
analytics rollup (one indexed `SUM`, never the `DeliveryRating` table); the app average is a live
aggregate over the small one-row-per-user `AppRating` table; the whole payload is **cached ~5 min**,
so a freshly submitted rating can lag the tile by up to the TTL.

---

# Data model touchpoints

| Model | Role |
|---|---|
| `DeliveryRating` | **OneToOne `order`** (→ one rating per order; the DB guard behind the 409). `user`, `rating` (1–5), `tags` (validated to `QuickTag`), `comment`, and the snapshot **`delivery_partner`** (FK, `SET_NULL`, limited to `delivery_partner` role). |
| `AppRating` | **OneToOne `user`** (→ one revisable rating per user). `rating`, `feedback`, `app_version`, `platform`. |
| `DeliveryAssignment` | The **source of the partner snapshot** — the `DELIVERED` assignment (else the active one) supplies `delivery_partner` at submit time. |
| `DailyPartnerMetrics` | The analytics rollup (Flow 28/analytics) that reads the snapshot to attribute the rating to the right partner. |

---

# How Flow 16 connects

- **Upstream:** Flow 10 (delivery) produces the rateable status (`delivered` / `partially_delivered`)
  and the `DeliveryAssignment` whose partner is snapshotted onto the rating.
- **Downstream:** the snapshot feeds the **partner KPI rollups** (Flow 28 / analytics) — attribution is
  frozen at submit time so a later reassignment can't misattribute.
- **Out of scope:** product ratings (`catalog.ProductRating`) — a deliberate exclusion; this flow is
  delivery + app only.
