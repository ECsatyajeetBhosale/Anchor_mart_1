# Flow 15 — Order Amendment (Add Items to an Existing Order)


> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`15-order-amendment-validation.md`](./15-order-amendment-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)


> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**


---


# Executive Summary


A sailor who has already placed an order can **add more goods to it** — right up until the
order is picked up (and no later than `CUSTOMER_CANCEL_LEAD_HOURS` before the ship arrives).
There is exactly **one endpoint**, and it takes one of two paths automatically, decided purely
by whether the order has already been **paid**:


- **Unpaid order → the items merge into the SAME order.** If the order had already been
 verified or billed, it drops back to `partner_verifying` so the partner re-checks the new
 lines; any open bill/checkout link is voided and the sailor's earlier substitution sign-off
 is cleared. **Returns `200`** with the same order.
- **Paid order → the items become a new linked "addition" order.** A fresh child order
 (`parent_order` → the paid order) is created at the start of the intent funnel and runs
 **verify → bill → pay** on its own. The paid parent is never touched — no re-bill, no refund
 maths. **Returns `201`** with the new child order.


Items can be supplied from a **catalog search** (`items`) and/or the sailor's **cart**
(`from_cart` for the whole cart, or `cart_item_ids` for specific lines — those lines are
**moved** out of the cart). Orders stay **single-type ("pure")**: a general order only accepts
general items; a marine-emergency order only marine items. **Express orders can never be
amended.**


| | |
|---|---|
| **Actors** | Customer (sailor) — the only caller. Admins & the delivery partner are downstream (notified / re-verify). |
| **Endpoint** | **1** — `POST /api/orders/<uuid:order_id>/add-items/` |
| **Django Apps** | `orders` (`AddItemsToOrderView` → `add_items_service.add_items_to_order`) |
| **Models** | `Order`, `OrderItem`, `Cart`, `CartItem`, `Payment` |
| **Core service** | `orders/add_items_service.py` |
| **Two paths** | unpaid → merge (200) · paid → child addition order (201) |
| **Previous Flow** | 5 (build cart) · 6 (place order) · 7 (pay) — the order must already exist |
| **Next Flow** | Unpaid → re-verification (Flow 10/partner) → re-bill → 7 (pay). Paid → the child runs Flow 14's intent funnel → 7 (pay) → 10 (delivery) |
| **Documentation Version** | 1.1 — 2026-07-23 (FQ1: one shared `is_orderable()` availability gate; FQ2: `warnings[]` on a capped line; FQ3: price-lock on merge documented) |
| **Documentation Status** | ✅ 1 route documented, verified against the running route table |


> **Why "pure" orders?** Each order carries a single catalog type so it can be sourced,
> verified and delivered as one shipment. A general order accepts only `REGULAR` items, a
> marine-emergency order only `MARINE_EMERGENCY` items. Express items never match either, which
> is one more reason express orders are excluded outright.


---


# The one endpoint


## `POST /api/orders/<uuid:order_id>/add-items/` — Add items to an order


**Name:** `add-order-items` · **Auth:** customer token (`IsAuthenticated`) +
`server-secret-key` header · **View:** `AddItemsToOrderView`


