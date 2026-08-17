# Catalog Sweep — Phase Plan

Working plan for resolving bugs and gaps across the five catalog surfaces
(**Products, Categories, Express items, Marine emergency spares, Marine emergency
categories**), run as **four passes plus setup and resolution**.

## The three documents

| File | Role | Edited by |
|---|---|---|
| [CATALOG_API_MAP.md](CATALOG_API_MAP.md) | Route inventory, generated from the Django URL resolver. The authority on what exists. | Backend — **mirror only, never hand-edit** |
| [CATALOG_CONFLICTS.md](CATALOG_CONFLICTS.md) | Running log of cross-catalog conflicts + standing constraints. | This sweep, continuously |
| **CATALOG_PHASES.md** (this file) | Plan of record: what each pass covers, what is done, what is open. | This sweep, at each pass boundary |

Git is handled outside this plan.

---

## Why four passes, not five

The five screens are not five backends.

- **Categories are one model** with a `scope` field. The two namespaces are scope-locked
  doors into one table, sharing base classes.
- **General products and marine spares are the same view and serializer classes** with a
  different `CATALOG_TYPES` tuple.

Running the halves as separate passes would mean logging each conflict twice, or fixing
one door and not the other. **Express runs last** because all three of its routes are
`GET` — it has no writers of its own, so it cannot meaningfully be worked before the
surfaces that write it.

---

## Status at a glance

| # | Pass | Routes | Status |
|---|---|---|---|
| 0 | Setup | — | ✅ Done |
| 1 | Categories, both scopes | 13 | ✅ Done |
| 2 | Products, both scopes | 18 | 🟡 General done, marine + picker open |
| 3 | Variants | 7 | ⬜ Not started |
| 4 | Express | 3 | ⬜ Not started |
| 5 | Conflict resolution | — | ⬜ Blocked on 1–4 |

**Every one of the 41 routes is already wired somewhere in the frontend.** This is not a
missing-integration sweep. The work is contract correctness, behaviour the UI fails to
communicate, and cross-catalog conflicts.

---

## The pass recipe

Every pass runs the same six steps, so passes stay comparable and nothing is skipped
because a screen looked fine.

1. **Inventory** — every route in the map's section, against what the frontend actually
   calls. Output per route: *wired correctly* / *wired but wrong* / *stale path*.
2. **Contract** — compare the real request/response against what the code assumes:
   accepted keys, silently-dropped keys, validation bounds, error status codes,
   pagination edges. Ask backend where the answer is not in the code.
3. **Fix** — bugs and gaps local to this catalog.
4. **Log, don't fix** — anything touching a second catalog goes to
   [CATALOG_CONFLICTS.md](CATALOG_CONFLICTS.md). Fixing a cross-catalog inconsistency from
   inside one screen relocates it rather than removing it.
5. **Verify** — `tsc --noEmit` and `biome check` clean on every touched file.
6. **Close** — update this file's checklist and status; note new conflicts in the log.

