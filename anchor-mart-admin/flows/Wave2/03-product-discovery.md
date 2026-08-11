# Flow 03 — Product Discovery & Catalog Browsing

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`03-product-discovery-validation.md`](./03-product-discovery-validation.md).
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
| **Flow Name** | Product Discovery & Catalog Browsing |
| **Business Objective** | Let a sailor find sourceable goods across the three catalogs, and bookmark them |
| **Flow Type** | Core |
| **Primary Actors** | Customer (sailor) |
| **Platforms** | `SAILOR` (`/api/catalog/`) |
| **Django Apps** | `catalog` |
| **Models** | `Category`, `Product`, `ProductVariant`, `ProductImage`, `ProductVariantImage`, `SavedProduct`, `ProductRating`, `PortAddress`, `Anchorage` |
| **Services** | `public_products_q`, `public_variants_q`, `variant_is_effectively_sourceable` (`catalog/waitlist_service.py`) |
| **State Machines** | **None.** |
| **External Integrations** | Redis (response cache, db 1) |
| **Total APIs** | **11** (2 category · 3 product list · 2 variant · 2 wishlist · 2 location lookup) |
| **Previous Flow** | Flow 02 — a vessel profile is expected before ordering |
| **Next Flow** | Flow 4 (Cart) · Flow 17 (Waitlist) if not sourceable |
| **Documentation Version** | 1.1 — 2026-08-07 (FE1, shipped 2026-08-06: the quote guard became the `Product.is_internal` column — closes F-01, F-02 and F-13; wishlist keeps out-of-sourcing items, 2026-08-05). 1.0 — 2026-07-20 |
| **Documentation Status** | ✅ 11 of 11 routes documented, verified against the running route table. **F-01 is fixed** — the guard no longer keys on `SuggestedProductByAdmin` |

---

# Phase 1 — Understand the Flow

## Business purpose

Three catalogs share one browsing surface, distinguished by `Product.catalog_type`:

| Catalog type | Reached by | Category scope |
|---|---|---|
| `regular` | `get-product-list/` | `general` |
| `express` | `express-products/` | `general` |
| `marine_emergency` | `marine-emergency-products/` | `marine_emergency` |

**Each list is single-type — the regular list does NOT include express items** (changed
2026-08-05). It used to span `(REGULAR, EXPRESS)` on the theory that an express item is also
buyable as a normal purchase, but that was never true: add-to-cart passes
`catalog_type=REGULAR` and `AddCartItemSerializer` rejects anything else, so the express
products surfaced there were a dead end — browsable but un-buyable. Express items are reached
through `express-products/` and the express cart. The express list additionally narrows to
variants with `is_express=True`.

## Entry point / Exit point

| | |
|---|---|
| **Entry** | `GET /api/catalog/get-category-list/` (home / category screen) |
| **Success** | Sailor opens a variant detail and can add to cart → **Flow 4** |
| **Alternate** | Variant is not sourceable → "notify me" → **Flow 17** |

## Actors

**Customer (sailor)**, and since 2026-08-10 also **anonymous visitors** on the browse
endpoints. The seven read endpoints — both category lists, all three product lists, and both
variant endpoints — are `[AllowAny]`; browsing the shelf is not a private act, so the catalog
opens before sign-in. Everything per-user (`save-product/`, `get-saved-items/`, special
requests) stays `[IsAuthenticated]`.

Two consequences worth holding onto:

* **`is_saved` reads `false` for a signed-out caller.** The cached payload was always
  user-agnostic — that is why it is shared — and the flag is injected afterwards. Filtering
  `SavedProduct` on an `AnonymousUser` would raise, so the injection short-circuits.
* **The `is_internal` guard now stands alone.** It was the second line of defence behind a
  login; it is the only thing keeping a bespoke special-request quote product out of an
  anonymous caller's hands.

## The sourceability model — read this before anything else

`admin_sourceable` exists on **both** `Product` and `ProductVariant`. The project's
"effective sourceability" rule is the **AND** of the two, defined canonically in
`catalog/waitlist_service.py:44-50`:

