# Flow 04 — Cart Management

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`04-cart-management-validation.md`](./04-cart-management-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.** They collide
> with this document's flow numbering throughout the codebase. Quotes below preserve
> them verbatim; do not cross-map them.

---

# Executive Summary

| | |
|---|---|
| **Flow Name** | Cart Management |
| **Business Objective** | Hold a sailor's selection in one of three mutually exclusive, catalog-pure carts |
| **Flow Type** | Core |
| **Primary Actors** | Customer (sailor) |
| **Platforms** | `SAILOR` (`/api/orders/`) |
| **Django Apps** | `orders` · `catalog` (variant resolution) |
| **Models** | `Cart`, `CartItem`, `ProductVariant`, `Product`, `Anchorage`, `PortAddress` |
| **Services** | `get_cart`, `get_or_create_cart`, `restore_order_items_to_cart` (`orders/cart_service.py`) · `resolve_variant`, `AddCartItemSerializer` (`orders/serializers.py`) |
| **State Machines** | **None.** |
| **External Integrations** | None |
| **Total APIs** | **13** (4 regular · 4 express · 4 marine · 1 shared delivery-ETA) |
| **Previous Flow** | Flow 3 — Product Discovery |
| **Next Flow** | Flow 5 (Order Intent) for regular + marine · Flow 9 (Express Placement) for express |
| **Documentation Version** | 1.0 — 2026-07-20 |
| **Documentation Status** | ✅ 13 of 13 routes documented, verified against the running route table. ⚠️ **The three cart families are near-duplicates that have drifted — see the divergence matrix below before building any shared client code** |

---

# Phase 1 — Understand the Flow

## Business purpose

A sailor's selection lives in a cart. There are **three** carts, one per catalog type,
and a cart may never mix types. The rule is structural, not just validated: each catalog
type gets its own `Cart` row, and the model comment states the reason
(`orders/models.py:510-513`):

> *"`cart_type` mirrors `Product.catalog_type` 1:1, so each cart holds exactly one catalog
> type and a marine-emergency item can never leak its 24h SLA onto a regular order."*

| Cart | `cart_type` | Accepts `catalog_type` | Checkout goes to |
|---|---|---|---|
| Regular | `regular` | `regular` **only** | Flow 5 — Order Intent |
| Express | `express` | `express` only | Flow 9 — direct to Stripe |
| Marine | `marine` | `marine_emergency` only | Flow 5 — Order Intent (24h SLA) |

> **The regular cart does not accept express items.** The catalog-type check is a strict
> `!=`, so an express variant must go to the express cart. Note the DB value for the
> marine cart is `"marine"` while the catalog value is `"marine_emergency"` — they are
> different strings, mapped in two separate places.

Carts coexist: one sailor may hold a regular, an express and a marine cart
simultaneously. `UniqueConstraint(fields=["user", "cart_type"])` allows exactly one of
each (`orders/models.py:525-528`).

## Entry / Exit

| | |
|---|---|
| **Entry** | "Add to cart" on a variant detail (Flow 3) |
| **Success** | Cart is consumed by order creation and **deleted inside that transaction** |
| **Failure** | Checkout returns 400 listing unavailable or wrong-type items; **the cart is left intact** |

## Actors

**Customer (sailor)** only. All 13 endpoints are `[IsAuthenticated]`. Every cart
operation is scoped to `request.user` **and** to the family's `cart_type`, so a regular
endpoint cannot touch the caller's own express or marine items either.

## Models

| Model | File · Line | Notes |
|---|---|---|
| `Cart` | `orders/models.py:498-531` | `UniqueConstraint(["user", "cart_type"])` = one cart per type per sailor. Carries a `note` field that **no endpoint reads or writes** |
| `CartItem` | `orders/models.py:534-550` | `unique_together = [("cart", "variant")]` — one row per variant, which is why a duplicate add increments. `CheckConstraint(quantity >= 1)`. **No price column** |

`CartItem` has exactly four own fields: `id`, `cart`, `variant`, `quantity`.

## Pricing — read live, never snapshotted

There is **no price column on `CartItem`**. `variant_price` is resolved live on every
read (`orders/serializers.py:354`, `source='variant.price'`), so an admin price change is
reflected in the cart immediately with no stale-price banner and no "price changed"
signal. The snapshot happens later, at order-line creation.

The cart API computes **no line subtotal and no cart total** — both must be computed
client-side.

## Sourceability

Adding requires `product.admin_sourceable AND variant.admin_sourceable`, plus variant
liveness (`orders/serializers.py:90-93`, `:25`).

> **Update and view do not re-check.** An item that goes unavailable while sitting in
> the cart renders identically to a healthy one, at full price, and its quantity can
> still be raised. The sailor first learns at checkout, as a blocking 400. See validation
> findings **F-02** and **F-03**.

## Checkout hand-off — all-or-nothing

Order creation locks the cart, validates **every** line, and either builds the whole
order or refuses the whole cart:

- All offenders are collected into lists (`unavailable`, `wrong_type`) rather than
  bailing on the first.
- If either list is non-empty, a 400 is returned listing them, **before any write**.
- The cart is left completely intact — nothing is partially removed or silently dropped.
- On success, `cart.delete()` is the last statement **inside** `transaction.atomic()`.

A mid-build failure rolls back everything and the cart survives — asserted by
`orders/tests/test_order_atomicity.py:133-139`.

## Signals · Celery · Notifications

**None.**

---

# Phase 2 — Discover the Complete Flow

## Sequence diagram

```
SAILOR (from Flow 3, variant detail, is_sourceable=true)
  │
  ├── REGULAR ──────────────── EXPRESS ──────────────── MARINE ─────────────
  │  POST /add-to-cart/        POST /express-cart/items/  POST /marine-cart/items/
  │    {variant_id|product_id, quantity}                 (shared serializer)
  │    ├─ catalog type must match cart      → 400
  │    ├─ product AND variant sourceable    → 400
  │    ├─ quantity 1..999                   → 400
  │    └─ get_or_create + increment, capped at 999  → 201
  │
  │  GET /get-cart-items/      GET /express-cart/        GET /marine-cart/
  │    PAGINATED                {cart_type, item_count, items}
  │    404 if no cart row       always 200                always 200
  │    └─ NO availability signal on any item (all three)
  │
  │  PATCH /update-cart-item/<id>/   PATCH /express-cart/items/<id>/   (marine same)
  │    ├─ ownership: 404 if not yours
  │    ├─ quantity 1..999  (absolute set, NOT increment)
  │    └─ NO sourceability re-check (all three)
  │
  │  DELETE /remove-cart-item/?cart_item_id=  DELETE /express-cart/items/<id>/delete/
  │    ⚠ query param, unvalidated             path param, <uuid:> converted
  │    └─ hard delete
  │
  ├─ GET /delivery-eta/?anchorage_id=…   ← cart-agnostic pre-checkout utility
  │
  ▼ CHECKOUT
  regular/marine → build_intent_order        express → CreateExpressOrderView
    transaction.atomic + select_for_update      transaction.atomic + select_for_update
    ├─ collect ALL wrong-type   → 400 (SKUs)    ├─ collect ALL non-express → 400 (SKUs)
    ├─ collect ALL unavailable  → 400 (NAMES)   ├─ collect ALL unavailable → 400 (SKUs)
    │   cart untouched on either                │   cart untouched
    ├─ create order + items (live price)        ├─ create order + items (live price)
    └─ cart.delete() inside the lock            └─ cart.delete() inside the lock
         │                                            │ Stripe call is OUTSIDE the block
         ▼ Flow 5                                     ▼ Flow 9
```

## API sequence table

| Step | Family | API | Purpose |
|---|---|---|---|
| 1 | Regular | `POST /api/orders/add-to-cart/` | Add / increment |
| 2 | Regular | `GET /api/orders/get-cart-items/` | View (paginated) |
| 3 | Regular | `PATCH /api/orders/update-cart-item/<id>/` | Set quantity |
| 4 | Regular | `DELETE /api/orders/remove-cart-item/?cart_item_id=` | Remove |
| 5 | Express | `POST /api/orders/express-cart/items/` | Add / increment |
| 6 | Express | `GET /api/orders/express-cart/` | View |
| 7 | Express | `PATCH /api/orders/express-cart/items/<id>/` | Set quantity |
| 8 | Express | `DELETE /api/orders/express-cart/items/<id>/delete/` | Remove |
| 9 | Marine | `POST /api/orders/marine-cart/items/` | Add / increment |
| 10 | Marine | `GET /api/orders/marine-cart/` | View |
| 11 | Marine | `PATCH /api/orders/marine-cart/items/<id>/` | Set quantity |
| 12 | Marine | `DELETE /api/orders/marine-cart/items/<id>/delete/` | Remove |
| 13 | Shared | `GET /api/orders/delivery-eta/` | Pre-checkout ETA (cart-agnostic) |

## ⚠️ Divergence matrix — read this before writing client code

The three families are near-duplicates that have drifted. Only `get_cart` and
`get_or_create_cart` are genuinely shared; the add block, update handler and
ownership-scope helper are **copy-pasted three times**.

| Behaviour | Regular | Express | Marine |
|---|---|---|---|
| **URL style** | Verb-in-path, **remove uses a query param** | REST-ish `/items/<id>/`, delete at `/delete/` | Same as express |
| **View cart response** | **Paginated** `{count, next, previous, results}` | `{cart_type, item_count, items}` | `{cart_type, item_count, items}` |
| **No cart row** | **404** `{"message": "Cart not found"}` | **200**, `item_count: 0` | **200**, `item_count: 0` |
| **Empty existing cart** | 200, `results: []` | 200, `items: []` | 200, `items: []` |
| **Remove id source** | `?cart_item_id=` — **unvalidated** | `<uuid:item_id>` path | `<uuid:item_id>` path |
| **`select_related` on view** | ❌ absent (N+1) | ✅ present | ✅ present |
| **`try/except` on view** | Bare `except Exception` → 500 `{"message": str(e)}` | none | none |
| **Add success message** | `"Product added to cart successfully"` (no period) | `"Item added to express cart."` | `"Item added to marine cart."` |
| **Update success message** | `"Quantity updated."` | `"Quantity updated."` | `"Quantity updated."` |
| **Remove success message** | `"Cart item removed successfully"` (no period) | `"Item removed from express cart."` | `"Item removed from marine cart."` |
| **404 message** | `"Cart item not found."` | `"Express cart item not found."` | `"Marine cart item not found."` |
| **Checkout identifies bad items by** | wrong-type: **SKU** · unavailable: **product NAME** | **SKU** for both | wrong-type: SKU · unavailable: **NAME** |
| **Checkout service** | `build_intent_order` | **reimplemented inline** | `build_intent_order` |

**Identical across all three** (so not drift — shared blind spots): ownership scoping
(404, never 403), the add-time sourceability and catalog-type gates, quantity bounds
1–999, duplicate-add increment capped at 999, live pricing, `PATCH`-only (no `PUT`),
hard delete, no availability signal in the view, and `.order_by("id")`.

> `PUT` is **not implemented on any update endpoint** — it returns 405. Only `PATCH`
> works, on all three families.

---

# Phase 3 — API Documentation

## Flow-wide conventions

| Header | Notes |
|---|---|
| `Authorization: Token <key>` | All 13 |
| `server-secret-key: <SERVER_SECRET_KEY>` | All 13 — `/api/orders/` is **not** exempt |
| `Content-Type: application/json` | All write endpoints |

**Cart item object** — `CartItemsSerializer` (`orders/serializers.py:352-374`), the same
8 fields on all three families:

| Field | Notes |
|---|---|
| `id` · `cart` · `variant` | UUIDs |
| `quantity` | int |
| `variant_price` | **Live** `variant.price`, decimal string |
| `variant_name` | `"{product.name} - {variant.sku}"` |
| `description` | `variant.product.description` |
| `product_img` | Primary variant image → any variant image → primary product image → any product image → `null` |

> **No availability field exists.** There is no `is_sourceable`, `is_active` or
> `catalog_type` on the cart item, so a client cannot tell a dead line from a healthy
> one. No line subtotal, no cart total.

---

## API 1 · Add to the regular cart

| Field | Value |
|---|---|
| **Endpoint** | `/api/orders/add-to-cart/` · `POST` |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`orders/views.py:46`) |

