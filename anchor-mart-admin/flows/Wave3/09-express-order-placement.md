# Flow 09 — Express Order Placement

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`09-express-order-placement-validation.md`](./09-express-order-placement-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

---

# Executive Summary

| | |
|---|---|
| **Flow Name** | Express Order Placement |
| **Business Objective** | Let a sailor buy pre-vetted express-deliverable stock with no sourcing funnel |
| **Flow Type** | Core |
| **Primary Actors** | Customer · Admin (console) · Background System (Stripe webhook) |
| **Platforms** | `SAILOR` · `ADMIN` · `SYS` · Stripe |
| **Django Apps** | `orders` (`express_views.py`, `order_service.py`, `payments_service.py`) · `catalog` · `admin_panel` (console) |
| **Models** | `Order`, `OrderItem`, `Cart`, `CartItem`, `Payment`, `ProductVariant` |
| **Total APIs** | **1 owned customer** (checkout) **+ 3 admin console**; express **cart** (view/add/update/remove) is **Flow 4**, express **browse** is **Flow 3** |
| **Previous Flow** | Flow 4 — the express cart holds vetted express variants |
| **Next Flow** | Flow 7 webhook → `order_confirmed` → **Flow 10** delivery |
| **Documentation Version** | 1.1 — 2026-07-22 (F-01 fixed: zero-total settles like the pay path) |
| **Documentation Status** | ✅ Owned routes documented in full; shared cart/browse/payment/delivery cross-referenced |

> **Thin on endpoints, thick on *rules*.** Express is essentially **one create call**, but its
> rules diverge from the standard journey end-to-end — which is why it's its own chapter. The
> cart, catalog browse, Stripe webhook, and delivery are the **same** machinery as the standard
> flow; this doc states *how express differs*.

---

# Phase 1 — Understand the Flow

## How express differs from the standard order journey

| | Standard order (Flows 5→7) | **Express** |
|---|---|---|
| Funnel | intent → source → verify → substitute → admin bills → pay | **None** — straight to pay |
| Order born at | `intent_received` (zero totals) | **`payment_pending`** with the price already set |
| Fees | admin adds shipping / tax / platform fee at billing | **None** — total = item prices only (express variants are pre-priced to include any charge) |
| Verification | a partner checks stock dockside | **None** — express stock is pre-vetted (`is_express` + sourceable) |
| Stripe link | admin generates it, or sailor pays in-app | **created immediately** on checkout, returned in the response |
| Amendable? | yes (unpaid: merge; paid: child order) | **never** (Flow 15 refuses express) |
| Sailor-cancellable? | yes, within the window | **never** — the money-back route is returns/refunds (Flow 12) |

Everything else — the cart model, the Stripe webhook that confirms payment, and the delivery
ladder — is shared.

## The checkout, step by step (`express/create/`)

1. **Validate the shipping/location payload** (`OrderCreateRequestSerializer`, same contract as
   the standard intent) — pure input validation, done *before* the lock.
2. **Under a cart-row lock** (`select_for_update` on the express `Cart`) — this is the
   **double-submit guard**: two taps / a retry would otherwise build two paid orders from one
   cart; the second request blocks, then finds the cart already consumed and is rejected:
   - Empty cart → **400**.
   - **Re-check express catalog type** — a variant may have lost its `is_express` flag since it
     was added → **400** listing the SKUs.
   - **Availability gate** — never charge for something unfulfillable: reject any line whose
     variant is deleted/inactive or not sourceable (`admin_sourceable` on **product AND variant**,
     the "in stock, ship now" signal — there is no numeric stock) → **400**.
   - **Total = item prices only** (`Σ variant.price × qty`), no fees.
   - `create_order(status=payment_pending, is_express=True, subtotal=…)` → `total_amount = subtotal`.
   - Save the delivery address to the book, `bulk_create` the order lines, **delete the cart**
     (consume it inside the lock).
3. **Create the Stripe session** — deliberately **outside** the transaction (never hold a DB lock
   across a network round-trip). On a Stripe error → **502**, but the order is already committed at
   `payment_pending` with the cart cleared, so the sailor completes it via **pay-order** (Flow 7) —
   no duplicate.
4. **Return** the order id, total, and the Stripe **checkout link**.

## What confirms and delivers it

Once the sailor pays, the **same webhook as Flow 7** (`checkout.session.completed`) marks the
payment complete and advances `payment_received → order_confirmed` — then it's **Flow 10**
delivery (assign → transit → proof). Express skips only the *front* of the journey.

> An **unpaid** express order sits at `payment_pending`, so it appears in the sailor's **intents**
> list (Flow 14), not history, until paid.

## The admin express console

Three admin-only read surfaces (a "saved view" so an express-desk admin doesn't re-filter every
time):

| Surface | Endpoint | Shows |
|---|---|---|
| Express orders | `superadmin/express/orders/` | The post-payment Orders list pre-scoped to `is_express=True` (same lean rows + validated filters as the main Orders screen) |
| Express items | `superadmin/express/items/` | The express variant catalog, with validated filters + sorting |
| Express stats | `superadmin/express/stats/` | Express product/variant catalog counts + order volume by status |

---

# Phase 2 — Discover the Complete Flow

```
SAILOR  (express cart = Flow 4; browse express products = Flow 3)
  └─ POST /api/orders/express/create/   { shipping_address, expected_departure, platform, … }
       ├─ validate location payload
       ├── transaction.atomic + cart-row lock (double-submit guard) ──────────────┐
       │     ├─ 400 empty cart                                                     │
       │     ├─ 400 a line lost its express flag                                   │
       │     ├─ 400 a line is unavailable (deleted/inactive/not sourceable)        │
       │     ├─ total = Σ price×qty (no fees)                                       │
       │     ├─ create Order(payment_pending, is_express=True) + lines             │
       │     └─ delete the express cart                                            │
       └── commit ─────────────────────────────────────────────────────────────────┘
             └─ create Stripe session (OUTSIDE the lock) → 502 on Stripe error (recoverable via pay-order)
                → 201 { order_id, total_amount, checkout_url, expires_at }

  sailor pays ▼
STRIPE → POST /api/payments/stripe/webhook/   (Flow 7) → payment_received → order_confirmed
       → Flow 10 delivery

ADMIN
  ├─ GET /superadmin/express/orders/    is_express Orders list  (?status ?date ?partner_id ?search)
  ├─ GET /superadmin/express/items/     express variant catalog (filters + sort)
  └─ GET /superadmin/express/stats/     express catalog + order-volume aggregates
```

## API sequence table

| Step | Platform | API | Owner |
|---|---|---|---|
| — | SAILOR | express cart (view/add/update/remove) | **Flow 4** |
| — | SAILOR | `GET /api/catalog/express-products/` (browse) | Flow 3 |
| 1 | SAILOR | `POST /api/orders/express/create/` | **Flow 9** |
| 2 | SYS | `POST /api/payments/stripe/webhook/` | Flow 7 |
| 3 | ADMIN | `GET /api/superadmin/express/orders/` | **Flow 9** |
| 4 | ADMIN | `GET /api/superadmin/express/items/` | **Flow 9** |
| 5 | ADMIN | `GET /api/superadmin/express/stats/` | **Flow 9** |

---

# Phase 3 — API Documentation

## Flow-wide conventions

| Header | Notes |
|---|---|
| `Authorization: Token <key>` | All |
| `server-secret-key` | `/api/orders/…` (checkout); **`/api/superadmin/…` exempt** (console) |

Checkout is `[IsAuthenticated]`, scoped to the caller's own express cart. Console endpoints are
`[IsAuthenticated, IsAdminUser]`.

---

## API 1 · Create an express order (checkout)

| Field | Value |
|---|---|
| **Endpoint** | `/api/orders/express/create/` · `POST` |
| **View** | `CreateExpressOrderView` · payload serializer `OrderCreateRequestSerializer` |

**Request body** — the delivery/location contract (same as the standard intent):

| Field | Required | Type / rules |
|---|---|---|
| `shipping_address` | ✅ | Object (validated `DictField` — the delivery address) |
| `expected_departure` | ✅ | Datetime (ISO-8601 or `YYYY-MM-DD`) |
| `platform` | ✅ | One of `Order.Platform` (`web` / `app` — the originating surface) |
| `port_id` | ✖ | UUID of a port |
| `anchorage_id` | ✖ | UUID of an anchorage |
| `ship_arrival_date` | ✖ | Datetime; **must not be in the past** |
| `is_fastest_delivery` | ✖ | Boolean (default `false`) |
| `note` | ✖ | ≤ 2000 chars |
| `ship_agent_id` | ✖ | UUID (nullable) — an agent from the sailor's directory |

*(No `items` in the body — the lines come from the sailor's express cart.)*

**Success — 201** (with a Stripe link)
```json
{
  "message": "Express order created.",
  "order_id": "…",
  "total_amount": "349.00",
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_…",
  "expires_at": "2026-07-23T09:41:00+00:00"
}
```

**Success — 201** (zero-total → settled without Stripe, e.g. a fully-free express item):
```json
{ "message": "Express order confirmed — no payment required.",
  "settled": true, "order_id": "…", "total_amount": "0.00" }
```
A `total_amount <= 0` order is confirmed via `settle_free_order` (same as Flow 7's pay path) and
**never reaches Stripe** — no `checkout_url`.

**Error responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"detail": "Your express cart is empty."}` | No items in the express cart |
| 400 | `{"detail": "These items are no longer available for express delivery: SKU…"}` | A line lost its express catalog type |
| 400 | `{"detail": "No longer available: SKU…"}` | A line is deleted / inactive / not sourceable |
| 400 | serializer errors | Bad/missing `shipping_address` / `expected_departure` / `platform`; past `ship_arrival_date` |
| 502 | `{"detail": "Payment provider error: …", "order_id": "…"}` | Stripe failed — order exists at `payment_pending`, pay via Flow 7 pay-order |

**Side effects** (one transaction): create the `Order` (`payment_pending`, `is_express=True`),
save the address to the book, `bulk_create` the lines, **delete the express cart**. After commit:
create the Stripe session.

---

## API 2 · Admin — express orders

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/express/orders/` · `GET` |
| **View** | `ListExpressOrdersView` |

The post-payment Orders list **pre-scoped to `is_express=True`**, with the **same validated
filters** as the main Orders screen (`_apply_order_list_filters`):

| Param | Values |
|---|---|
| `status` | a post-payment `Order.Status` (validated — a bad value → **400**) |
| `date_from` / `date_to` | `YYYY-MM-DD` (on `payment_completed_at`) |
| `partner_id` | UUID of the assigned partner |
| `search` | order number / customer name / email |
| `page` / `page_size` | pagination |

**Success — 200** — paginated lean rows (`OrderListSerializer`).

---

## API 3 · Admin — express items

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/express/items/` · `GET` |
| **View** | `ListExpressItemsView` |

The express **variant** catalog. Filters are **validated up front** (a bad UUID/number → **400**,
never a 500):

| Param | Values |
|---|---|
| `category_id` / `product_id` | UUID |
| `min_price` / `max_price` | decimal |
| `admin_sourceable` | bool — effective = **product AND variant** |
| `is_active` | bool |
| `search` | product name / description / SKU / about |
| `sort_by_price` | `low to high` / `high to low` |
| `sort_by_popularity` | `low to high` / `high to low` (by avg rating) |
| `sort_by_relevance` | `newest_first` / `oldest_first` |
| `page` / `page_size` | pagination |

**Success — 200** — `{ "message", "data": [ …ProductVariantSerializer… ] }` (paginated).

---

## API 4 · Admin — express stats

`GET /api/superadmin/express/stats/` · `ExpressStatsView` — three aggregates in one call:
express **products** (total / active / sourceable / top-rated / on-deal), express **variants**
(effective sourceable = product AND variant), and express **order volume by status**. No params.

---

## What happens next

| Outcome | Next |
|---|---|
| Sailor pays | **Flow 7** webhook → `order_confirmed` |
| Confirmed | **Flow 10** — partner assignment & delivery |
| Wants to change it | Can't — express is never amendable (**Flow 15**) or sailor-cancellable (**Flow 12**) |
| Unpaid express order | Shows in the **intents** list (**Flow 14**) until paid |

---

## Source reference

| Concern | Location |
|---|---|
| Express checkout | `orders/express_views.py` (`CreateExpressOrderView`) |
| Express cart (Flow 4) | `orders/express_views.py` (`View/Add/Update/Remove ExpressCartItemView`) |
| Order shell + total | `orders/order_service.py` (`create_order` — `total_amount = subtotal + shipping_fee`) |
| Stripe session | `orders/payments_service.py` (`create_or_reuse_session`) — shared with Flow 7 |
| Admin console | `admin_panel/views/express_views.py` |
| Express flag on a variant | `admin_panel/views/variant_views.py` (`SetVariantExpressView`) — Flow 29 |
| Express browse | `catalog/views.py` (`ExpressProductListView`) — Flow 3 |
