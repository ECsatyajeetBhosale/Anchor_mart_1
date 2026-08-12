# AnchorMart Admin — Test Plan & Traceability Matrix

**Date:** 11 August 2026
**Scope:** the admin console in `anchor-mart-admin/` — 29 routed pages, 205 RTK Query operations,
190 UI-reachable admin endpoints.
**Status:** Deliverable 1 of the test programme. Matrix only — **no test tooling installed yet, no
tests written, no application code modified.**
**Companions:** [API_INTEGRATION_AUDIT.md](./API_INTEGRATION_AUDIT.md) ·
[API_INTEGRATION_FIXES.md](./API_INTEGRATION_FIXES.md) ·
[E2E_PERMISSION_RESULTS.md](./E2E_PERMISSION_RESULTS.md) ·
[PICKER_TRUNCATION_INVESTIGATION.md](./PICKER_TRUNCATION_INVESTIGATION.md)

---

## 1. Why this document exists first

"Test all functionality and UI" is not yet a countable statement. Three inventories exist — the
route table, the 40 flow documents, the 202-endpoint Postman collection — and none of them agrees
with the others on what a "feature" is. Until they are joined, coverage cannot be distinguished
from activity: we could write two hundred tests and still not know which screens were never opened.

This document is that join. Every row below is one testable surface with its API operations, its UI
controls, its contract source and its business specification named together. Sections 6–9 turn the
rows into an execution plan.

**The gap this programme closes.** [E2E_PERMISSION_RESULTS.md](./E2E_PERMISSION_RESULTS.md) §1 ends
on an unresolved line:

> `UI actually hides the controls` — 🟡 **Unverified** — needs a browser or a human

The API layer is proven: 16/16 governance endpoints refuse a sub-admin, 7/7 operational endpoints
admit one. The **UI layer has never been tested at all**, and there is no harness to test it with.

---

## 2. Scope

**In scope — this repository only.** The 29 routed pages of the admin console, the Redux/RTK Query
layer beneath them, and the admin half of the Postman collection.

**Out of scope, and why.** The sailor (`/api/v1/`) and delivery-partner (`/api/partner/`) portals
are separate frontends not present in this working directory. Their flows are documented in
`flows/` but there is nothing here to execute against — testing them would produce documentation,
not results. The Django backend is likewise out of scope: it ships its own
`manage.py check_postman_coverage` drift checker, which currently reports *no drift* across 362
routes.

**Deliberately excluded from the matrix.** Three screens are built and wired but unrouted — see
§5.1. They cannot be reached in a browser, so they cannot be UI-tested until their routes are
restored.

---

## 3. Counting rules — what "one test" covers

The ledger only means something if the units are fixed. These are the units.

| Unit | Count | Definition |
| ---- | ----: | ---------- |
| **Route** | 29 | A path in `APP_ROUTES` that renders a page component. Excludes 2 redirects, the root redirect and the 404 fallback. |
| **Operation** | 205 | One `builder.query` or `builder.mutation` in a feature's `api/` directory. 110 reads, 95 writes. |
| **Endpoint** | 202 | One request in Postman `03 · Admin Panel`. 190 are reachable through a routed screen; 12 belong to parked screens. |
| **Table** | 36 | One `<DataTable>` mount. Each carries sort, filter, pagination and row actions. |
| **Drawer** | 40 | A `*Drawer.tsx` component — the console's dominant create/edit/detail surface. |
| **Dialog** | 20 | A `*Dialog.tsx` / `*Modal.tsx` component, excluding the 25 `ConfirmDialog` reuses. |
| **Tab panel** | 11 | A `*Tab.tsx` component. Tab switching is a distinct navigation path with its own fetch. |
| **Schema** | 15 | A file under a feature's `schemas/` directory — zod validation, unit-testable with no backend. |
| **Flow** | 40 | One document under `anchor-mart-admin/flows/Wave1–8/`. |

A route is **Covered** only when all four of its columns are green: every operation exercised, every
table paged and filtered, every write path driven through its real drawer or dialog, and the role
gate checked as both tiers.

---

## 4. The matrix

`Q/M` = query and mutation counts in the feature module. `T/D/G/B` = DataTables / Drawers / dialoGs /
taB panels. Modules shared by several routes show their totals once, on the first row, marked `†`.

### 4.1 Authentication — 2 routes

| Route | Feature module | Q/M | UI surfaces | Postman | Flow | Role gate |
| ----- | -------------- | --- | ----------- | ------- | ---- | --------- |
| `/login` | `auth` † | 1/4 | password form, 1 schema | `00 · Setup` (partial) | 01 | — |
| `/login/otp` | `auth` | ↑ | OTP request + 6-digit input | `00 · Setup` (partial) | 01 | — |