**Request Body**
```json
{ "variant_id": "…", "quantity": 2 }
```

| Field | Required | Rules |
|---|---|---|
| `variant_id` | ✖* | UUID. **Wins if both ids are sent** |
| `product_id` | ✖* | UUID. Shorthand for a single-variant product |
| `quantity` | ✖ | Integer, **1–999**, default `1` |

\* At least one identifier is required.

**Success — 201**
```json
{ "message": "Product added to cart successfully", "item": { …cart item… } }
```

> **201 is returned even when the call merely incremented an existing line.** A
> duplicate add never creates a second row — `unique_together ("cart", "variant")`
> guarantees one row per variant, and the quantity is `min(old + new, 999)`.

> **Saturation is silent.** Adding 900 then 900 yields 999 with a 201 and no indication
> that 801 units were dropped.

**Error Responses** — all 400

| Body | Condition |
|---|---|
| `{"detail": "Provide variant_id, or product_id for a single-variant product."}` | Neither id |
| `{"variant_id": ["Product variant not found."]}` | Unknown, inactive, or soft-deleted variant |
| `{"product_id": ["Product not found."]}` | Unknown product |
| `{"detail": "This product is currently unavailable."}` | Product has no live variant |
| `{"product_id": ["This product has multiple variants — send variant_id for the one you want."]}` | Ambiguous |
| `{"detail": "This is a marine emergency item and can't be added to your regular cart."}` | Wrong catalog type |
| `{"detail": "This item is currently unavailable and can't be added to your cart."}` | Not sourceable |
| `{"quantity": ["Ensure this value is greater than or equal to 1."]}` | Out of range |

