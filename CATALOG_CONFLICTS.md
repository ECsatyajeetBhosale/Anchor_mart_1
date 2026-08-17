# Catalog Conflicts Log

Cross-catalog conflicts found while auditing **Products, Categories, Express items,
Marine emergency spares, Marine emergency categories**.

These are deliberately **not fixed as they are found**. Each one touches more than one
catalog, so fixing it inside a single screen's pass tends to move the inconsistency
rather than remove it. They are collected here and resolved together at the end.

**Status key** — `OPEN` (recorded, not yet decided) · `ASKED` (question with backend) ·
`DECIDED` (resolution agreed, not yet built) · `RESOLVED` (built and verified).

**Scope note.** A bug inside one catalog is not a conflict — it gets fixed in that
catalog's pass. This file is only for disagreements *between* catalogs: two screens
that describe the same record differently, one write path that changes another
screen's contents, or one word that means different things in two places.

---

## Standing constraints — read before every pass

From backend, 2026-08-17. These are **not** gaps to fix. Treating any of them as a bug
is the mistake this list exists to prevent.

| Constraint | What it means here |
|---|---|
| **Catalog serializers are shared customer+admin and use `exclude`** | Any new model field leaks to sailors by default. Pin new fields explicitly. |
| **`purchase_count` is internal ops data** | Never customer-facing. It is on the admin table by design; do not propagate it outward. |
| **`admin_sourceable=False` is overloaded** | It means both "cannot be sourced" *and* "hidden special-request quote product". Any listing that surfaces non-sourceable items **must exclude quotes**, or it leaks one sailor's private quote to everyone. |
| **The waitlist model/service/views are dormant by design** | Build A shipped the manual announce; the waitlist is Build B. They look unwired because they are. |
| **The demo dataset is deliberately imperfect** | 50 products, 49 live, 46 orderable. The soft-deleted and unsourceable fixtures are fixtures. |
| **S3/CDN paths are unreachable** (no client credentials) | The `DEBUG=False` branch describes a target state. Do not test against it. |
| **`upload_to` is inert on every image field** | The client posts a path string, so the serializer prefix validators are the only real control — and only 5 of 17 directories enforce one. |
| **OTP logic is frozen** | Out of catalog scope; stated as a standing rule. |

---

## Started

2026-08-17. Pass order, scope and per-route status live in
[CATALOG_PHASES.md](CATALOG_PHASES.md) — four passes, not five, because categories are
one model with two doors and general/marine products are one view family with two
`CATALOG_TYPES` tuples. Route inventory is [CATALOG_API_MAP_BACKEND.md](CATALOG_API_MAP_BACKEND.md).

Products (general) is partially complete from the pre-plan work; the marine half of that
pass, and all of the other three, have not started.

---

## C1 · `product-stats.total` counts three catalogs, `get-products` serves two

**Status:** OPEN · **Catalogs:** Products, Marine emergency spares

`product-stats/` returns `total: 50` spanning regular + express + marine_emergency,
while `get-products/` returns 36 — the general catalog only, with no indication that
anything is missing. The 14 marine-emergency products live on the Spares screen with
their own endpoint.

Currently mitigated in the UI by labelling the card *"Total Products · all catalogs"*
and giving the three catalog-type counts their own cards. That is honest but it is a
caption over a mismatch, not a fix.

**Options:** (a) `product-stats/` takes the same catalog scope the list has, so the
card follows the table; (b) leave it and keep the labels; (c) split into a scoped and
an all-catalogs figure with both shown.

---

## C2 · `category-stats/` counts both taxonomies over a single-scope table

**Status:** DECIDED — backend fixing before pass 1 · **Catalogs:** Categories, Marine
emergency categories

**Answered 2026-08-17, and narrower than first recorded.** Categories are **one model**
with a `scope` field; the two namespaces are scope-locked doors into one table. They
cannot fight: scope is set by the view class, never read from the request body, each door
404s on a cross-scope id, and scope is not writable on update — so a category cannot
change taxonomy. Uniqueness is `(name, scope)` among live rows, so the same name may
legally exist in both taxonomies.

The actual defect is confined to one view. `CategoryStatsView` aggregates
`Category.objects.filter(is_deleted=False)` with **no scope filter**, while the list
beneath it is `scope=general`. Its marine twin is correctly scoped. So the general
Categories screen shows cards counting both taxonomies over a table showing one. It also
ignores the list's `search` / `is_active` filters — the identical defect `ProductStatsView`
was fixed for on 2026-08-14 and the category twin was missed.

