# Flow 17 — Back-in-Stock Waitlist


> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`17-back-in-stock-waitlist-validation.md`](./17-back-in-stock-waitlist-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint is fully specified.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)


> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.** (This feature is `#23`.)


---


# ⚠️ Build A vs Build B — read this first


**What actually ships in Build A** (product decision, 2026-07-27): the **per-user waitlist opt-in is
NOT implemented**. There is no customer "Notify when available" endpoint and flipping a variant/product
sourceable does **not** auto-notify anyone. Instead, an admin **deliberately** announces availability
with a **manual "Announce this item" broadcast to all customers** (push + in-app, never email) — see
[§ Build A · Announce](#build-a--announce-this-item-is-available-what-ships). This avoids recreating the
spam the waitlist existed to prevent, now at admin-bulk scale (50 sourceable flips ≠ 50 blasts to
everyone).


**The waitlist design below (per-user opt-in + auto fan-out) is retained but DORMANT** — the model,
service (`catalog.waitlist_service`), views and Django admin are kept intact and unit-tested so a later
**Build B** can restore opt-in **without a migration**. The two customer routes are commented out in
`catalog/urls.py`; the fan-out is unwired from the sourceable-flip views. Everything from
[§ Endpoints 1–2](#1--post-apicatalognotify-when-available--toggle-a-waitlist-subscription) down
describes that dormant Build B design, not what Build A serves.


---


# Executive Summary


> **Build A summary:** browse surfaces non-sourceable items with an `is_sourceable=false` badge (no
> waitlist affordance); when an item is genuinely available again, an admin taps **"Announce this
> item"**, which broadcasts *"{product} is now available"* to all customers over push + in-app. That's
> the whole customer-facing loop in Build A. The rest of this section describes the **dormant Build B**
> waitlist.


AnchorMart tracks **no numeric stock** — a SKU is orderable purely by the `admin_sourceable` flag
(on the variant **and** its product). *(Build B)* When an item is *not* sourceable, the browse surface
still lists it (with an `is_sourceable=false` badge) so a sailor can tap **"Notify when available"**.
That creates a **per-variant** waitlist subscription. Later, when an admin flips the variant (or its
product master) back to sourceable, a **fan-out** notifies every un-notified waiter, with the
**variant as the notification target**, and stamps each row `notified_at` so it never re-fires.


Two ideas carry the flow:


1. **Per-variant, not per-product.** "Effective sourceable = product master **AND** variant", so the
  sailor is waiting on *this exact SKU*. A product-level row would fire a false "it's back!" when a
  *different* variant of the same product returned.
2. **At-least-once, stamped after enqueue.** `notified_at` is written **after** the notification is
  handed to the background sender — a crash mid-fan-out re-notifies on the next flip, which is
  preferred to silently dropping a waiter.


| | |
|---|---|
| **Actors** | Customer (sailor) · Admin (flips sourceable) · Background System (fan-out + send) |
| **Endpoints** | **2 customer** (`/api/catalog/…`) + **2 admin triggers** (`/api/superadmin/…set-admin-sourceable/…`) |
| **Django Apps** | `catalog` (waitlist + fan-out), `admin_panel` (the trigger sites), `notifications` (delivery) |
| **Models** | `AvailabilityWaitlist` (per user+variant, `unique_together`), `ProductVariant`, `Product`, `Notification` |
| **Trigger** | Sailor taps "Notify when available" on a non-sourceable variant → later an admin flips `admin_sourceable` True |
| **Previous Flow** | 3 (Product Discovery — surfaces the non-sourceable variant with the waitlist affordance) |
| **Next Flow** | 21 (Notification Inbox — the "Back in stock" row lands here, targeted at the variant) |
| **Documentation Version** | 1.0 — 2026-07-27 |
| **Documentation Status** | ✅ 4 routes fully specified here, verified against the running route table + serializers |


> **The load-bearing rule:** a "back in stock" alert fires **only** when the variant is *effectively
> sourceable* — `variant.admin_sourceable AND product.admin_sourceable AND` both live/active. An admin
> may flip one flag while the other stays down; the fan-out is gated per-variant so it never promises
> an item the sailor still can't order.


---


# Core concepts


**No numeric stock.** Availability is the `admin_sourceable` boolean, at two levels:


- **Variant** `admin_sourceable` — this SKU specifically.
- **Product** `admin_sourceable` — the master switch for all its variants.


**Effective sourceable** (the single rule enforced everywhere, `variant_is_effectively_sourceable`):
`variant.is_active AND not variant.is_deleted AND variant.admin_sourceable AND product.admin_sourceable
AND product.is_active AND not product.is_deleted`.


**Quote-product safety gate.** `admin_sourceable=False` is **overloaded**: it also hides a private
special-request **quote product** (a bespoke item created for one sailor). The only marker of one is a
`SuggestedProductByAdmin` on its variant. Every waitlist surface excludes those
(`not_a_quote_variant_q()` / `not_a_quote_product_q()`) so a crafted `variant_id` can't waitlist — and
later leak — someone else's private quote. See [[admin-sourceable-overloaded]].


**Waitlist ≠ wishlist.** `AvailabilityWaitlist` ("tell me the moment I can buy it") is modelled
separately from `SavedProduct` ("I like this").


---


# Build A · "Announce this item is available" (what ships)


The only customer-facing notification in Build A. **Manual** (never auto-fired on a sourceable flip),
so a bulk sourceable-edit can't blast every sailor. Reuses the broadcast pipeline — **push + in-app
announcement only, never email** (an availability nudge is higher-frequency/lower-stakes than an admin
broadcast; email for every announce would erode the opt-out/Promotional email channel — an admin who
wants email for a big restock uses the broadcast tool with a deliberate channel choice).


## `POST /api/superadmin/products/<product_id>/announce-availability/`


**Headers:** `Authorization: Token <token>` (admin/super_admin; `/api/superadmin/` is exempt from the
`server-secret-key` middleware — do not send it). `IsAuthenticated + IsAdminUser`. No request body.


**Guards** — the product must be real, live, and **actually orderable** (else you'd announce something
nobody can buy): `is_deleted=False`, `is_active=True`, **not a private quote product**
(`not_a_quote_product_q()`), **`admin_sourceable=True`**, **and** at least one live variant with
`admin_sourceable=True`.


**Response `201`:**
```json
{ "message": "Announced 'Mooring Rope' to customers.", "broadcast_id": "…-uuid" }
```
Effect: a `GeneralNotification` audit row (category `promotional`, `channels: []` → no email,
`is_active=true` → shown in-app, `created_by` = the admin) + an FCM **topic push** to customers. Title
**"Now available"**, message **"{product} is now available — order it before your ship sails."**


**Errors** — `400` not orderable (`"This item isn't available to order, so it can't be announced. Make
it sourceable first."`) · `404` product missing / soft-deleted / inactive / a quote product · `401`/`403`
not an admin.


> **Build A note:** the broadcast surface carries no per-target deep link (the dormant waitlist row used
> `target=variant`), so the product name is in the copy rather than a tap-through. Adding target support
> to the broadcast is a Build B enhancement, not a Build A gap.


---


# Endpoints — full specification *(DORMANT — Build B design, not served in Build A)*


> The two endpoints below are **unrouted in Build A** (commented out in `catalog/urls.py`). They are
> documented because the code is retained for Build B. In Build A these paths return 404.


**Headers:** `Authorization: Token <token>` + `server-secret-key: <SERVER_SECRET_KEY>` on the customer
calls. Both customer endpoints are `IsAuthenticated` and scoped to the caller.


---


## 1 · `POST /api/catalog/notify-when-available/` — Toggle a waitlist subscription


One endpoint, driven by a boolean: `notify_flag=true` **subscribes**, `notify_flag=false`
**unsubscribes**.


**Request body**


| Field | Type | Required | Rule |
|---|---|---|---|
| `variant_id` | UUID | ✅ | The variant to watch. |
| `notify_flag` | bool | ✅ | `true` = subscribe, `false` = unsubscribe. **Must be present** — an omitted flag is a **400**, never a silent unsubscribe. |


```json
{ "variant_id": "aac76a81-…", "notify_flag": true }
```


**Behaviour & responses**


| Case | Status | Body |
|---|---|---|
| Subscribe to a non-sourceable, live, non-quote variant | **201** | `{ "message": "You'll be notified when this is available again." }` |
| Unsubscribe (`notify_flag=false`) | **200** | `{ "message": "Removed from waitlist." }` (idempotent — 200 even if no row existed) |
| Subscribe to a variant that is **already** effectively sourceable | **409** | `{ "detail": "This item is already available." }` (client should show "add to cart", not "notify me") |
| `variant_id` is not a live/real/non-quote variant | **404** | `{ "detail": "Variant not found." }` |
| `notify_flag` missing | **400** | `{ "notify_flag": ["This field is required."] }` |
| `variant_id` missing / not a UUID | **400** | field error |
| Not authenticated | **401** | — |


Subscribe is **idempotent** on `(user, variant)` (`unique_together`) — a repeat tap doesn't create a
second row.


---


## 2 · `GET /api/catalog/my-waitlist/` — The caller's waitlist


No params. Paginated (`page` / `page_size`, default 10 / max 50), newest first.


**Response `200`** — standard paginated envelope; each result:
```json
{ "id": "…", "variant_id": "aac76a81-…", "sku": "SEED-REG-1",
 "product_id": "4186ef08-…", "product_name": "Seed Mooring Rope",
 "notified": false, "created_at": "July 27, 2026, 07:09 AM" }
```
`notified` = `notified_at is not null` (i.e. the back-in-stock alert has already been sent for this
row). **Errors** — `401` auth.


---


## 3 & 4 · Admin triggers — the fan-out fires here


These are catalog-management endpoints (documented in the catalog flow), but the **back-in-stock
fan-out is a side effect of them**, so they're specified here at the mechanism level. Both are
`IsAuthenticated + IsAdminUser`, under `/api/superadmin/`.


### `POST /api/superadmin/products/product-variants/set-admin-sourceable/<variant_id>/`


Body `{ "admin_sourceable": true|false }` (boolean required, else 400). On a **real `False→True`
flip**: the variant is set sourceable; if the product master was off it is **up-cascaded on** (making
a variant sourceable implies the product is on — turning a variant *off* never turns the product off);
then **`notify_back_in_stock_for_product(product)`** fans out for the whole product (the up-cascade may
have unblocked sibling variants too — each is still gated on its own flag). Response `200`
`{ "message": "Variant marked sourceable.", "admin_sourceable": true }`.


### `POST /api/superadmin/products/set-admin-sourceable/<product_id>/`


Body `{ "admin_sourceable": true|false }`. On a **real `False→True`** flip of the master:
**`notify_back_in_stock_for_product(product)`** fans out across every variant that is now effectively
sourceable. Response `200` `{ "message": "Product marked sourceable.", "admin_sourceable": true }`.


**Only a real transition fans out** (`val and not was_sourceable`) — re-saving an already-sourceable
product never re-notifies.


---


# The fan-out — what happens on a flip *(DORMANT — Build B)*


> **Unwired in Build A:** the two `set-admin-sourceable` views no longer call this. It runs only if
> Build B restores the trigger. `notify_back_in_stock` / `notify_back_in_stock_for_product` remain in
> `catalog/waitlist_service.py`, unit-tested, with no production caller.




`notify_back_in_stock(variant)` (per variant; `notify_back_in_stock_for_product` loops a product's
variants):


1. **Gate:** no-op unless the variant is *effectively sourceable* (both flags on, both live). An admin
  who flips only one flag triggers nothing until the other is on too.
2. **Select waiters:** `AvailabilityWaitlist.objects.filter(variant=variant, notified_at__isnull=True)`
  — everyone still waiting who hasn't been told (indexed on `(variant, notified_at)`).
3. **Enqueue one notification** for all of them via `notify_multiple_users(...)` — a single background
  task (`bulk_user_notification_task`), not one send per user in the request:
  - Type **`BACK_IN_STOCK`** — **TRANSACTIONAL**, not promotional: the sailor explicitly opted in, so
    a promotional mute must not silence it. It has **no per-type preference key** — the waitlist row
    *is* the subscription; deleting it (unsubscribe) is the only "off".
  - Title `"Back in stock"`, message `"<product name> is available again — order it before it's gone."`
  - `metadata = {product_id, variant_id}`; **`target = variant`** so the inbox row links to what came
    back (the notification-inbox target pattern). See [[notification-inbox-rules]].
4. **Stamp after enqueue:** `.update(notified_at=now())` on those rows — *after* handing off the send.
  At-least-once by design: a crash before the stamp re-notifies on the next flip (silence is worse
  than a duplicate).


---


# Data model touchpoints


| Model | Role |
|---|---|
| `AvailabilityWaitlist` | The subscription. `user` + `variant` (**`unique_together`** → one row per sailor per SKU), `notified_at` (null = live subscription; set = already alerted, kept as aRating Copy dedupe + admin demand signal). Indexed `(variant, notified_at)` for the fan-out query. `CASCADE` on both FKs. |
| `ProductVariant` / `Product` | Carry the two `admin_sourceable` flags whose AND is "effective sourceable". The product master up-cascades from a variant. |
| `Notification` | The `BACK_IN_STOCK` row the sailor receives, targeted at the variant. |


**Django admin:** `AvailabilityWaitlistAdmin` — "who's waiting on what" (also a demand signal for what
to make sourceable next); `list_display` user/variant/notified_at/created_at, searchable by email / SKU
/ product name.


---


# How Flow 17 connects


- **Upstream — Flow 3 (Product Discovery):** the browse surface *lists* non-sourceable products (with
 an `is_sourceable=false` badge) instead of hiding them, which is what gives the sailor a place to tap
 "Notify when available". Private quote products are still excluded from that surface.
- **Trigger — catalog management:** the admin `set-admin-sourceable` endpoints (variant + product master)
 are the only things that fan out.
- **Downstream — Flow 21 (Notification Inbox):** the `BACK_IN_STOCK` notification lands in the inbox,
 targeted at the variant so tapping it deep-links to the item that returned.
- **Related — Flow 29 / messaging:** delivery of the notification (push + inbox row) rides the shared
 notification pipeline.