### 4.2 Overview — 2 routes

| Route | Feature module | Q/M | UI surfaces | Postman | Flow | Role gate |
| ----- | -------------- | --- | ----------- | ------- | ---- | --------- |
| `/dashboard` | `dashboard` | 10/0 | 1 T, 6 cards, order drawer | Dashboard (12) | 33 | — |
| `/analytics` | `analytics` | 4/0 | 4 Recharts panels, date range | Analytics (4) | 33 | — |

### 4.3 Orders & Delivery — 5 routes

| Route | Feature module | Q/M | UI surfaces | Postman | Flow | Role gate |
| ----- | -------------- | --- | ----------- | ------- | ---- | --------- |
| `/orders` | `orders` | 8/10 | 2 T, 4 G | Orders (25) | 04, 10, 11, 12, 14, 15, 27 | **super-admin**: handover, reassign, release |
| `/intents` | `intents` | 6/7 | 2 T, 1 D, 3 G | Orders·Intents (3) + Substitutions (4) + Payments (3) | 05, 06, 07 | — |
| `/requests` | `special-requests` | 4/3 | 1 T, 1 D, 3 G, 1 schema | Special Requests (6) | 13 | — |
| `/sailors` | `sailors` | 3/4 | 1 T, 3 D, 1 schema | Sailors (6) | 02, 31 | — |
| `/partners` | `partners` | 4/3 | 2 T, 3 D, 1 G, 1 schema | Partner (20, less 10 parked) | 10, 28 | capability change |

### 4.4 Catalog — 7 routes

| Route | Feature module | Q/M | UI surfaces | Postman | Flow | Role gate |
| ----- | -------------- | --- | ----------- | ------- | ---- | --------- |
| `/products` | `products` + `variants` † + `media` † | 3/7 + 2/5 + 0/1 | 2 T, 3 D, 2 G, 1 schema | Products (10) + Variants (7) | 03, 17, 26, 29a | `canManageCatalog` |
| `/categories` | `catalog` | 4/3 | 1 T, 2 D, 1 G, 1 schema | Categories (7) | 03, 29 | `canManageCatalog` |
| `/express` | `express` | 3/0 | 2 T, 1 D, 1 B | Express (3) | 09, 29a | — |
| `/spares` | `spares` | 3/3 | 1 T, 3 D, 1 G, 1 schema | Spare Products (6) | 29b | `canManageCatalog` |
| `/emergency-categories` | `emergency-categories` | 3/3 | 1 T, 2 D, 1 G, 1 schema | Spare Categories (6) | 29b | `canManageCatalog` |
| `/ports` | `catalog-ops` | 1/3 | 1 T, 1 D, 1 schema | Ports & Saved Products (6) ‡ | 29c | `canManageCatalog` |
| `/ship-agents` | `ship-agents` | 1/3 | 1 T, 2 D, 1 G, 1 schema | Ship Agents (5) | 02 | — |

### 4.5 Marketing — 4 routes

| Route | Feature module | Q/M | UI surfaces | Postman | Flow | Role gate |
| ----- | -------------- | --- | ----------- | ------- | ---- | --------- |
| `/rewards` | `rewards` | 11/12 | **6 T**, 3 D, 4 B, 2 schemas | Promotion (23) | 08, 18, 19, 30 | `promo.coupon`, `finance.credit`, `finance.config` |
| `/gifts` | `gifts` | 3/6 | 1 T, 2 D | Surprise Gifts (9) | 20 | — |
| `/ratings` | `ratings` | 3/0 | 2 T, 1 D, 2 B | Ratings (3) | 16 | — |
| `/saved-products` | `saved-products` | 1/0 | 1 T (read-only) | Ports & Saved Products ‡ | 29c | — |

`/rewards` is the single largest screen in the console: 23 operations and 6 tables behind 4 tabs,
and the only screen using three distinct capability gates.

### 4.6 Operations — 6 routes

| Route | Feature module | Q/M | UI surfaces | Postman | Flow | Role gate |
| ----- | -------------- | --- | ----------- | ------- | ---- | --------- |
| `/notifications` | `notifications` | 3/2 | 1 T, 1 B, broadcast form | Notification Campaigns (5) | 21, 32 | — |
| `/chat` | `chat` † | 6/1 | thread list, composer, presence poll | Chat (7) | 23 | — |
| `/support` | `chat` | ↑ | ↑ | ↑ | 23 | — |
| `/order-chats` | `chat` | ↑ | ↑ + 1 D | ↑ | 23 | **super-admin** sees all orders |
| `/sellers` | `sellers` | 3/1 | 1 T, 1 D | Seller Requests (4) | 24 | — |
| `/account-management` | `account-management` | 5/6 | 2 T, 3 D, 3 B, 2 schemas | Admin Users (8) + Account Deletion Requests (4) | 31 | **super-admin**: create, delete, reset password |

