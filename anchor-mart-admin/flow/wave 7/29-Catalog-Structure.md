# Flow 29 — Catalog Structure (Categories → Products → Variants)


> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`29-catalog-structure-validation.md`](./29-catalog-structure-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint is fully specified.
>
> Index: [`../../BUSINESS_FLOWS.md`](../../BUSINESS_FLOWS.md)


> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**


> **Flow 29 is documented in four parts** — 42 endpoints split by admin journey, not by module:
>
> | Part | Endpoints | Journey |
> |---|---|---|
> | **29 · Catalog Structure** *(this doc)* | 18 | Build a sellable item: categories → products → variants |
> | 29a · Merchandising & Availability | 6 | Decide what a sailor sees and can buy |
> | 29b · Marine-Emergency Spares | 12 | The parallel scope-partitioned surface |
> | 29c · Ports & Anchorages | 6 | Delivery geography |


---


# Executive Summary


The admin's authoring surface for everything a sailor can browse. Three levels, created in order:


**Category → Product → Variant.** A category groups products; a product is the thing with a name,
description and images; a **variant is the thing that is actually bought** — it carries the SKU and
the **authoritative price**. `Product.base_price` is a display/default figure; the money that reaches
an order comes from `ProductVariant.price`.


Two ideas shape every endpoint here:


1. **The catalog is scope-partitioned.** `Category.scope` is `general` or `marine_emergency`, and
  `Product.catalog_type` is `regular`, `express` or `marine_emergency`. A product's category scope
  must match its catalog type. **Endpoints are partitioned to match** — the endpoints in this
  document only ever touch the *general* surface (regular + express); the marine-emergency
  equivalents are separate endpoints, documented in **29b**. Scope is never taken from the request
  body on create, and cannot be changed by update.
2. **There is no numeric stock anywhere in AnchorMart.** Availability is expressed entirely through
  `admin_sourceable` (on both product and variant) plus `is_active`. Those switches are documented
  in **29a**; this document covers only creating and editing the objects themselves.


| | |
|---|---|
| **Actors** | Admin (Catalog screens) |
| **Endpoints** | **18** — 7 category · 6 product · 5 variant, all under `/api/superadmin/` |
| **Django Apps** | `admin_panel` (views + serializers), `catalog` (models) |
| **Models** | `Category`, `Product`, `ProductVariant`, `ProductImage`, `ProductVariantImage`, `ProductRating`, `DealOfTheDay` (read for the on-deal flag) |
| **Trigger** | Admin opens Catalog → Categories / Products / Variants |
| **Previous Flow** | 26 (media upload — images arrive as *paths*, see below) |
| **Next Flow** | 29a (availability switches) · 3 (what the sailor then sees) |
| **Documentation Version** | 1.1 — 2026-07-30 (post-remediation) |
| **Documentation Status** | ✅ 18 routes fully specified. Routes from the running route table; **behaviour verified by EXECUTING all 18 endpoints** (43 assertions, 0 mismatches, 2026-07-29) — not inferred from source. **Revised 2026-07-30** for the GA1 / GA6 / GA7 fixes (scope partition on detail+delete, product image prefix, `base_price` floor), each now locked by permanent tests in `admin_panel/tests/test_catalog_scope_partition.py`. |


> **The load-bearing rule:** a **product's category scope must match its catalog type**. A
> `regular`/`express` product needs a `general` category; a `marine_emergency` product needs a
> `marine_emergency` category. This is validated on create and on any category change, and it is
> checked **before** the name-uniqueness check so a wrong-catalog category is reported clearly even
> when the name also clashes.


---


# Concepts you need before reading the endpoints


### Scope and catalog type


| `Category.scope` | Used by `Product.catalog_type` |
|---|---|
| `general` | `regular`, `express` |
| `marine_emergency` | `marine_emergency` |


Express products live in the **general** category bucket — there is no separate "express" category.
When the product form asks for a category list for an express product, it passes
`catalog_type=regular` (see §2).


### Images are paths, not uploads


Every image field on these endpoints takes a **relative path string** produced by the presigned
upload in Flow 26 — never a file. The **directory segment is fixed and validated**; only the
filename varies:


| Object | Required path prefix |
|---|---|
| Category image | `category_images/` |
| **Product images** | **`product_images/`** |
| Variant images | `variant_images/` |


A path with the wrong prefix is a **400**. Example valid value: `"category_images/abc123.jpg"`.


> All three objects are now prefix-validated. Product images were the one gap (GA6, fixed
> 2026-07-30); before that the product serializer accepted any string.


### Soft delete


Nothing is hard-deleted. `is_deleted=True` + `is_active=False` + `deleted_at`/`deleted_by` are set,
and every list/detail endpoint filters `is_deleted=False`. Deleting a **product cascades** the
soft-delete to its variants.


---


# Endpoints — full specification


**Headers:** `Authorization: Token <token>` (role `admin` or `super_admin`).
`/api/superadmin/` is **exempt** from the `server-secret-key` middleware — do **not** send it.
All endpoints are `IsAuthenticated + IsAdminUser`. There is **no per-object ownership gate** on this
flow — any admin may edit any catalog object.


**Pagination** (all list endpoints): `page`, `page_size` — default **10**, max **50**. Response is
the standard envelope:


```json
{ "count": 42, "next": "…?page=2", "previous": null,
 "results": { "message": "…", "data": [ /* rows */ ] } }
```


---


## Categories


## 1 · `GET /api/superadmin/categories/get-categories/` — List general categories


Lists **`scope=general`** categories only (regular + express). Marine categories are §29b.


| Query param | Type | Allowed values | Default | Meaning |
|---|---|---|---|---|
| `search` | string | free text | — | Case-insensitive match on **`name` only**. Description is not searched. |
| `is_active` | string | `true` `1` `yes` `t` / `false` `0` `no` `f` (case-insensitive); **anything else → 400** | unset = no filter | Filter by active state. |
| `page` | int | ≥ 1 | 1 | |
| `page_size` | int | 1–50 | 10 | |


Ordered by **`name` ascending**.


**Response `200`** — paginated envelope, `message: "Categories fetched successfully"`, each row:


```json
{
 "id": "3f1c…", "name": "Provisions", "description": "Food and dry stores",
 "image": "https://…/category_images/abc123.jpg",
 "scope": "general", "product_count": 24,
 "parent": null, "parent_name": null,
 "is_active": true,
 "created_at": "July 29, 2026, 11:04 AM", "updated_at": "July 29, 2026, 11:04 AM"
}
```


- `product_count` — non-deleted products in this category (annotation).
- `image` — absolute URL, or `null` when unset.
- `parent` / `parent_name` — self-referential parent category; `null` at top level. A parent is
 always in the same `scope` as its child (enforced since GA3, 2026-07-30).


---


## 2 · `GET /api/superadmin/categories/get-categories-by-catalog-type/` — Categories for a product form


Powers the **category dropdown on the product form**. Same rows, filters and pagination as §1, plus
one **required** param.


| Query param | Type | Allowed values | Required |
|---|---|---|---|
| `catalog_type` | string | **`regular`** or **`marine_emergency`** only | ✅ |


| You are creating a… | Pass |
|---|---|
| regular product | `regular` |
| **express product** | **`regular`** — express products use the general bucket |
| marine-emergency product | `marine_emergency` |


**Errors** — `400` when `catalog_type` is missing **or** is any other value, including `express`:
```json
{ "catalog_type": ["Required; must be one of ['regular', 'marine_emergency']. Use 'regular' for both regular and express products."] }
```


---


## 3 · `GET /api/superadmin/categories/category-stats/` — Category cards


No params. Counts across **both scopes** (not just general).


**Response `200`:**
```json
{ "total": 31, "active": 28, "inactive": 3, "empty": 4 }
```
`empty` = categories with zero non-deleted products.


---


## 4 · `GET /api/superadmin/categories/get-category/<category_id>/` — Category detail


No params. `category_id` is a UUID. Returns the **same shape as a §1 row** (including
`product_count`).


> Lookup is **scoped to `general`** — a marine category id returns **404** (fixed 2026-07-30, GA1).


**Errors** — `404` unknown or soft-deleted category.


---


## 5 · `POST /api/superadmin/categories/add-category/` — Create a general category


`scope` is **fixed to `general` by the endpoint** and is *not* accepted in the body.


| Field | Type | Required | Rule |
|---|---|---|---|
| `name` | string | ✅ | Max 255. **Unique (case-insensitive) among non-deleted `general` categories.** |
| `description` | string | ❌ | Free text; defaults to `""`. |
| `image` | string \| null | ❌ | Path must start with **`category_images/`**, else 400. Null/blank allowed. |
| `parent` | UUID \| null | ❌ | Another category id. Must be in the **same scope**, cannot be the category itself, and cannot create a cycle — else **400**. |


```json
{ "name": "Provisions", "description": "Food and dry stores",
 "image": "category_images/abc123.jpg", "parent": null }
```


**Response `201`** — the §1 row shape.


**Errors** — `400` `{"name": ["A category with this name already exists in this catalog."]}` ·
`400` bad image prefix · `401`/`403` auth.


---


## 6 · `PUT` / `PATCH` `/api/superadmin/categories/update-category/<category_id>/` — Update


**Both verbs are partial** — send only what changes; omitted fields are untouched.
Lookup is **scoped to `general`**: a marine category id returns **404** here.


| Field | Type | Required | Rule |
|---|---|---|---|
| `name` | string | ❌ | Unique within `general`, excluding this row. |
| `description` | string | ❌ | |
| `image` | string \| null | ❌ | `category_images/` prefix. Send `null` to clear. |
| `is_active` | bool | ❌ | |
| `parent` | UUID \| null | ❌ | Another category id. Must be in the **same scope**, cannot be the category itself, and cannot create a cycle — else **400**. |


`scope` is **not writable** — a category cannot be moved between catalogs.


**Response `200`** — the §1 row shape. **Errors** — `400` name clash / bad prefix · `404` unknown,
deleted, or **marine-scope** category.


---


## 7 · `DELETE /api/superadmin/categories/delete-category/<category_id>/` — Soft-delete


No body. Sets `is_deleted=True`, `is_active=False`, `deleted_at`, `deleted_by`.


**Response `200`** — `deactivated_products` is always present; the message only mentions it when
non-zero, so the previous exact string is preserved for an empty category.


```json
{ "message": "Category deleted successfully. 12 products deactivated.",
 "deactivated_products": 12 }
```


> The lookup is **scoped to `general`** — a marine category id returns **404** (fixed 2026-07-30,
> GA1), matching §6.
>
> **Deleting a category deactivates its live products** (`is_active=False`, **not** a further
> soft-delete, so it is reversible from the product screen). Decision 2026-07-30, GA2 /
> CROSS-FLOW-6: cascade rather than block, because a category is not the thing being bought — a
> product with no *variant* is unbuyable and broken (hence §18's last-variant refusal), whereas a
> product with no *category* is merely uncategorised. A hard block would force manual re-homing
> before any routine reorganisation.
>
> Deactivated products stop being orderable immediately: `ProductVariant.is_orderable()` checks
> `product.is_active`, so their variants go unavailable too.


**Errors** — `404` unknown or already-deleted category.


---


## Products


## 8 · `GET /api/superadmin/products/product-stats/` — Product cards


No params. Three aggregate queries, no per-card fan-out. Counts span **all catalog types**.


**Response `200`:**
```json
{ "total": 412, "active": 380, "regular": 300, "express": 84, "emergency": 28,
 "top_rated": 12, "on_deal": 5, "deal_of_the_day": 5,
 "total_categories": 31, "general_categories": 24, "marine_emergency_categories": 7 }
```
`on_deal` = products with a currently-valid `DealOfTheDay` on a live variant.
`deal_of_the_day` = count of those active deals.


---


## 9 · `GET /api/superadmin/products/get-products/` — List general products


**Regular + express only.** Marine-emergency products are §29b.


| Query param | Type | Allowed values | Default | Meaning |
|---|---|---|---|---|
| `search` | string | free text | — | Case-insensitive match on **`name` only**. |
| `category` | UUID | valid UUID | — | Filter by category. **400** if not a UUID. |
| `is_active` | string | `true` `1` `yes` `t` / `false` `0` `no` `f` (case-insensitive); **anything else → 400** | no filter | |
| `catalog_type` | string | **`regular`** or **`express`** only | no filter | **400** if `marine_emergency` — it is out of this endpoint's scope. |
| `is_express` | string | `true` `1` `yes` `t` / `false` `0` `no` `f` (case-insensitive); **anything else → 400** — true → only express; false → **excludes** express | no filter | Legacy alias for `catalog_type`. |
| `on_deal` | string | `true` `1` `yes` `t` / `false` `0` `no` `f` (case-insensitive); **anything else → 400** | no filter | Has a currently-valid deal. |
| `is_top_rated` | string | `true` `1` `yes` `t` / `false` `0` `no` `f` (case-insensitive); **anything else → 400** | no filter | |
| `page` / `page_size` | int | 1–50 | 10 | |


Ordered **newest first** (`-created_at`).


**Response `200`** — paginated envelope, `message: "Products fetched successfully"`, each row:


```json
{
 "id": "9a2f…", "name": "Deck Cap", "image": "https://…/product_images/cap.jpg",
 "category": "3f1c…", "category_name": "Provisions",
 "base_price": "25.00", "variant_count": 3,
 "catalog_type": "regular", "is_express": false, "on_deal": false, "is_top_rated": false,
 "average_rating": 4.3, "admin_sourceable": true, "is_active": true,
 "purchase_count": 87,
 "created_at": "July 29, 2026, 11:04 AM", "updated_at": "July 29, 2026, 11:04 AM"
}
```


- `image` — the **primary** product image, else the first, else `null`.
- `is_express` — derived: `catalog_type == "express"`.
- `average_rating` — rounded to 1dp, **`0`** when unrated (not `null`).
- `purchase_count` — distinct sailors served, from delivered orders. **Read-only on every surface**
 and **admin-only** — it is never exposed to customers.


---


## 10 · `GET /api/superadmin/products/get-product/<product_id>/` — Product detail


No params. Returns **all** product fields except the soft-delete bookkeeping
(`is_deleted`, `deleted_at`, `deleted_reason`, `deleted_by`), plus:


| Extra field | Meaning |
|---|---|
| `images` | Array of `{id, image, is_primary, display_order}` |
| `category_name` | |
| `average_rating` | 1dp, `0` when unrated |
| `created_at` / `updated_at` | Display-formatted strings |


`purchase_count` is included and **read-only**.


> Lookup is **scoped to `regular` + `express`** — a marine-emergency product id returns **404**
> (fixed 2026-07-30, GA1).


**Errors** — `404` unknown or soft-deleted product.


---


## 11 · `POST /api/superadmin/products/add-product/` — Create a regular/express product


| Field | Type | Required | Rule |
|---|---|---|---|
| `category` | UUID | ✅ | Must exist **and be `is_active=True`**. Its `scope` must be `general`. |
| `name` | string | ✅ | **Unique within the category.** |
| `description` | string | ✅ | |
| `base_price` | decimal | ✅ | max 12 digits, 2dp, **minimum `0.01`**. |
| `catalog_type` | string | ❌ | `regular` or `express`. See resolution below. |
| `is_express` *or* `is_express_item` | any | ❌ | Legacy fallback when `catalog_type` is absent. |
| `admin_sourceable` | bool | ❌ | Default **`true`**. |
| `is_top_rated` | bool | ❌ | Default `false`. |
| `images` | array of string | ❌ | Each path must start with **`product_images/`**, else 400. First becomes primary. |
| `sku` | string | ❌ | **If present, a default variant is created too** (see below). Must be globally unique. |
| `attributes` | object | ❌ | Only used when `sku` is given. Default `{}`. |


**How `catalog_type` is resolved** (this endpoint allows `regular` + `express`):


1. `catalog_type` in the body → used, must be `regular` or `express` (else 400).
2. Otherwise `is_express` / `is_express_item` — a recognised boolean (`true` `1` `yes` `t` /
  `false` `0` `no` `f`); true → `express`, false → `regular`. **An unrecognised value is a
  400**, not a silent `regular` (GA5, fixed 2026-07-30).
3. Otherwise → **`regular`**.


**The optional default variant.** If `sku` is supplied, one `ProductVariant` is created in the same
transaction with `price = base_price`, the given `attributes`, the product's `admin_sourceable`, and
copies of `images`. **If `sku` is omitted, the product is created with zero variants** — it cannot be
bought until a variant is added via §16.


```json
{ "category": "3f1c…", "name": "Deck Cap", "description": "Cotton cap",
 "base_price": "25.00", "catalog_type": "regular",
 "images": ["product_images/cap.jpg"], "sku": "CAP-1", "attributes": {"size": "M"} }
```


**Response `201`** — the §10 detail shape.


**Errors** (checked in this order, so the first failure is the one reported):
- `400` `{"category": ["This category belongs to 'marine_emergency', but a 'regular' product must use a 'general' category."]}`
- `400` `{"name": ["A product with this name already exists in this category."]}`
- `400` `{"sku": ["A product with this SKU already exists."]}`
- `400` `{"category": ["Category not found"]}` — unknown **or inactive** category
- `400` `{"catalog_type": ["Must be one of ['regular', 'express'] for this endpoint."]}`


---


## 12 · `PUT` / `PATCH` `/api/superadmin/products/update-product/<product_id>/` — Update


**Both verbs are partial.** Lookup is **scoped to `regular` + `express`** — a marine-emergency
product id returns **404**.


| Field | Type | Required | Rule |
|---|---|---|---|
| `category` | UUID | ❌ | Must be active; scope must match the product's **existing** `catalog_type`. |
| `name` | string | ❌ | Unique within the category, excluding this product. |
| `description` | string | ❌ | |
| `base_price` | decimal | ❌ | |
| `admin_sourceable` | bool | ❌ | Also settable via the dedicated endpoint in **29a**. |
| `is_active` | bool | ❌ | |
| `is_top_rated` | bool | ❌ | |
| `images` | array of string | ❌ | **Full replacement** — sending this deletes all existing product images and recreates from the list. Omit to keep them. `product_images/` prefix enforced. |


`catalog_type` is **not updatable here** — use `set-catalog-type/` (**29a**).


**Response `200`** — the §10 detail shape. **Errors** — as §11 (scope, then name) · `404` unknown,
deleted, or marine-scope product.


---


## 13 · `DELETE /api/superadmin/products/delete-product/<product_id>/` — Soft-delete


No body. Soft-deletes the product **and cascades to all its live variants** (each gets
`is_deleted=True`, `is_active=False`, `deleted_at`, `deleted_by`), so they drop out of the variant
list and stop counting toward express/deal totals.


**Response `200`:** `{"message": "Product deleted successfully"}`


> Lookup is **scoped to `regular` + `express`** — a marine-emergency product id returns **404**
> (fixed 2026-07-30, GA1), matching §12.


**Errors** — `404` unknown or already-deleted product.


---


## Variants


> **`ProductVariant.price` is the authoritative money field for the whole catalog.** A change to it
> is written to the tamper-evident audit trail (`PRICE_CHANGED`, with both the old and new value).
> `Product.base_price` is a display/default figure.


## 14 · `GET /api/superadmin/product-variants/get-product-variants/` — List variants


Spans **all catalog types** (not scope-partitioned).


| Query param | Type | Allowed values | Default | Meaning |
|---|---|---|---|---|
| `search` | string | free text | — | Matches **`sku`** OR **parent product `name`** (both case-insensitive). |
| `product` | UUID | valid UUID | — | Filter to one product. **400** if not a UUID. |
| `is_active` | string | `true` `1` `yes` `t` / `false` `0` `no` `f` (case-insensitive); **anything else → 400** | no filter | |
| `catalog_type` | string | `regular`, `express`, `marine_emergency` | no filter | Filters on the **parent product's** type. 400 if not one of the three. |
| `is_express` | string | `true` `1` `yes` `t` / `false` `0` `no` `f` (case-insensitive); **anything else → 400** — true → parent is express; false → **excludes** express parents | no filter | Legacy alias. |
| `page` / `page_size` | int | 1–50 | 10 | |


Ordered **newest first**.


**Response `200`** — paginated envelope, `message: "Product variants fetched successfully"`, each row
carries every variant field except soft-delete bookkeeping, plus:


```json
{
 "id": "7c31…", "product": "9a2f…", "product_name": "Deck Cap",
 "sku": "CAP-1", "price": "25.00", "attributes": {"size": "M"},
 "images": [{"id": "…", "image": "https://…/variant_images/cap.jpg",
             "is_primary": true, "display_order": 0}],
 "admin_sourceable": true, "is_express": false, "is_active": true,
 "about_product": "Cotton, one size",
 "catalog_type": "regular",
 "created_at": "July 29, 2026, 11:04 AM", "updated_at": "July 29, 2026, 11:04 AM"
}
```
`catalog_type` is **inherited from the parent product** — variants have no type of their own.


---


## 15 · `GET /api/superadmin/product-variants/product-variant/` — Variant detail


Takes the id as a **query parameter**, not a path segment.


| Query param | Type | Required |
|---|---|---|
| `product_variant_id` | UUID | ✅ |


**Response `200`** — the §14 row shape.


**Errors** — `400` `{"product_variant_id": "This query parameter is required."}` ·
`400` `{"product_variant_id": "'x' is not a valid UUID."}` · `404` unknown or deleted variant.


---


## 16 · `POST /api/superadmin/product-variants/add-product-variant/` — Create a variant


| Field | Type | Required | Rule |
|---|---|---|---|
| `product` | UUID | ✅ | Must exist and be **`is_active=True`**. |
| `sku` | string | ✅ | Max 100. **Globally unique** across all variants (including soft-deleted ones — the DB constraint is unconditional). |
| `price` | decimal | ✅ | max 12 digits, 2dp, **minimum `0.01`**. |
| `attributes` | object | ✅ | e.g. `{"color": "red", "size": "M"}`. |
| `images` | array of string | ❌ | Each path must start with **`variant_images/`**, else 400. First becomes primary. |


`admin_sourceable` defaults to **`true`**; `is_express` defaults to **`false`**. Neither is accepted
here — use the toggles in **29a**.


```json
{ "product": "9a2f…", "sku": "CAP-2", "price": "27.50",
 "attributes": {"size": "L"}, "images": ["variant_images/cap-l.jpg"] }
```


**Response `201`:**
```json
{ "message": "Product variant created successfully",
 "data": { "product_variant_id": "7c31…", "product": "9a2f…", "sku": "CAP-2",
           "price": "27.50", "attributes": {"size": "L"}, "images": [ … ] } }
```
Note this response uses **`product_variant_id`**, not `id`, and is a narrower shape than §14.


**Errors** — `400` `{"sku": ["A product variant with this SKU already exists."]}` ·
`400` `{"product": ["Product not found"]}` (unknown **or inactive**) · `400` bad image prefix ·
`400` price below `0.01`.


---


## 17 · `PUT` / `PATCH` `/api/superadmin/product-variants/update-product-variant/<product_variant_id>/`


**Both verbs are partial.**


| Field | Type | Required | Rule |
|---|---|---|---|
| `product` | UUID | ❌ | Must be active. **Re-parents the variant to a different product.** |
| `sku` | string | ❌ | Globally unique (DB constraint). |
| `price` | decimal | ❌ | min `0.01`. **Audited** — see below. |
| `attributes` | object | ❌ | |
| `images` | array of string | ❌ | **Full replacement**; `variant_images/` prefix enforced. Omit to keep existing. |
| `admin_sourceable` | bool | ❌ | Also settable via the dedicated toggle in **29a**. |
| `about_product` | string | ❌ | |
| `is_active` | bool | ❌ | |


**Price changes are audited.** If `price` differs after save, a `PRICE_CHANGED` entry is written to
the tamper-evident audit trail recording the SKU, product name, and both the old and new values.


**Response `200`** — the §14 row shape.


**Errors** — `400` duplicate `sku` · `400` price below `0.01` · `400` bad image prefix ·
`404` unknown or deleted variant.


---


## 18 · `DELETE /api/superadmin/product-variants/delete-product-variant/<product_variant_id>/`


No body. Soft-deletes the variant.


**One guard:** if the parent product is **not** deleted and this is its **only remaining live
variant**, the request is refused — a live product with zero variants would be listed but
unbuyable.


**Response `200`:** `{"message": "Product variant deleted successfully"}`


**Errors:**
- `400` `{"detail": "Cannot delete the product's only variant. Add another variant first, or delete the product."}`
- `404` unknown or already-deleted variant.


> To remove the last variant, delete the **product** (§13) — that cascades.


---


# How Flow 29 connects


- **Upstream — Flow 26 (Media Upload):** every image field here takes a **path string** from the
 presigned upload, never a file. Category, **product** and variant paths are all prefix-validated.
- **Sideways — 29a (Merchandising & Availability):** `admin_sourceable`, `is_express`,
 `is_top_rated`, `catalog_type` and the availability announcement have dedicated endpoints.
- **Sideways — 29b (Marine-Emergency Spares):** the same three levels for the
 `marine_emergency` scope, on separate endpoints.
- **Downstream — Flow 3 (Product Discovery):** what a sailor can see and buy is derived from
 `is_active` + `admin_sourceable` on **both** the product and its variant.
- **Downstream — Flow 34 (Audit Trail):** variant price changes write `PRICE_CHANGED`.
- **Downstream — Flow 19 (Deal of the Day):** deals attach to a **variant**; the product list's
 `on_deal` flag reads them.