> On the wrong-catalog-type path **no `Cart` row is created** — validation runs before
> any cart access, so the sailor is not left with a stray empty cart.

**Database Changes** — `Cart` `get_or_create`, then `CartItem` `get_or_create` or a
quantity UPDATE. **Not wrapped in `transaction.atomic()`** — see finding F-08.

---

## API 2 · View the regular cart

| Field | Value |
|---|---|
| **Endpoint** | `/api/orders/get-cart-items/` · `GET` |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`orders/views.py:68`) |
| **Query Parameters** | `page` · `page_size` (max 50) |

**This is the only cart view that paginates.** `CustomPagination`, `page_size=10`.

**Success — 200** — standard DRF envelope: `{count, next, previous, results: [ …items… ]}`.

> No `cart_type` and no `item_count`, unlike express and marine.

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| **404** | `{"message": "Cart not found"}` | The sailor has **no regular cart row** |
| 500 | `{"message": "<str(exception)>"}` | Any exception — see finding F-07 |

> An **empty existing cart** returns 200 with `results: []`. So the same user-visible
> state — "my cart is empty" — produces a 404 or a 200 depending on whether a `Cart` row
> happens to exist. Express and marine always return 200.

**Database Changes** — None.

---

## API 3 · Set a regular cart item's quantity