```python
def variant_is_effectively_sourceable(variant):
    return (variant.is_active and not variant.is_deleted
            and variant.admin_sourceable
            and variant.product.admin_sourceable
            and variant.product.is_active and not variant.product.is_deleted)
```

> ⚠️ **The AND rule does not gate visibility in browse.** It once did; since **#23** it
> does not. Non-sourceable products and variants are **deliberately surfaced** with
> `is_sourceable: false` so a sailor can join the back-in-stock waitlist per SKU.
> Ordering is blocked downstream by the cart and order gates, not by the catalog.
> The code states this at `catalog/views.py:279-283` and `:422-425`.

So in this flow the AND rule determines **`is_sourceable` and `variant_option`**, not
whether a row appears.

| Surface | Visibility gate | `is_sourceable` computed by |
|---|---|---|
| Product lists | ≥1 live variant (`is_deleted=False, is_active=True`) — **no** sourceability check | `variant_option > 0`, where the count applies the full AND rule |
| Variant list / detail | live variant + live parent — **no** sourceability check | `obj.admin_sourceable and obj.product.admin_sourceable` |
| **Wishlist** | ≥1 live variant — **no** sourceability check *(changed 2026-08-05)* | `variant_option > 0`, full AND rule including the product master |

> **The wishlist no longer hides non-sourceable items** (user decision, 2026-08-05). A wishlist
> is "save it for later", so an out-of-sourcing product **stays in the list** and comes back with
> `is_sourceable: false`, exactly as it does in browse, instead of silently vanishing until it is
> sourceable again. A product with **zero live variants** still drops out — there is nothing to
> render. Consequence for the client: the saved-products list is now a surface that renders
> `admin_sourceable=False` cards, so it must show the same unavailable state browse does.

**Every surface now uses the same visibility gate**: product live + ≥1 live variant + not
internal. Sourceability is a *badge*, not a filter, anywhere in this flow.

## The internal-product guard

*(Rewritten 2026-08-07 — the mechanism changed on 2026-08-06, FE1.)*

Some products must never appear in customer-facing browse. Two kinds exist:

1. a **special-request quote product** — a bespoke item created for **one** sailor at a price
   negotiated with them (Flow 13); and
2. a **partner-substitute holding product** — the internal reuse pool that promoted partner
   substitutes are parented under.

Both are marked **`Product.is_internal = True` by whatever created them**
(`catalog/models.py:245-250`); every ordinary catalog product is `False`. Two guards read that
column:

| Guard | File | Semantics | Applied at |
|---|---|---|---|
| `public_products_q()` | `waitlist_service.py:32-42` | `Q(is_internal=False)` — hides the **whole product** | `catalog/views.py:293` (all three product lists) · `:415` (add to wishlist) · `:570` (saved-products list) |
| `public_variants_q()` | `waitlist_service.py:45-49` | `Q(product__is_internal=False)` — hides **that variant** | `views.py:454` (variant list) · `:504` (variant detail) · `waitlist_views.py:73` |

**Both wishlist endpoints are now covered** — adding *and* listing. They were the F-02 / F-13
gap: the saved-products list deliberately keeps out-of-sourcing items, which makes it a surface
that renders `admin_sourceable=False` rows, so without the guard one sailor's bespoke quote
rendered as an ordinary wishlist card.

> **This replaced a subquery on `SuggestedProductByAdmin`,** which was the F-01 defect. The old
> guard asked "does any admin suggestion point at this product?" — but that row is written by two
> operations with opposite intent: `suggest_new_product` (genuinely bespoke) and
> `suggest_replacement`, which points at an **existing catalog variant**. So the first time an
> admin offered catalog SKU *X* as a replacement on any order, *X*'s entire parent product and
> every sibling variant silently vanished from browse for every sailor, permanently — nothing
> deletes the suggestion row, and `variant` is `on_delete=PROTECT`. The discriminator is now
> **how the product was created**, which a column can record and a suggestion's state cannot.
>
> ⚠️ **Nothing infers the flag** — that inference *was* the bug. A third creator of a non-public
> product must set `is_internal=True` itself; `catalog/tests/test_internal_products.py` locks the
> two known creators.

`admin_sourceable=False` remains **overloaded** for its other pair of meanings
(*"temporarily out of sourcing"* vs. *"hidden"*), which the new column does not address.

