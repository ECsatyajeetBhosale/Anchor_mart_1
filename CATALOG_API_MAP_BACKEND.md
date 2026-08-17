# Catalog API Map — definitive route inventory

Generated from the Django URL resolver on 2026-08-17, not from the Postman collection.
This is the complete admin catalog surface: **41 routes across 4 code surfaces**.

If a route is not in this file, it does not exist. If the frontend calls something not
listed here, it is calling a stale path.

---

## The two facts that shape all of it

**1. Categories are ONE model.** `Category` has a `scope` field
(`general` | `marine_emergency`). The two CRUD namespaces are two scope-locked doors into
the same table — not two models. Scope is fixed by the view class and is never read from
the request body; every door 404s on a cross-scope id. Name uniqueness is
`(name, scope)` among live rows, so the same category name may legally exist in both
taxonomies.

**2. Products are ONE model with a 3-way partition.** `Product.catalog_type` is
`regular` | `express` | `marine_emergency`. The general and marine screens are the *same
view and serializer classes* with a different `CATALOG_TYPES` tuple. `Category.scope` must
match `catalog_type` (general categories hold regular + express; marine categories hold
marine_emergency).

---

## Global response conventions (apply to every route below)

- **Field errors:** `{"field_name": ["message"]}`.
- **Serializer-raised non-field errors:** `{"message": ["..."]}` — the project sets
  `NON_FIELD_ERRORS_KEY = "message"` in `REST_FRAMEWORK`. **Not** `non_field_errors`, and
  **not** `detail`.
- **View-raised non-field errors:** `{"detail": "..."}` (CLAUDE.md §3). Both shapes exist;
  handle both.
- **Unknown request keys are silently dropped** on every serializer — DRF default, no strict
  mode anywhere. A 200/201 never means "it accepted every key I sent". All create/update
  endpoints return the full read serializer, so diff the response rather than trusting the
  status.
- **Update endpoints are always partial**, PUT and PATCH alike (CLAUDE.md §4a). Send
  dirty-only: `update()` does a full-row `instance.save()`, so a full-object PUT writes back
  every field and can clobber a concurrent row toggle.
- **Pagination is uniform** (`CustomPagination`): `page_size` default 10, max 50 (over-max is
  silently clamped, not a 400); `page_size=0`/junk falls back to 10; **page past the end is a
  404** `{"detail": "Invalid page."}`. Response shape is
  `{count, next, previous, results: {message, data: [...]}}` — rows at `results.data`.

---

## 1. Categories — general scope (7 routes)

Base: `/api/superadmin/categories/`

| Method | Path | View |
|---|---|---|
| GET | `get-categories/` | `ListGeneralCategoriesView` |
| GET | `get-categories-by-catalog-type/` | `ListCategoriesByCatalogTypeView` |
| GET | `category-stats/` | `CategoryStatsView` |
| GET | `get-category/<uuid>/` | `GetCategoryView` |
| POST | `add-category/` | `AddGeneralCategoryView` |
| PUT/PATCH | `update-category/<uuid>/` | `UpdateGeneralCategoryView` |
| DELETE | `delete-category/<uuid>/` | `DeleteCategoryView` |

- `get-categories-by-catalog-type/?catalog_type=` takes **`regular` | `marine_emergency`
  only**. There are two category buckets, not three: express products use the general
  bucket, so **send `regular` for an express product**. `?catalog_type=express` is a
  deliberate **400** (locked by `test_categories.test_categories_by_catalog_type_validates`).
  It is the one route that reaches both scopes, by design — it answers "which categories may
  this product use?"
  *(Corrected 2026-08-17: the first version of this file listed `express` as accepted,
  copied from a stale comment in `category_urls.py`. That comment is now fixed too.)*
- `scope` is not a writable field on create or update. A category cannot change taxonomy.
- `category-stats/` is **general-scope only** and honours the list's `search` / `is_active`
  filters (C2 fix, 2026-08-17). Its marine twin behaves identically. For a whole-taxonomy
  figure use `products/product-stats/`, whose `general_categories` /
  `marine_emergency_categories` are global and labelled per scope.