| Field | Value |
|---|---|
| **Endpoint** | `/api/orders/update-cart-item/<uuid:item_id>/` · **`PATCH` only** |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`orders/views.py:97`) |

> **`PUT` returns 405.** No update endpoint in any family implements it.

**Request Body** — `{ "quantity": 7 }`

Sets an **absolute** quantity — unlike add-to-cart, which increments. The docstring says
so explicitly (`orders/views.py:93`).

Validation is hand-rolled, not a serializer: `int()` cast, then `>= 1`, then `<= 999`.
A JSON float like `7.9` is silently truncated to `7`; the string `"7"` is accepted;
unknown body keys are ignored.

**Success — 200** — `{"message": "Quantity updated.", "item": { … }}`

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 404 | `{"detail": "Cart item not found."}` | Unknown, or **not the caller's** |
| 400 | `{"quantity": ["Must be an integer."]}` | Missing or non-numeric |
| 400 | `{"quantity": ["Must be at least 1."]}` | `< 1` |
| 400 | `{"quantity": ["Must be at most 999."]}` | `> 999` |

> **Ownership returns 404, never 403** — a foreign item id is indistinguishable from a
> nonexistent one, so the endpoint is not an enumeration oracle. Asserted by
> `orders/tests/test_cart_validation.py:127-134`.

> **No availability re-check.** An item that has gone unsourceable can still have its
> quantity raised to 999, returning 200. See finding **F-03**.

---

## API 4 · Remove a regular cart item

| Field | Value |
|---|---|
| **Endpoint** | `/api/orders/remove-cart-item/` · `DELETE` |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`orders/views.py:121`) |
| **Query Parameters** | `cart_item_id` — **required in practice, and not validated** |

> ⚠️ **This is the only cart endpoint that takes the item id as a query parameter**, and
> the only one that does not validate it. A malformed value is an unhandled **500** —
> see finding **F-01**. Omitting the parameter entirely is benign (clean 404).

**Success — 200** — `{"message": "Cart item removed successfully"}`