## Caching

| Surface | Cached? | TTL | Key |
|---|---|---|---|
| Category lists | ✅ | **300 s** (`views.py:76`) | `<prefix>:<md5 of sorted query params>` |
| Product lists | ✅ | **60 s** (`views.py:189`) | same construction |
| Variant list / detail | ❌ | — | — |
| Wishlist | ❌ (deliberately — per-user) | — | — |
| Ports / anchorages | ❌ | — | — |

The cached payload is the **entire pagination envelope**, including `count`, `next`,
`previous` and `message`. No user id is in the key, which is correct because the cached
value is user-agnostic.

**`is_saved` is injected *after* the cache**, on both hit and miss paths
(`views.py:217-227`), against a `deepcopy` of the cached object so that a local-memory
cache backend cannot be mutated in place (`views.py:350-365`). One batched query per
request, scoped to the current page's ids.

## Signals · Celery · Notifications

**None** in this flow. Back-in-stock fan-out (`notify_back_in_stock`) belongs to Flow 17.

---

# Phase 2 — Discover the Complete Flow

## Sequence diagram

```
SAILOR
  │
  ├─ GET /catalog/get-category-list/            (general scope, 300s cache)
  │  GET /catalog/marine-emergency-category-list/ (marine_emergency scope)
  │         ├─ paginated, ?search=
  │         ├─ EMPTY CATEGORIES HIDDEN — only categories with ≥1 browsable product
  │         └─ ?catalog_type=regular|express  (which shelf "non-empty" means)
  │
  ├─ GET /catalog/get-product-list/             (REGULAR only, 60s cache)
  │  GET /catalog/express-products/             (express, variants is_express=True)
  │  GET /catalog/marine-emergency-products/    (marine_emergency)
  │         ├─ ?category_id= ?min_price= ?max_price= ?search=
  │         ├─ ?sort_by_price= ?sort_by_popularity= ?sort_by_relevance=  (stackable)
  │         ├─ internal-product guard applied ← public_products_q()
  │         ├─ presence gate: ≥1 live variant (sourceability NOT checked)
  │         └─ is_saved injected per-user AFTER cache
  │
  ├─ GET /catalog/product-variants/?product=<uuid>
  │         ├─ 404 if parent product dead
  │         ├─ quote-variant guard applied
  │         └─ paginated, ordered (created_at, id)
  │
  ├─ GET /catalog/product-variants-details/?product_variant=<uuid>
  │         ├─ quote-variant guard applied → 404 (no enumeration oracle)
  │         └─ un-paginated single object
  │              │
  │              ├─ is_sourceable=true ──▶ Flow 4 (Cart)
  │              └─ is_sourceable=false ─▶ Flow 17 (Waitlist)
  │
  ├─ POST /catalog/save-product/  {product_id, save_flag}
  │         └─ explicit flag, NOT a toggle; idempotent both ways
  │  GET  /catalog/get-saved-items/
  │         ├─ scoped to request.user
  │         ├─ full AND rule applied → non-sourceable items disappear
  │         └─ NO quote guard
  │
  └─ GET /catalog/get-ports-list/          ?search= ?is_active=
     GET /catalog/get-anchorages-list/?port_id=<uuid> ?search=
              └─ shared with Flow 2 (vessel profile) and Flow 5 (order intent)
```

## API sequence table

| Step | API | Purpose | Next |
|---|---|---|---|
| 1 | `GET /catalog/get-category-list/` | Browse general categories | 3 |
| 2 | `GET /catalog/marine-emergency-category-list/` | Browse emergency categories | 5 |
| 3 | `GET /catalog/get-product-list/` | List regular products | 6 |
| 4 | `GET /catalog/express-products/` | Express-deliverable only | 6 |
| 5 | `GET /catalog/marine-emergency-products/` | Emergency catalog | 6 |
| 6 | `GET /catalog/product-variants/` | Variants of one product | 7 |
| 7 | `GET /catalog/product-variants-details/` | One variant's detail | Flow 4 / 17 |
| 8 | `POST /catalog/save-product/` | Save or unsave a product | 9 |
| 9 | `GET /catalog/get-saved-items/` | The wishlist | 6 |
| 10 | `GET /catalog/get-ports-list/` | Port directory | Flow 2 / 5 |
| 11 | `GET /catalog/get-anchorages-list/` | Anchorages of one port | Flow 2 / 5 |

