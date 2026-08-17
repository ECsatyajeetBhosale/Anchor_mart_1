# Category Flat Taxonomy (Build A) — Frontend Plan

Plan of record for removing the parent/child category concept from the admin panel,
per [`help folder/CATEGORY_FLAT_TAXONOMY_BUILD_A_API.md`](help%20folder/CATEGORY_FLAT_TAXONOMY_BUILD_A_API.md)
(product decision, 2026-08-17).

**Status:** ✅ Phases A–F implemented 2026-08-17. `tsc --noEmit` clean, `biome check` clean on all
20 touched files, production build green. Browser QA (§4 Phase F steps 2–3) still to run.

---

## 1. What the three help-folder docs actually ask for

I read all three against the current frontend. Only one describes work that is not already done.

| Doc | Verdict |
|---|---|
| `CATEGORY_FLAT_TAXONOMY_BUILD_A_API.md` | **NEW — this is the whole job.** `parent` / `parent_name` are gone from all 9 admin category endpoints. |
| `CATALOG_TYPE_MARINE_EMERGENCY_API.md` | **Already integrated** in the Aug 11–17 catalog sweep (see [CATALOG_PHASES.md](CATALOG_PHASES.md), passes 1–4 ✅). Contains 3 stale claims — see §2. |
| `CATALOG_TYPE_API_POSTMAN.md` | **Already integrated.** It is a Postman generation spec, not a frontend brief. Repeats two of the same stale claims. |

Spot-checks confirming the catalog_type work is live, not pending:

- `set-catalog-type/<id>/` wired — [apiEndpoints.ts:31](anchor-mart-admin/src/lib/apiEndpoints.ts#L31)
- `catalog_type` is the product-level enum; `is_express_item` survives only as an
  orders-domain field and in explanatory comments — [product.types.ts:52](anchor-mart-admin/src/features/products/types/product.types.ts#L52)
- `emergency` in product stats — [product.types.ts:162](anchor-mart-admin/src/features/products/types/product.types.ts#L162)
- `is_emergency` on order rows, filters and both admin lists — [orderApi.ts:141](anchor-mart-admin/src/features/orders/api/orderApi.ts#L141), [OrdersPage.tsx:397](anchor-mart-admin/src/features/orders/components/OrdersPage.tsx#L397)

So the scope is **categories only, both scopes**. No product, variant, express or order work.

---

## 2. Doc conflicts — resolve before coding, do not implement literally

Three statements in `CATALOG_TYPE_MARINE_EMERGENCY_API.md` contradict both the newer flat-taxonomy
doc and [CATALOG_API_MAP_BACKEND.md](CATALOG_API_MAP_BACKEND.md), which is generated from the
Django URL resolver and is the authority on what exists.

### D1 — "`/superadmin/emergency-spares/**` is gone" is stale ⚠️ highest damage if believed

`CATALOG_TYPE_MARINE_EMERGENCY_API.md` §A lists all `emergency-spares/**` routes as 404.
Contradicted by:

- `CATALOG_API_MAP_BACKEND.md` §2 and §4 — **12 live routes** under that base
- the flat doc itself — endpoints **6–9** are `emergency-spares/categories/**`

**Reading:** the §A row means the *old* emergency-spare **item catalog / types / requests** flow
(the `add-emergency-spairs` era), not the current scope-partitioned category and product doors.
Its own parenthetical says "(item catalog, types, requests)".

**Action:** none. Do **not** touch [features/spares/](anchor-mart-admin/src/features/spares/) or
the emergency-category endpoints. Worth one confirmation from backend, because acting on the
literal wording would delete two working screens.

### D2 — `get-categories/` does not take `catalog_type` or `scope`

§1.1 says it accepts both. The flat doc §1 lists the real params: `search`, `is_active`, `page`,
`page_size`. Catalog filtering lives on a **separate** route, `get-categories-by-catalog-type/`,
which takes `regular | marine_emergency` only — `?catalog_type=express` is a deliberate 400.

**Action:** none. We already send only `marine_emergency` on the by-catalog-type route
(verified in phase 1) and never send `catalog_type` to the plain list.

### D3 — `scope` is not writable

§E claims `scope` can be sent on `add-category/` / `update-category/`. Both the same doc's §1.2/§1.3
and the flat doc contradict it; the flat doc records fixing exactly this doc bug.

**Action:** none. Our forms already treat `scope` as read-only and neither offers a taxonomy move.

---

## 3. What is broken today

The parent picker was added deliberately in phase 1 — it was writable and server-validated at the
time. As of the flattening it is a control that silently does nothing:

- **Writes are ignored, not rejected.** A `parent` in a create/update body is dropped by DRF's
  unknown-key default. **No 400.** An admin picks a parent, saves, sees a success toast, and the
  value is gone.
- **Reads return `undefined`.** `row.parent_name` no longer exists, so the Parent column renders
  `—` on every row, and the "Parent deleted" badge can never fire.
- Six network requests per session fetch a whole taxonomy that now feeds nothing.

Both screens are affected identically.

---

## 4. The work

Ten files across two mirrored features, plus shared copy. Ordered so the type layer breaks first
and `tsc` walks us to every call site.

### Phase A — contract layer (types + schemas + API docs)

| File | Change |
|---|---|
| [category.types.ts](anchor-mart-admin/src/features/catalog/types/category.types.ts#L16) | Drop `parent` / `parent_name` from `Category`; drop `parent` from `AddCategoryPayload` (L84) and `UpdateCategoryPayload` (L102); fix the `empty` doc comment (L57) that explains child-category counting |
| [category.schema.ts](anchor-mart-admin/src/features/catalog/schemas/category.schema.ts#L37) | Remove the `parent` field + its comment from `categoryAddSchema`; `categoryUpdateSchema` inherits the fix |
| [emergencyCategory.types.ts](anchor-mart-admin/src/features/emergency-categories/types/emergencyCategory.types.ts#L18) | Same three removals (L18, L20, L81, L96) |
| [emergencyCategory.schema.ts](anchor-mart-admin/src/features/emergency-categories/schemas/emergencyCategory.schema.ts#L37) | Same |
| [categoryApi.ts:14](anchor-mart-admin/src/features/catalog/api/categoryApi.ts#L14) · [emergencyCategoryApi.ts:14](anchor-mart-admin/src/features/emergency-categories/api/emergencyCategoryApi.ts#L14) | Comment-only: the "no `parent`" note now refers to a field that does not exist anywhere. Reword or drop |

**Decision applied:** remove `parent` from the types outright rather than marking it optional for
Build B. An optional field lets code read `undefined` without a compile error, which is the exact
failure mode we are fixing. Build B restores it as a serializer-only backend change plus the
mirror of this commit — git history is the recovery path, and the flat doc already carries a
backend re-enable checklist.

### Phase B — table column

| File | Change |
|---|---|
| [categoryColumns.tsx:82-110](anchor-mart-admin/src/features/catalog/components/categoryColumns.tsx#L82) | Delete the `parent` column; remove `liveCategoryIds` from `UseCategoryColumnsOptions` (L45) and the destructure (L59) |
| [emergencyCategoryColumns.tsx:85-105](anchor-mart-admin/src/features/emergency-categories/components/emergencyCategoryColumns.tsx#L85) | Same |

Both tables go 6 columns → 5 (Category, Scope, Products, Status, Actions). Column widths need a
look after removal — Scope and Products get the freed space.

### Phase C — forms (4 drawers)

For each of `CategoryAddDrawer`, `CategoryEditDrawer`, `EmergencyCategoryAddDrawer`,
`EmergencyCategoryEditDrawer`:

1. Delete the parent `FormField` + `Controller` + `DropdownSelect` block
   ([CategoryAddDrawer.tsx:137-156](anchor-mart-admin/src/features/catalog/components/CategoryAddDrawer.tsx#L137), and the three mirrors)
2. Delete `parentOptions` and its `useMemo`
3. Delete the options query — `useGetCategoriesQuery({ limit: 50 }, { skip: !isOpen })` and the
   emergency twin. **4 requests removed**
4. Remove `parent` from the defaults object and from the payload builder
   (`parent: formData.parent || null` on add; `if (dirtyFields.parent) …` on edit)
5. Remove `"parent"` from the field-keyed error allow-list `["name","description","image","parent"]`
   in all four — a `parent` key can no longer come back from the server

### Phase D — pages

| File | Change |
|---|---|
| [CategoriesPage.tsx:83-99](anchor-mart-admin/src/features/catalog/components/CategoriesPage.tsx#L83) | Delete the whole-taxonomy query, `allCategories`, and the `liveCategoryIds` memo; drop the prop at [L211-223](anchor-mart-admin/src/features/catalog/components/CategoriesPage.tsx#L211). Verified: nothing else on the page reads them |
| [EmergencyCategoriesPage.tsx:88-101](anchor-mart-admin/src/features/emergency-categories/components/EmergencyCategoriesPage.tsx#L88) | Same |

**2 more requests removed** — 6 total, and both pages lose a `PAGE_SIZE_MAX` fetch on every load.
Watch for imports that go unused here (`PAGE_SIZE_MAX`, `useMemo`, the `Category` type).

### Phase E — copy

[messages.ts](anchor-mart-admin/src/lib/messages.ts#L2239) — delete from `CATEGORIES` (L2239-2251)
and `EMERGENCY_CATEGORIES` (L2371-2375): `PARENT_DELETED`, `PARENT_LABEL`, `NO_PARENT`,
`PARENT_HINT`, and `COLUMNS.PARENT` (L2274, L2390).

`PARENT_HINT` currently reads *"Organises the admin list. Customers see a flat category list either
way."* — that sentence is now false in its first half and redundant in its second.

### Phase F — verify

1. ✅ `tsc --noEmit` clean, `biome check` clean (20 files), `npm run build` green.
   The only errors the removal surfaced were the four predicted unused symbols —
   `useMemo` and `PAGE_SIZE_MAX` on both pages — now deleted.
2. ⬜ Manual, **both screens**: create with no parent control → 201; edit → 200; table renders 5
   columns; no console noise; network tab shows the taxonomy fetches gone
3. ⬜ Confirm no request body still carries `parent` (it would be silently accepted, so this will
   not show up as an error — it has to be read off the wire). The type layer now makes it
   unconstructible, so this is a confirmation rather than a hunt.

### What shipped

12 files. Beyond the 10 planned, `navigation.ts` (unrelated, same session) and the two pages'
unused-constant cleanup.

| Area | Files |
|---|---|
| Types | `category.types.ts`, `emergencyCategory.types.ts` — `parent`/`parent_name` off the read model, `parent` off both write payloads |
| Schemas | `category.schema.ts`, `emergencyCategory.schema.ts` — `parent` field dropped; update schemas inherit |
| Columns | `categoryColumns.tsx`, `emergencyCategoryColumns.tsx` — column, `liveCategoryIds` option and the now-unused `Badge` import gone; 6 columns → 5 |
| Drawers | 4 files — picker, `parentOptions`, options query, defaults, payload key and the `"parent"` error key all removed |
| Pages | `CategoriesPage.tsx`, `EmergencyCategoriesPage.tsx` — whole-taxonomy query, `liveCategoryIds` memo and prop, `PAGE_SIZE_MAX` |
| Copy | `messages.ts` — `PARENT_DELETED`, `PARENT_LABEL`, `NO_PARENT`, `PARENT_HINT`, `COLUMNS.PARENT` × 2 taxonomies; the two `EMPTY_CATEGORIES` notes reworded off child-category counting |

**6 network requests removed** — one whole-taxonomy fetch per page load on each screen, plus one
per drawer open across the four drawers.

---

## 5. What is deliberately not changed

| Kept | Why |
|---|---|
| `features/spares/` and all `emergency-spares/**` calls | D1 — the "gone" claim is stale |
| `scope` field, column and read-only handling | Unaffected by flattening |
| Category delete cascade copy + typed confirm | Phase 1 work, still correct |
| `get-categories-by-catalog-type/` wiring | Unaffected; still `regular | marine_emergency` |
| C9 (deactivate vs delete blast radius) | Still open, still a product decision — unrelated |

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Silent-ignore means a missed `parent` in a payload never errors | Phase F step 3 reads the actual request bodies rather than trusting a green save |
| The two features are mirrors; fixing one and not the other is the standing phase-1 failure mode | Every phase above lists both files side by side; review as pairs |
| A row that still has a parent in the DB | Backend serialises it flat and returns 200 — nothing for us to handle |
| Build B reversal | Backend checklist exists in the flat doc; our side is one revert of this commit |

---

## 7. Open question for backend

**One only, D1:** confirm `/api/superadmin/emergency-spares/categories/**` and
`/api/superadmin/emergency-spares/products/**` are live. The URL map and the flat doc both say yes;
`CATALOG_TYPE_MARINE_EMERGENCY_API.md` §A says no. I am proceeding on **yes** — the map is generated
from the resolver and the flat doc post-dates the marine doc — but the downside of being wrong here
is two dead screens, so it is worth one message.

This does not block phases A–F: nothing in the parent removal depends on the answer.