`product-stats/`'s category counts are **not** part of this: they are deliberately global
and explicitly labelled per scope (`general_categories` / `marine_emergency_categories`).
Only `category-stats/`'s unlabelled total on a scoped screen is wrong.

**RESOLVED backend-side 2026-08-17.** `BaseCategoryStatsView` now scopes to one `SCOPE`
and runs `_apply_category_filters` — the *same* function the list runs, so one definition
governs both and a filter cannot narrow the table while the cards describe a different
population. The marine twin was a standalone copy that happened to be correct; it was
collapsed into the same base class rather than left as a second implementation free to
diverge again. Both stats endpoints now behave identically: scoped, filter-following, and
400 on bad filter input exactly as the list is. Four tests added, including
`test_stats_exclude_marine_categories` and a card-vs-table agreement test.

`total` shrinks. For a whole-taxonomy figure use `products/product-stats/`, whose
`general_categories` / `marine_emergency_categories` are deliberately global and labelled
per scope.

**Remaining frontend work (pass 1):** confirm the cards follow the list's filters, and
that no copy on either categories screen promises an all-scopes number.

---

## C3 · `set-catalog-type/` breaks the express invariant that `set-express/` maintains

**Status:** ✅ **RESOLVED — asymmetrically, by design** (backend + frontend, pass 5) ·
**Catalogs:** Products, Variants, Express items

The resolution is deliberately **not** "make `set-catalog-type/` cascade like
`set-express/`", because the two directions are not symmetrical problems:

- **Leaving express** now clears `is_express` on every live variant, in the same
  transaction as the `catalog_type` write. This kills two bugs at once: the stale
  per-variant label, and the silent *resurrection* where moving a product back onto the
  express shelf brought its old flags with it.
- **Entering express** flags nothing, and should not — no machine knows which SKUs are
  genuinely express-deliverable. Instead the response reports
  `express_variants: { flagged, live_total, unflagged_by_this_call }`, so the stranded
  state (`flagged: 0` on an express product) is **named at the point of decision** rather
  than discovered later on the Express screen.

Frontend: the catalog dialog reports the un-flag count when leaving, and warns explicitly
when a move onto the express shelf leaves nothing flagged. The mutation also invalidates
the variant and express caches, since one product-level write now moves N variant rows.

Backing this up, pass 4 made the state independently visible: `is_sailor_visible` plus the
`not_flagged_express` blocker surface it on both the Express and variants screens. So the
gap is now caught at the move, and caught again if it is ever reached another way.

**Answered 2026-08-17: the two express flags are not alternatives, they compose.**

| Flag | Level | Means |
|---|---|---|
| `Product.catalog_type == "express"` | product | which shelf the product sits on |
| `ProductVariant.is_express` | variant | which of its variants are express-deliverable |

A sailor sees an item under Express **iff both**, plus the usual liveness/sourceable
gates. Neither is derived from the other, so the admin must present both with distinct
labels — *"in the express catalog"* (product) vs *"express-deliverable"* (variant).

**The confirmed bug is one-directional.** `set-express/` maintains the invariant both
ways: flagging a variant express up-cascades the product to `catalog_type=express`, and
un-flagging the *last* express variant down-cascades the product back to `regular` (or
`marine_emergency` per its category scope). `set-catalog-type/` does **not** — it writes
`catalog_type` alone.

So moving a product to Express from the Products screen produces a product that **appears
on the admin Express Items tab and is invisible to sailors**, with no warning. The
express *category* list mirrors the same rule, so such a product does not hold its
category open either.

Two facts for the UI:
- The Express Items tab lists **all** variants of express products on purpose — that is
  where you go to enable them. `ProductVariantSerializer` uses `exclude`, so `is_express`
  is on every row; render it per row rather than assuming every listed variant is live.
- `is_express` is not in `UpdateProductVariantSerializer.fields`, so `set-express/` is
  its only writer. No dual-write problem at the variant level, unlike products.

**Candidate resolutions:** (a) backend cascades in `set-catalog-type/` too; (b) the
catalog dialog warns and offers to flag variants; (c) the Products screen shows an
"express catalog, no express variants" warning state. Decide with C5 — same dialog.

Terminology note, unchanged: `Product.is_express` is a serializer alias for
`catalog_type == express`, and `?is_express=` on the products list/stats is a legacy
alias for `catalog_type=express`. So one param name spells the product-level notion here
and the variant-level one on the express endpoints.

