# Catalog API Map — definitive route inventory

> **Mirror of the backend's `MD/CATALOG_API_MAP.md`, received 2026-08-17.**
> Generated from the Django URL resolver, not from the Postman collection.
> Do not hand-edit this copy — ask backend to regenerate and re-mirror it.
> If a route is not in this file, it does not exist. If the frontend calls
> something not listed here, it is calling a stale path.

**41 admin routes across 4 code surfaces**, plus 9 customer-facing routes.

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

- `get-categories-by-catalog-type/?catalog_type=` maps `regular` → general,
  `express` → general, `marine_emergency` → marine. It is the one route that reaches
  both scopes, by design — it answers "which categories may this product use?"
- `scope` is not a writable field on create or update. A category cannot change taxonomy.
- Delete is a soft-delete and **cascades** (see `BaseDeleteCategoryView`).

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
(`categories/add/` vs `add-category/`) — cosmetic drift between the two doors, not a
behavioural difference.

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
liveness/sourceable gates (`ExpressProductListView.EXTRA_VARIANT_FILTERS =
{"is_express": True}` over `CATALOG_TYPES = (EXPRESS,)`). The express **category** list
mirrors it exactly, so a product with no express variants does not hold its category open
either.

`set-express/` maintains the invariant in both directions: turning a variant express
up-cascades its product to `catalog_type=express`; turning off the *last* express variant
down-cascades the product back to `regular` (or `marine_emergency` per its category scope).

`set-catalog-type/` does **not** — it writes `catalog_type` only. See C3 in the conflicts
log.

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