**Read [the standing constraints](CATALOG_CONFLICTS.md#standing-constraints--read-before-every-pass)
before starting each pass.** Several of them look like bugs and are not.

---

## Phase 0 · Setup — ✅ Done

- [x] [CATALOG_API_MAP.md](CATALOG_API_MAP.md) mirrored (re-synced 2026-08-17 with the
      `by-catalog-type` correction, new `category-stats/` semantics, and the category
      delete blast radius)
- [x] [CATALOG_CONFLICTS.md](CATALOG_CONFLICTS.md) created; C1–C8 recorded
- [x] Standing constraints recorded
- [x] Backend fixed **C2** (`category-stats/` scope + filter following)
- [x] Backend built `products/set-active/`; frontend wired
- [x] Verified `SetCatalogTypeDialog` never sends `catalog_type=express` to
      `get-categories-by-catalog-type/` — the corrected 400 was never being hit

---

## Phase 1 · Categories, both scopes — 13 routes

**Frontend:** `src/features/catalog/` (5 files) · `src/features/emergency-categories/` (5 files)

Two frontend feature directories mirroring two doors of one model. The main risk is the
two screens diverging in behaviour where the backend does not.

### Routes — all 13 audited ✅

**General** (`/superadmin/categories/`)

- [x] `GET get-categories/` — 404 page recovery added; search placeholder corrected to name-only
- [x] `GET get-categories-by-catalog-type/` — verified we only ever send `marine_emergency`, so the corrected `express` 400 was never hit
- [x] `GET category-stats/` — **was called with no params at all**; now shares the list's filter object
- [x] `GET get-category/<uuid>/` — `product_count` used to pre-fill the delete dialog
- [x] `POST add-category/` — `parent` added; field-keyed errors pinned to inputs
- [x] `PUT/PATCH update-category/<uuid>/` — dirty-only; `parent` added
- [x] `DELETE delete-category/<uuid>/` — overflow + typed confirm; copy rewritten around the category being the irreversible part

**Marine** (`/superadmin/emergency-spares/categories/`) — same six changes applied

- [x] `GET ` (list) · [x] `GET stats/` · [x] `GET <uuid>/`
- [x] `POST add/` · [x] `PUT/PATCH <uuid>/update/` · [x] `DELETE <uuid>/delete/`

### What changed

| Fix | Why |
|---|---|
| Stats now sends the list's filters | It sent **none**, so the C2 backend fix landed on an endpoint we never filtered |
| `parent` picker on add + edit, both doors | Writable and validated server-side since forever; the UI simply had no control |
| Deleted-parent badge on the Parent column | Deleting a parent leaves children live and still rendering the dead parent's name |
| `empty` KPI card | Was in the response from the start and rendered nowhere |
| Dirty-only PATCH | Full-row `save()` + silently-dropped unknown keys = over-sending is invisible when wrong |
| Field-keyed errors pinned to inputs | Backend fixed update's error shape this pass; the form was rendering nothing onto the input |
| `is_active` row toggle | Verified not to cascade, so safe as one click — but see C9 for what it does *not* do |
| Delete → overflow + typed confirm | Cascades to every product, and the category cannot be restored |
| Page-past-end 404 recovery | Same `CustomPagination` as products; same permanent-error trap |
| Image prefix validated client-side | `category_images/` is enforced server-side and is the *only* control |

### Logged, not fixed

**[C9](CATALOG_CONFLICTS.md)** — category deactivate and delete have inverted blast radii:
the safe reversible action does not take products off sale, the irreversible one does.
Handled here by wording only; the behaviour needs a product decision.

### Known work

- **Verify the C2 fix landed correctly on both screens** — cards follow the list's
  `search` / `is_active` filters, and no copy on either screen promises an all-scopes
  number. `total` is now smaller by design.
- **Delete confirm is the big one.** Deleting a category deactivates every live product
  in it. Per [C6](CATALOG_CONFLICTS.md#c6--is_active-vs-delete-asymmetry--fixed-for-products-unverified-elsewhere)
  the copy must weight the *category row* as the irreversible part — products can each be
  switched back on, the category cannot be restored. Pre-fill "up to N" from
  `product_count` (an upper bound), and show the authoritative `deactivated_products` in
  the success toast.
- **`(name, scope)` uniqueness** — the add form must not reject a name that legally
  exists in the other taxonomy.
- **`scope` is not writable** — neither edit form should offer to move a category between
  taxonomies.
- **Apply the C6 delete-vs-deactivate treatment** to both screens if their semantics
  match Products'.
- **Both doors, one behaviour** — anything fixed on one screen gets checked on the other.

### Backend answers — all 18 received 2026-08-17, plus two backend bugs fixed

Kept for reference; the fixes above are built on them.

**A · `category-stats/`**
1. Exact response keys now? We assume `{ total, active, inactive, empty }`. Did the C2 fix
   change the key set, or only the population it counts?
2. Confirm the filter params are exactly `search` + `is_active` — the same two the list
   takes.
3. Does `empty` mean "no products at all", counting inactive and soft-deleted products, or
   only live ones?

**B · `get-categories/` list contract**
4. Full accepted filter set? We send `search`, `is_active`, `page`, `page_size` — is
   anything else honoured (parent, has_products, ordering)?
5. Same pagination semantics as `get-products/` — default 10, `page_size` clamped to 50,
   page past the end → **404** `{"detail": "Invalid page."}`? We built specific 404
   recovery for products and want to know whether to mirror it or not.
6. Is `search` name-only, as on products, or does it also cover `description`?

**C · Hierarchy — the largest unknown**
7. `parent` / `parent_name` are on the read serializer but on **neither** the add nor the
   update payload. Is the hierarchy writable at all? If not, is it dormant-by-design like
   the waitlist, or is the write path simply missing?
8. Does `product_count` include products in **child** categories, or only directly
   assigned ones? This materially changes the delete dialog's "up to N".
9. What does deleting a **parent** category do to its children? The blast-radius note
   covers products but not child categories.
10. Can a category's parent be in the other scope? (Presumably not — confirming so the
    form validates rather than relying on a 400.)

**D · Create / update contract**
11. Exact writable field list, for add and for update separately. We currently send
    `{name, description, image}` on add and `{name, description, image, is_active}` on
    update. Is `parent` accepted? Is `is_active` settable at creation?
12. Which of `description` and `image` are required?
13. Error shape for a `(name, scope)` uniqueness violation — field-keyed
    `{"name": ["…"]}`? We render field-keyed errors onto the input.
14. Are unknown keys silently dropped here too, as on `update-product`? That decides
    whether a 200 can be trusted as "it did what I asked".

**E · Deactivate vs delete** *(decides whether the row toggle is safe to offer)*
15. There is no `set-active/` for categories, so `PATCH update-category {is_active}` is the
    only path. Confirm — and confirm it is a true partial, so we can send dirty-only.
16. **Does deactivating a category cascade to its products the way deleting does, or is it
    category-only?** If it silently deactivates every product in the category, a one-click
    row toggle is the wrong control and we will keep it in the drawer behind a confirm.
17. Is `product_count` on the **list rows** as well as the detail? If so the delete dialog
    can pre-fill without an extra fetch.

**F · Images**
18. Per the standing constraints, `upload_to` is inert and only 5 of 17 directories enforce
    a prefix validator. Does `category_images/` enforce one? If not we will validate the
    prefix client-side rather than let a bad path save silently.

---

## Phase 2 · Products, both scopes + picker — 18 routes

**Frontend:** `src/features/products/` (6 files) · `src/features/spares/` (5 files)

### Routes — general (12): ✅ 11 done

- [x] `GET get-products/` — all 6 filters wired, page-past-end 404 handled, `on_deal` staleness mitigated
- [ ] `GET get-all-products/` — **not audited**; the picker endpoint, all three catalog types
- [x] `GET get-product/<uuid>/` · [x] `GET product-stats/`
- [x] `POST add-product/` · [x] `PATCH update-product/` · [x] `DELETE delete-product/`
- [x] `POST set-top-rated/` · [x] `POST set-admin-sourceable/` · [x] `POST set-active/`
- [x] `POST set-catalog-type/` — wired; see C3/C5 and the open question below
- [x] `POST <uuid>/announce-availability/`

### Routes — marine spares (6): ⬜ none audited

- [ ] `GET ` (list) · [ ] `GET stats/` · [ ] `GET <uuid>/`
- [ ] `POST add/` · [ ] `PUT/PATCH <uuid>/update/` · [ ] `DELETE <uuid>/delete/`

### Already fixed (general screen)

Eleven KPI cards · full column set · detail/list merge (was clearing `on_deal` and
`is_express` on every save) · read-only Record section · `update-product` narrowed to its
eight keys and sent dirty-only · `add-product` corrected to `catalog_type` +
`is_top_rated`, `is_express_item` dropped · `base_price` bounds (0.01 floor, 2 dp) ·
`is_active` row toggle via `set-active/` · delete demoted to overflow with a typed
confirm · catalog filter + Reset · SKU-creates-first-variant hint · inherited-inactive
hint on variants.

### Known work

- **Marine parity is the bulk of it.** Same serializer classes means the fixes above
  *should* apply, but `src/features/spares/` is separate frontend code. Each needs
  verifying there: dirty-only PATCH, `base_price` bounds, `is_active` toggle, overflow
  delete + typed confirm, Record section, and no writes to `is_express` / `on_deal`.
- **Marine has no toggle routes** — confirm Spares calls `products/set-top-rated/`,
  `set-admin-sourceable/`, `set-active/` and not something local.
- **`get-all-products/`** — same view family as `get-products/` with all three catalog
  types and identical filters. Quick, but check the pickers handle a `marine_emergency`
  row appearing in a list the management screens exclude.
- **`add-product/` reaches into variants** — an `sku` creates the first variant inline.
  Coordinate with phase 3 rather than duplicating the rules.

### Open questions

- **Moving a marine product *out* of its catalog.** `SetCatalogTypeDialog` asks for a
  category only when moving *into* `marine_emergency`. Moving a marine product to
  regular/express sends no category, so it keeps a marine category FK while its
  `catalog_type` becomes general — which contradicts the map's rule that `Category.scope`
  must match `catalog_type`. Does the backend re-home it, 400, or produce an inconsistent
  record? **Ask before touching the dialog.**

---

## Phase 3 · Variants — 7 routes

**Frontend:** `src/features/variants/` (3 files)

### Routes

- [ ] `GET get-product-variants/`
- [ ] `GET product-variant/` — **query-param lookup, not a path id**
- [ ] `POST add-product-variant/`
- [ ] `PUT/PATCH update-product-variant/<uuid>/`
- [ ] `DELETE delete-product-variant/<uuid>/`
- [ ] `POST set-admin-sourceable/<uuid>/`
- [ ] `POST set-express/<uuid>/`

### Known work

- **`set-express/` moves the parent product between catalogs, in both directions.**
  Flagging a variant express up-cascades the product to `catalog_type=express`;
  un-flagging the *last* one down-cascades it back to regular (or marine per its category
  scope). A variant toggle therefore silently relocates its product, and the UI currently
  says nothing. This is the single most important thing in this pass.
- **`is_express` is not in `UpdateProductVariantSerializer.fields`** — `set-express/` is
  its only writer. No dual-write problem here, unlike products.
- Serves all catalog types; there is no marine/general split at the variant level.

---

## Phase 4 · Express — 3 routes, all read-only

**Frontend:** `src/features/express/` (4 files)

### Routes

- [ ] `GET stats/` · [ ] `GET orders/` · [ ] `GET items/`

### Known work

- **No writers.** Every action on this screen must deep-link into phase 2 or 3 surfaces.
  A control here that appears to write is a bug by construction.
- **The Items tab lists *all* variants of express products on purpose** — that is where
  you go to enable them. `ProductVariantSerializer` uses `exclude`, so `is_express` is on
  every row: render it per row rather than assuming every listed variant is live.
- Cross-check against the customer-facing routes in the map. An item can be present here
  and absent from the sailor's catalog — that gap is [C3](CATALOG_CONFLICTS.md).

---

## Phase 5 · Conflict resolution

Blocked on 1–4. Work [CATALOG_CONFLICTS.md](CATALOG_CONFLICTS.md) end to end: C1–C8 plus
whatever accumulates. Several will need a backend decision rather than a frontend fix.

Current open set: **C1** (stats/list catalog scope) · **C3** (`set-catalog-type/` breaks
the express invariant `set-express/` maintains) · **C4** (marine product split across two
management surfaces) · **C5** (catalog move makes a row vanish silently) · **C6** (delete
vs deactivate, three screens unverified) · **C7** (`marine_emergency` valid on stats,
400 on list) · **C8** (`on_deal` staleness has no invalidation path).
**C2 is resolved.**

---

## Definition of done, per pass

1. Every route in the section has been called or read, and its status recorded above.
2. Local bugs fixed; cross-catalog findings logged, not fixed.
3. `tsc --noEmit` → 0 errors. `biome check` → clean on touched files.
4. This file's checklist and the status table updated.
5. Anything deferred is written down with the reason — not left implicit.
