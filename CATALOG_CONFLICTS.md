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

2026-08-17. Pass order and scope are set by
[CATALOG_API_MAP.md](CATALOG_API_MAP.md) — four passes, not five, because categories are
one model with two doors and general/marine products are one view family with two
`CATALOG_TYPES` tuples.

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

**Resolution:** backend mirrors the `ProductStatsView` fix (~20 lines) before pass 1.
Mildly breaking — `total` shrinks for anyone reading it as "all categories". Frontend
work: confirm the cards follow the list's filters after the fix, and that no copy
promises an all-scopes number.

---

## C3 · `set-catalog-type/` breaks the express invariant that `set-express/` maintains

**Status:** OPEN — confirmed by backend · **Catalogs:** Products, Variants, Express items

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

**Status:** OPEN · **Catalogs:** Products, Marine emergency spares

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

**Status:** OPEN · **Catalogs:** Products, Marine emergency spares, Express items

`set-catalog-type/` to `marine_emergency` removes the row from the Products table
(scoped to regular + express) and inserts it into Spares. The dialog does not say so.
The same move in reverse takes a record out of Spares.

Related: the products list/detail/update/delete views are scoped to regular + express
and **404 on a marine record**, while the toggles are not. A stale Products row whose
catalog changed underneath will therefore 404 on edit but succeed on toggle.

---

## C7 · `?catalog_type=marine_emergency` is a 400 on the list, valid on the stats

**Status:** OPEN · **Catalogs:** Products, Marine emergency spares

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

Mitigated on Products with `refetchOnMountOrArgChange` on both the list and the stats
query, so returning to the screen re-reads it. **That is a mitigation, not a fix** — a
tab left open still goes stale, and the same annotation presumably appears on any other
screen that reads deal state. Worth deciding once, globally, rather than per screen:
poll, accept staleness with a visible "as of" marker, or push.

---

## C6 · `is_active` vs delete asymmetry — fixed for Products, unverified elsewhere

**Status:** OPEN · **Catalogs:** all five

For Products (resolved 2026-08-17): delete is a soft delete with **no restore
endpoint** and every admin queryset filters deleted rows, so it is terminal and hides
its own evidence; it also runs with no check for open orders, carts or live deals.
Deactivating is the reversible action that actually stops sales.

The fix there was a row-level Active toggle plus demoting delete behind an overflow
menu with a typed confirm. **Whether Categories, Express items, Spares and Emergency
categories have the same delete semantics — and the same missing guard — has not been
checked.** If they do, they should get the same treatment rather than each screen
inventing its own.

---

## Change log

| Date | Entry | Change |
|---|---|---|
| 2026-08-17 | — | File created; C1–C6 seeded from the Products pass |
| 2026-08-17 | C7, C8 | Added from the `set-active/` + filter-contract pass |
| 2026-08-17 | C2 | Backend answered: one model, two scope-locked doors. Narrowed to a `CategoryStatsView` scope bug; backend fixing pre-pass-1. OPEN → DECIDED |
| 2026-08-17 | C3 | Backend answered: the two express flags compose, neither is derived. Rewritten around the confirmed one-directional cascade gap in `set-catalog-type/` |
| 2026-08-17 | — | Standing constraints added; [CATALOG_API_MAP.md](CATALOG_API_MAP.md) mirrored |

---

## Resolved

_(none yet)_