---

# Phase 3 — API Documentation

## Flow-wide conventions

| Header | Notes |
|---|---|
| `Authorization: Token <key>` | Required by the per-user endpoints only. The 7 browse endpoints are **public** since 2026-08-10 (see *Actors*) |
| `server-secret-key: <SERVER_SECRET_KEY>` | All 11 — `/api/catalog/` is **not** middleware-exempt. "Public" means *no user token*, not open to the internet |

**Pagination** — every list uses `CustomPagination` (`AnchorMart/paginators.py:3-6`):
`page_size=10`, `page_size_query_param="page_size"`, `max_page_size=50`. The project
default `LimitOffsetPagination` is never used here, so the wire params are `page` and
`page_size`, **not** `limit`/`offset`.

**Response envelope — nested, and inconsistent.** These views pass a *dict* to
`get_paginated_response`, so `results` is an **object, not an array**:

```json
{ "count": 42, "next": "…?page=2", "previous": null,
  "results": { "status": true, "message": "…", "data": [ … ] } }
```

The inner keys vary by endpoint — some carry `status`, some do not; the anchorage
endpoint carries no `message`. The table under each API states the exact shape.

**Timestamps are not uniform.** Product and category payloads emit none. Variant, port
and anchorage payloads emit `created_at`/`updated_at` as **pre-formatted display
strings** (`"July 20, 2026, 03:45 PM"`), not ISO-8601 — they are not machine-parseable.

---

## API 1 & 2 · Category lists

| Field | Value |
|---|---|
| **Endpoints** | `/api/catalog/get-category-list/` (scope `general`) · `/api/catalog/marine-emergency-category-list/` (scope `marine_emergency`) |
| **Method** | `GET` |
| **Authentication / Permissions** | **`AllowAny`** — public since 2026-08-10. `server-secret-key` still required |
| **Query Parameters** | `search` (str, optional, no validation) · **`catalog_type`** (see below) · `page` · `page_size` |

Both are thin subclasses of `BaseCategoryListView` setting only `SCOPE`, `CACHE_PREFIX`,
`LABEL` and `CATALOG_FILTERS`.

