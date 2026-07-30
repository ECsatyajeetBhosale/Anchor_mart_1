# Flow 19 — Deal of the Day


> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`19-deal-of-the-day-validation.md`](./19-deal-of-the-day-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint is fully specified.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)


---


# Executive Summary


A **time-boxed discounted variant** merchandised to sailors. An admin schedules a deal on a specific
**variant** with a `deal_price`, a `[start_time, end_time]` window and optional T&Cs; the discount % is
auto-derived. Sailors either **list** the currently-live deals (sortable/searchable) or pull **one at
random**. Both customer surfaces apply the **identical availability gate**: the deal must be active and
in-window **and** the variant *and* its product must all be live, active and **sourceable** — so a deal
never surfaces for something a sailor can't actually order.


| | |
|---|---|
| **Actors** | Admin (schedules/toggles deals) · Customer (browses) |
| **Endpoints** | **10** — 2 customer (`/api/promotion/user/deal-of-the-day/…`) · 8 admin (`/api/superadmin/promotion/deals…`) |
| **Django Apps** | `promotion` (model, customer surfaces), `admin_panel` (admin CRUD/toggle/stats) |
| **Models** | `DealOfTheDay` (variant-scoped, priced window), `ProductVariant` (authoritative price/images), `Product` |
| **Trigger** | Admin creates/toggles a deal window; sailor opens the deals surface |
| **Previous Flow** | 3 (Product Discovery — the variant/product being discounted) |
| **Next Flow** | 30 (Analytics — deal performance) · 4/7 (a deal price flows into cart/billing) |
| **Documentation Version** | 1.0 — 2026-07-27 |
| **Documentation Status** | ✅ 10 routes fully specified here, verified against the running route table + serializers |


> **The load-bearing rule:** the customer surfaces filter on the **variant chain** — `variant` +
> `variant.product` must both be `is_active`, not `is_deleted`, and `admin_sourceable=True` — so a deal
> is never shown for an item that can't be bought. The variant is the **authoritative** source of the
> deal's original price and images (`product` on the deal is a redundant convenience FK).


---


# Core concepts


**Variant-scoped.** A deal targets one `ProductVariant`; `variant.price` is the original price the
`deal_price` discounts. `discount_percentage` is **auto-calculated** `(price − deal_price)/price × 100`
when the admin omits it (editable if supplied).


**Validation on write** (`AddDealOfTheDaySerializer` / `UpdateDealOfTheDaySerializer`):
`deal_price > 0`; **`deal_price < variant.price`** (a deal must be a genuine discount); `end_time >
start_time`; the variant must belong to the given product; and **no overlapping active deal for the same
variant** in the window.


**The availability gate** (both customer surfaces, identical): `is_active` **and** `start_time ≤ now ≤
end_time` **and** `variant`/`variant.product` all `is_active`, not `is_deleted`, `admin_sourceable=True`.


**Toggle sets a fresh 24-h window.** Activating a deal via the toggle endpoint resets `start_time = now`,
`end_time = now + 24h` (re-checking overlap); deactivating just clears `is_active`.


**Soft delete.** Delete sets `is_deleted=True` + `is_active=False`; rows are never hard-deleted.


---


# Customer endpoints


**Headers:** `Authorization: Token <token>` + `server-secret-key: <SECRET>`. Both `IsAuthenticated`.


---


## 1 · `GET /api/promotion/user/deal-of-the-day/` — List live deals


Only deals passing the availability gate. Paginated (`page`/`page_size`, default 10/max 50).


**Query params** (all optional): `search_query` (variant SKU / product name / description) ·
`sort_by_category` (a category UUID → 404 if unknown) · `sort_by_price` (`low to high` / `high to low`,
several aliases) · `sort_by_popularity` (by avg product rating, unrated last) · `sort_by_relevance`
(`newest_first` / `oldest_first`). Default order: newest window first (`-start_time`).


**Response `200`** — paginated envelope of deal objects:
```json
{ "id": "…", "product": "…-uuid", "product_name": "Mooring Rope", "variant": "…-uuid",
 "variant_sku": "SEED-REG-1", "original_price": "100.00", "variant_images": [ … ],
 "deal_price": "70.00", "discount_percentage": "30.00", "terms_and_conditions": "…",
 "start_time": "2026-07-27T00:00:00Z", "end_time": "2026-07-28T00:00:00Z",
 "is_active": true, "is_deleted": false, "created_at": "July 27, 2026, 03:14 PM",
 "updated_at": "…", "category": "…-uuid", "category_name": "Deck" }
```
**Errors** — `404` `{ "error": "Category not found" }` (bad `sort_by_category`) · `400`/`500` (`error` key).


---