`chat` is the only module with a **WebSocket** path (`/ws`, proxied in `vite.config.ts`) and a
polling presence loop. Both need a distinct test strategy from REST — see §7.4.

### 4.7 System — 3 routes

| Route | Feature module | Q/M | UI surfaces | Postman | Flow | Role gate |
| ----- | -------------- | --- | ----------- | ------- | ---- | --------- |
| `/audit` | `audit` | 2/0 | 1 T, 1 D, 1 G | Audit Trail (2) | 34 | **super-admin**: verify chain. Sub-admin sees `category=order` only |
| `/settings` | `settings` † | 3/6 | settings shell | Help & FAQ (9) | 25 | — |
| `/settings/faqs` | `settings` | ↑ | 2 D, 1 G, accordion, 1 schema | ↑ | 25 | — |

‡ `Ports & Saved Products` is one Postman folder of 6 requests serving two routes.

---

## 5. Off-matrix surfaces

### 5.1 Parked screens — built, wired, unroutable

Three pages have complete feature modules and commented-out routes in
[AppRouter.tsx:112](anchor-mart-admin/src/routes/AppRouter.tsx#L112),
[:113](anchor-mart-admin/src/routes/AppRouter.tsx#L113) and
[:133](anchor-mart-admin/src/routes/AppRouter.tsx#L133), with matching commented nav entries in
[navigation.ts](anchor-mart-admin/src/lib/navigation.ts).

| Screen | Module | Q/M | Postman | Flow |
| ------ | ------ | --- | ------- | ---- |
| Assignments | `assignments` | 5/1 | Partner·Order Assignment (5) | 28 |
| Verifications | `verification` | 3/1 | Partner·Verification (5) | 06 |
| Message Log | `messages` | 2/0 | Outbound Messages (2) | 22 |

**12 of the 202 admin endpoints are only reachable through these three screens.** They are
excluded from UI coverage and must not be counted as failures. If the product intent is to ship
them, restoring the routes is a prerequisite, not a test task.

### 5.2 Shared components with no route of their own

[components/common/](anchor-mart-admin/src/components/common/) holds 40 shared components —
`DataTable`, `Pagination`, `DateRangePicker`, `ConfirmDialog`, `SearchFilters`, `StatusBadge` and
the rest. They carry no API calls but appear on nearly every row of §4, so a defect in one is a
defect everywhere. `media` (`ImageUploadField`, presigned upload, Flow 26) is likewise shared by
`products` and `spares`.

**Consequence for sequencing:** these are the highest-leverage unit-test targets in the codebase
and the cheapest to cover. They come first in §9.

### 5.3 Flows with no admin surface

`20a` (crew intent nudge), `35` (order lifecycle timers) and `36` (nightly aggregation) are Celery
background jobs with no console screen. `08` (discount application) is applied sailor-side; only
its coupon administration appears here, on `/rewards`. These four are correctly absent from §4 and
should not be chased.

---

## 6. Test layers

Three layers, cheapest first. The split is by *what can fail*, not by convenience.

### Layer 1 — Vitest + React Testing Library

No backend, no browser, runs in seconds. Targets pure logic where a bug is silent in production:

- **15 zod schema files** — every field rule, boundary and error message.
- [lib/roles.ts](anchor-mart-admin/src/lib/roles.ts) — `useAdminAccess`, `normaliseRole`,
  `isSuperAdminRole`. The fail-closed contract in its docblock (a session rehydrated without
  `features` must hold nothing) is a security-relevant invariant currently asserted only by a comment.
- [lib/validation.ts](anchor-mart-admin/src/lib/validation.ts),
  [lib/apiResponse.ts](anchor-mart-admin/src/lib/apiResponse.ts),
  [lib/apiError.ts](anchor-mart-admin/src/lib/apiError.ts),
  [lib/orderStatuses.ts](anchor-mart-admin/src/lib/orderStatuses.ts) — the response unwrappers are
  defensive by design (`asString`, `asNumber`, `unwrapList` with fallbacks) and every fallback branch
  is an untested assumption about a payload shape nobody has documented.
- The auth slice — login, rehydrate, logout, and the `GET /admin/me/` refresh.
- `DataTable` and `Pagination` in isolation.

### Layer 2 — Playwright end-to-end

Real browser against the running stack (`:3000` → proxy → `:8000`). The only layer that can answer
the open question from `E2E_PERMISSION_RESULTS.md`. Three suites:

1. **Smoke** — all 29 routes load as both roles, no console error, no unhandled rejection, no
   infinite spinner. One spec, high value, catches whole-screen breakage immediately.
2. **Role matrix** — the same 26 nav items and every gated control visited as sub-admin and as
   super-admin, asserting presence *and* absence. This is the deliverable that closes the gap.
3. **Journeys** — per-route CRUD through the real drawers and dialogs: create, edit, validate,
   confirm, delete, and verify the table row afterwards.

### Layer 3 — Manual

What automation asserts badly: visual regression, empty and loading states, error copy, focus
order, keyboard traps in the 40 drawers, responsive behaviour. Produced as a per-route checklist
derived from §4, executed by a human.

---

## 7. Known defects — convert each to a regression test

These are established by prior audits or verified during this pass. Each becomes a failing test
before it becomes a fix.

### 7.1 `npm run build` fails — confirmed live

```
tsconfig.node.json(8,35): error TS5096: Option 'allowImportingTsExtensions' can only be used
when either 'noEmit' or 'emitDeclarationOnly' is set.
```

Pre-existing, dating to the initial React migration. `npx vite build` alone exits 0, so this is a
broken build *script*, not a broken app — but **CI cannot gate on `npm run build` until it is
fixed**, which makes it a blocker for the whole programme rather than a defect within it.

### 7.2 `vite.config.js` shadows `vite.config.ts`

`composite: true` on the node project makes `tsc -b` emit `vite.config.js`, and that emitted file is
committed. Vite resolves `.js` before `.ts`, so **any future edit to `vite.config.ts` is silently
ignored.** The two files are equivalent today, so nothing misbehaves yet.

This bites the test programme directly: adding a Vitest block or a Playwright `webServer` config to
`vite.config.ts` would appear to do nothing, with no error. **Fix before writing any config.**

### 7.3 Picker truncation — 8 sites remain

`API_MAX_PAGE_SIZE` is 50 ([constants.ts:81](anchor-mart-admin/src/lib/constants.ts#L81)) and the
backend's `CustomPagination` caps `max_page_size` at 50 — it silently returns 50 rows for a
`limit: 100` request rather than erroring.

The three sites `PICKER_TRUNCATION_INVESTIGATION.md` marked *fix now* **have been fixed** — the
sailor and product pickers in `BonusPointsTab`, `CouponAssignmentsTab` and `DealFormDrawer` now pass
`API_MAX_PAGE_SIZE` with server-side `search`. Eight callers still pass the truncating literal:

| File | Line | Picker |
| ---- | ---: | ------ |
| [ProductsPage.tsx](anchor-mart-admin/src/features/products/components/ProductsPage.tsx#L86) | 86 | category filter |
| [ProductAddDrawer.tsx](anchor-mart-admin/src/features/products/components/ProductAddDrawer.tsx#L87) | 87 | category select |
| [ProductEditDrawer.tsx](anchor-mart-admin/src/features/products/components/ProductEditDrawer.tsx#L118) | 118 | category select |
| [SparesPage.tsx](anchor-mart-admin/src/features/spares/components/SparesPage.tsx#L117) | 117 | emergency-category filter |
| [SpareProductAddDrawer.tsx](anchor-mart-admin/src/features/spares/components/SpareProductAddDrawer.tsx#L57) | 57 | emergency-category select |
| [SpareProductEditDrawer.tsx](anchor-mart-admin/src/features/spares/components/SpareProductEditDrawer.tsx#L57) | 57 | emergency-category select |
| [useProductSales.ts](anchor-mart-admin/src/features/analytics/hooks/useProductSales.ts#L25) | 25 | analytics product set |
| [SuggestReplacementPanel.tsx](anchor-mart-admin/src/features/intents/components/SuggestReplacementPanel.tsx#L81) | 81 | substitution candidates |

**Test shape:** seed 51+ categories, open the picker, assert the 51st is selectable. It will fail
today at every site above. `useProductSales.ts` is the worst case — a truncated product set makes
the analytics chart quietly wrong rather than visibly broken.

### 7.4 UI role gating — never verified in a browser

The console holds **25 `isSuperAdmin` checks but only 4 capability (`can()`) checks**
(`promo.coupon` ×2, `finance.credit`, `finance.config`), while the backend issues **21 features to a
sub-admin and 31 to a super-admin** — roughly ten super-admin-only capabilities.

The docblock on `AdminAccess.canManageCatalog`
([roles.ts:41-55](anchor-mart-admin/src/lib/roles.ts#L41-L55)) records exactly this class of bug
already found once: `canManageCatalog` used to read `isSuperAdmin` and hid catalog controls from
sub-admins who were entitled to them. **The same re-derivation may persist at some of the other 25
sites.** Auditing them is a distinct task from testing them, and the role-matrix suite (§6, Layer 2)
is what makes the answer observable.

`useAdminAccess` is consumed in only 7 of 30 feature modules — `account-management`, `rewards`,
`spares`, `products`, `emergency-categories`, `catalog`, `catalog-ops`. Whether the remaining 23
genuinely need no gate is an open question this suite answers.

---

## 8. Blockers — resolve before any test runs

| # | Blocker | Detail |
| - | ------- | ------ |
| B1 | **No test tooling installed** | Neither `vitest`, `@testing-library/*`, `playwright` nor `cypress` is in `package.json` or `node_modules`. |
| B2 | **Orphaned test setup** | [src/test/setup.ts](anchor-mart-admin/src/test/setup.ts) imports `@testing-library/jest-dom/vitest` — a scaffold someone abandoned. It fails on first run until B1 is done. |
| B3 | **Config shadowing** | §7.2. Any test config added to `vite.config.ts` is silently ignored. **Fix first — it invalidates everything after it.** |
| B4 | **Build gate broken** | §7.1. CI cannot run `npm run build`. |
| B5 | **Test accounts** | Layer 2 needs both tiers. `E2E_PERMISSION_RESULTS.md` used `sub.admin@anchormart.test` and `satyajeet@ecinfosolutions.com`; credentials and their seed state need confirming as reusable. |
| B6 | **OTP login unautomatable** | `/login/otp` needs a mailbox or a backend test hook. Password login covers session setup; the OTP path may have to stay manual. |
| B7 | **Seed data** | Truncation tests need 51+ rows; journey tests need deletable fixtures. Whether tests may write to the dev database is a decision, not a task. |

B3 and B5 are the two that stop work starting. B7 shapes what Layer 2 can assert.

---

## 9. Proposed execution order

**Phase 0 — unblock.** Fix B3, then B4; delete the four committed build artifacts and gitignore
them. Install Vitest + RTL + Playwright, wire `setup.ts`, confirm test accounts. *Ends with: one
trivial passing test in each layer.*

**Phase 1 — Layer 1 on shared code.** [components/common/](anchor-mart-admin/src/components/common/)
and `lib/` — `DataTable`, `Pagination`, the response unwrappers, `roles.ts`, the auth slice. Highest
leverage: these sit under every row of §4.

**Phase 2 — Layer 1 on schemas.** All 15 schema files. Mechanical, parallelisable, no backend.

**Phase 3 — smoke suite.** All 29 routes load as both roles. First real answer to "does the console
work", and the regression net for everything after.

**Phase 4 — role matrix.** Closes the `E2E_PERMISSION_RESULTS.md` gap. Pair with an audit of the 25
`isSuperAdmin` sites (§7.4) — the test tells you *what* the UI does, the audit tells you *whether
that is right*.

**Phase 5 — journeys, by descending weight.** `/rewards` (23 ops, 6 tables) → `/orders` (18) →
`/intents` (13) → `/account-management` (11) → `/dashboard` (10) → `/products` (10 + 7 variants) →
the remaining 19 routes.

**Phase 6 — regression tests for §7.** Truncation first: it is a live, reproducible, silent
data-correctness bug on 8 call sites.

**Phase 7 — manual checklist.** Per-route visual and a11y pass derived from §4.

---

## 10. Method and limitations

Route, operation and component counts were extracted mechanically from source — RTK Query
operations by matching `builder.query` / `builder.mutation` declarations in each feature's `api/`
directory, not by counting exported symbols, which undercounts badly (the modules export one API
object each, so a symbol count reports 30 where the true figure is 205). Postman counts come from
walking the collection JSON; the `03 · Admin Panel` subsections sum to exactly 202, matching the
prior audit.

**What this document does not establish.** No screen has been opened in a browser during this pass.
Every "UI surface" figure is a static count of components, not evidence that any of them render,
and the role-gating analysis in §7.4 is static too — it counts check sites, it does not prove what
a sub-admin sees. That proof is Phase 4's job, and it is the reason this programme exists.

Flow-to-route mapping comes from `Flow NN` references in source comments where present, and from
document titles where absent. The two agree everywhere both exist.