**Queryset** — `is_deleted=False, is_active=True, scope=<SCOPE>`, ordered `-updated_at`
(overriding the model's `["name"]`). `search` applies `name__icontains`.

**Empty categories are hidden** (2026-08-10). A category is returned only when at least one
product would actually appear inside it — a category leading to an empty shelf is a dead end.
"Would appear" is not re-stated in the category view: it correlates
`catalog.waitlist_service.browsable_products_qs`, the same queryset the product lists are built
from, so the two cannot drift into listing a category whose shelf is empty. `Exists` rather than
a count, so Postgres stops at the first matching product per category and rides the
`products.category_id` index.

**`?catalog_type=` — which shelf "non-empty" means.** `Scope.GENERAL` feeds *two* product
lists, so the question has two answers:

| Value | Categories returned |
|---|---|
| `regular` | those with something on the regular shelf |
| `express` | those with something **express-deliverable** (narrows on the `is_express` *variant* flag, mirroring `express-products/`) |
| *omitted* | either — the back-compatible union |

The default is the union deliberately: it can never hide a category that has stock on *some*
general surface. It is still the wrong answer for a specific shelf, so **each screen should send
the param matching the product list it is about to call**. The cache key hashes every query
param, so each value gets its own entry. On the marine list the only meaningful value is
`marine_emergency`, and omitting it is the norm. An unrecognised value is a **400**.

> **No cache invalidation.** The list is 300 s TTL with nothing invalidating it, so adding the
> first product to an empty category — or removing the last — takes up to five minutes to show.

**Success — 200**
```json
{
  "count": 12, "next": null, "previous": null,
  "results": {
    "status": true,
    "message": "General categories fetched successfully",
    "data": [
      { "id": "…", "name": "Deck Equipment", "description": "…",
        "image": "https://…/category_images/x.jpg", "scope": "general" }
    ]
  }
}
```
`message` is `"General categories fetched successfully"` or
`"Marine emergency categories fetched successfully"`.

**Fields returned** — exactly five: `id`, `name`, `description`, `image`, `scope`.
`GetCategorySerializer` uses an explicit `fields` allow-list (`serializers.py:15`), so
no internal column can leak.

**Error Responses** — 400 (unrecognised `catalog_type`) · 403 (missing `server-secret-key`) ·
404 `{"detail": "Invalid page."}` · 405. `search` is never rejected. An empty scope — or a scope
whose every category is empty — is a 200 with `count: 0`. **No 401**: the endpoint is public,
though a *stale* token still fails authentication before permissions are checked.

**Caching** — 300 s. **Database Changes / Notifications** — None.

---

## API 3, 4 & 5 · Product lists

| Field | Value |
|---|---|
| **Endpoints** | `/api/catalog/get-product-list/` (REGULAR only) · `/api/catalog/express-products/` (EXPRESS, `is_express` variants) · `/api/catalog/marine-emergency-products/` (MARINE_EMERGENCY) |
| **Method** | `GET` |
| **Authentication / Permissions** | **`AllowAny`** — public since 2026-08-10. `server-secret-key` still required |

All three subclass `BaseCatalogProductListView`, setting only `CATALOG_TYPES`,
`CACHE_PREFIX`, `LABEL`, and — for express only — `EXTRA_VARIANT_FILTERS = {"is_express": True}`.

The base queryset is `catalog.waitlist_service.browsable_products_qs` — **the** definition of
"a product a sailor can see", shared with the category list and the wishlist so the three
cannot disagree. Four conditions, each load-bearing: the row is live; `public_products_q()`
(never a bespoke quote or a substitute holding product); `catalog_type` matches the surface;
and **at least one live variant** — sourceable or not, since out-of-sourcing products are
surfaced with a badge so they can be waitlisted, but a product with zero live variants has
nothing to render.

`is_saved` is injected after the shared cache and reads **`false` for a signed-out caller** —
a wishlist needs an account to exist, and filtering `SavedProduct` on an `AnonymousUser` would
raise rather than return empty.

**Query Parameters**

| Param | Type | Validation |
|---|---|---|
| `category_id` | UUID | ✅ validated → 400 on malformed |
| `min_price` / `max_price` | Decimal | ✅ validated, **negatives rejected**; `min > max` → 400 |
| `search` | str | ❌ none — applied as `name__icontains OR description__icontains` |
| `sort_by_price` | enum | allow-list: `low to high` / `low-to-high` / `low_to_high` / `asc`, and the `high…`/`desc` equivalents |
| `sort_by_popularity` | enum | same aliases; sorts on **average rating**, not sales |
| `sort_by_relevance` | enum | `newest_first` / `newest` / `latest`, or `oldest_first` / `oldest` |
| `page` / `page_size` | int | paginator |

**Sorts are stackable** in a fixed precedence — price → popularity → relevance —
regardless of query-string order. The applied value is always a hardcoded literal, never
the user's string.

> **Unrecognised sort values are silently ignored, not rejected.**
> `?sort_by_price=banana` returns 200 with default ordering. This differs from
> `category_id` and the price params, which 400. See finding F-09.

**Default ordering** — with a `search` term: exact-name-match first, then `avg_rating`
desc (nulls last), then `-created_at`. Without: `avg_rating` desc, then `-created_at`.

**Success — 200**
```json
{
  "count": 137, "next": "…?page=2", "previous": null,
  "results": {
    "status": true,
    "message": "Product products fetched successfully",
    "data": [
      { "id": "…", "name": "Mooring Rope 24mm", "description": "…",
        "base_price": "125.00", "category": "Deck Equipment",
        "avg_rating": 4.3,
        "images": [ { "id": "…", "image": "…", "is_primary": true, "display_order": 0 } ],
        "variant_option": 3, "is_sourceable": true, "is_saved": false }
    ]
  }
}
```

> The regular list's message reads literally **`"Product products fetched successfully"`**
> (`LABEL = "Product"` + `" products fetched successfully"`). Preserved verbatim — do not
> match on it.

| Field | Meaning |
|---|---|
| `base_price` | `Product.base_price`, JSON **string**. The orderable price is the **variant's**, not this |
| `category` | The category **name**, or `null` (the FK is `SET_NULL`) |
| `avg_rating` | 1 dp, `0` when unrated |
| `variant_option` | Count of variants passing the **full AND rule** (+ `is_express` on the express list) |
| `is_sourceable` | `variant_option > 0` — the two can never disagree |
| `is_saved` | Per-user, injected after the cache |

`purchase_count` is deliberately **absent** — `GetProductSerializer` uses an explicit
`fields` allow-list with a standing comment at `serializers.py:74-77`. `admin_sourceable`,
`is_top_rated`, `catalog_type` and all soft-delete internals are likewise not emitted.

**Error Responses** — 400 `{"category_id": ["'abc' is not a valid UUID."]}` ·
400 `{"min_price": ["min_price must be greater than or equal to 0."]}` ·
400 `{"min_price": ["min_price cannot be greater than max_price."]}` · 401 · 403 ·
404 `{"detail": "Invalid page."}`. Empty results are 200 with `count: 0`.

**Caching** — 60 s. **Database Changes** — None.

---

## API 6 · List a product's variants

| Field | Value |
|---|---|
| **Endpoint** | `/api/catalog/product-variants/` · `GET` |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`views.py:411`) |