**Error Responses** — 404 `{"detail": "Cart item not found."}` (unknown or not the
caller's) · **500** on a malformed `cart_item_id`.

**Database Changes** — **hard delete.** `CartItem` inherits soft-delete *fields* from
`GenericModel` but there is no `delete()` override, so the row is physically removed and
`is_deleted` / `deleted_at` are never populated.

---

## APIs 5–8 · Express cart

| API | Endpoint | Method |
|---|---|---|
| 5 | `/api/orders/express-cart/items/` | `POST` |
| 6 | `/api/orders/express-cart/` | `GET` |
| 7 | `/api/orders/express-cart/items/<uuid:item_id>/` | **`PATCH` only** |
| 8 | `/api/orders/express-cart/items/<uuid:item_id>/delete/` | `DELETE` |

Behaviour is identical to APIs 1–4 except as listed in the divergence matrix. The
material differences:

**API 6 — view** returns an **unpaginated** envelope and **always 200**:
```json
{ "cart_type": "express", "item_count": 3, "items": [ … ] }
```
`item_count` is the number of **lines**, not the summed quantity. A sailor with no
express cart row gets `item_count: 0, items: []`, not a 404.

**API 5 — add** rejects anything that is not `catalog_type=express`:
`{"detail": "This is a regular item and can't be added to your express cart."}`

**APIs 7 and 8** take `<uuid:item_id>` in the path, so a malformed id never reaches the
ORM — Django's URL resolver returns 404. `DELETE` on `/items/<id>/` (without `/delete/`)
returns **405**.

404 message is `"Express cart item not found."`; success messages are
`"Item added to express cart."` and `"Item removed from express cart."`.

---

## APIs 9–12 · Marine cart

| API | Endpoint | Method |
|---|---|---|
| 9 | `/api/orders/marine-cart/items/` | `POST` |
| 10 | `/api/orders/marine-cart/` | `GET` |
| 11 | `/api/orders/marine-cart/items/<uuid:item_id>/` | **`PATCH` only** |
| 12 | `/api/orders/marine-cart/items/<uuid:item_id>/delete/` | `DELETE` |

**Byte-for-byte identical to the express family** apart from these substitutions:

| | Express | Marine |
|---|---|---|
| `cart_type` in the GET body | `"express"` | `"marine"` |
| Accepted catalog type | `express` | `marine_emergency` |
| Add success | `"Item added to express cart."` | `"Item added to marine cart."` |
| 404 message | `"Express cart item not found."` | `"Marine cart item not found."` |
| Remove success | `"Item removed from express cart."` | `"Item removed from marine cart."` |
| Wrong-type label | `"your express cart"` | `"your marine emergency cart"` |

The update success message is `"Quantity updated."` in **both** — no family prefix,
unlike add and remove.

---

## API 13 · Pre-checkout delivery ETA

| Field | Value |
|---|---|
| **Purpose** | Delivery ETA at port/anchorage selection, before an order exists |
| **Endpoint** | `/api/orders/delivery-eta/` · `GET` |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`orders/views.py:23`) |
| **Query Parameters** | `anchorage_id` *(preferred)* or `port_id`; optional `arrival`, `expected_departure` |

Returns an ETA **range** and, when `expected_departure` is supplied, the
arrives-before-you-sail feasibility cue. Delegates to
`delivery_policy.eta_for_anchorage(...)`.

> **This endpoint is cart-agnostic.** It touches no `Cart`, takes no cart id, and is
> keyed to port/anchorage selection. It lives in the regular flow's module and has no
> express or marine equivalent — all three families call this same route. Documented
> here because the flow definition lists it as a step; see validation BFO-1.

---

## What happens next

| Condition | Continue to |
|---|---|
| Regular or marine cart checked out | **Flow 5** — Standard & Marine Emergency Order Intent |
| Express cart checked out | **Flow 9** — Express Order Placement (direct to Stripe) |
| Checkout returned 400 listing bad items | Back to this flow — remove them, retry |
| Order later cancelled while unpaid | Items are **restored** to the matching cart (`restore_order_items_to_cart`) |

---

## Source reference

| Concern | File |
|---|---|
| Regular cart views + delivery ETA | [`orders/views.py`](../../backend/orders/views.py) |
| Express cart + express checkout | [`orders/express_views.py`](../../backend/orders/express_views.py) |
| Marine cart | [`orders/marine_views.py`](../../backend/orders/marine_views.py) |
| Shared cart helpers, cancel-restore | [`orders/cart_service.py`](../../backend/orders/cart_service.py) |
| `AddCartItemSerializer`, `resolve_variant`, `CartItemsSerializer` | [`orders/serializers.py`](../../backend/orders/serializers.py) |
| Regular + marine checkout | [`orders/intent_service.py`](../../backend/orders/intent_service.py) |
| `Cart`, `CartItem` | [`orders/models.py`](../../backend/orders/models.py) (498-550) |
| Routes | [`orders/urls.py`](../../backend/orders/urls.py) (60-79) |
| Tests | [`orders/tests/test_cart_validation.py`](../../backend/orders/tests/test_cart_validation.py) · [`test_cart_quantity_cap.py`](../../backend/orders/tests/test_cart_quantity_cap.py) · [`test_order_atomicity.py`](../../backend/orders/tests/test_order_atomicity.py) |
