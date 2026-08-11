# Flow 29b — Marine-Emergency Spares

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`29b-marine-emergency-spares-validation.md`](./29b-marine-emergency-spares-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint is fully specified.
>
> Index: [`../../BUSINESS_FLOWS.md`](../../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

> **Part 3 of 4.** Companion parts: [29 · Catalog Structure](./29-catalog-structure.md) ·
> [29a · Merchandising & Availability](./29a-merchandising-availability.md) ·
> 29c · Ports & Anchorages.

---

# Executive Summary

The **second catalog**. AnchorMart sells two distinct things and administers them on two separate
screens: the general catalog (provisions, deck gear — part 29) and **marine-emergency spares**, the
parts a vessel needs urgently. This part documents the 12 endpoints that serve the spares screen.

The shape is deliberately **identical** to part 29 — categories, products, stats — but every endpoint
here is **pinned to the marine scope**. A general product or category id returns **404** from every
one of them, in both directions: the general endpoints in part 29 are meant to be equally blind to
marine objects.

**What this part does NOT contain:**

| Missing here | Where it lives | Why |
|---|---|---|
| Variant endpoints | Part 29 §14–§18 | Variant endpoints are **shared across all catalog types** — there is no marine-specific variant API. A spare's variants are managed through the same endpoints as everything else. |
| `admin_sourceable` / `is_top_rated` / `is_express` toggles | Part 29a | Also shared and unscoped — one set of toggles serves both catalogs. |
| `set-catalog-type` | Part 29a §3 | The bidirectional move *between* catalogs; by definition it cannot belong to one of them. |

| | |
|---|---|
| **Actors** | Admin (Emergency Spares screen) |
| **Endpoints** | **12** — 6 product · 6 category, all under `/api/superadmin/emergency-spares/` |
| **Django Apps** | `admin_panel` (views + serializers), `catalog` (models) |
| **Models** | `Product` (`catalog_type=marine_emergency`), `Category` (`scope=marine_emergency`), `ProductVariant`, `ProductImage` |
| **Trigger** | Admin opens Catalog → Emergency Spares |
| **Previous Flow** | 26 (media upload — images arrive as paths) |
| **Next Flow** | 29a (availability toggles) · 5 (Marine Emergency Order Intent — the sailor side) |
| **Documentation Version** | 1.0 — 2026-07-29 |
| **Documentation Status** | ✅ 12 routes fully specified. Routes from the running route table; behaviour verified by executing every endpoint. |

> **The load-bearing rule:** every endpoint in this part is **scope-pinned to marine-emergency**, and
> — unlike its general-catalog counterpart — **all six verbs enforce it**, including detail and
> delete. Passing a general product or category id here returns **404**, never a cross-catalog edit.

---

# Concepts you need before reading the endpoints

### The scope pinning, and how it is achieved

Three of the six verbs on each object inherit shared base classes with the scope fixed as a class
attribute; the other three are standalone views that apply the same filter explicitly:

| Verb | Product | Category |
|---|---|---|
| List | `BaseListProductsView` + `CATALOG_TYPES = (marine_emergency,)` | `BaseListCategoriesView` + `SCOPE = marine_emergency` |
| Add | `BaseAddProductView` + `CATALOG_TYPES` | `BaseAddCategoryView` + `SCOPE` |
| Update | `BaseUpdateProductView` + `CATALOG_TYPES` | `BaseUpdateCategoryView` + `SCOPE` |
| Get | standalone, filters `catalog_type=marine_emergency` | standalone, filters `scope=marine_emergency` |
| Delete | standalone, filters `catalog_type=marine_emergency` | standalone, filters `scope=marine_emergency` |
| Stats | standalone, filters by scope | standalone, filters by scope |

**The practical guarantee for a frontend: every id you pass to any endpoint in this part is checked
against the marine scope before anything happens.** There is no verb that reaches across.

### `catalog_type` is forced, never chosen

On create (§2) the endpoint has exactly one catalog type in scope, so `catalog_type` is **set to
`marine_emergency` regardless of what the body says** — a client cannot create a general product
through this endpoint even by sending `catalog_type: "regular"`. The field is simply ignored here.

### The category must be a marine category

A `marine_emergency` product requires a `marine_emergency`-scope category. This is checked on create
and on any category change, and it is checked **before** the name-uniqueness check so a
wrong-catalog category is reported clearly even when the name also clashes.

### Images are paths

Same as part 29: image fields take a **relative path string** from the Flow 26 presigned upload, not
a file. Category images must start with `category_images/` and product images with `product_images/`
(the latter was unvalidated until GA6, fixed 2026-07-30). A wrong prefix is a **400**.

### Soft delete

Nothing is hard-deleted. Deleting a **product cascades** the soft-delete to its variants. Deleting a
**category** does neither guard nor cascade — see the note on §12.

---

# Endpoints — full specification

**Headers:** `Authorization: Token <token>` (role `admin` or `super_admin`).
`/api/superadmin/` is **exempt** from the `server-secret-key` middleware — do **not** send it.
All endpoints are `IsAuthenticated + IsAdminUser`. There is **no per-object ownership gate**.

**Pagination** (list endpoints): `page`, `page_size` — default **10**, max **50**, standard envelope:

```json
{ "count": 42, "next": "…?page=2", "previous": null,
  "results": { "message": "…", "data": [ /* rows */ ] } }
```

---

## Emergency-spare products

## 1 · `GET /api/superadmin/emergency-spares/products/` — List spares

Lists **only** `catalog_type=marine_emergency` products.

| Query param | Type | Allowed values | Default | Meaning |
|---|---|---|---|---|
| `search` | string | free text | — | Case-insensitive match on **`name` only**. |
| `category` | UUID | valid UUID | — | Filter by category. **400** if not a UUID. |
| `is_active` | string | `true` `1` `yes` `t` / `false` `0` `no` `f` (case-insensitive); **anything else → 400** | no filter | |
| `catalog_type` | string | **`marine_emergency`** only | no filter | Redundant here — any other value is **400**, since this endpoint's scope is a single type. |
| `is_express` | string | truthy / falsy | no filter | Legacy alias. A marine product is not express, so truthy returns nothing. |
| `on_deal` | string | truthy / falsy | no filter | Has a currently-valid `DealOfTheDay`. |
| `is_top_rated` | string | truthy / falsy | no filter | |
| `page` / `page_size` | int | 1–50 | 10 | |

Ordered **newest first** (`-created_at`). Message: `"Products fetched successfully"`.

**Response `200`** — each row:

```json
{
  "id": "9a2f…", "name": "Fuel Injector", "image": "https://…/product_images/inj.jpg",
  "category": "7b21…", "category_name": "Engine Spares",
  "base_price": "450.00", "variant_count": 2,
  "catalog_type": "marine_emergency", "is_express": false, "on_deal": false,
  "is_top_rated": false, "average_rating": 0, "admin_sourceable": true, "is_active": true,
  "purchase_count": 3,
  "created_at": "July 29, 2026, 11:04 AM", "updated_at": "July 29, 2026, 11:04 AM"
}
```

- `image` — the **primary** product image, else the first, else `null`.
- `average_rating` — 1dp, **`0`** when unrated (not `null`).
- `purchase_count` — distinct sailors served; **read-only, admin-only**, never customer-facing.

---

## 2 · `POST /api/superadmin/emergency-spares/products/add/` — Create a spare

| Field | Type | Required | Rule |
|---|---|---|---|
| `category` | UUID | ✅ | Must exist, be **`is_active=True`**, and have **`scope=marine_emergency`**. |
| `name` | string | ✅ | **Unique within the category.** |
| `description` | string | ✅ | |
| `base_price` | decimal | ✅ | max 12 digits, 2dp, **minimum `0.01`**. |
| `admin_sourceable` | bool | ❌ | Default **`true`**. |
| `is_top_rated` | bool | ❌ | Default `false`. |
| `images` | array of string | ❌ | Each path must start with **`product_images/`**, else 400. First becomes primary. |
| `sku` | string | ❌ | **If present, a default variant is created too.** Globally unique. |
| `attributes` | object | ❌ | Only used when `sku` is given. Default `{}`. |
| ~~`catalog_type`~~ | — | — | **Ignored.** Forced to `marine_emergency` by the endpoint. |

**The optional default variant.** If `sku` is supplied, one `ProductVariant` is created in the same
transaction with `price = base_price`, the given `attributes`, the product's `admin_sourceable`, and
copies of `images`. **If `sku` is omitted the spare has zero variants** and cannot be bought until
one is added via part 29 §16.

```json
{ "category": "7b21…", "name": "Fuel Injector", "description": "Bosch, 6-cyl",
  "base_price": "450.00", "sku": "INJ-6C", "attributes": {"fitment": "6-cyl"} }
```

**Response `201`** — the full product detail shape (as §3).

**Errors** (in this order):
- `400` `{"category": ["This category belongs to 'general', but a 'marine_emergency' product must use a 'marine_emergency' category."]}`
- `400` `{"name": ["A product with this name already exists in this category."]}`
- `400` `{"sku": ["A product with this SKU already exists."]}`
- `400` `{"category": ["Category not found"]}` — unknown **or inactive**

---

## 3 · `GET /api/superadmin/emergency-spares/products/<product_id>/` — Spare detail

No params. Returns all product fields except soft-delete bookkeeping, plus `images[]`,
`category_name`, `average_rating`, and display-formatted timestamps. `purchase_count` is included
and read-only.

**Errors** — `404` unknown, soft-deleted, **or a non-marine product**.

---

## 4 · `PUT` / `PATCH` `/api/superadmin/emergency-spares/products/<product_id>/update/`

**Both verbs are partial.** Lookup is **pinned to marine** — a general product id returns **404**.

| Field | Type | Required | Rule |
|---|---|---|---|
| `category` | UUID | ❌ | Must be active and **marine-scope**. |
| `name` | string | ❌ | Unique within the category, excluding this product. |
| `description` | string | ❌ | |
| `base_price` | decimal | ❌ | |
| `admin_sourceable` | bool | ❌ | |
| `is_active` | bool | ❌ | |
| `is_top_rated` | bool | ❌ | |
| `images` | array of string | ❌ | **Full replacement** — sending this deletes all existing product images and recreates from the list. Omit to keep them. `product_images/` prefix enforced. |

`catalog_type` is **not updatable** — use `set-catalog-type/` (part 29a §3) to move a spare out of
the marine catalog.

**Response `200`** — the §3 detail shape. **Errors** — as §2 · `404` unknown, deleted, or non-marine.

---

## 5 · `DELETE /api/superadmin/emergency-spares/products/<product_id>/delete/`

No body. Soft-deletes the spare **and cascades to all its live variants**.

**Response `200`:** `{"message": "Emergency spare product deleted successfully"}`

**Errors** — `404` unknown, already-deleted, **or a non-marine product**.

---

## 6 · `GET /api/superadmin/emergency-spares/products/stats/` — Spare product cards

No params. **Four** counters, scoped to marine only — a narrower set than the general product stats
in part 29 §8.

**Response `200`:**
```json
{ "total": 28, "active": 26, "top_rated": 2, "on_deal": 1 }
```

---

## Emergency-spare categories

## 7 · `GET /api/superadmin/emergency-spares/categories/` — List marine categories

Lists **only** `scope=marine_emergency` categories.

| Query param | Type | Allowed values | Default |
|---|---|---|---|
| `search` | string | free text | — · matches **`name` only** |
| `is_active` | string | `true` `1` `yes` `t` / `false` `0` `no` `f` (case-insensitive); **anything else → 400** | no filter |
| `page` / `page_size` | int | 1–50 | 10 |

Ordered by **`name` ascending**. Message: `"Categories fetched successfully"`.

**Response `200`** — each row:

```json
{
  "id": "7b21…", "name": "Engine Spares", "description": "Injectors, pumps, filters",
  "image": "https://…/category_images/eng.jpg",
  "scope": "marine_emergency", "product_count": 12,
  "parent": null, "parent_name": null, "is_active": true,
  "created_at": "July 29, 2026, 11:04 AM", "updated_at": "July 29, 2026, 11:04 AM"
}
```

---

## 8 · `POST /api/superadmin/emergency-spares/categories/add/` — Create a marine category

`scope` is **fixed to `marine_emergency` by the endpoint** and is *not* accepted in the body.

| Field | Type | Required | Rule |
|---|---|---|---|
| `name` | string | ✅ | Max 255. **Unique (case-insensitive) among non-deleted `marine_emergency` categories** — a general category may share the name. |
| `description` | string | ❌ | Defaults to `""`. |
| `image` | string \| null | ❌ | Must start with **`category_images/`**, else 400. |
| `parent` | UUID \| null | ❌ | Another **marine-scope** category id. A general-scope parent is **400** (fixed 2026-07-30, GA3); a category also cannot be its own parent or form a cycle. |

**Response `201`** — the §7 row shape.

**Errors** — `400` `{"name": ["A category with this name already exists in this catalog."]}` ·
`400` bad image prefix.

---

## 9 · `GET /api/superadmin/emergency-spares/categories/<category_id>/` — Category detail

No params. Returns the §7 row shape including `product_count`.

**Errors** — `404` unknown, soft-deleted, **or a general-scope category**.

---

## 10 · `PUT` / `PATCH` `/api/superadmin/emergency-spares/categories/<category_id>/update/`

**Both verbs are partial.** Lookup is **pinned to marine** — a general category id returns **404**.

| Field | Type | Required | Rule |
|---|---|---|---|
| `name` | string | ❌ | Unique within the marine scope, excluding this row. |
| `description` | string | ❌ | |
| `image` | string \| null | ❌ | `category_images/` prefix. Send `null` to clear. |
| `is_active` | bool | ❌ | |
| `parent` | UUID \| null | ❌ | |

`scope` is **not writable** — a category cannot be moved between catalogs.

**Response `200`** — the §7 row shape.

---

## 11 · `GET /api/superadmin/emergency-spares/categories/stats/` — Category cards

No params. Scoped to marine only.

**Response `200`:**
```json
{ "total": 7, "active": 7, "inactive": 0, "empty": 1 }
```
`empty` = marine categories with zero non-deleted products.

---

## 12 · `DELETE /api/superadmin/emergency-spares/categories/<category_id>/delete/`

No body. Sets `is_deleted=True`, `is_active=False`, `deleted_at`, `deleted_by`, and
**deactivates the category's live spares** (`is_active=False`, not a further soft-delete —
GA2 / CROSS-FLOW-6, 2026-07-30). Same cascade and same rationale as part 29 §7; this endpoint
shares the base class, so the behaviour is identical.

**Response `200`** — `deactivated_products` is always present; the message mentions it only when
non-zero, so the previous exact string is preserved for an empty category.

```json
{ "message": "Emergency spare category deleted successfully. 3 products deactivated.",
  "deactivated_products": 3 }
```

Deactivated spares stop being orderable immediately — `ProductVariant.is_orderable()` checks
`product.is_active`.

**Errors** — `404` unknown, already-deleted, **or a general-scope category**.

> Unlike its general-catalog counterpart, this endpoint **is** scope-pinned. It shares the other
> behaviour, though: there is **no guard on categories that still contain products** and **no
> cascade** — the spares remain live and buyable with a deleted category. Recorded in the validation
> report.

---

# How Flow 29b connects

- **Mirror — part 29 (Catalog Structure):** the same six verbs on the same two objects, pinned to the
  other scope. The general endpoints there should be equally blind to marine objects.
- **Shared — part 29 §14–§18 (variants):** a spare's variants are created and edited through the
  **general, unscoped** variant endpoints. There is no marine-specific variant API.
- **Shared — part 29a (toggles):** `admin_sourceable`, `is_top_rated` and the availability
  announcement are one unscoped set serving both catalogs.
- **Exit — part 29a §3 (`set-catalog-type`):** the only way to move a product out of the marine
  catalog.
- **Upstream — Flow 26 (Media Upload):** image fields take paths, not files.
- **Downstream — Flow 5 (Standard & Marine Emergency Order Intent):** what a sailor can request
  urgently is drawn from this catalog.