**Query Parameters**

| Param | Required | Validation |
|---|---|---|
| `product` | ✅ | UUID, validated → 400 on missing or malformed |
| `is_express` | ✖ | **Not validated** — see below |
| `page` / `page_size` | ✖ | paginator |

> ⚠️ **`is_express` accepts anything.** Only `true`/`1`/`yes` (case-insensitive) mean
> true; **every other non-empty value means `false` and still applies the filter**. So
> `?is_express=banana` returns only non-express variants with a 200, and `?is_express=0`
> does the same. Omit the param entirely to skip the filter.

**Queryset** — live variants of a live product, plus `public_variants_q()`, ordered
`(created_at, id)`. The ordering is load-bearing: `ProductVariant` has no `Meta.ordering`,
so without it pagination would be unstable.

**Success — 200**
```json
{
  "count": 3, "next": null, "previous": null,
  "results": {
    "message": "Product variants fetched successfully",
    "data": [ { …variant… } ]
  }
}
```
> This envelope has **no `"status"` key**, unlike the product and wishlist lists.

**Variant object — all 14 fields** (`ProductVariantSerializer`, `serializers.py:122-153`):

| Field | Notes |
|---|---|
| `id` · `product` | UUIDs. `product` is a bare PK — no nested product data |
| `sku` | Unique |
| `price` | **The authoritative price.** `Product.base_price` is not emitted here |
| `attributes` | Free-form admin-authored JSON, unvalidated |
| `images` | `{id, image, is_primary, display_order}` |
| `is_sourceable` | The AND badge — **use this for orderability** |
| `admin_sourceable` | ⚠️ Raw variant-level flag. `true` here with the product master off still means unorderable. Do not badge off this |
| `is_express` · `about_product` | |
| `is_active` | Always `true` on this endpoint (the queryset pins it) |
| `prodcut_rating` | **Typo is in the wire contract.** Product-level average, 1 dp, `0` when none |
| `created_at` · `updated_at` | Display strings, **not ISO-8601** |

**Error Responses** — 400 `{"product": ["This query parameter is required."]}` ·
400 `{"product": ["'abc' is not a valid UUID."]}` ·
404 `{"detail": "Product not found."}` (absent, soft-deleted, or inactive) · 401 · 403.
A live product with zero visible variants is a **200 with `"data": []`**.

**Caching** — none. **Database Changes** — None.

---

## API 7 · Variant detail

| Field | Value |
|---|---|
| **Endpoint** | `/api/catalog/product-variants-details/` · `GET` |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`views.py:460`) |
| **Query Parameters** | `product_variant` (UUID, **required**, validated) |

**Queryset** — the variant plus parent liveness folded into one filter, plus
`public_variants_q()`.