- Delete is a soft-delete and **cascades to products** — see "Category delete blast radius".

## 2. Categories — marine-emergency scope (6 routes)

Base: `/api/superadmin/emergency-spares/categories/`

| Method | Path | View |
|---|---|---|
| GET | `` (list) | `ListEmergencySpareCategoriesView` |
| GET | `stats/` | `EmergencySpareCategoryStatsView` |
| GET | `<uuid>/` | `GetEmergencySpareCategoryView` |
| POST | `add/` | `AddEmergencySpareCategoryView` |
| PUT/PATCH | `<uuid>/update/` | `UpdateEmergencySpareCategoryView` |
| DELETE | `<uuid>/delete/` | `DeleteEmergencySpareCategoryView` |

Same base classes as §1 with `SCOPE = marine_emergency`. Note the URL *shape* differs
(`categories/add/` vs `add-category/`) — that is cosmetic drift between the two doors, not
a behavioural difference.

## 3. Products — general (regular + express) (12 routes)

Base: `/api/superadmin/products/`

| Method | Path | View |
|---|---|---|
| GET | `get-products/` | `ListGeneralProductsView` |
| GET | `get-all-products/` | `ListAllProductsView` |
| GET | `get-product/<uuid>/` | `GetProductView` |
| GET | `product-stats/` | `ProductStatsView` |
| POST | `add-product/` | `AddGeneralProductView` |
| PUT/PATCH | `update-product/<uuid>/` | `UpdateGeneralProductView` |
| DELETE | `delete-product/<uuid>/` | `DeleteProductView` |
| POST | `set-top-rated/<uuid>/` | `SetTopRatedView` |
| POST | `set-admin-sourceable/<uuid>/` | `SetProductSourceableView` |
| POST | `set-active/<uuid>/` | `SetProductActiveView` |
| POST | `set-catalog-type/<uuid>/` | `SetProductCatalogTypeView` |
| POST | `<uuid>/announce-availability/` | `AnnounceProductAvailabilityView` |

- `get-all-products/` spans **all three** catalog types. Read-only picker endpoint; the
  scoped lists stay the management surfaces.
- The three `set-*` toggles are **catalog-wide** (no `catalog_type` scoping) — the marine
  screen has no toggle routes of its own and uses these.

## 4. Products — marine-emergency spares (6 routes)

Base: `/api/superadmin/emergency-spares/products/`

| Method | Path | View |
|---|---|---|
| GET | `` (list) | `ListEmergencySpareProductsView` |
| GET | `stats/` | `EmergencySpareProductStatsView` |
| GET | `<uuid>/` | `GetEmergencySpareProductView` |
| POST | `add/` | `AddEmergencySpareProductView` |
| PUT/PATCH | `<uuid>/update/` | `UpdateEmergencySpareProductView` |
| DELETE | `<uuid>/delete/` | `DeleteEmergencySpareProductView` |

Same view and serializer classes as §3 with `CATALOG_TYPES = (marine_emergency,)`.
`catalog_type` is forced by the endpoint and ignored if sent in the body.
**No toggle routes** — use §3's.

## 5. Product variants (7 routes)

Base: `/api/superadmin/product-variants/`

| Method | Path | View |
|---|---|---|
| GET | `get-product-variants/` | `ListVariantsView` |
| GET | `product-variant/` | `GetVariantView` (query-param lookup, not a path id) |
| POST | `add-product-variant/` | `AddVariantView` |
| PUT/PATCH | `update-product-variant/<uuid>/` | `UpdateVariantView` |
| DELETE | `delete-product-variant/<uuid>/` | `DeleteVariantView` |
| POST | `set-admin-sourceable/<uuid>/` | `SetVariantSourceableView` |
| POST | `set-express/<uuid>/` | `SetVariantExpressView` |

- Serves **all** catalog types — there is no marine/general split here.
- `is_express` is **not** in `UpdateProductVariantSerializer.fields`; `set-express/` is its
  only writer.