## 2 · `GET /api/promotion/user/deal-of-the-day/random/` — One random live deal


Same availability gate; returns a **single** randomly-chosen live deal (the "today's deal" hero slot).


**Response `200`** — one deal object (shape as §1). **`404`** `{ "message": "No active deal available." }`
when nothing is live. `500` → `{ "error": … }`.


---


# Admin endpoints


**Headers:** `Authorization: Token <token>` (admin/super_admin; `/api/superadmin/` is exempt from the
`server-secret-key` middleware). All `IsAuthenticated + IsAdminUser`. Admin surfaces show **all**
non-deleted deals (no sourceable gate — that's a customer-visibility concern).


---


## 3 · `GET /api/superadmin/promotion/deals/` — List (manage)


Paginated. **Query params:** `search` (SKU / product name) · `status` (`active_now` | `scheduled` |
`expired` | `inactive`; else 400) · `category` (UUID; else 400) · `sort_by_created_at` /
`sort_by_start_date` / `sort_by_end_date` / `sort_by_is_active` (each `asc`/`desc` aliases). Default
`-start_time`. Returns the deal shape (admin serializer — same fields minus `category`/`category_name`).


## 4 · `POST /api/superadmin/promotion/deals/add/` — Create a deal


**Request body**


| Field | Type | Required | Rule |
|---|---|---|---|
| `product` | UUID | ✅ | Must exist. |
| `variant` | UUID | ✅ | Must exist **and belong to `product`**. |
| `deal_price` | decimal | ✅ | **`> 0` and `< variant.price`.** |
| `discount_percentage` | decimal | ❌ | 0–100; **auto-calculated** from prices if omitted. |
| `terms_and_conditions` | string | ❌ | Free text. |
| `start_time` / `end_time` | datetime | ✅ | `end_time > start_time`. |


Rejected with **400** if any rule fails, or if an **active deal already overlaps** this variant's window
(`{"variant": "An active deal already exists for this variant in the given time range."}`). **`201`**
returns the created deal.


## 5 · `GET /api/superadmin/promotion/deals/<pk>/` — Deal detail


`200` the deal (non-deleted) or `404`.


## 6 · `PUT`/`PATCH` `/api/superadmin/promotion/deals/update/<pk>/` — Update (always partial)


Both PUT and PATCH are partial (§4a). Any subset of the create fields; the same validation (price,
overlap, time) applies to whatever is present. `200` the updated deal · `400` validation.


## 7 · `DELETE /api/superadmin/promotion/deals/delete/<pk>/` — Soft-delete


Sets `is_deleted=True` + `is_active=False`. `200 { "message": "Deal of the day deleted successfully." }`.


## 8 · `POST /api/superadmin/promotion/deals/<pk>/toggle/` — Activate / deactivate


**Body:** `{ "is_active": true|false }` (boolean required, else 400). **Activating** resets the window to
`[now, now+24h]` and is **blocked (400)** if that window overlaps another active deal for the variant
(`{"detail": "Another active deal already overlaps this variant's time range."}`). **Deactivating** just
clears `is_active`. `200` returns the deal.


## 9 · `GET /api/superadmin/promotion/deals/stats/` — Status cards


`200 { "total", "active_now", "scheduled", "expired", "inactive" }` (counts over non-deleted deals).


## 10 · `GET /api/superadmin/promotion/deals-of-day/` — Admin in-window list


A convenience list of currently-in-window, non-deleted deals (no `is_active` filter). Paginated.


---


# Data model touchpoints


| Model | Role |
|---|---|
| `DealOfTheDay` | `variant` (required, authoritative), `product` (nullable convenience FK), `deal_price`, `discount_percentage` (auto), `terms_and_conditions`, `start_time`/`end_time`, `is_active`. `is_currently_valid()` = active + in-window. Soft-deleted. |
| `ProductVariant` | The discounted SKU — supplies `original_price` (`variant.price`) and `variant_images`; its liveness/sourceable flags gate customer visibility. |
| `Product` | Name + category for display; its liveness/sourceable flags are part of the gate (via `variant.product`). |


**Django admin:** `DealOfTheDayAdmin` (`ActiveFilteredAdminMixin`) under `promotion/admin.py`.


---


# How Flow 19 connects


- **Upstream — Flow 3 (Catalog):** the variant/product being discounted; the same
 `admin_sourceable` liveness rules gate deal visibility.
- **Downstream — cart/billing (Flows 4/7):** a live deal's `deal_price` is the price a sailor pays for
 that variant while the window is open.
- **Downstream — Flow 30 (Analytics):** deal performance reporting.
- **Sibling — Flow 8 (Discounts):** deals and coupons are independent discount mechanisms on the same
 catalog. See [[product-catalog-rules]] (deal is variant-level).