**Success — 200** — un-paginated, no `count`/`next`/`previous`, no `status`:
```json
{ "message": "Product variant fetched successfully", "data": { …same 14 fields as API 6… } }
```

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"product_variant": ["This query parameter is required."]}` | Missing |
| 400 | `{"product_variant": ["'abc' is not a valid UUID."]}` | Malformed |
| 404 | `{"detail": "Product variant not found."}` | Absent, soft-deleted, inactive, parent dead, **or a quote variant** |

> **All not-found causes collapse to one 404.** A sailor who knows another sailor's
> quoted variant UUID cannot distinguish "does not exist" from "exists but is private" —
> there is no enumeration oracle at the variant level.

**Related data** — variant images only. No ratings list, no stock field (none exists),
no sibling variants, no nested product.

**Caching** — none. **Database Changes** — None.

---

## API 8 · Save or unsave a product

| Field | Value |
|---|---|
| **Endpoint** | `/api/catalog/save-product/` · `POST` |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`views.py:378`) |

**Request Body**
```json
{ "product_id": "…", "save_flag": true }
```

| Field | Required | Notes |
|---|---|---|
| `product_id` | ✅ | `UUIDField` — malformed is 400 before the ORM |
| `save_flag` | ✅ | **Presence is explicitly guarded** (`views.py:381-385`) because DRF's `BooleanField` treats a missing value as `False`, which would silently *unsave* |

> **This is an explicit flag, not a toggle.** The server never inspects current state.
> Send `true` to save, `false` to unsave.

**Success — 200** — `{"message": "Product saved"}` or `{"message": "Product removed"}`.

Both directions are **idempotent**: saving twice reuses the row via `get_or_create`,
unsaving twice is a no-op delete. `SavedProduct` has `unique_together = ("user",
"product")` enforced in the DB, so a concurrent double-save collapses to one row rather
than erroring. **Unsave is a hard delete**, despite the model inheriting `GenericModel`.

**Error Responses** — 400 `{"save_flag": "This field is required."}` · 400 DRF field
errors · 404 `{"detail": "Product not found."}` (absent, soft-deleted, or inactive).

> **The internal-product guard now applies here** (`views.py:415`, fixed 2026-08-06): the
> lookup is `is_deleted=False, is_active=True` **plus** `public_products_q()`, so a crafted
> `product_id` pointing at someone else's bespoke quote returns **404**, not a saved row.
> This closes finding **F-02**.

**Database Changes** — one `SavedProduct` INSERT or DELETE.

---

## API 9 · The wishlist

| Field | Value |
|---|---|
| **Endpoint** | `/api/catalog/get-saved-items/` · `GET` |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`views.py:504`) |
| **Query Parameters** | `page` · `page_size` only — no search, filter, or sort |

**Ownership** — both subqueries pin `user=request.user` (`views.py:510`, `:513`), and
there is no user-identifying input parameter, so one sailor cannot read another's
wishlist.

**Sourceability** *(changed 2026-08-05)* — this endpoint **no longer filters on
sourceability**. The gate is the same one the catalog lists use: product live, **≥1 live
variant** (sourceable or not), and not an internal product (`public_products_q()`).

> **A saved product that becomes non-sourceable stays in the wishlist**, returned with
> `is_sourceable: false` — the same card browse renders — instead of silently disappearing.
> It drops out only when the product is soft-deleted/deactivated or loses its last live
> variant. `variant_option` still applies the **full AND rule including the product master**,
> so the badge on a still-listed card is correct: an on-variant of a master-off product is
> **not** counted as orderable.

**Success — 200** — same product object as API 3, with `is_saved` always `true`, ordered
newest-saved first (`-saved_at, id` — a total order, so pagination is stable):
```json
{ "count": 8, "next": null, "previous": null,
  "results": { "status": true, "message": "Saved items fetched successfully", "data": [ … ] } }