---

## C4 · A marine emergency product is edited in one place and toggled in another

**Status:** ✅ **RESOLVED** (frontend, pass 2) · **Catalogs:** Products, Marine emergency
spares

The split is real server-side and is not going away — CRUD lives under
`/emergency-spares/products/…` while the three toggles are catalog-wide under
`/products/…`. But it was only a *conflict* because the Spares screen offered **none** of
the toggles, so a spare's flags could only be reached from a different screen's endpoints
with no UI at all.

Pass 2 wired `set-top-rated/`, `set-admin-sourceable/` and `set-active/` onto the Spares
rows, calling the catalog-wide routes with a marine id. The operator now sees one screen
that manages the whole record; the two-namespace split stays a backend implementation
detail, which is what it should have been all along.

They are the same underlying model — `products/set-catalog-type/` moves a record
between them — but:

- read/create/update/delete go through `/emergency-spares/products/…` (own screen,
  own serializer)
- `set-top-rated/`, `set-admin-sourceable/` and `announce-availability/` are
  **catalog-wide** and live under `/products/…`; the emergency screen has no toggle
  routes of its own and must call the shared ones (confirmed by backend 2026-08-17)

So one record's fields are split across two management surfaces. Whether the Spares
screen currently offers those toggles at all is unverified.

---

## C5 · Moving a catalog makes a product vanish from the screen you moved it on

**Status:** ✅ **RESOLVED** (frontend, pass 5) · **Catalogs:** Products, Marine emergency
spares, Express items

The disappearance is correct behaviour — the two catalogs are different screens backed by
different endpoints — so the fix was never to prevent it, only to stop it reading as a
failed save. The dialog now says where the product is going *before* the move, and only
when the destination actually changes screens: regular ↔ express share the Products list,
so no warning fires there.

The related 404-on-edit risk noted here is also gone: the products list, detail, update
and delete views 404 on a marine record, and pass 2 made the dialog ask for a category in
both directions, so the move that produced a stale row now completes correctly rather than
half-failing.

`set-catalog-type/` to `marine_emergency` removes the row from the Products table
(scoped to regular + express) and inserts it into Spares. The dialog does not say so.
The same move in reverse takes a record out of Spares.

Related: the products list/detail/update/delete views are scoped to regular + express
and **404 on a marine record**, while the toggles are not. A stale Products row whose
catalog changed underneath will therefore 404 on edit but succeed on toggle.

---

## C7 · `?catalog_type=marine_emergency` is a 400 on the list, valid on the stats

**Status:** ✅ **RESOLVED — guarded by construction** (frontend, pass 2) ·
**Catalogs:** Products, Marine emergency spares

The asymmetry is real and stays: `product-stats/` accepts all three catalog types,
`get-products/` rejects the third. It cannot bite here because the Products filter bar is
driven by a fixed two-option list that cannot express `marine_emergency`, and the same
`listFilters` object feeds both calls — so the list and the stats can only ever be sent a
value the list accepts.

The marine list rejects `catalog_type` outright (it is forced), and the spares client
never sends it. Documented on both param types so a future filter cannot reintroduce the
gap by widening the options list alone.

`get-products/` rejects `marine_emergency` (that catalog has its own endpoint), while
`product-stats/` accepts all three values. The two endpoints therefore take *almost*
the same filter set — close enough that passing one screen's state to both looks safe,
and it is only safe because the filter bar cannot offer the third value.

Harmless on the Products screen as built. It becomes a live conflict the moment
anything wants "stats scoped to marine emergency", because the natural move — reuse
the products filter state — is exactly the one that breaks.