Adds items to the order at `order_id`, which **must belong to the caller**. The response
status and shape depend on whether the order is paid (see [Responses](#responses)).


### Path parameter


| Param | Type | Notes |
|---|---|---|
| `order_id` | UUID (path) | The order to amend. Must be owned by the caller, else **404**. |


### Request body


All three item sources are **optional individually**, but **at least one** must resolve to a
line, or you get a 400. They combine in a single call; duplicates (same variant across sources)
are merged into one line.


| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `items` | array of objects | No | `[]` | Catalog-picked lines (see item shape below). |
| `from_cart` | boolean | No | `false` | Move the sailor's **whole** matching-type cart onto the order. Wins over `cart_item_ids`. |
| `cart_item_ids` | array of UUID | No | `[]` | Or just these specific cart lines. **Moved** (deleted from the cart) once added. |
| `is_fastest_delivery` | boolean | No | *(unset — leaves the order's choice)* | Opt into fastest delivery. **Upgrade-only**: `true` turns it on if the order wasn't already fastest; it never turns an existing fastest order off. |


**`items[]` — one catalog-picked line:**


| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `variant_id` | UUID | Conditional | — | The specific variant. **Wins** if both are sent. |
| `product_id` | UUID | Conditional | — | Single-variant shorthand — resolves the product's one live variant; **400** if the product has multiple live variants (send `variant_id`). |
| `quantity` | integer | No | `1` | `1 … 999`. |


> Provide `variant_id` **or** `product_id` per item. Neither → 400
> (`"Provide variant_id, or product_id for a single-variant product."`).


**Source precedence & merging.** `from_cart` (whole cart) takes precedence over
`cart_item_ids`. Lines from the cart and from `items` are pooled; the same variant appearing in
more than one source is **merged into a single line** (quantities summed, capped at 999).


**Limits.** At most **50 distinct items** per request (`MAX_ITEMS`); per-line quantity `1…999`.


**Filters / search / pagination:** **none** — this is a single write endpoint, not a list.


### Request examples


**(a) Add two catalog items by variant:**
```json
{
 "items": [
   { "variant_id": "7c1e…-a1", "quantity": 2 },
   { "variant_id": "9f2d…-b7", "quantity": 1 }
 ]
}
```


**(b) Move the whole matching-type cart onto the order and upgrade to fastest:**
```json
{ "from_cart": true, "is_fastest_delivery": true }
```


**(c) Move specific cart lines + one catalog item (single-variant shorthand):**
```json
{
 "cart_item_ids": ["3a4b…-11", "3a4b…-22"],
 "items": [ { "product_id": "d0c1…-e9", "quantity": 3 } ]
}
```


### What the endpoint checks — in order


**View-level gates (before any items are read):**


| # | Guard | On failure |
|---|---|---|
| 1 | **Ownership** — the order exists and belongs to the caller | **404** |
| 2 | **Not closed** — status ∉ `{cancelled, refunded, intent_rejected}` | **400** `"This order is closed — place a new order instead."` |
| 3 | **Not express** — `is_express == False` | **400** `"Express orders can't be modified…"` |
| 4 | **Not yet picked up** — status ∉ `{items_collected, at_port, at_berth, partially_delivered, delivered, delivery_failed}` | **400** `"Items can't be added once the order has been picked up."` |
| 5 | **Within the cancel window** — now ≤ `ship_arrival_date − CUSTOMER_CANCEL_LEAD_HOURS` (no gate if the order has no arrival date) | **400** `"Items can only be added up to {N}h before the ship's arrival."` |


**Serializer-level gates (on the resolved items):**


| Check | On failure |
|---|---|
| At least one item resolves | **400** `"Provide items, cart_item_ids, or from_cart to add."` |
| `from_cart` but the matching-type cart is empty | **400** `{"from_cart": ["Your {type} cart is empty."]}` |
| `cart_item_ids` not in the matching-type cart | **400** `{"cart_item_ids": ["Not found in your {type} cart: …"]}` |
| Each catalog item resolves to a **live** variant | **400** (`"Product variant not found."` / `"Product not found."` / multi-variant prompt) |
| **≤ 50** distinct items | **400** `"At most 50 items can be added in one request."` |
| **Type purity** — every item matches the order's catalog type | **400** `"This is a {type} order — these items don't belong to it: {SKUs}. Place a separate order for them."` |
| **Availability** — every item passes the shared gate `ProductVariant.is_orderable()` (live **and** sourceable on the variant **and** its product — the one definition used by add-to-cart, add-items and cart-restore) | **400** `"These items are currently unavailable: {SKUs}."` |


### Responses


**Unpaid order → merge (HTTP `200`):**
```json
{
 "message": "Items added to your order. We'll re-check availability and update your bill.",
 "order_id": "1b2c…-99",
 "order_number": "AM-2026-000481",
 "status": "partner_verifying",
 "is_addition_order": false,
 "parent_order_id": null
}
```


**Paid order → new child addition order (HTTP `201`):**
```json
{
 "message": "Your items were added as a linked order AM-2026-000482. We'll source them and send you a bill.",
 "order_id": "5d6e…-42",
 "order_number": "AM-2026-000482",
 "status": "intent_received",
 "is_addition_order": true,
 "parent_order_id": "1b2c…-99"
}
```


| Field | Meaning |
|---|---|
| `order_id` / `order_number` | The order the items **landed on** — the same order (unpaid) or the new child (paid). |
| `status` | Its status *after* the amendment (see side effects). |
| `is_addition_order` | `true` only when a child addition order was created (paid path). |
| `parent_order_id` | The paid parent's id (paid path), else `null`. |
| `warnings` | **Present only if** a line hit the 999 per-line maximum. An array of human strings, one per capped line — e.g. `"Rope (R-1): you asked for 1003 but the per-line maximum is 999 — added up to the maximum."` Omitted entirely when nothing was capped. |


### Side effects


**Unpaid → merge (same order):**
- New lines are appended; a line for a variant already on the order has its **quantity bumped**
 (merged into the existing line, capped at 999) rather than duplicated.
- Any picked **cart lines are deleted** from the cart (moved, not copied).
- `is_fastest_delivery` upgrades the order if requested and not already on.
- **If the order had reached `verification_submitted`, `pending_customer_response` or
 `payment_pending`**, it transitions back to **`partner_verifying`** (history note *"Items added
 by sailor — re-verification required"*), and:
 - `substitutions_confirmed_at` is cleared (the sailor's sign-off no longer covers the new lines),
 - `customer_response_due_at` is cleared,
 - **all open Stripe checkout sessions are expired** (the old bill/link is now wrong).
 - *(If the order was in an earlier state — e.g. `intent_received`/`partner_verifying` — nothing
   had been verified or billed yet, so the lines simply merge with no status change.)*
- **All admins are notified** (`ORDER_UPDATE`, "Items added to an order — it needs re-verification").


**Paid → child addition order:**
- A new `Order` is created at **`intent_received`** with `parent_order` → the paid order,
 inheriting the parent's delivery context (shipping address, port, anchorage, arrival/departure,
 ship agent + snapshot, platform, catalog type). It runs the normal intent funnel and gets its
 **own** bill and payment.
- The **paid parent is untouched** (no re-bill, no refund).
- Picked cart lines are deleted; `is_fastest_delivery` applies to the **child** (upgrade-only).
- **All admins are notified** (`INTENT_RECEIVED`, "Items added to a paid order — addition {number}
 needs sourcing and billing").


### Error responses — quick reference


| Status | When |
|---|---|
| **200** | Unpaid order — items merged. |
| **201** | Paid order — child addition order created. |
| **400** | Closed / express / picked-up / past the window; empty or invalid item set; wrong type; unavailable; > 50 items. |
| **401** | Missing/expired token. |
| **404** | Order not found or not owned by the caller. |


---


# Data model touchpoints


| Model | Role in this flow |
|---|---|
| `Order` | The target (unpaid) or parent (paid). `parent_order` FK links a child addition to its paid parent. `payment_status == COMPLETED` is the **branch switch**. |
| `OrderItem` | The added lines. One live line per variant per order (`uniq_orderitem_per_variant_live`), so a repeat variant merges (its quantity grows). `unit_price` is **price-locked at first-add**: snapshotted from `variant.price` when the line is first created, and **not** re-priced when a later amendment bumps the quantity — added units bill at the original price (intended; customer-fair). A brand-new line uses the current `variant.price`. |
| `Cart` / `CartItem` | The optional item source. Picked lines are **moved** (deleted) onto the order. The cart type is chosen by the order's type (`MARINE` for emergency, else `REGULAR`). |
| `Payment` | Open checkout sessions on an unpaid order are **expired** when it drops back to re-verification. |


---


# How Flow 15 connects


```
                      POST /orders/<id>/add-items/
                                  │
                ┌─────────────────┴──────────────────┐
       order.payment_status == COMPLETED ?            │
                │ no (UNPAID)                          │ yes (PAID)
                ▼                                      ▼
  items merge into the SAME order              create child Order
  (bump existing lines)                        (parent_order = paid order,
                │                               status = intent_received,
  if verified/billed already:                  inherits delivery context)
    → back to partner_verifying                          │
    → clear substitution sign-off              runs its OWN funnel:
    → expire open Stripe sessions              verify → bill → pay → deliver
                │                                        │
       re-verify → re-bill → pay               (Flow 14 intent · 7 pay · 10 deliver)
```


- **Upstream:** the order comes from Flow 6 (place) / Flow 7 (pay); cart items from Flow 5.
- **Downstream (unpaid):** re-verification is the partner's Flow 10 work; the new bill is paid via
 Flow 7.
- **Downstream (paid):** the child addition is an ordinary order — it appears in Flow 14 (history /
 intent funnel), is billed and paid via Flow 7, delivered via Flow 10.
- **Never reachable here:** express orders (Flow 9) — excluded at gate 3.