```
`id` is the **product** id, not the `SavedProduct` id.

**Error Responses** — none in the view. An empty wishlist is a 200 with `data: []`.

**Caching** — none, deliberately (per-user). **Database Changes** — None.

---

## API 10 · Port directory

| Field | Value |
|---|---|
| **Endpoint** | `/api/catalog/get-ports-list/` · `GET` |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`views.py:122`) |

**Query Parameters**

| Param | Notes |
|---|---|
| `search` | `icontains` across `port_name`, `country`, `region` |
| `is_active` | ⚠️ **Passed raw into the ORM.** Only `True`/`1`/`t`/`False`/`0`/`f` are accepted. **Lowercase `?is_active=true` — what a JS client naturally sends — is an unhandled 500.** See finding **F-04** |
| `page` / `page_size` | paginator |

> **Inactive ports are returned by default.** The base filter is `is_deleted=False`
> only; `is_active` is applied *only* when the caller passes the param.

**Success — 200**
```json
{ "count": 240, "next": "…?page=2", "previous": null,
  "results": { "status": true, "message": "Ports fetched successfully",
    "data": [ { "id": "…", "port_code": "SGSIN", "port_name": "Port of Singapore",
                "country": "Singapore", "region": "Southeast Asia", "is_active": true,
                "created_at": "July 20, 2026, 03:45 PM",
                "updated_at": "July 20, 2026, 03:45 PM" } ] } }
```
`PortViewSerializer` uses `exclude`, so only the four soft-delete columns are withheld.

**Error Responses** — 401 · 403 · 404 `{"detail": "Invalid page."}` · **500** on a
malformed `is_active`. The view's own `{"message": "No ports found"}` 404 branch is
**unreachable** — see finding F-15.

---

## API 11 · Anchorages of a port

| Field | Value |
|---|---|
| **Endpoint** | `/api/catalog/get-anchorages-list/` · `GET` |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`views.py:152`) |

**Query Parameters**

| Param | Required | Notes |
|---|---|---|
| `port_id` | ✅ | ⚠️ **Not UUID-validated.** A malformed value is an unhandled **500** — see finding **F-03** |
| `search` | ✖ | `anchorage_name__icontains` only — `anchorage_code` is not searchable |
| `page` / `page_size` | ✖ | paginator |

**Success — 200** — note this envelope has **no `message` key**:
```json
{ "count": 2, "next": null, "previous": null,
  "results": { "status": true,
    "data": [ { "id": "…", "port": "…", "anchorage_name": "Eastern Anchorage",
                "anchorage_code": "EA1", "estimated_delivery_hours": 12,
                "is_active": true, "created_at": "July 20, 2026, 03:45 PM",
                "updated_at": "July 20, 2026, 03:45 PM" } ] } }
```
`port` is a raw UUID pk. `estimated_delivery_hours` may be `null` — it feeds
`DeliveryPolicy.calculate_deadline()`, and `null` means "use the global default".

**Error Responses** — 400 `{"message": "port_id is required"}` · **500** on a malformed
`port_id` · 401 · 403.

> An unknown-but-well-formed `port_id` returns **200 with an empty list**, not 404 — the
> port is never checked for existence or liveness.

---

## What happens next

| Condition | Continue to |
|---|---|
| `is_sourceable: true` on a variant | **Flow 4** — Cart Management |
| `is_sourceable: false` | **Flow 17** — Back-in-Stock Waitlist |
| Nothing in the catalog fits | **Flow 13** — Special Request |
| Port / anchorage selected | **Flow 2** (vessel profile) or **Flow 5** (order intent) |

---

## Source reference

| Concern | File |
|---|---|
| All 11 views | [`catalog/views.py`](../../backend/catalog/views.py) |
| Catalog serializers | [`catalog/serializers.py`](../../backend/catalog/serializers.py) |
| Sourceability + quote guards | [`catalog/waitlist_service.py`](../../backend/catalog/waitlist_service.py) |
| `Category`, `Product`, `ProductVariant`, `SavedProduct`, `ProductRating`, `PortAddress`, `Anchorage` | [`catalog/models.py`](../../backend/catalog/models.py) |
| `SuggestedProductByAdmin` (the quote marker) | [`orders/models.py`](../../backend/orders/models.py) (377-435) |
| Where quote products are created | [`orders/substitutions.py`](../../backend/orders/substitutions.py) (`suggest_new_product`, `suggest_replacement`) |
| Pagination | [`AnchorMart/paginators.py`](../../backend/AnchorMart/paginators.py) |
| Routes | [`catalog/urls.py`](../../backend/catalog/urls.py) |