Related: `?is_express=true` is a legacy alias for `catalog_type=express` on both
endpoints, so there are two spellings of one filter, and `is_express=false` means
"regular only" here rather than "not express" in general. See also [C3](#c3--express-means-three-different-things).

---

## C8 · `on_deal` changes without a write, so no cache invalidation can track it

**Status:** OPEN · **Catalogs:** Products, (Express items — unverified)

`on_deal` is an EXISTS against a deal's live start/end window. A row enters or leaves
the Deal Products tab when a clock passes, with no write to the product and nothing for
RTK Query to invalidate.

**Mitigated on every affected screen** (pass 5): `refetchOnMountOrArgChange` now covers
the Products list and stats, the Spares list and stats, and the Express catalog. Express
gets it for a second reason — its rows carry server-computed sailor visibility, which
depends on product state that screen never writes, so another admin's edit changes what
those rows should say with nothing local to invalidate.

**Now a real fix on the products list** (pass 5). Backend added `deal_ends_at` to
`get-products/` rows — an ISO timestamp, null when not on deal, the earliest window end
when deals overlap. `useDealBoundaryRefetch` schedules **one** refetch at that instant: no
polling, and no staleness inside the window, because by definition nothing changes until
the boundary is crossed. It is deliberately machine-readable rather than a display string,
so it pre-commits nothing about how the state is presented.

**Still open elsewhere.** Spares and Express have no equivalent field, so both keep the
`refetchOnMountOrArgChange` mitigation. And a "deal starting" boundary is not covered —
only expiry. Whether the remaining screens get the same field, or the product prefers an
"as of" marker or push, is still a product decision.

---

## C10 · A marine-category express product is absent from express **category** browse

**Status:** OPEN — **downgraded 2026-08-17** · **Catalogs:** Products, Marine emergency
spares, Express items, Categories

**Originally logged as "invisible in express browse". That was too strong.**
`ExpressProductListView` filters on `catalog_type` alone, with no category-scope check —
so a sailor **does** find the product, through the flat express list and by search. Only
the express **category** list filters `scope=GENERAL`, so what is unreachable is the
product's category tile, not the product.

These rows correctly report `is_sailor_visible: true`, and there is a backend test pinning
that so nobody later "fixes" it into a blocker.

How it arises, unchanged: **marine → express** with no category is a 200 by design —
`allowed_category_scopes_for_catalog_type` treats express as an operational overlay valid
for both scopes — leaving `catalog_type=express` on a product whose category is still
marine. (**marine → regular** with no category is a 400, and pass 2 fixed the dialog to
ask for one in that direction.)

So the residue is narrow: a product browsable by list and search but not filed under any
tile a sailor can reach. Related to
[C3](#c3--set-catalog-type-breaks-the-express-invariant-that-set-express-maintains) only
in origin — both come from `set-catalog-type/` — not in severity.

**Candidate resolutions:** (a) the express category list spans both scopes; (b) moving to
express from marine also asks for a general category; (c) accept it and surface the
category gap on the Express screen. Lower priority than first recorded.

---

## C11 · A soft-deleted variant's SKU is burned permanently

**Status:** ✅ **RESOLVED — accepted, with the message fixed** (backend + frontend, pass 5) ·
**Catalogs:** Variants, Products, Marine emergency spares

**The reservation stays: it protects order history.** That is the right call — releasing a
SKU would let a new variant inherit the identity of one that appears on historical orders.
What was actually broken was the *explanation*, not the behaviour.

`ProductVariant.sku_conflict()` now classifies a collision as live / deleted / none, and
all three write paths report the real reason — so "this SKU belonged to a deleted variant"
is said out loud instead of presenting as a conflict against a row that appears on no
screen.

Backend found two things while fixing it: the update path could never have reached the new
message, because DRF's auto-generated `UniqueValidator` is field-level and short-circuited
`validate_sku` with its own generic wording; and an over-long SKU reached the column and
surfaced as a **500**, now capped at `max_length=100` on both add and update.

Frontend: the 100-character cap is enforced on all three SKU inputs (variant form, product
add, spare add) so the former 500 is unreachable, and the hint is now just *"Unique across
all variants, including deleted ones"* — the specific reason arrives field-keyed on the
input.

SKU uniqueness is global across all variants and the check **does not exclude
soft-deleted rows** (the model column is `unique=True`). So deleting a variant reserves
its SKU forever: re-creating `TWO-B` after deleting `TWO-B` is a 400.

From the admin's side that is a conflict against a row that appears on no screen — every
list, detail and stats queryset filters `is_deleted=False`. An operator tidying SKUs hits
a phantom collision and has nowhere to look for the cause.

**Handled in pass 3 by copy only**: the variant form's SKU hint says *"Unique across all
variants. A deleted variant keeps its SKU reserved,"* and the delete confirm repeats it.
That stops the surprise; it does not give the SKU back.

Reaches products because `add-product/`'s inline `sku` hits the same global check, so the
same phantom collision can block **product creation**, where the copy currently says only
"Must be unique."

**Candidate resolutions:** (a) exclude soft-deleted rows from the uniqueness check;
(b) release the SKU on delete by suffixing the deleted row; (c) leave it and keep the
copy. (a) and (b) are backend calls.

---

## C12 · `admin_sourceable` has two writers on variants — decided, not a defect

**Status:** DECIDED · **Catalogs:** Variants

`admin_sourceable` is both on `UpdateProductVariantSerializer.fields` and served by its
own `set-admin-sourceable/` endpoint — the same dual-writer shape as products'
`is_top_rated`, which was reviewed in the products pass and accepted.

Recorded so it is not rediscovered as a bug in a later pass. The resolution is the same
as products': **the dedicated endpoint for row toggles, the PATCH for the drawer's
multi-field save.** The dedicated one writes a single column and returns a small
response; it also carries the up-cascade reporting (`product_cascaded`) that the PATCH
does not.

Contrast `is_express`, which is **not** on the update serializer at all — `set-express/`
is genuinely its only writer, which is what lets that cascade be a single source of truth.

---

## C13 · The only-variant delete guard is a count, not a constraint

**Status:** ✅ **RESOLVED** (backend, pass 5) · **Catalogs:** Variants, Products

`DeleteVariantView` now wraps the guard and the delete in `transaction.atomic()` and reads
the sibling count under `select_for_update(of=("self",))` on the parent product, so two
concurrent deletes of the last two variants can no longer both see a survivor.

Worth recording for whoever meets it next: a bare `select_for_update()` fails on Postgres
here — `Product.category` is nullable, so `select_related("category")` emits a LEFT OUTER
JOIN and *"FOR UPDATE cannot be applied to the nullable side of an outer join"*.
`of=("self",)` locks the product row only and keeps the join, which the demotion needs in
order to pick the target shelf.

The zero-variant badge added in pass 2 stays, but its meaning narrows: it now detects
**legacy** rows rather than a state new work can still produce.

Deleting a product's only variant is refused with a 400, which is what stops the delete
path from producing a zero-variant, sailor-invisible product.

But the guard is an **application-level count**, not a database constraint or a row lock.
Two concurrent deletes of the last two variants can each see one surviving sibling and
both proceed, leaving the product with none. This is the RC-4 pattern the codebase
already tracks; backend added the note in place rather than fixing it, since the fix is a
constraint or a lock.

Nothing the frontend can do about it — recorded so the zero-variant badge added in pass 2
is understood as a **detector for a state that is still reachable**, not a legacy display.

---

## C9 · Category deactivation doesn't take products off sale — but deleting does

**Status:** OPEN — confirmed by backend · **Catalogs:** Categories, Marine emergency
categories, Products, Marine emergency spares

Verified 2026-08-17. The two category write paths have **inverted** blast radii relative
to how safe they look:

| Action | Cascades to products? | Reversible? | Actually takes the shelf down? |
|---|---|---|---|
| Deactivate | No | Yes, trivially | **No** |
| Delete | Yes — deactivates every live product | **No** — no restore endpoint | Yes |

Deactivating hides the tile: the sailor's category list filters `is_active=True`. But
their **product** list never joins category liveness — `browsable_products_qs` filters
`Product` fields only — so the products stay visible and purchasable through the product
list, search and saved items. Backend verified a sailor still gets "Rice" back after its
category was deactivated.

So the safe, reversible, one-click action **does not do the thing an operator means by
it**, and the irreversible one does. That is the exact inverse of the safe/dangerous
framing built for products, where deactivate genuinely is the softer form of delete.

**Handled in pass 1 by wording, not by behaviour**: the toggle's copy says *"hides this
category from browse — its products stay on sale"*, and the drawer carries the same
caveat. That stops the control lying; it does not give operators the action they want.

**Candidate resolutions:** (a) the sailor's product list joins category liveness, making
deactivate mean what it looks like — cleanest, but changes customer-visible behaviour and
is the same shape as the GA4 hole the delete cascade's own docstring warns about;
(b) an explicit "deactivate category and its products" action that does the cascade
without the delete; (c) leave as-is and rely on copy. Needs a product decision, not a
frontend one.

---

## C6 · `is_active` vs delete asymmetry — fixed for Products, unverified elsewhere

**Status:** ✅ **RESOLVED** (frontend, passes 1–5) · **Catalogs:** all five

Verified and brought to parity on every screen that deletes:

| Screen | Row toggle | Delete behind overflow | Typed confirm |
|---|---|---|---|
| Products | ✅ pass 2 | ✅ | ✅ |
| Categories (both doors) | ✅ pass 1 | ✅ | ✅ |
| Marine spares | ✅ pass 2 | ✅ pass 5 | ✅ pass 5 |
| Variants | active flag in form | — guarded server-side | — |
| Express items | — read-only screen | — | — |

Variants are the deliberate exception: deleting a product's only variant is refused with
a 400, so the destructive path is already guarded where it matters, and the screen has no
row-level delete to demote. Express writes nothing at all.

For Products (resolved 2026-08-17): delete is a soft delete with **no restore
endpoint** and every admin queryset filters deleted rows, so it is terminal and hides
its own evidence; it also runs with no check for open orders, carts or live deals.
Deactivating is the reversible action that actually stops sales.

The fix there was a row-level Active toggle plus demoting delete behind an overflow
menu with a typed confirm.

**Categories: verified 2026-08-17, and the semantics differ enough to need their own
copy.** Deleting a category does two things in one transaction — soft-deletes the
category, and sets `is_active=False` on **every live product in it**. Products are
deactivated, not deleted; nothing cascades to variants, orders, carts or deals, and
products keep their FK pointing at the deleted category. Sailors stop seeing those
products immediately.

The danger is therefore **not** the products — it is the category row. Each product can
be switched back on individually via `products/set-active/`, but **the category itself
cannot be restored**, so undoing means re-creating it and re-homing everything. The copy
must put the weight there, not on the product count. Backend chose cascade over a 409
deliberately (2026-07-30): a hard block forced admins to re-home by hand before a routine
reorg, which pushed people into bulk-reassigning to a placeholder category.

Two details for the dialog: `deactivated_products` in the response is authoritative and
belongs in the success toast; the pre-fill from `get-category/<uuid>/`'s `product_count`
counts already-inactive products too, so it is an upper bound — word it *"up to N"* or
the two numbers will legitimately disagree and look like a bug.

**Still unverified: Express items, Spares, Emergency categories.**

---

## Change log

| Date | Entry | Change |
|---|---|---|
| 2026-08-17 | — | File created; C1–C6 seeded from the Products pass |
| 2026-08-17 | C7, C8 | Added from the `set-active/` + filter-contract pass |
| 2026-08-17 | C2 | Backend answered: one model, two scope-locked doors. Narrowed to a `CategoryStatsView` scope bug; backend fixing pre-pass-1. OPEN → DECIDED |
| 2026-08-17 | C3 | Backend answered: the two express flags compose, neither is derived. Rewritten around the confirmed one-directional cascade gap in `set-catalog-type/` |
| 2026-08-17 | — | Standing constraints added; [CATALOG_API_MAP_BACKEND.md](CATALOG_API_MAP_BACKEND.md) mirrored |
| 2026-08-17 | C2 | Backend shipped the scope + filter fix. DECIDED → **RESOLVED**; frontend verification deferred to pass 1 |
| 2026-08-17 | C6 | Category delete semantics verified — cascades to products as a *deactivation*; the irreversible part is the category row, not the products |
| 2026-08-17 | C9 | **Added in pass 1.** Category deactivate/delete have inverted blast radii — the safe action doesn't take products off sale, the irreversible one does |
| 2026-08-17 | C10 | **Added in pass 2.** marine → express keeps a marine category, which the sailor-facing express category list can never show |
| 2026-08-17 | C11 | **Added in pass 3.** A soft-deleted variant's SKU stays reserved forever, colliding against a row no screen shows |
| 2026-08-17 | C12 | **Added in pass 3.** `admin_sourceable` dual writers on variants — same shape as products' top-rated; recorded as DECIDED, not a defect |
| 2026-08-17 | C13 | **Added in pass 3.** The only-variant delete guard is an app-level count, so concurrent deletes can still strand a product at zero (RC-4) |
| 2026-08-17 | C10 | **Downgraded in pass 4.** Backend verified the product *is* reachable by list and search — only its category tile is absent. Reworded and de-prioritised |
| 2026-08-17 | C3 | **Now detectable in the UI.** `is_sailor_visible` + blockers surface the C3 state (`not_flagged_express`) on both the Express and variants screens |
| 2026-08-17 | C11–C13 | Bodies restored — an earlier edit to C10 spanned and deleted them; only their changelog rows had survived |
| 2026-08-17 | C4, C5, C6, C7 | **Pass 5: RESOLVED frontend-side.** Spares toggles (C4), cross-screen move warning (C5), delete parity on Spares (C6), filter guarded by construction (C7) |
| 2026-08-17 | C8 | Mitigation extended to Spares and Express; the global staleness decision remains open |

---

## Resolved

_(none yet)_
