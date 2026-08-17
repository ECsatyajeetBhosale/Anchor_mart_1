# Catalog Sweep — Phase Plan

Working plan for resolving bugs and gaps across the five catalog surfaces
(**Products, Categories, Express items, Marine emergency spares, Marine emergency
categories**), run as **four passes plus setup and resolution**.

## The three documents

| File | Role | Edited by |
|---|---|---|
| [CATALOG_API_MAP_BACKEND.md](CATALOG_API_MAP_BACKEND.md) | Route inventory, generated from the Django URL resolver. The authority on what exists. | Backend — **mirror only, never hand-edit** |
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
| 2 | Products, both scopes | 18 | ✅ Done |
| 3 | Variants | 7 | ✅ Done |
| 4 | Express | 3 | ✅ Done |
| 5 | Conflict resolution | — | 🟡 10 of 13 closed · 3 need a product decision |

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

- [x] [CATALOG_API_MAP_BACKEND.md](CATALOG_API_MAP_BACKEND.md) mirrored (re-synced 2026-08-17 with the
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
- [x] `GET get-all-products/` — picker now sends `is_active=true`; it excludes soft-deleted rows but **includes inactive ones**
- [x] `GET get-product/<uuid>/` · [x] `GET product-stats/`
- [x] `POST add-product/` · [x] `PATCH update-product/` · [x] `DELETE delete-product/`
- [x] `POST set-top-rated/` · [x] `POST set-admin-sourceable/` · [x] `POST set-active/`
- [x] `POST set-catalog-type/` — wired; see C3/C5 and the open question below
- [x] `POST <uuid>/announce-availability/`

### Routes — marine spares (6): ✅ all audited

- [x] `GET ` (list) — 404 recovery; `on_deal`/`is_top_rated` filters wired; name-only placeholder
- [x] `GET stats/` — **was called with no params**; now shares the list's filter object
- [x] `GET <uuid>/` · [x] `DELETE <uuid>/delete/`
- [x] `POST add/` — **`sku` added**; see below
- [x] `PUT/PATCH <uuid>/update/` — dirty-only, narrowed to the eight keys

### Already fixed (general screen)

Eleven KPI cards · full column set · detail/list merge (was clearing `on_deal` and
`is_express` on every save) · read-only Record section · `update-product` narrowed to its
eight keys and sent dirty-only · `add-product` corrected to `catalog_type` +
`is_top_rated`, `is_express_item` dropped · `base_price` bounds (0.01 floor, 2 dp) ·
`is_active` row toggle via `set-active/` · delete demoted to overflow with a typed
confirm · catalog filter + Reset · SKU-creates-first-variant hint · inherited-inactive
hint on variants.

### What changed

| Fix | Why |
|---|---|
| **`sku` added to marine create** | Omitting it produced a spare with **zero variants** — invisible to every sailor, with no error. Made required here though the API allows its absence |
| Zero-variant warning badge in the table | The only signal an admin gets for spares already in that state |
| Three row toggles wired | `set-top-rated/`, `set-admin-sourceable/`, `set-active/` are catalog-wide; this screen offered **none** of them |
| Stats now sends the list's filters | Third instance of this defect, after products and categories |
| Dirty-only PATCH | Update is literally `UpdateProductSerializer` — same full-row `save()`, same silent drop |
| `base_price` bounds (0.01 floor, 2 dp) | Same shared serializer, so the same validation as products |
| `on_deal` / `is_top_rated` filters wired | Accepted by the marine list and never sent |
| Page-past-end 404 recovery | Same pagination as every other catalog list |
| Transform stopped discarding fields | `is_top_rated`, `admin_sourceable`, `on_deal`, `updated_at` all arrived and were dropped before the table |
| Catalog-move dialog asks for a category **both** directions | marine → regular with no category is a 400; the dialog only asked when moving *into* marine |
| Picker sends `is_active=true` | `get-all-products/` includes inactive products, so the picker offered unfulfillable order lines |
| `limit: 100` → `API_MAX_PAGE_SIZE` in 5 places | The server clamps to 50, so those calls silently fetched fewer than they asked for |

### Not done deliberately

- **`announce-availability/` is still not offered on the Spares screen.** All three
  toggles are wired, but announcing broadcasts to **every customer**. Backend recommends
  exposing it and notes it is guarded (explicit action, 120s dedupe, refuses anything not
  actually orderable) — but flagged it as a product call, so it is left for one.
- **One data row needs cleaning**: `'marine emergency product dumy 1'` (created
  2026-08-04) has zero variants. Backend confirmed it is the only one in their
  environment; **production has not been checked**.

### Logged, not fixed

**[C10](CATALOG_CONFLICTS.md)** — marine → express keeps a marine category, which the
sailor-facing express category list can never show. Same class as C3; decide together.

## Phase 3 · Variants — 7 routes

**Frontend:** `src/features/variants/` (3 files)

### Routes — all 7 audited ✅

- [x] `GET get-product-variants/` — `is_active` filter wired; search is **SKU or product name**, unlike every other list
- [x] `GET product-variant/` — query-param lookup confirmed correct
- [x] `POST add-product-variant/` — payload already exact; SKU-reservation copy added
- [x] `PUT/PATCH update-product-variant/<uuid>/` — dirty-only; `product` deliberately never sent
- [x] `DELETE delete-product-variant/<uuid>/` — cascade reported; only-variant 400 surfaced verbatim
- [x] `POST set-admin-sourceable/<uuid>/` — already correct; inherited state now rendered
- [x] `POST set-express/<uuid>/` — cascade named in the toast; Products caches invalidated

### What changed

| Fix | Why |
|---|---|
| Express toast names the cascade | One SKU toggle moves the **product** between catalogs; the toast said "Variant updated" |
| Products caches invalidated on `set-express/` **and** delete | Both write `product.catalog_type`; neither invalidated Products, so the list and stats went stale |
| Delete toast + confirm copy | Deleting the last express variant now demotes the product too (backend fixed this pass) |
| Dirty-only PATCH | Price changes are **audited**, so re-sending an unchanged price wrote a phantom `PRICE_CHANGED` row |
| `product` kept out of the edit form | It is writable and reparents the variant across products with no catalog check |
| Price floor 0.01 + 2 dp | Same `DecimalField` as `base_price`; `0` was a guaranteed 400 that only appeared on submit |
| Parent catalog shown in the drawer header | Read off the rows, so it visibly changes when a toggle cascades |
| Inherited-sourceable note | A new variant does **not** inherit `admin_sourceable`, so on-under-off is legitimate |
| SKU reservation hint | A deleted variant's SKU is burned; the collision is against a row no screen shows |
| Transform keeps `catalog_type`, `about_product`, timestamps | All arrived and were discarded |

### Logged, not fixed

**[C11](CATALOG_CONFLICTS.md)** burned SKUs · **[C12](CATALOG_CONFLICTS.md)** dual
`admin_sourceable` writers (DECIDED, matches products' top-rated) ·
**[C13](CATALOG_CONFLICTS.md)** the only-variant guard is a count, not a constraint (RC-4).

### D10 closed before it was opened

The escalated question — whether deleting the last variant makes the product invisible —
is guarded server-side with a 400. The zero-variant-by-delete path does not exist, so the
pass-2 `sku` finding was already covered from this end. The zero-variant badge added in
pass 2 remains a live detector because of C13.

### Frontend gaps found in the pre-pass survey — disclose up front

1. **The express toggle never mentions the cascade.** `set-express/` moves the parent
   product between catalogs in both directions, and our handler toasts a generic
   "Variant updated". An operator flips one SKU and the product silently changes shelf.
2. **`setVariantExpress` does not invalidate the Products caches** — only `Variants` and
   `ExpressItems`. Since it writes `product.catalog_type`, the products list and stats go
   stale behind it. `setVariantSourceable` gets this right, which is what makes the
   omission visible.
3. **`UpdateVariantPayload` is a fixed full body** — the same over-send removed from
   products, spares and categories.
4. **The transform drops fields** — `catalog_type`, `about_product`, `created_at` and
   `updated_at` all arrive (the serializer uses `exclude`) and never reach the UI.
5. **Variant price validates `>= 0`**, the same wrong floor products and spares had before
   their real bound (0.01) was confirmed.

### Open questions for backend

**A · The `set-express/` cascade — the headline**
1. Does the response report the product's **resulting `catalog_type`**? The down-cascade
   target depends on the product's category scope (regular vs marine), which the frontend
   cannot predict — so to say "this also moved *X* to Express" or "…back to Regular" we
   need the server to tell us, or we re-fetch the product on every toggle.
2. Is there a flag indicating the cascade actually fired, like `product_cascaded` on
   `set-admin-sourceable/`?
3. Can turning the *last* express variant off ever fail — a product mid-order, on a live
   deal — or is it unconditional?

**B · Variant update contract**
4. Exact `UpdateProductVariantSerializer.fields`. We send
   `{sku, price, attributes, images, is_active}`. Is `admin_sourceable` accepted there too,
   or is its endpoint the only writer as with `is_express`? What about `about_product`?
5. Partial semantics and silent drop of unknown keys, same as products and categories?

**C · Variant create contract**
6. Exact `AddProductVariantSerializer.fields`. We send
   `{product, sku, price, attributes, images}`. Does it accept `is_express`,
   `admin_sourceable`, `is_active`, `about_product`? Is `set-express/` the only writer of
   `is_express` **including** at create time?
7. Is `sku` globally unique here too, with the same field-keyed 400?
8. Does a variant created here inherit `admin_sourceable` from its product, the way
   `add-product/`'s inline variant does?

**D · Variant delete — the mirror of the Phase 2 finding**
9. Soft or hard? Any guard for open orders, carts or live deals?
10. **Does deleting the last variant make the product invisible?** Phase 2 established that
    `browsable_products_qs` requires at least one live variant. If so, deleting the last
    SKU silently removes the *product* from every sailor-facing list — the exact mirror of
    the zero-variant spare, and the confirm dialog has to say so.
11. Does deleting the last *express* variant down-cascade `catalog_type` the way
    `set-express/` does, or does it leave the product in the express catalog with nothing
    express under it?

**E · `get-product-variants/`**
12. Full accepted filter set? We send `page`, `page_size`, `search`, `product`. Does it
    take `is_active`, `is_express`, `admin_sourceable`, `catalog_type`?
13. Does `search` match SKU, product name, or both?
14. Same pagination — default 10, clamp 50, page past end → 404?

**F · Fields and validation**
15. Is variant `price` the same `DecimalField(max_digits=12, decimal_places=2,
    min_value=0.01)` as `base_price`? Our form currently allows 0.
16. `ProductVariantSerializer` uses `exclude`, so a row carries more than we render. Of
    `catalog_type`, `about_product`, `created_at`, `updated_at` — which are worth showing,
    and is anything on there that should **not** be rendered in an admin table?

---

## Phase 4 · Express — 3 routes, all read-only

**Frontend:** `src/features/express/` (4 files)

### Routes — all 3 audited ✅

- [x] `GET stats/` — confirmed **no params by design**; cards relabelled whole-catalog
- [x] `GET orders/` — confirmed an *orders* surface, not a catalog one; nothing to change
- [x] `GET items/` — `is_express` filter wired; visibility column added; 404 recovery

### What changed

| Fix | Why |
|---|---|
| **Sailor-visibility column** | The answer the screen exists to give. Server-computed — three inputs aren't on the payload, so no client rule could be right |
| Same column on the variants drawer | Backend put the fields on that serializer too; shared labels so the two screens can't word it differently |
| `is_express=false` filter | Isolates express-catalog variants nobody flagged — the actionable worklist |
| Typed `set-express/` result | The inline cast hid `product_cascaded`, so the toast claimed a catalog move on **every** toggle |
| Unknown sort tokens dropped | Bad values are silently ignored server-side, so the toolbar showed a sort the rows weren't using |
| Stats cards relabelled "All Express …" | The endpoint takes no filters *by design* — one call serves two tabs |
| 404 page recovery | Most reachable here: flagging the last unflagged variant while filtered empties the page you're on |
| Search placeholder | Matches four fields including description and variant notes, so a hit can be invisible in the row |

### Corrections to our own assumptions

Two of the five visibility conditions I proposed were **wrong**, and backend built the
field rather than let a client-side rule ship:

- **product not sourceable** — not a visibility condition. Sourcing-off stays browsable
  with an unavailable badge. This was the likeliest one to get wrong.
- **marine-category express product** — not invisible either; see the C10 downgrade.
- **missing**: `product.is_internal`, which we had no way to know about.

Hence two separate booleans in the UI: *visible* and *orderable* are different questions.

### Logged

**[C10](CATALOG_CONFLICTS.md) downgraded** — the product is reachable by list and search;
only its category tile is absent. **[C3](CATALOG_CONFLICTS.md) is now detectable in the
UI** via the `not_flagged_express` blocker.

### Frontend gaps found in the pre-pass survey — disclose up front

1. **`getExpressStats` sends no params** — the fourth screen with this shape. It may be
   correct here (the map says the endpoint takes none), which is question A1.
2. **The Catalog tab casts the `set-express/` response inline**
   (`as { product_catalog_type?: string }`) instead of using the result type Phase 3 gave
   it — so it ignores `product_cascaded` and says "moved to X" even when nothing moved.
3. **No `is_express` filter is offered**, so the actionable view — variants of express
   products that are *not* themselves flagged, i.e. the ones invisible to sailors — cannot
   be isolated. Question B6.

The screen already does two things right and they should stay: `isExpress` is rendered
per row with a hint (the C3 case), and the row action routes through
`product-variants/set-express/` rather than pretending Express has a writer.

### Open questions for backend

**A · `express/stats/`**
1. Does it accept the Items tab's filters, or genuinely none? Three screens had cards that
   described a different population than the table beneath them. If express is
   deliberately exempt — because it mixes catalog and order aggregates in one call — we
   will label the cards as whole-catalog rather than wire filters that do nothing.
2. Confirm the key set: `{ items: {9 keys}, orders: {7 keys} }` as we model it.
3. Confirm `total_orders` is the aggregate and its siblings are the breakdown, so the two
   must never be summed.

**B · `express/items/`**
4. Full accepted filter set? We send `page`, `page_size`, `search`, `category_id`,
   `product_id`, `min_price`, `max_price`, `admin_sourceable`, `is_active`,
   `sort_by_price`, `sort_by_popularity`, `sort_by_relevance`.
5. **Can the three sort params combine**, or is only one honoured? We send exactly one, but
   want to know whether that is a constraint or our own convention.
6. Is there an `is_express` filter? This tab exists to enable express on variants, so
   "show me the ones not yet flagged" is its most useful view and we cannot build it.
7. Does `search` match SKU, product name, or both?
8. Same pagination — default 10, clamp 50, page past end → 404?
9. Confirm `admin_sourceable` filters the **effective** value (product AND variant), as our
   type claims, rather than the raw variant column.

**C · Sailor visibility — the point of running this pass last**
10. **Can a row tell us whether a sailor can actually see it?** A variant can be on this
    tab and invisible for at least five reasons: the product is not express
    ([C3](CATALOG_CONFLICTS.md)), the variant is not flagged, either is inactive, the
    product is not sourceable, or the product sits on a marine category
    ([C10](CATALOG_CONFLICTS.md)). Is there one computed field for this, or do we compose
    it client-side — and if we compose it, are those five the complete set?
11. Specifically for C10: does `express/items/` include express products whose category is
    marine-scoped? If so those rows are present in the admin and unreachable in express
    browse, and this screen is the only place that gap is visible.

**D · `express/orders/`**
12. Is this in catalog scope at all? It reads as the Orders screen's sibling, pre-scoped to
    `is_express=True`. Confirm we should treat it as an orders surface that happens to live
    here, and that nothing catalog-shaped is expected of it.

**E · Writers**
13. Confirm the intended pattern is what the tab already does — Express as a read surface
    that acts through `product-variants/set-express/` — and that there is no express-only
    write we should be calling instead.

## Phase 5 · Conflict resolution

**Frontend work complete.** Seven of thirteen conflicts are closed; the remaining six need
a backend or product decision and cannot be resolved from this side.

### Closed

| # | How |
|---|---|
| **C2** | Backend scoped + filter-fixed `category-stats/`; frontend now sends the filters |
| **C4** | Spares screen wired to the three catalog-wide toggles — the namespace split is now invisible to operators |
| **C5** | Catalog dialog warns before a move that changes screens, and asks for a category in both directions |
| **C6** | Delete-vs-deactivate parity verified on all five screens; Spares got overflow + typed confirm |
| **C7** | Guarded by construction — a fixed two-option filter list cannot express the value the list rejects |
| **C12** | Decided: dedicated endpoint for row toggles, PATCH for the drawer save |
| **C8** | Mitigated everywhere (*the global staleness decision is still open*) |

### Closed in the final round

| # | Resolution |
|---|---|
| **C3** | Backend made the invariant asymmetric — leaving express clears variant flags, entering reports counts. Dialog warns at the point of decision |
| **C11** | Accepted (the reservation protects order history), with the message fixed to name live vs deleted, and a 100-char cap that removes a former 500 |
| **C13** | Row lock — `select_for_update(of=("self",))` under `transaction.atomic()` |
| **C8** | `deal_ends_at` turns the mitigation into a scheduled refetch at the boundary, on Products |

### Still needs a decision — cannot be closed frontend-side

| # | Question | Owner |
|---|---|---|
| **C1** | Should `product-stats/` take the list's catalog scope, or keep the labelled all-catalogs total? | Backend |
| **C8** | Spares/Express have no `deal_ends_at`, and deal *start* boundaries aren't covered. Extend the field, or accept an "as of" marker? | Product |
| **C9** | Category deactivate doesn't take products off sale; delete does. Change the behaviour or keep the copy? | Product |
| **C10** | Should the express category list span both scopes? (downgraded — the product is reachable, only its tile is not) | Backend |

### Definition of done for this phase

Each remaining item either has an agreed resolution built, or is explicitly accepted with
the reasoning recorded. An accepted conflict is a closed one — what this log must not
contain at the end is an item nobody decided about.
