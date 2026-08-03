# Flow 29a — Merchandising & Availability


> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`29a-merchandising-availability-validation.md`](./29a-merchandising-availability-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint is fully specified.
>
> Index: [`../../BUSINESS_FLOWS.md`](../../BUSINESS_FLOWS.md)


> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**


> **Part 2 of 4.** Companion parts: [29 · Catalog Structure](./29-catalog-structure.md) ·
> 29b · Marine-Emergency Spares · 29c · Ports & Anchorages.


---


# Executive Summary


Six endpoints that decide **what a sailor sees and whether they can buy it**. Part 29 covers
*authoring* an item; this part covers *merchandising* it.


Everything here is a **toggle on an object that already exists**, and every one of them takes a
single boolean (or an enum) and returns immediately. There are no lists and no pagination in this
part.


| Switch | Level | Controls |
|---|---|---|
| `admin_sourceable` | product **and** variant | **Can it be bought?** The availability signal. |
| `is_express` | variant | Express-delivery eligibility. |
| `catalog_type` | product | Which catalog surface it appears on. |
| `is_top_rated` | product | A merchandising badge. |
| *(announce)* | product | A one-off broadcast telling customers it's available. |


| | |
|---|---|
| **Actors** | Admin (Catalog screens) · Customer (recipient of the announce broadcast) |
| **Endpoints** | **6** — 4 product · 2 variant, all `POST` |
| **Django Apps** | `admin_panel` (views), `catalog` (models + `waitlist_service`), `notifications` (broadcast) |
| **Models** | `Product`, `ProductVariant`, `Category`, `GeneralNotification` (the broadcast record) |
| **Trigger** | Admin toggles a switch on the Catalog screen |
| **Previous Flow** | 29 (the object must exist first) |
| **Next Flow** | 3 (what the sailor then sees) · 21 (the broadcast's delivery) |
| **Documentation Version** | 1.0 — 2026-07-29 |
| **Documentation Status** | ✅ 6 routes fully specified. Routes from the running route table; behaviour verified by executing every endpoint. |


> **The load-bearing rule — the effective-sourceable AND.** A variant is buyable only when
> **`product.admin_sourceable` AND `variant.admin_sourceable`** are both true (plus both rows live).
> The product flag is a **master switch**; the variant flag is a per-variant override. Turning the
> master off makes every variant unbuyable regardless of their own flags. **This is why a raw
> `admin_sourceable` value on a variant payload cannot be trusted on its own** — the customer-facing
> API exposes a computed `is_sourceable` for exactly this reason.


---


# Concepts you need before reading the endpoints


### `admin_sourceable` carries two different meanings


This is the single most important thing to understand in this part, and it is not inferable from the
field name.


`admin_sourceable=False` means **either**:


1. **"We cannot currently source this item"** — the ordinary merchandising meaning, set by the
  toggles in §2 and §5 below; **or**
2. **"This is a hidden special-request quote product"** — a bespoke product created by the
  special-request flow, which must never appear in the catalog at all.


**Nothing on the model distinguishes them.** The only marker for meaning (2) is the presence of a
`SuggestedProductByAdmin` row pointing at the variant, which `catalog.waitlist_service` wraps in
`not_a_quote_product_q()` / `not_a_quote_variant_q()`.


**Practical consequence for an admin UI:** a product with `admin_sourceable=False` may be an ordinary
out-of-stock item *or* somebody's private quote. §4 (announce) filters quotes out explicitly. Any new
screen that lists non-sourceable products must do the same, or it will leak one sailor's bespoke
quote into a general listing.


### There is no numeric stock


AnchorMart tracks no quantity anywhere. `admin_sourceable` **is** the availability model. "Out of
stock" and "back in stock" are this boolean flipping.


### Flipping sourceable does NOT notify anyone


Making a product or variant sourceable used to fan out to a per-user waitlist. **It no longer does.**
The per-user waitlist opt-in is unwired (dormant code retained in `catalog.waitlist_service` for a
future build), and availability is announced **deliberately** via §4 — so an admin bulk-enabling
fifty products cannot blast every sailor.


### Cascades


Three of these endpoints change more than the field you asked for:


| Endpoint | Cascade |
|---|---|
| §5 variant → sourceable **on** | Turns the **product's** master on if it was off (**up only**) |
| §6 variant → express **on** | Sets the **product's** `catalog_type` to `express` |
| §6 variant → express **off** | If it was the **last** express variant, moves the product **out** of the express catalog |


Turning a variant's sourceable **off** never turns the product's master off.


---


# Endpoints — full specification


**Headers:** `Authorization: Token <token>` (role `admin` or `super_admin`).
`/api/superadmin/` is **exempt** from the `server-secret-key` middleware — do **not** send it.
All are `IsAuthenticated + IsAdminUser`, all are `POST`, none is scope-partitioned (they accept a
product or variant of **any** catalog type).


---


## 1 · `POST /api/superadmin/products/set-top-rated/<product_id>/` — Top-rated badge


| Field | Type | Required | Rule |
|---|---|---|---|
| `is_top_rated` | bool | ✅ | **Must be a real JSON boolean.** `"true"` (string), `1`, or omitted → **400**. |


```json
{ "is_top_rated": true }
```


**Response `200`:**
```json
{ "message": "Product marked as top rated.", "is_top_rated": true }
```
When `false`, the message reads `"Product unmarked as top rated."`.


**Errors**
- `400` `{"is_top_rated": ["This field is required and must be a boolean."]}` — missing, or not a
 JSON boolean
- `404` unknown or soft-deleted product


> `is_top_rated` is a **product-level** merchandising badge. It is not derived from ratings — an
> admin sets it by hand, and `average_rating` is computed separately.


---


## 2 · `POST /api/superadmin/products/set-admin-sourceable/<product_id>/` — Master availability switch


Sets the **product-level master**. Combined with each variant's own flag by the AND rule.


| Field | Type | Required | Rule |
|---|---|---|---|
| `admin_sourceable` | bool | ✅ | Must be a real JSON boolean, else **400**. |


```json
{ "admin_sourceable": false }
```


**Response `200`:**
```json
{ "message": "Product marked not sourceable.", "admin_sourceable": false }
```
When `true`: `"Product marked sourceable."`


**Errors** — `400` non-boolean or missing · `404` unknown or soft-deleted product.


> **No notification is sent**, in either direction. To tell customers an item is available, call §4
> deliberately.
>
> **Turning the master off does not change any variant's own flag** — the variants keep
> `admin_sourceable=True` individually and become buyable again the moment the master is turned back
> on. The stored variant value therefore does not reflect buyability on its own.


---


## 3 · `POST /api/superadmin/products/set-catalog-type/<product_id>/` — Move between catalogs


The one **bidirectional** endpoint for moving a product between the regular, express and
marine-emergency catalogs. All the product's variants follow, because `catalog_type` lives only on
the product — variants have no type of their own.


| Field | Type | Required | Rule |
|---|---|---|---|
| `catalog_type` | string | ✅ | One of **`regular`**, **`express`**, **`marine_emergency`**. Anything else → 400. |
| `category` | UUID | ❌ | Re-point the product to this category **in the same call**. Must be live, active, and scope-valid for the target type. |


**The relaxed scope rule** — this endpoint uses a *different*, more permissive rule than
create/update:


| Target `catalog_type` | Category scopes accepted **here** |
|---|---|
| `regular` | `general` only |
| **`express`** | **`general` OR `marine_emergency`** — express is an operational overlay valid for both |
| `marine_emergency` | `marine_emergency` only |


> ⚠️ **This differs from §11/§12 in part 29**, where creating or updating a product uses the *strict*
> rule and an express product must have a `general` category. The practical effect: this endpoint can
> put a product into a `(express, marine category)` combination that the add/update endpoints would
> refuse. Recorded in the validation report.


**When `category` is omitted**, the product keeps its current category — but that category must
**already** be valid for the new type. So:


- switching to `express` never needs a `category` (both scopes are accepted);
- switching `general → marine_emergency` **does** need one, unless the product is somehow already in
 a marine category.


```json
{ "catalog_type": "express" }
```
```json
{ "catalog_type": "marine_emergency", "category": "7b21…" }
```


**Response `200`:**
```json
{ "message": "Product catalog type set to 'express'. All variants inherit it.",
 "data": { /* the full product detail shape — see part 29 §10 */ } }
```


**Errors**
- `400` `{"catalog_type": ["Required; must be one of ['regular', 'express', 'marine_emergency']."]}`
- `400` `{"category": ["'x' is not a valid UUID."]}`
- `400` `{"category": ["Category not found."]}` — unknown, inactive, or soft-deleted
- `400` `{"category": ["A 'marine_emergency' product cannot use a 'general' category (allowed: ['marine_emergency'])."]}`
- `400` when `category` is omitted and the **current** one isn't valid for the target type:
 `{"category": ["This product's category is 'general', which isn't valid for a 'marine_emergency' product. Include a valid 'category' in the request (allowed scopes: ['marine_emergency'])."]}`
- `404` unknown or soft-deleted product


---


## 4 · `POST /api/superadmin/products/<product_id>/announce-availability/` — Tell customers it's available


No request body. A **deliberate, manual broadcast to all customers** — this replaced the automatic
waitlist fan-out so a bulk sourceable-edit cannot spam every sailor.


**Two preconditions**, both enforced:


1. The product must be **live and active**, and must **not** be a special-request quote product
  (`not_a_quote_product_q()`), else **404**.
2. The product must actually be **orderable**: the master `admin_sourceable` must be on **and** at
  least one live, active variant must itself be `admin_sourceable`, else **400**.


**Response `201` — sent:**
```json
{ "message": "Announced 'Deck Cap' to customers.",
 "announced": true,
 "broadcast_id": "e91c…" }
```


**Response `200` — suppressed as a duplicate** (see the dedupe window below). Note the **200, not
201**, and that `broadcast_id` is absent because nothing was created:
```json
{ "message": "You announced 'Deck Cap' moments ago — not sent again.",
 "announced": false,
 "retry_after_seconds": 120 }
```
`message` reads `"Another admin announced …"` when someone else made the original call.


**Check `announced`, not the status code**, if you only care whether a broadcast went out.


**Errors**
- `400` `{"detail": "This item isn't available to order, so it can't be announced. Make it sourceable first."}`
- `404` unknown, inactive, soft-deleted, **or a special-request quote product**


**What the customer receives**


| Property | Value |
|---|---|
| Audience | **All customers** — not a targeted or opted-in list |
| Category | `PROMOTIONAL` — honours the marketing opt-out |
| Channels | **Push + in-app announcement only. Never email.** |
| Title | `"Now available"` |
| Message | `"<product name> is now available — order it before your ship sails."` |


Email is deliberately excluded: an availability nudge is higher-frequency and lower-stakes than an
admin broadcast, and sending email for every announce would erode the promotional email channel. An
admin who wants email for a large restock uses the general broadcast tool instead, with a deliberate
channel choice.


### The dedupe window (GA11, 2026-07-30)


A repeat announce for the **same product** within a short window is a **no-op returning `200`**
rather than a second broadcast. Two consecutive calls previously both returned `201` and both
blasted every customer.


| | |
|---|---|
| Window | **120 seconds** by default (`ANNOUNCE_DEDUPE_WINDOW_SECONDS`) |
| Scope | **Per product** — a different product is unaffected, and the window covers one admin double-clicking *and* two admins racing |
| Not once-only | After the window the product can be announced again. Re-announcing a genuine restock weeks later is expected to work |
| A rejected call costs nothing | A `400`/`404` happens before the guard, so fixing the product and retrying immediately works |
| A failed send releases it | If the broadcast itself errors, the window is cleared so a retry is possible |


**Still not recorded.** This is a short in-memory window, not an announcement history — there is no
`last_announced_at` and no log of what was announced when. A cache restart clears the window (worst
case: one duplicate broadcast). It guards the accidental double-tap and nothing more.


---


## 5 · `POST /api/superadmin/product-variants/set-admin-sourceable/<product_variant_id>/`


Sets **one variant's** availability override.


| Field | Type | Required | Rule |
|---|---|---|---|
| `admin_sourceable` | bool | ✅ | Must be a real JSON boolean, else **400**. |


**Response `200`:**
```json
{ "message": "Variant marked sourceable.",
 "admin_sourceable": true,
 "product_admin_sourceable": true,
 "product_cascaded": true }
```
When `false`: `"Variant marked not sourceable."`


| Field | Meaning |
|---|---|
| `admin_sourceable` | The **variant's** resulting flag — what you just set |
| `product_admin_sourceable` | The **product master's** resulting flag, post-write. Always present, cascade or not, so a client can render the product row straight from it |
| `product_cascaded` | `true` only when **this call** is what turned the product master on |


**The up-cascade.** Setting a variant sourceable **`true`** also turns the **product's** master on if
it was off — a sourceable variant implies its product is sourceable. Setting a variant **`false`**
never touches the product (the cascade is up-only), so `product_admin_sourceable` can come back
`true` on a call that set the variant to `false`.


Before GA11/GA12 (2026-07-30) the response carried only `message` and `admin_sourceable`, so a UI
built to this contract showed a stale product row after a cascade.


**Errors** — `400` non-boolean or missing · `404` unknown or soft-deleted variant.


> No notification is sent on the `false → true` transition. See §4.


---


## 6 · `POST /api/superadmin/product-variants/set-express/<product_variant_id>/` — Express eligibility


| Field | Type | Required | Rule |
|---|---|---|---|
| `is_express` | bool | ✅ | Must be a real JSON boolean, else **400**. |


**Response `200`:**
```json
{ "message": "Variant marked express.", "is_express": true,
 "product_catalog_type": "express" }
```


`product_catalog_type` is included because this endpoint **can change the parent product**:


**Up-cascade (`true`)** — if the product isn't already `catalog_type=express`, it is set to
`express`. A variant can only be express-deliverable when its product is in the express catalog.


**Down-cascade (`false`)** — if the product is currently `express` and this was the **last** express
variant, the product leaves the express catalog and reverts to its base type, derived from its
category:


| Product's category scope | Reverts to |
|---|---|
| `marine_emergency` | `marine_emergency` |
| anything else (incl. no category) | `regular` |


If other express variants remain, the product stays `express`.


**Errors** — `400` non-boolean or missing · `404` unknown or soft-deleted variant.


> Neither cascade re-validates the category scope, and neither needs to: the up-cascade always
> targets `express`, which the relaxed rule accepts for **both** scopes, and the down-cascade derives
> the new type **from** the category. Every combination these cascades can produce is already valid.


---


# How Flow 29a connects


- **Upstream — 29 (Catalog Structure):** the product or variant must already exist. `admin_sourceable`
 and `is_top_rated` can also be set on the product create/update bodies; these endpoints are the
 dedicated single-purpose toggles.
- **Downstream — Flow 3 (Product Discovery):** what a sailor sees is the effective-sourceable AND of
 the two flags, plus liveness on both rows.
- **Downstream — Flow 21 (Notifications):** §4's broadcast is delivered as a `PROMOTIONAL`
 `GeneralNotification`, push + in-app.
- **Related — Flow 13 (Special Requests):** quote products also carry `admin_sourceable=False`. §4
 excludes them; any new listing of non-sourceable items must do the same.
- **Related — Flow 17 (Back-in-Stock Waitlist):** the per-user waitlist is **dormant**. The fan-out
 code is retained but unwired; §4 is the manual replacement.