- `add-product/` with an `sku` creates the first variant inline, so product creation and
  variant creation overlap.

## 6. Express (3 routes — all read-only)

Base: `/api/superadmin/express/`

| Method | Path | View |
|---|---|---|
| GET | `stats/` | `ExpressStatsView` |
| GET | `orders/` | `ListExpressOrdersView` |
| GET | `items/` | `ListExpressItemsView` |

**The Express screen has no writers of its own.** Everything it displays is written by
`products/set-catalog-type/` and `product-variants/set-express/`. Build it after both.

---

## Express: which flag decides what a sailor sees

The two flags are **not** alternatives — they compose, hierarchically:

| Flag | Level | Means |
|---|---|---|
| `Product.catalog_type == "express"` | product | which shelf the product sits on (a partition — exactly one value) |
| `ProductVariant.is_express` | variant | which of that product's variants are express-deliverable |

A sailor sees an item in the express catalog iff **both** are true, plus the ordinary
liveness/sourceable gates (`catalog/views.py` — `ExpressProductListView.EXTRA_VARIANT_FILTERS
= {"is_express": True}` over `CATALOG_TYPES = (EXPRESS,)`).

`set-express/` maintains the invariant in both directions: turning a variant express
up-cascades its product to `catalog_type=express`; turning off the *last* express variant
down-cascades the product back to `regular` (or `marine_emergency` per its category scope).

`set-catalog-type/` does **not** — it writes `catalog_type` only. See the conflicts log.

---

## Category delete blast radius

`DELETE` on either category door does **two** things, in one transaction
([`BaseDeleteCategoryView`](../backend/admin_panel/views/category_views.py)):

1. soft-deletes the category (`is_deleted=True`, `is_active=False`);
2. sets **`is_active=False` on every live product in it** — a deactivation, *not* a delete.

It does **not** cascade to variants, orders, carts, or deals. Products keep their `category`
FK pointing at the now-deleted category.

```jsonc
// 200
{ "message": "Category deleted successfully. 12 products deactivated.",
  "deactivated_products": 12 }
```

**For the confirm dialog:**

- `deactivated_products` is authoritative — it is what the call actually changed. Show it in
  the success toast.
- To pre-fill the count, `get-category/<uuid>/` returns `product_count`, but it counts every
  non-deleted product **including already-inactive ones**, while the cascade only touches
  live ones. So `product_count >= deactivated_products`. Word the dialog as "up to N
  products will be deactivated", or the two numbers will legitimately disagree and look
  like a bug.
- The reversal is **asymmetric**, and this is the part worth spelling out in the copy:
  each product can be switched back on via `products/set-active/<id>/`, but **the category
  itself cannot be restored** — there is no restore endpoint. Undoing a mistaken category
  delete means re-creating the category and re-homing every product.
- Products are deactivated, so sailors stop seeing them immediately (the variant-level
  orderability gate reads `product.is_active`). Nothing is destroyed.

---

## Customer-facing catalog routes (for cross-checking admin writes)

| Method | Path | View |
|---|---|---|
| GET | `/api/catalog/get-category-list/` | `GetGeneralCategoryListView` |
| GET | `/api/catalog/marine-emergency-category-list/` | `GetMarineEmergencyCategoryListView` |
| GET | `/api/catalog/get-product-list/` | `GetProductListView` (regular only) |
| GET | `/api/catalog/express-products/` | `ExpressProductListView` |
| GET | `/api/catalog/marine-emergency-products/` | `MarineEmergencyProductListView` |
| GET | `/api/catalog/product-variants/` | `ProductVariantsView` |
| GET | `/api/catalog/product-variants-details/` | `GetProductVariantDetailsView` |
| GET | `/api/catalog/get-special-request-product/` | `GetSpecialRequestProductView` |
| POST | `/api/catalog/save-product/` | `SaveProductView` |

These need the `server-secret-key` header; `/api/superadmin/` routes do not.
Several admin-side divergences are only visible from here — an item can be present on an
admin screen and absent from the sailor's.
