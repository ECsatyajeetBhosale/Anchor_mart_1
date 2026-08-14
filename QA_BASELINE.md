# QA_BASELINE — Phase 0: frozen baseline

**Frozen at:** commit `e4f1373` — *"feat: enhance admin features with role-based access and improved
search functionality"* (2026-08-11)
**Executed:** 11 August 2026
**Mode:** **Read-only.** No application code, configuration or data was modified. Verified: after
every command below, `git status` reports the tree unchanged except this document and its
companions.
**Companions:** [TEST_PLAN.md](./TEST_PLAN.md) · [QA_TEST_MATRIX.md](./QA_TEST_MATRIX.md) ·
[API_INTEGRATION_AUDIT.md](./API_INTEGRATION_AUDIT.md) ·
[API_INTEGRATION_FIXES.md](./API_INTEGRATION_FIXES.md) ·
[E2E_PERMISSION_RESULTS.md](./E2E_PERMISSION_RESULTS.md) ·
[PICKER_TRUNCATION_INVESTIGATION.md](./PICKER_TRUNCATION_INVESTIGATION.md)

---

## 1. What this document is for

Everything found from Phase 2 onward gets compared against this file. A defect that is already
listed here is **not a regression** — it was broken before testing started. A defect that is *not*
listed here, on a screen this baseline says worked, **is** a regression and is the test programme's
responsibility to explain.

Without this freeze, the first defect report is unarguable in both directions: nobody can prove the
tests broke it, and nobody can prove they didn't.

---

## 2. Classification legend

Every finding, in this document and every later phase, carries exactly one marker.

| Marker | Meaning | Action |
| ------ | ------- | ------ |
| 🔴 **New regression** | Worked at baseline, broken now | Fix, and find what broke it |
| 🟠 **Existing defect** | Already broken at baseline | Schedule; do **not** treat as urgent because a test found it |
| 🟡 **Expected / product decision** | Behaves as designed, even if surprising | Do **not** fix. Record the decision and move on |
| ⚪ **Environment / data issue** | Test harness, credentials, seed data or infrastructure | Fix the harness, not the app |

**The rule that matters:** a tester who cannot classify a finding must escalate it as *unclassified*
rather than guess. Guessing 🟠 hides regressions; guessing 🔴 sends people chasing ghosts.

---

## 3. Environment at freeze

| Component | Value |
| --------- | ----- |
| Frontend | `anchor-mart-admin` @ `e4f1373`, Vite 6 dev server, port 3000 |
| Backend | `/home/abc/Desktop/AnchorMartBackend/backend` — Django + uvicorn ASGI, port 8000 (`--reload`) |
| Second backend | `manage.py runserver` on port 8001 — **not** the proxy target; noted so it is not mistaken for the system under test |
| Proxy | `/api` and `/ws` → `http://localhost:8000`, configured in `vite.config.ts` |
| Node / npm | v20.19.5 / 10.8.2 |
| React / TS | 19.0.0 / 5.7.2 |
| Working tree | Clean at freeze (only untracked QA documents) |

**Not in this repository:** the backend, and the sailor and delivery-partner frontends. The backend
is reachable on disk and its management commands were runnable; the two other frontends do not
exist here in any form. §8 explains why that constrains Phase 7.

---

## 4. Gate results

### 4.1 Runtime — both services up ✅

| Check | Result |
| ----- | ------ |
| Frontend responds | `GET localhost:3000/` → **200** (1.9 ms) |
| Backend responds | `GET localhost:8000/api/schema/` → **200** |
| Vite `/api` proxy reaches Django | `POST /api/superadmin/admin/login/` with `{}` → **400** `{"error":"Email and password are required"}` |

The 400 is the correct proof: the request left the browser origin, traversed the proxy, and was
answered by Django's own validator. A proxy misconfiguration returns 404 or an HTML error page here,
not a JSON field error.

### 4.2 Static gates

| Gate | Command | Result |
| ---- | ------- | ------ |
| Typecheck (app) | `tsc -p tsconfig.json --noEmit` | ✅ **Clean** — zero errors across 393 source files |
| Build gate | `npm run build` (`tsc -b && vite build`) | 🟠 **FAILS** — `TS5096`, see BL-01 |
| Bundle build | `vite build` | ✅ **Exits 0** — `dist/` produced, 11.98 s |
| Lint | `biome lint .` | 🟠 **13 errors + 1 warning** across 7 files, see BL-04 |

The two build rows are not contradictory and the distinction is the important part: **the app
builds, the build *script* does not.** `tsc -b` is a pure typecheck gate that contributes nothing to
`dist/` — the app project sets `noEmit`.

### 4.3 Contract gates ✅

| Check | Result |
| ----- | ------ |
| Collection parses | ✅ 342 requests · 64 collection variables |
| Admin surface | ✅ 202 requests under `03 · Admin Panel` — matches the prior audit exactly |
| Embedded assertions | ✅ 337 test scripts |
| Saved example responses | ⚪ **0** — see BL-08 |
| Backend drift check | ✅ **`No drift. Collection matches the URL conf.`** — 362 live routes, 339 covered, 23 aliases sharing a covered view |

The drift check is the strongest single fact in this baseline: backend and Postman agree exactly, so
any behavioural discrepancy found later is frontend-side by elimination.

> ⚠️ **Corrected 13 Aug 2026 — that inference is narrower than it reads.** The checker matches on
> **view class**, not on route, and **23 of 363 live routes are aliases sharing a view with a covered
> path**. The backend demonstrated the hole: a live endpoint pointed at an already-covered view class
> reports **"No drift"** and `--fail-on-drift` exits **0**. `get-all-products/` was only caught
> because `ListAllProductsView` is a new class.
>
> So "no drift" means *every view class is represented*, not *every route is covered*. A new endpoint
> reusing an existing view is invisible to the gate. **Do not use this check alone to conclude a
> discrepancy is frontend-side** — confirm the specific route is in the collection first. The fix is
> a small edit on the backend, deliberately unscheduled because it changes a CI gate's semantics and
> wants a chosen first run.

### 4.4 Test inventory — nothing exists ⚪

| Check | Result |
| ----- | ------ |
| Test files (`*.test.*`, `*.spec.*`) | **0** |
| Test runner installed | **None** — no `vitest`, `@testing-library/*`, `playwright` or `cypress` in `package.json` or `node_modules` |
| API runner installed | **None** — `newman` not present |
| Orphaned scaffold | `src/test/setup.ts` imports `@testing-library/jest-dom/vitest`, which is not installed |

**There is no existing test suite to regress against.** Every later "pass" is a first pass. This is
the single largest fact about the baseline and it is why Phase 3 (manual smoke) cannot be skipped in
favour of automation.

---

## 5. Defect register at baseline

Ten findings. All pre-date this programme; none was introduced by it. No fixes applied.

### BL-01 🟠 `npm run build` fails — `TS5096`

```
tsconfig.node.json(8,35): error TS5096: Option 'allowImportingTsExtensions' can only be used
when either 'noEmit' or 'emitDeclarationOnly' is set.
```

`composite: true` forces emit; `allowImportingTsExtensions` forbids it. `tsc -b` refuses before
`vite build` runs. Traced by the prior audit to `28af123`, the initial template→React migration.

**Impact on QA:** CI cannot gate on `npm run build`. Until fixed, the typecheck gate must be invoked
as `tsc -p tsconfig.json --noEmit`, which passes cleanly.

### BL-02 🟠 `vite.config.js` shadows `vite.config.ts`

`tsc -b` emits `vite.config.js` from `vite.config.ts`, and the emitted output is **committed**:
`vite.config.js`, `vite.config.d.ts`, `tsconfig.tsbuildinfo`, `tsconfig.node.tsbuildinfo` are all
tracked. Vite resolves `.js` before `.ts`.

The two files are equivalent today, so nothing misbehaves yet. **Any future edit to
`vite.config.ts` will be silently ignored** — no error, no warning.

**Impact on QA — this is the highest-priority blocker.** Adding a Vitest block or a Playwright
`webServer` entry to `vite.config.ts` would appear to do nothing. Every configuration task in the
programme sits downstream of this.

*Corroborating evidence:* the lint run reports the **same error at the same line in both files**
(`vite.config.ts:4:18` and `vite.config.js:4:18`) — the duplication is directly observable.

### BL-03 🟠 Picker truncation — 8 call sites

`API_MAX_PAGE_SIZE` is 50; the backend's `CustomPagination` caps `max_page_size` at 50 and **returns
50 rows for a `limit: 100` request without erroring**. Eight callers still pass the literal:

| File | Line | Picker |
| ---- | ---: | ------ |
| `features/products/components/ProductsPage.tsx` | 86 | category filter |
| `features/products/components/ProductAddDrawer.tsx` | 87 | category select |
| `features/products/components/ProductEditDrawer.tsx` | 118 | category select |
| `features/spares/components/SparesPage.tsx` | 117 | emergency-category filter |
| `features/spares/components/SpareProductAddDrawer.tsx` | 57 | emergency-category select |
| `features/spares/components/SpareProductEditDrawer.tsx` | 57 | emergency-category select |
| `features/analytics/hooks/useProductSales.ts` | 25 | analytics product set |
| `features/intents/components/SuggestReplacementPanel.tsx` | 81 | substitution candidates |

The three sites `PICKER_TRUNCATION_INVESTIGATION.md` marked *fix now* — `BonusPointsTab`,
`CouponAssignmentsTab`, `DealFormDrawer` — **have been fixed** and now pass `API_MAX_PAGE_SIZE`
with server-side `search`. The eight above are the "decision required" remainder.

`useProductSales.ts` is the most serious: a truncated product set makes the analytics chart quietly
*wrong* rather than visibly broken. Reproduction requires 51+ rows — see BL-09.

### BL-04 🟠 Lint — 13 errors, 1 warning

| Rule | Count | Where |
| ---- | ----: | ----- |
| `a11y/useKeyWithClickEvents` | 4 | `AppSidebar:163`, `ProfileDrawer:31,45`, `LoginPage:219` |
| `a11y/useButtonType` | 4 | `AppSidebar:99`, `ConfirmDialog:47,50`, `ProfileDrawer:61` |
| `style/useNodejsImportProtocol` | 2 | `vite.config.ts:4`, `vite.config.js:4` — *both copies, see BL-02* |
| `a11y/noSvgWithoutTitle` | 1 | `AppSidebar:34` |
| `style/useImportType` | 1 | `badge.tsx:1` |
| `suspicious/noArrayIndexKey` | 1 | `DataTable.tsx:134` |
| `correctness/useExhaustiveDependencies` | 1 *(warning)* | `sheet.tsx:74` |

**Nine of the thirteen are accessibility errors, and they sit in four shared components** —
`AppSidebar`, `ConfirmDialog`, `ProfileDrawer`, `DataTable` — which appear on nearly every routed
page. Phase 15's keyboard-navigation pass will re-find these; they are recorded here so it reports
them as 🟠, not 🔴.

`DataTable.tsx:134` using an array index as React key is the one with runtime consequence: row
identity breaks under re-sort or re-filter, which is exactly what Phase 5 exercises.

### BL-05 ⚪ No test tooling; orphaned scaffold

Per §4.4. `src/test/setup.ts` is a scaffold someone abandoned — it will fail on first run until the
dependencies land. Not a product defect; a harness gap.

### BL-06 🟡 Three screens built but unroutable

`Assignments`, `Verifications` and `Message Log` have complete feature modules and commented-out
routes and nav entries. **12 of the 202 admin endpoints are reachable only through them.**

Recorded 🟡 because the code comments describe this as deliberate parking, not breakage. Restoring
them is a product decision. Until then these 12 endpoints are **untestable through the UI and must
not be reported as coverage failures.**

### BL-07 🟠 Single 1.8 MB bundle, no code splitting

```
dist/assets/index-BLT7xZo4.js   1,801.45 kB │ gzip: 502.59 kB
```

Vite's own 500 kB warning fires. No route-level `import()` anywhere. Not a functional defect;
recorded because it belongs to Phase 17 (production readiness) and because it sets first-paint
expectations for Phase 15 on throttled connections.

### BL-08 ⚪ Postman collection has zero saved example responses

337 assertions, **0** stored response bodies. The prior audit found the same for OpenAPI: the schema
at `/api/schema/` describes 385 operations but carries a response schema for only 4.

**Consequence:** no authoritative record of what any endpoint *returns*. Frontend response handling
cannot be validated against a document — it can only be validated against live traffic. Every
"response shape" claim in later phases must cite an observed response, not a specification.

### BL-09 ⚪ Test credentials blank; two sub-admin identities in circulation

The collection ships seeded identities with **empty passwords**:

| Variable | Value |
| -------- | ----- |
| `admin_email` | `satyajeet@ecinfosolutions.com` |
| `admin_password` | *(blank)* |
| `sub_admin_email` | `rushi@gmail.com` |
| `sub_admin_password` | *(blank)* |
| `admin_token` / `sub_admin_token` | *(blank)* |

`E2E_PERMISSION_RESULTS.md` ran against a **different** sub-admin — `sub.admin@anchormart.test`.
Two sub-admin identities are therefore in circulation, and it is not established that they hold the
same 21 features.

**Blocks Phase 2 entirely.** Resolving this means naming one canonical pair of accounts and
confirming their credentials and seeded feature lists.

### BL-10 ⚪ Seed data volumes unmeasured at this freeze

BL-03 needs 51+ rows to reproduce; Phase 5 needs a list with a real page 2 and a real last page.
`E2E_PERMISSION_RESULTS.md` previously observed `60 → 50` and `700 → 50` truncations, so sufficient
data existed then. **Not re-measured here** — every list endpoint requires a token, and BL-09 leaves
us without one. First task after BL-09 clears.

---

## 6. Intentionally unfixed — do not "fix" these

| # | Behaviour | Why it is correct |
| - | --------- | ----------------- |
| 1 | Backend silently caps `page_size` at 50 instead of erroring | Backend design (`CustomPagination`). The **frontend's** request is the defect (BL-03), not the cap |
| 2 | Three parked screens 404 to the dashboard | BL-06 — deliberate |
| 3 | `tsc -b` contributes nothing to `dist/` | By design; the app project sets `noEmit`. Do not "fix" by removing `noEmit` |
| 4 | No password-reset flow anywhere in the admin console | Product decision recorded in Flow 01: OTP is the standing recovery path. The `/login` "Forgot password?" link correctly only shows a toast |
| 5 | `canManageCatalog` grants catalog CRUD to sub-admins | Correct per the backend's `OPERATIONAL` feature set. It previously read `isSuperAdmin` and was **too restrictive**; the current behaviour is the fix, not a regression |
| 6 | Admin API offers both password and OTP login | Product decision, 2026-07-20 (Flow 01). Other portals are OTP-only |

Item 5 is the one most likely to be misreported. A tester seeing a sub-admin create a product will
reasonably assume a permission bug. It is not — it is documented, deliberate, and was fixed in that
direction on purpose.

---

## 7. What this baseline does **not** establish

Stated plainly, because the gap is the whole point of the programme:

- **No screen has been opened in a browser.** Not one of the 29 routes has been rendered. A clean
  typecheck proves the code compiles; it says nothing about whether a page displays data.
- **No UI behaviour is verified** — no table paged, no drawer opened, no form submitted, no toast
  observed, no error state seen.
- **Role gating in the UI remains unverified**, exactly as `E2E_PERMISSION_RESULTS.md` left it. The
  console holds 25 `isSuperAdmin` checks but only 4 capability (`can()`) checks, against a backend
  granting 21 features to sub-admins and 31 to super-admins.
- **No runtime console errors are known**, because no console has been observed.

Anything in these four categories found in Phase 3+ is **unclassifiable against this baseline** and
must be recorded as *first observation*, not as a regression.

---

## 8. Scope constraint discovered during Phase 0

**The Phase 7 order journeys cannot be driven from the admin console alone.** This is a structural
finding, established from the collection's own layout, and it changes how Phase 7 must be built.

The Regular order funnel spans three portals:

| Leg | Portal | Where it lives |
| --- | ------ | -------------- |
| Browse → Cart → Place intent | **Customer** (`/api/v1/`) | Postman `01 · Customer` — Browse (9), Regular Cart (4), Placing an order (4) |
| Sourcing → Verification → Billing | **Admin** | This repo — `/intents`, `/orders` |
| Payment | **Customer** | Postman `01 · Customer` — Payment (4) |
| Assignment | **Admin** | Parked screen (BL-06) or API |
| Pickup → Port → Berth → Delivery | **Partner** (`/api/partner/`) | Postman `02 · Delivery Partner` — Work Queue (5), Delivery (4) |

The admin console covers only the middle. The sailor and partner frontends are not in this
repository.

**Therefore Phase 7 must be a hybrid harness:** customer and partner legs driven through the API
(newman or a scripted client), admin legs driven through the UI. This is achievable and defensible —
the collection already carries 337 assertions and the drift check proves it matches the backend —
but it is a different build from Phases 3–6, and `newman` is not currently installed.

Express and Special Request are the shallower cases: both use the direct-pay path and skip the
sourcing funnel, so their admin leg is smaller, but both still originate customer-side.

---

## 9. Blockers, in dependency order

| # | Blocker | Blocks | Owner |
| - | ------- | ------ | ----- |
| **1** | **BL-02** — config shadowing | Every configuration task. Fix before writing any test config, or the config is silently ignored | Dev |
| **2** | **BL-09** — credentials | Phase 2 entirely; Phase 3 onward for the two-role passes | **Client / you** |
| **3** | **BL-10** — seed volumes | Phase 5, and BL-03 reproduction. Unblocked by #2 | QA |
| 4 | **BL-05** — no tooling | All automation. Mechanical once #1 lands | Dev |
| 5 | **BL-01** — build gate | CI only. Does not block manual phases | Dev |
| 6 | Write policy | Phase 4 (CRUD) and Phase 8 (money) need to create and delete records. **May tests write to the dev database, and against which order fixtures?** | **Client / you** |
| 7 | `newman` absent | Phase 7 hybrid harness, and any API regression run | Dev |

**Two of these are yours, not ours:** #2 and #6. The rest are engineering tasks that can start as
soon as code changes are authorized.

---

## 10. Authorized changes since the freeze

The baseline is frozen at `e4f1373`, but the code may move. Every authorized change is logged here so
a later phase can tell an intentional change from a regression. **Nothing lands in this section
without explicit authorization.**

### C-01 — Data freshness on navigation · 11 Aug 2026 · authorized by user

**Problem.** `baseApi` set no cache options, so RTK Query's defaults applied: `keepUnusedDataFor: 60`
and `refetchOnMountOrArgChange: false`. Navigating Orders → Intents → Orders within 60 seconds served
cached rows and issued **no request**. `refetchOnMountOrArgChange` appeared **0 times** in the
codebase.

Mutations invalidated their own tags correctly, so an operator's own edits always appeared. What went
stale was every change they did not cause — another admin claiming an order, a payment landing, a
partner submitting verification, a Celery timer firing.

**Also found:** `setupListeners(store.dispatch)` was never called, so the `refetchOnFocus: true` and
`refetchOnReconnect: true` flags in `features/chat/hooks/useChatPresence.ts:53-54` were **dead
config**. Chat presence stayed live only because that hook also polls.

**Applied.**

| File | Change |
| ---- | ------ |
| `src/lib/fetchUtils.ts` | `refetchOnMountOrArgChange: true` on `baseApi` |
| `src/store/index.ts` | `setupListeners(store.dispatch)` |

**Verified.** `tsc -p tsconfig.json --noEmit` clean · `biome lint` clean on both files · Vite dev
server compiled and served both modules.

**No skeleton flash, by design.** Pages gate skeletons on `isLoading` (322 uses), which stays false
while a cache entry exists; `isFetching` (61 uses) mostly drives the small `searchLoading` spinner.
Cached rows render immediately and are swapped for fresh data when the response lands.

**Scope limit — state it when reporting.** This makes data fresh **per navigation**, not real-time. A
screen left open still does not update on its own; that needs `pollingInterval` or a socket. The
three endpoints carrying `keepUnusedDataFor: 0` (special-request export, order slip, audit chain
verify) are unaffected and still never cache.

**Consequence for later phases.** Phase 3 onward will now see a network request on every page mount.
That is expected — treat it as the new baseline, not as a defect. Dashboard fires all 10 of its
queries per visit.

### C-02 — Intents Review drawer mapping fixes · 11 Aug 2026 · authorized by user

Closes six of the seven findings in
[INTENTS_REVIEW_MAPPING_AUDIT.md](./INTENTS_REVIEW_MAPPING_AUDIT.md). F6 stays open as a product
decision (that audit's §11).

| Finding | What changed |
| ------- | ------------ |
| **F1 · P0** — rail showed the wrong stage | New `src/lib/timeline.ts` (`resolveTimelineStates`) reconciles the two backend ladder contracts in one place. `assignmentApi` now passes the endpoint's `status` through instead of discarding it and falling back to `!!at` |
| **F3 · P0** — rail labels from two vocabularies | Steps now carry their own labels; the `ORDER_STATUS_BY_KEY` lookup is gone from both ladder surfaces |
| **F2 · P0** — STAY always `—` | `expected_stay` (deleted from the backend) → `expected_departure`, rendered as a date. Column relabelled **Departure** |
| **F4 · P1** — `$0.00` on unbilled intents | `UNBILLED_STATUSES` gate renders "Not priced yet" before a bill exists |
| **F5 · P1** — owner shown as an email | Dev data: `admin@gmail.com` → `Platform Admin` |

**Second site found during the fix.** `components/common/Timeline.tsx` carried **both** F1 and F3
independently — so the Orders drawer's vertical timeline was mis-stating stages too, not just the
Intents rail. The audit found it on one screen; the fix covers both.

**Files:** `lib/timeline.ts` *(new)* · `lib/messages.ts` · `components/common/Timeline.tsx` ·
`features/assignments/{api/assignmentApi.ts,types/assignment.types.ts}` ·
`features/intents/{api/intentApi.ts,types/intent.types.ts,components/IntentsPage.tsx,components/IntentReviewDrawer.tsx}` ·
`features/orders/types/order.types.ts`

**Verified.** `tsc -p tsconfig.json --noEmit` clean · `biome lint` clean across 19 touched files ·
`vite build` exits 0.

**Database write.** One row in the dev database: `User(email='admin@gmail.com')` gained
`first_name='Platform'`, `last_name='Admin'`. This is the **first authorized write** of the
programme; the general write policy (blocker #6 in §9) remains unanswered.

**Still carrying blank or placeholder names** — reported, not changed:

| Account | Role | Name |
| ------- | ---- | ---- |
| `aaa@gmail.com` | super_admin | `asdf adsf` |
| `anchormartlocal@yopmail.com` | admin | *(blank)* |
| `ecadmin@gmail.com` | admin | *(blank)* |
| `localadmin@gmail.com` | admin | *(blank)* |

Each will display as a raw email wherever an owner is shown. Worth clearing before Phase 2, since
owner display appears throughout the Flow 27 permission tests.

**Regression tests owed** (Flows 05/06/07 rows in [QA_TEST_MATRIX.md](./QA_TEST_MATRIX.md)):
an order at `verification_submitted` that never held `sourcing` must render **Stage 4 of 10**, with
no `done` segment after a non-`done` one; the Departure column must render a real date; the drawer
must show "Not priced yet" pre-bill and `$0.00` for a genuinely free paid order.

### C-03 — Intents drawer, Items & Pricing tab · 11 Aug 2026 · authorized by user

Two further defects, reported from a browser check of the C-02 fixes and confirmed against the
serializers. Written up as F8/F9 in
[INTENTS_REVIEW_MAPPING_AUDIT.md](./INTENTS_REVIEW_MAPPING_AUDIT.md).

| Finding | Cause | Fix |
| ------- | ----- | --- |
| **F8** — every item badged "Checking…" although verification was complete | The **detail** endpoint's `AdminOrderItemSerializer` carries no availability fields; they live in the separate `availability_reports[].lines[]` collection, which the detail mapper ignored. Only the *list* serializer folds them into the item row | Merge the newest report's lines into each item by `order_item_id` (reports are prefetched `-submitted_at`, so index 0 is live) |
| **F9** — breakdown showed `$0.00` under **$693.42** of priced line items | `create_order` writes `subtotal = 0` / `total_amount = 0`; `sync_order_subtotal` runs only at bill creation. Order-level financials are a genuine 0 pre-bill while line items carry catalog prices | Pre-bill, replace the five `$0.00` rows with one labelled **Estimated Total** + a hint. The real breakdown is unchanged once a bill exists |

The estimate mirrors the backend's `compute_subtotal` — Σ (available qty × unit price), capped at
requested quantity — so F9 depends on F8. Accepted substitutions are excluded, hence "estimate".

**Files:** `features/intents/{api/intentApi.ts,types/intent.types.ts,components/IntentReviewDrawer.tsx}` ·
`lib/messages.ts`

**Verified.** `tsc --noEmit` clean · `biome lint` clean across 14 files · `vite build` exits 0 · dev
server serving the new module.

**Confirmed working from the same browser check** — the C-02 fixes landed: the rail now reads
**"Stage 4 of 10"** with `AWAITING YOUR…` active and the first three segments complete, labels come
from a single vocabulary, and the header shows **"Not priced yet"**.

**Pattern worth noting for later phases.** F4, F8 and F9 are all the same class: *the list and
detail endpoints for the same entity expose different field sets, and a mapper written against one
was pointed at the other.* Phase 4 should check every drawer that is opened from a table for exactly
this, not just the Intents one.

### C-04 — Partner picker capability filter · 11 Aug 2026 · authorized by user

**Reported:** the Assign-to-Partner picker offers partners regardless of whether they can do the
work the order's phase requires. Partners carry `can_verify` and `can_deliver` independently and
most hold both.

**Resolved server-side.** `GET /superadmin/partner/list/` takes `?can_verify=` / `?can_deliver=`,
strictly parsed (`?can_verify=maybe` is a 400, never a silent no-filter), ANDed when both are given,
no filter when blank. Its docstring states the purpose exactly: *"the filter an admin needs before
assigning: `assign-order` refuses a partner who lacks the capability for that job, so without it the
list offers people the next screen will reject."*

| Picker | Query | Meaning |
| ------ | ----- | ------- |
| Intents review | `?can_verify=true` | everyone who can verify, both-capable included |
| Orders assign · Express | `?can_deliver=true` | everyone who can deliver, both-capable included |

**Why not `assignable-partners/?order_id=`,** which derives the same capability from order status: it
*also* scopes to the order's port, and partner port data is incomplete — 9 of 13 have no
`assigned_port` and the rest are at Port of Singapore, while orders are raised against other ports.
Measured on order `AM202608110001` (Port of Los Angeles): capability alone → 13; capability **+
port** → **0**. That endpoint stays in place for when port data is populated; the port scope is a
real requirement, not one to design away.

**Applied.** New `getPartnersByCapability` in the assignments feature, used by all three pickers.
Each screen states its own phase — the intents drawer is always verification, the orders and express
drawers are always fulfilment — so **no status→phase table exists on the frontend at all**. That
respects `orders/assignment_lifecycle.py`'s instruction (*"this is the only place the mapping
exists. Do not re-declare these sets elsewhere."*), which an earlier draft of this change had
violated by mirroring the two status sets client-side.

Availability matches `assignable-partners`' own base: `is_active=true` server-side, then unavailable
partners dropped in the transform. `partner/list/` has no `is_available` parameter, and
`?status=available` would additionally exclude on-duty partners — a behaviour change rather than a
like-for-like swap. *Caveat:* the availability filter runs after pagination, so it is exact only
while the capability pool fits one 50-row page (13 partners today).

**Measured effect** — each picker now excludes exactly one partner the other admits:

| Picker | Returns | Excludes |
| ------ | ------: | -------- |
| Verify (intents) | 12 | `can.go.deliver@yopmail.com` — deliver-only |
| Deliver (orders/express) | 12 | `can.verify.deliver@yopmail.com` — verify-only |

Still a UX gate: `AdminAssignOrderSerializer` validates capability on the write and the
`DeliveryAssignment` guard raises `CapabilityViolation` (403) behind it.

**Open data question (yours).** No partner is assigned to the ports orders are being raised against,
so an admin can still assign a Singapore partner to a Los Angeles order. Populating partner ports
unblocks the stricter server-side scoping.

**Files:** `features/assignments/{api/assignmentApi.ts,index.ts}` · `lib/partnerCapability.ts` *(new
— type only)* · `features/intents/components/IntentReviewDrawer.tsx` ·
`features/orders/components/OrderAssignPartnerSection.tsx` ·
`features/express/components/ExpressItemDrawer.tsx`

**Verified.** `tsc --noEmit` clean · `biome lint src/` reports **12 findings, all pre-existing
BL-04, zero new** · `vite build` exits 0. Formatting applied with the repo's own
`biome check --write` on the touched files only.

**Follow-up — picker option label.** Reduced to **email · capability**, per request. It previously
read `name · code · port · capability`. Confirmed against the live payload: partner names are not
identifying (`"Partner Bhai"` and `"Abhishek Kuwar"` each appear twice), `partner_id` is an internal
reference, and `port` is null on 9 of 13 rows — the email is the only field that distinguishes one
partner from another. Capability is now always spelled out, including the both-capable case
(`"Verify & Deliver"`), which was previously left blank on the theory that a badge every row shares
is noise; unlabelled read as *unknown* rather than *can do everything*. `capabilitySuffix` was
replaced by `capabilityLabel`; `email` added to `AssignablePartner` and its mapper.

**Live API confirmation** (supplied by the user, 10-row pages): `can_verify=true&can_deliver=true` →
**11**; `can_verify=true&can_deliver=false` → **1** (`can.verify.deliver@yopmail.com`);
`can_verify=false&can_deliver=true` → **1** (`can.go.deliver@yopmail.com`). Total 13, so each
picker's single-flag query returns 12 — matching the ORM measurement above. Note their example URLs
use `page_size=10`, which pages an 11-row result; the app sends `page_size=50`, so a single page
covers the pool.

**Open question raised with the user.** 6 of the 10 partners in the sample carry `on_duty: true`
(mid-job). They are currently offered in both pickers, matching the previous `assignable-partners`
behaviour. Whether a partner already on a job should be selectable is a product decision, not a bug.

### C-05 — Orders review drawer rebuilt on the Intents layout · 11 Aug 2026 · authorized by user

**Requested:** the Orders review drawer should look like the Intents one, which the user preferred.

**Approach — extract, do not duplicate.** `OrderDetailDrawer` lives in `components/common` and is
shared with the parked Assignments board, so the Intents drawer's layout was pulled into
`components/common/ReviewLayout.tsx` (`Fact`, `KV`, `Section`, `Contact`, `ReviewHeader`,
`ReviewSummaryStrip`, `ReviewGateBanner`, `ReviewCustomerCard`, `ReviewTiles`) and both drawers now
compose from it. The Intents drawer dropped from **938 to 777 lines** with no visual change — the
same JSX, relocated.

`IntentLifecycleRail` moved to `components/common/LifecycleRail` (a shared drawer cannot import from
a feature) and is re-exported under its old name so the intents feature's public surface is
unchanged. Its `steps` prop is now typed structurally against `TimelineStepLike`, so both the
order-timeline shape (`status`) and the dashboard shape (`is_done`) satisfy it — the same
two-contract problem C-02 fixed, now closed at the type level too.

**The enabling fact.** Both drawers already call `GET /superadmin/orders/orders/{id}/`. The intents
mapper reads ~30 fields off it; `toOrderDetail` mapped 12 into a deliberately thin shape and
discarded the rest. Customer email/phone, IMO, port, anchorage, arrival, expected departure, order
date and notes were **already arriving on the Orders screen and being thrown away** — so the richer
layout needed no backend work and no new request.

| Area | Before | After |
| ---- | ------ | ----- |
| Header | icon · title · terminal · bare total | icon · title · copyable reference |
| Summary strip | *(none)* | status + express/emergency badges · Order Total · **10-stage lifecycle rail** · Items / Order Date / Port / Ship Arrival |
| Overview | flat key-value list | customer card · 6 vessel & shipping tiles · order summary · notes |
| Items | stacked list | same 4-column table as Intents (no Availability — settled by payment) |
| Fulfilment | timeline · partner · ship agent | unchanged |
| Footer | Picking Slip / Refund / Cancel | unchanged |

**Decisions confirmed with the user:** keep the vertical timeline in Fulfilment *and* add the
horizontal rail on top (they answer different questions — where it is now vs when each step
happened); keep each screen's own footer actions; Orders only this pass.

New `OrderDetail` fields are **optional**, so the parked Assignments board — which builds one from a
list row — still compiles and degrades to "—".

**Files:** `components/common/{ReviewLayout.tsx,LifecycleRail.tsx}` *(new)* ·
`components/common/OrderDetailDrawer.tsx` · `features/intents/components/{IntentReviewDrawer.tsx,IntentLifecycleRail.tsx}` ·
`features/orders/components/OrdersPage.tsx` · `lib/messages.ts`

**Verified.** `tsc --noEmit` clean · `biome lint src/` reports **12 findings, all pre-existing BL-04,
zero new** · `vite build` exits 0 · the second `OrderDetailDrawer` consumer still compiles.

**Not yet seen in a browser.** Structure and types are proven; the rendering is not. Worth a look at
both drawers side by side before this is called done.

### C-06 — Stat cards on Orders and Intents · 11 Aug 2026 · authorized by user

**Requested:** show the rest of what the stats endpoints return.

#### 🔴 Bug fixed: "Total Orders 0"

The endpoint returns **`all_orders`**. The card read `total_orders` / `total` / `orders` — **none of
which exist in the payload** — so it fell through to its `0` fallback and displayed *"Total Orders 0"*
directly above *"Delivered 496"*. The true figure is **715**. The other three cards happened to name
real keys, which is why only this one was wrong and why it survived unnoticed.

`OrderStats` was retyped from invented names (`total_orders`, `in_transit`, `delivering`, …) to the
nine the API actually sends.

#### Cards added

| Screen | Was | Now |
| ------ | --: | --- |
| Orders | 4 (1 broken) | **7 lifecycle** — Total · Confirmed · In Transit · Delivered · Delivery Failed · Cancelled · Refunded, plus **2 order types** shown separately |
| Intents | 4 | **10** — Total · New · Pending · In Sourcing · In Verification · Awaiting Customer · Ready to Bill · Awaiting Payment · Confirmed Today · Rejected |

#### Two structural findings that shaped the layout

**Express and Emergency are dimensions, not buckets.** The endpoint's contract states they cross-cut
every status, an order may be both, and they *"must never be added into a lifecycle total"*. They are
rendered under their own **Order Types** heading so nobody sums them with the seven above.

**`substitution_needed` is the parent of `awaiting_customer` and `ready_to_bill`, not their peer:**

```
substitution_needed = Count(status = PENDING_CUSTOMER_RESPONSE)             ← whole bucket
awaiting_customer   = same status, substitutions_confirmed_at IS NULL       ← sub-state
ready_to_bill       = same status, substitutions_confirmed_at IS NOT NULL   ← sub-state
```

The parent card was dropped in favour of its two halves, which are the states an admin acts on.

**This closes F6** ([INTENTS_REVIEW_MAPPING_AUDIT.md §11](./INTENTS_REVIEW_MAPPING_AUDIT.md)). The
card labelled "Substitutions Needed" never counted rows needing substitution — it counted the whole
pending-customer-response bucket, which is why it could never agree with the per-row flag that fires
a stage earlier at `verification_submitted`. The misleading label is gone rather than explained.

#### Arithmetic verified against the live database

| | Result |
| --- | --- |
| Orders | `52 + 119 + 496 + 4 + 1 + 43 = 715 = all_orders` — zero left in the `payment_received` transient |
| Intents | `8 + 3 + 0 + 6 + 0 + 0 + 72 = 89 = total_intents` |
| Sub-state identity | `substitution_needed (0) == awaiting_customer (0) + ready_to_bill (0)` ✓ |

`rejected` (3) and `confirmed_today` (1) sit outside the intent total by design: one is a terminal
off-ramp, the other counts orders that have already left the funnel.

**Files:** `features/orders/components/OrdersPage.tsx` · `features/orders/api/orderApi.ts` ·
`features/intents/components/IntentsPage.tsx` · `lib/messages.ts`

**Verified.** `tsc --noEmit` clean · `biome lint src/` reports **12 findings, all pre-existing BL-04,
zero new** · `vite build` exits 0.

### C-07 — Order-type filter on Orders and Intents · 11 Aug 2026 · authorized by user

**Requested:** an All / Express / Marine Emergency / Regular filter that hits the API and is visible
in the UI.

**Built against `type_counts`,** a block the backend added to both stats endpoints on 2026-08-11 and
which solves the three problems this feature has:

```json
"type_counts": { "all": 715, "regular": 546, "express": 129, "emergency": 49, "both": 9 }
```

- It is computed with `is_express`/`is_emergency` **removed** from the queryset, so selecting a type
  does not zero the other chips. Verified by the backend across tabs: `all_orders` follows the
  selection (715 → 129 → 546) while `type_counts` stays identical.
- It returns `regular` outright. Deriving it requires the overlap, and inclusion–exclusion is
  impossible without it: `regular + express + emergency − both == all`.
- It returns `both` (9), so nothing has to guess why 129 + 49 + 546 = 724 against a total of 715.

It is type-blind but **not** filter-blind: `search`, `date_from` and `partner_id` still apply, so the
chips show the type breakdown *within* the rest of the active filters.

**Applied.** A `PillToggle` above each table, driven by `?type=` in the URL so a filtered view is
shareable. It scopes the list **and** the stat cards — filter to Express and the lifecycle breakdown
becomes Express's breakdown, while the chips hold steady. The Express/Emergency cards were removed:
the chips carry the same two figures, are actionable, and add the complement the cards could not
express.

Same control on both screens. The intents endpoint carries the same block scoped to the open funnel,
so `type_counts.all == total_intents`.

**Two latent bugs fixed on the way.** `getOrderStats` and `getIntentStats` both took `void` and sent
**no parameters at all**, so neither screen's cards responded to any filter. The backend had been
fixed on 2026-08-11 to honour them — its docstring notes a filtered screen previously showed
`all_orders: 701` above a table of 27 rows — but the frontend never started sending them. Both now
pass the screen's scope.

**Also added:** the intents `cancelled` counter (unpaid cancellations; a paid one is a refund and
counts on the orders screen), which the endpoint returns and no card showed.

**Verified.** `?is_express=false` parses correctly — the view guards `parse_bool` with
`not in (None, "")`, so `false` is a real filter rather than being swallowed as empty, which is what
makes the Regular option work. `tsc --noEmit` clean · `biome lint src/` reports **12 findings, all
pre-existing BL-04, zero new** · `vite build` exits 0.

**Files:** `features/orders/{components/OrdersPage.tsx,api/orderApi.ts}` ·
`features/intents/{components/IntentsPage.tsx,api/intentApi.ts,types/intent.types.ts}` ·
`lib/messages.ts`

### C-08 — Type column + clickable status cards · 11 Aug 2026 · authorized by user

**Type column.** Added to both tables. Both list serializers already returned `is_express` /
`is_emergency`; the intents mapper simply wasn't reading them, so no API work was needed. Rendered
by a shared `OrderTypeBadges`, which draws **two badges when an order is both** rather than resolving
to one type — 9 of 715 orders and 1 of 89 intents carry both flags, and collapsing that would make
the column contradict the filter chips above it, where the same order legitimately appears under
Express *and* Marine Emergency. Regular is labelled rather than blank: it is the large majority, so
an empty cell would be ambiguous between "regular" and "not loaded".

**`?status=` not reaching the cards is correct, not a defect.** Reported after user testing; verified
against the view, which states it: *"`?status=` is intentionally ignored here — it picks one bucket,
and the cards exist to break the population down BY bucket."* Applying it would zero six of seven
cards and leave the seventh repeating the total. The three layers are consistent — type chips are
type-blind, status cards are status-blind, the table honours everything.

**Made the cards the control instead.** Each card that maps to a filter now sets `?status=` on click,
shows a ring when active, and clears when clicked again. Nothing on screen previously explained why
the cards ignored the status filter; making them *be* the filter removes the question, and adds a
one-click shortcut. `StatCard` already had an unused `onClick`; it gained an `active` prop and
`aria-pressed`.

**Two cards initially could not be clickable — since resolved by the backend.** ✅ Both derived
filters shipped the same day (`ORDER_DERIVED_FILTERS` added, `in_verification` slotted into
`INTENT_DERIVED_FILTERS`) and are now wired, so **every card on both screens drills in except
Confirmed Today**, which stays unclickable permanently by design. The backend defines `in_progress`
as `Q(status__in=ORDER_IN_PROGRESS_STATUSES)` — a reference to the same constant the card aggregate
reads, not a re-listed copy, with a test asserting they are the same object — so a card and its
drill-in cannot drift apart. Card-count == row-count verified on both screens (Orders · In Transit
119/119, Intents · In Verification 6/6, Delivered 496/496).

The original constraint, for the record: The list's `?status=` takes exactly one
status (`ORDER_FILTERABLE_STATUSES`), so an aggregate card has no value to send:

| Card | Aggregates | Needs |
| ---- | ---------- | ----- |
| Orders · **In Transit** | the 5 `ORDER_IN_PROGRESS_STATUSES` | `?status=in_progress` |
| Intents · **In Verification** | `partner_verifying` + `verification_submitted` | `?status=in_verification` |

Both are left unclickable rather than given an affordance that would 400. The pattern already exists
on the intents side — `INTENT_DERIVED_FILTERS` resolves `awaiting_customer`, `ready_to_bill` and
`cancelled` — so this is extending it, not inventing it. Intents' **Confirmed Today** stays
unclickable by nature: it counts a different dimension (payment completed today, i.e. intents that
have already left the screen), not a funnel status.

**Label disambiguated.** `cancelled` resolves differently per screen and both are correct: on
Intents it is the derived filter for **unpaid** cancellations (67), on Orders the raw `cancelled`
status over a paid-only population (1). Two orders of magnitude apart under one word, so the intents
card and dropdown now read **"Cancelled (Unpaid)"** — the label answers the question rather than
inviting it.

**Also:** the intents status dropdown now lists the derived filters. It excluded them on the
grounds that the API collection didn't document them and an unknown value would 400 — but the view
resolves them explicitly, and two are now selectable from the cards, so the dropdown has to be able
to display what is active.

**Files:** `components/common/{OrderTypeBadges.tsx (new),StatCard.tsx}` ·
`features/orders/components/OrdersPage.tsx` ·
`features/intents/{components/IntentsPage.tsx,api/intentApi.ts,types/intent.types.ts}` ·
`lib/messages.ts`

**Verified.** `tsc --noEmit` clean · `biome lint src/` reports **12 findings, all pre-existing BL-04,
zero new** · `vite build` exits 0.

### C-09 — Stats UI guide, remaining items · 11 Aug 2026 · authorized by user

Worked the backend team's *Admin Dashboard — Stats UI Guide* checklist. Eight of thirteen items were
already shipped in C-06/C-07/C-08; this entry covers the rest, all of which follow the guide's one
rule — **never sum the response** — by making each field's kind legible in the layout.

| Kind | Treatment |
| ---- | --------- |
| **Bucket** — mutually exclusive, sums to the total | a card |
| **Sub-bucket** — already counted inside a bucket | a line *inside* its parent card |
| **Dimension** — belongs to no total | a chip strip (type) or a standalone stat |

**Totals became headings.** `total_intents` and `all_orders` are no longer cards — the screen now
reads "89 open intents" / "715 orders" under the page title. As a card a total sits beside the six
buckets it is the sum of, which is what invites adding it in; as a heading it is unmistakably the
whole. `PageHeader` gained an optional `subtitle` for exactly this, documented as a figure slot and
not a return of the descriptive subtitles that were deliberately removed.

**Sub-buckets moved inside their parent.** `substitution_needed` is a card again, with
`awaiting_customer` and `ready_to_bill` nested within it. **This reverses the earlier decision** to
drop the parent and promote the two halves (C-06) — that layout also summed correctly, but the guide
is right that six cards matching the six funnel buckets, with the split shown as detail, states the
containment rather than leaving it to be inferred. `StatCard` gained a `breakdown` prop; the nested
rows drill in independently and stop propagation so a sub-bucket click does not also fire the
parent's.

**Closed intents separated.** `rejected` and `cancelled` sit under a *Closed* heading, outside
`total_intents` — terminal, not open work.

**`confirmed_today` left the funnel row.** It is throughput — intents that *left* the screen today by
being paid — so it renders as a standalone line belonging to no total.

**Already shipped, re-verified against the guide:** same query string to stats and list ·
`?status=` never sent to stats · chips fed from `type_counts`, never the top-level
`express`/`emergency` · chips not rendered as a segmented total · Cancelled card present ·
In Transit → `?status=in_progress` · In Verification → `?status=in_verification` · Confirmed Today
unclickable. The intents screen has **no** date picker, so nothing to hide.

**Files:** `components/common/{StatCard.tsx,PageHeader.tsx}` ·
`features/orders/components/OrdersPage.tsx` · `features/intents/components/IntentsPage.tsx` ·
`lib/messages.ts`

**Verified.** `tsc --noEmit` clean · `biome lint src/` reports **12 findings, all pre-existing BL-04,
zero new** · `vite build` exits 0.

### C-10 — Retry refreshes cards and table together · 11 Aug 2026 · authorized by user

Found while confirming that a status change correctly issues **no** stats request. The error-state
retry called `refetch` on the list query only, so a screen that failed to load came back with fresh
rows sitting under whatever the counters happened to be holding. The two are meant to describe the
same population; a retry that refreshes one of them breaks that for as long as the page stays open.

Both screens now retry both queries. Narrow case — it needs a failed load first — but the
inconsistency was real.

**Files:** `features/orders/components/OrdersPage.tsx` · `features/intents/components/IntentsPage.tsx`

**Verified.** `tsc --noEmit` clean · `biome lint src/` reports **12 findings, all pre-existing BL-04,
zero new** · `vite build` exits 0.

**Confirmed correct, not changed:** filtering by status issues no stats request at all. The stats
args (`search`, `dateFrom`, `dateTo`, `isExpress`, `isEmergency`) do not include `status`, so they are
unchanged and RTK Query serves from cache. The backend strips `?status=` from that endpoint by
design, so a second call would return byte-identical numbers. Verified against the user's server log:
a date change fires both endpoints, a status change fires only the list.

**Still open (declined earlier, unchanged):** cards refresh per navigation, not on a timer. A page
left open holds its numbers regardless of filter activity. Revisit only if live figures are wanted —
see C-01.

### C-11 — Status filter moved to the column header · 11 Aug 2026 · authorized by user

**Reported:** the "All Status" dropdown is not global, so it should not sit in the page toolbar.

Correct, and it was the last place the screen still implied otherwise. Search, date range and order
type all rescope the **whole screen** — table, cards and chips. Status narrows the **table only**,
because the cards are the status breakdown and the endpoint strips `?status=` by design. Sitting in
the same toolbar row as the three global controls gave it a reach it does not have, which is exactly
the confusion that prompted the earlier "shouldn't both APIs fire?" question.

It now lives on the **STATUS column header** of both tables, as a dropdown that opens from the header
label. The control sits on the thing it filters.

**Used the existing component.** `ColumnFilterHeader` was already written, documented as *"generic by
design — any DataTable column can opt in via its `filter` config"*, and `DataTable` already renders
it for any column carrying a `filter` prop. **Neither had a single consumer.** So this is adopting a
built-in path, not adding one — no new component, no change to `DataTable`.

The status-legend info button stays in the toolbar: it explains all 18 statuses, not the selected
one, so it is reference material rather than a filter.

**Files:** `features/orders/components/OrdersPage.tsx` · `features/intents/components/IntentsPage.tsx`

**Verified.** `tsc --noEmit` clean · `biome lint src/` reports **12 findings, all pre-existing BL-04,
zero new** · `vite build` exits 0.

### C-12 — Analytics: default period, searchable product picker · 12 Aug 2026 · authorized by user

**Default period → Year.** The screen opened on a 7-day window that is empty on this data, so it
rendered blank charts and read as broken rather than as a narrow period — the operator had to widen
it before seeing anything.

**Product picker rebuilt — and this closes a BL-03 site.** `useProductSales` asked for `limit: 100`
against `BaseListProductsView`, which caps a page at 50 (`CustomPagination`). The extra 50 were never
sent and no error was raised, so the picker silently listed the first 50 products and **the 51st
could not be charted at all.** It now searches server-side, pages on demand, and offers a reset.

New shared `SearchableSelect` (`components/common/`): trigger, search field, scrollable options,
"Load more", and an optional clear row. It exists because `DropdownSelect` renders whatever array it
is handed, so every long-list caller fetched one page and hoped. **It never filters locally** —
filtering a truncated page would look like it worked while still hiding everything past the cap.

The reset is worded **"Show top product"**, not "Clear": clearing reverts to the endpoint's own top
product rather than emptying the chart, so the label states what happens.

**BL-03 now stands at 7 remaining call sites** (was 8). The others are category and emergency-category
pickers in products/spares plus the substitution candidates panel; `SearchableSelect` is the
ready-made fix for each.

**Files:** `components/common/SearchableSelect.tsx` *(new)* ·
`features/analytics/{hooks/useAnalyticsFilters.ts,hooks/useProductSales.ts,components/ProductSalesCard.tsx}` ·
`lib/messages.ts`

**Verified.** `tsc --noEmit` clean · `biome lint src/` reports **12 findings, all pre-existing BL-04,
zero new** · `vite build` exits 0.

### C-13 — Analytics picker on the whole catalog · 12 Aug 2026 · authorized by user

Adopted the backend's 12 Aug additions, which closed a defect C-12 had only half-fixed.

**The picker could reach 36 of 50 products.** C-12 fixed the `limit: 100` truncation but kept reading
`get-products/`, which serves the **general catalog only** — regular + express. The **14
marine-emergency products were absent from a perfectly ordinary 200**, 13 of them with real sales.
Two silent failures stacked on one control, and the second was invisible until the backend documented
the two-endpoint split.

Now on `get-all-products/` — one paginated, searchable list spanning all three types, `catalog_type`
on every row.

**Also adopted:**

| Change | Effect |
| ------ | ------ |
| `product.catalog_type` / `is_active` / `is_deleted` | the card now labels what it charted |
| Delisted label | a soft-deleted product is **badged, not hidden or errored** — it reports real history, and delisting does not undo sales made inside the window |
| `growth` typed `number \| null` | `null` means *no baseline*, not zero growth; both render a dash, never "0%" |

**The auto-pick change is a backend behaviour change on a shipped screen.** With no `product_id` the
default previously resolved to a **soft-deleted** product on live data — and since pickers exclude
deleted products, an operator who navigated away could never return to it. The default now chooses
among still-listed products only; an explicit id still resolves anything and reports its full
history. Two backend regression tests pin both halves. Recorded here so the change in default
product is not read as frontend drift.

**Not reconcilable, by design:** special-request revenue is variant-less, so it never enters
`DailyProductMetrics`. Summing every product's revenue will come out **below** sales-trend by exactly
that volume. The two are kept out of any side-by-side comparison.

**Files:** `lib/apiEndpoints.ts` · `features/products/{api/productApi.ts,index.ts}` ·
`features/analytics/{hooks/useProductSales.ts,types/analytics.types.ts,components/ProductSalesCard.tsx}` ·
`lib/messages.ts`

**Verified.** `tsc --noEmit` clean · `biome lint src/` reports **12 findings, all pre-existing BL-04,
zero new** · `vite build` exits 0.

**Follow-up (C-13a).** The picker now shows each product's **catalog type** on its row and carries
**type chips** — All types / Regular / Express / Marine Emergency — applied server-side via
`get-all-products/?catalog_type=`. Requested because an operator had to know the type *before*
choosing, and a name alone does not say whether a product is a marine-emergency spare.

The reset row is now labelled **"Clear"**, and the picker no longer claims a selection it was not
given. It previously displayed the endpoint's auto-picked product, so an operator arriving at
Analytics saw a product name in the control with no way to tell it from one they had chosen — a
filter that appeared to be applied and could not be removed.

The control now shows **"Select a product"** until one is picked. The chart is not left anonymous:
when no explicit pick exists the card title names the subject — *"Top product · Fuel Injection Pump
Assembly"* — so the source of the figure is stated exactly where it changes. Clearing returns to that
state; the chart cannot be empty, because the endpoint always falls back to its own top product.

**Open — raised with the backend:** `get-all-products/` is not yet in the Postman collection, so the
drift check that underwrites [§4.3](#43-contract-gates-) no longer covers the full route table.

### C-14 — Dashboard drill-through rule + Special Request Cancellation · 13 Aug 2026

**The rule, established jointly with the backend and verified against live data.** A dashboard
counter may link to a list **only** when three things hold:

1. **Same base population** — both sides start from the same queryset
2. **Same predicate** — the status/filter test is identical
3. **Same date field** — both window on the same column, or neither windows at all

Two conditions are not enough. `refunded` shares population *and* predicate with the Orders list and
still reads **11 against 43 rows**, because the card windows on `refunded_at` and the list cannot
filter on that column at all.

**Measured on live data:**

| Card | Card | Rows | Fails on |
| ---- | ---: | ---: | -------- |
| `in_progress` | 119 | 119 | — passes |
| `delivery_failed` | 4 | 4 | — passes |
| `pending_intents` | 3 | 3 | — passes |
| `location_reports_pending` | 4 | 4 | — passes |
| `special_request_cancellations` | 3 | 3 | — passes |
| `cancelled` | **13** | **1** | population **and** date |
| `refunded` | **11** | **43** | date |
| `orders_placed` | — | — | population and date |

**The observation that matters most:** *every card that currently passes does so because neither
side has a date filter.* **Not one card survives a date-scoped comparison.** The third condition is
not a checklist item — it is the one doing the work, and it is unproven across the whole dashboard.

The two failures point in **opposite** directions — one card reads 13× its list, the other a quarter
of it. Checking only one would have supported the wrong diagnosis ("the card is stale") instead of
the right one ("the definitions differ"). This is the same class as the `total_orders` bug in C-06,
which read 0 against 715: a plausible number is not a verified one.

**Wired:** Special Request Cancellation → `/requests?status=rejected`. Both sides run
`SpecialRequest.objects.exclude(is_deleted=True)` filtered to `status=REJECTED`, and
`ListSpecialRequestsView` accepts only `status` and `search` — so the third condition holds
*structurally*, not by luck. Card = 3, rows = 3, verified live by both sides independently.

Label kept as **"Cancellation"** pending product confirmation: `REJECTED` is the database's word, and
rejected/cancelled are distinct events elsewhere in this product.

**Still non-clickable, unchanged:** Assignments and Verifications (parked routes — a product
decision), Cancelled and Refunded (await the decision below), Expired Deltas and Location Reports —
the latter two have **no cross-order list endpoint to link to at all**.

**Open product decision (Cancelled / Refunded).** Recorded in C-14 rather than acted on:
`refunded` could drop its window and become a snapshot, matching the Orders list exactly — but it
would then leave the "This Period" group and move to the snapshot rows, so the drill-through decision
and the C-13 card grouping are coupled. `cancelled` is harder: 67 of its 68 records are **unpaid**
intents, which the Orders screen structurally cannot show, and both slices are already displayed
correctly elsewhere — Intents "Cancelled (Unpaid)" and Orders "Cancelled". The dashboard's single
figure matches neither screen.

### C-15 — Drill-through regression test (backend) + open items · 13 Aug 2026

**Backend built the test.** `admin_panel/tests/test_dashboard_drillthrough.py` — 9 tests, suite green
at 2826. A `WIRED_CARDS` table drives one generic assertion, so protecting a new drill-through is a
one-line addition. Two design details worth recording:

- `test_no_wired_card_is_trivially_zero` stops the file passing vacuously at `0 == 0`, and was
  verified to go red (dropping the paid filter from `in_progress` produces 4 failures).
- `UnwiredCardsStayUnwiredTests` records **why** each unwired card is unwired as executable facts —
  an unpaid cancellation moves the card and not the list; an old refund sits outside the window but
  on the list; `orders_placed` counts 2 where the list counts 1. Re-wiring one has to pass those.

**Its stated limit:** all five pairs are date-free on both sides, so it exercises population and
predicate and **cannot touch `date_field`**. That condition remains untested until a date-scoped
drill-through exists.

**⚠️ This test protects the backend half only.** The frontend has no tests at all (BL-05), so the
card→URL mapping on this side is unprotected: if a future change points a card at the wrong filter,
nothing catches it. That is a larger exposure than any single card in this work.

**Answered:** a declared `(population, predicate, date_field)` registry per card is the right fix,
**provided the triple generates the query rather than describing it** — a registry maintained
alongside a hand-built aggregate is a second definition that drifts, which is the exact defect class
this session has been removing. It is a real refactor of `DashboardStatsView` and wants its own task.
`?date_field=` should be general across both lists but validated against a per-screen allowlist,
400-ing on an invalid pairing (`refunded_at` with `?status=cancelled`) rather than silently returning
zero rows. A cross-order delta list is ~half a day and unscheduled — the cheapest remaining unblock.

**✅ Product decision, 13 Aug 2026 — `refunded` is period refund volume.** Orders whose `refunded_at`
falls inside the selected window: *Today* → refunds completed today, *This Month* → refunds completed
this month. It is **not** a snapshot of orders currently in the refunded state. Option (b), not (a).

**This requires no frontend change** — the card already reads the backend's period-scoped `refunded`
counter, already sits in the **This Period** group, and is already non-clickable. The decision
confirms the implementation rather than altering it.

It **stays non-clickable** until a destination exists whose population uses the same
`refunded_at + selected period` predicate. When it does, the frontend must consume that filter
explicitly — **never infer it from `?status=refunded`**, which is all-time and paid-only and reads
43 against the card's 11.

**Standing QA rule adopted:** every dashboard drill-through is verified against the **exact route and
query parameters**, not the underlying view class — see the alias-suppression correction in
[§4.3](#43-contract-gates-).

### C-16 — Account Management creates a real partner · 13 Aug 2026 · authorized by user

**Reported:** selecting the Delivery Partner role in Account Management → Create User should open the
same form the Delivery Partners screen uses.

The form was the visible half. The functional half is that the two screens post to **different
endpoints, and only one of them produces a working partner**:

| Endpoint | Creates |
|---|---|
| `admin/create-user/` | `User` only — `AdminCreateUserSerializer.create()` builds the user and returns it |
| `partner/create/` | `User` + `DeliveryPartnerProfile`, then the view sends the invite |

So a delivery partner created from Account Management had no profile: no partner code, no
capabilities, no assigned port, no availability flag. **Two such records already exist in the dev
database** — 17 users with `role=delivery_partner` against 15 `DeliveryPartnerProfile` rows
(`kunal.k@`, `pratap.patil@`); the first is visible in the active-partners payload as
`"partner_code": null, "is_available": null`.

The drawer now routes on role — `partner/create/` for `delivery_partner`, `create-user` for
everything else — and renders `CapabilityFields` plus the port picker only for the partner role,
since no other role has them.

**Not fixed by this, and stated to the user:** the two existing profile-less partners are not
repaired — both screens create rather than backfill. And `admin/create-user/` still accepts
`role=delivery_partner` from Postman or any future caller, so the half-record remains reachable
outside the UI; whether it should 400 is an open backend question.

**Files:** `features/account-management/components/CreateUserDrawer.tsx` ·
`features/account-management/schemas/createUser.schema.ts` ·
`features/account-management/lib/roles.ts` (role note corrected — it claimed partner details were
managed elsewhere, which this change made false) · `features/partners/index.ts` (exports
`CapabilityFields`)

### C-17 — One delivery timeline per order drawer · 13 Aug 2026 · authorized by user

**Reported:** the order review drawer shows two delivery timelines; remove the one in Fulfilment.

Both were rendering the same `order-timeline` steps: the `LifecycleRail` in the summary strip
(horizontal, "Stage 6 of 10", visible from every tab) and the vertical `Timeline` inside the
Fulfilment tab. This was introduced by C-05, which added the rail without removing the ladder that
predated it. The rail is the one that survives — it is visible from all three tabs, so the tab-local
copy was both duplicated and less reachable.

**Trade-off recorded:** the vertical timeline carried per-step **timestamps**; the rail does not, so
those are no longer shown anywhere in this drawer. Removed on the user's explicit instruction. If a
timestamped view is wanted later, it belongs in the rail (a popover per segment), not as a second
ladder.

`timelineLoading` went with it — the rail falls back to status-derived stages while the query is in
flight, so there was no longer a loading state to thread through. `ORDERS.DRAWER.TIMELINE` was the
only consumer of that string and is deleted.

**Not touched:** `DashboardOrderDrawer` still renders `Timeline`. It has no rail, so its ladder is
the only one on that surface — not a duplicate.

**Files:** `components/common/OrderDetailDrawer.tsx` · `features/orders/components/OrdersPage.tsx` ·
`lib/messages.ts`

**Verified.** `tsc --noEmit -p tsconfig.json` clean · `biome lint src` reports **11 errors + 1
warning, all pre-existing BL-04, zero new** · `vite build` exits 0.

⚠️ **`npm run build` fails, and did so before this change.** Its `tsc -b` step trips on
`tsconfig.node.json(8,35): error TS5096` — `allowImportingTsExtensions` without `noEmit` on a
composite project. Confirmed pre-existing by stashing the three modified files and re-running: same
error, identical output. This is **BL-02 surfacing** — that project exists to typecheck
`vite.config.ts`, and the emitted `vite.config.js` / `vite.config.d.ts` artifacts (10 Aug) are the
shadowing files BL-02 records. The production bundle is unaffected; `vite build` alone succeeds.

### C-18 — Reason visibility on terminated orders and intents · 13 Aug 2026 · authorized by user

**Audit finding first.** Five backend fields answer "why did this end here", every one of them
already arriving in the browser and every one discarded in a `transformResponse` mapper:

| Reason | Model field | Rows carrying it (dev DB) |
|---|---|---|
| Intent rejected | `Order.rejection_reason` | 2 of 3 |
| Cancelled | `Order.cancellation_reason` + `cancelled_at` | 65 of 69 |
| Delivery failed | `DeliveryAssignment.failure_reason` + `failed_at` | 2 assignments |
| Assignment declined | `DeliveryAssignment.rejection_reason` | 1 |
| Payment declined | `payments[].attempts[].failure_message` | — |

A cancelled order showed the rail's red banner — *"Cancelled — this order is closed"* — and nothing
else. Backend commit `1b12fc7` (same day) added the first three to **both list serializers**, so the
whole gap became frontend-only.

**Selection lives in one place.** `lib/terminalReason.ts` maps status → which field applies, and
both lists plus both drawers call it. Three surfaces answering one question independently is how
they drift; the module is deliberately **selection only** — every string is the backend's, nothing
is derived from status, availability or the timeline, and an order with no recorded reason returns
`""` rather than a manufactured sentence.

**Where it shows.** Muted line under the status badge on both lists (`RowReason`); inside the
existing terminal notice in both review drawers (`LifecycleRail`, shared by both, so one edit);
`failure_reason` beside the partner in the Fulfilment tab. **No new sections and no new requests** —
every field rides a response the screen already fetched.

**`items[].reason` (intent list).** The backend composes a per-line explanation — *"Out of stock —
none available"*, *"Short by 2: only 1 of 3 available"* — which was mapped into `IntentItem.reason`
and never rendered. Now shown under the items cell, prefixed with the item it belongs to because a
row holds several. `null` means **nothing to explain** (usually unverified) and is never read as
unavailable; availability state still comes from `is_available` alone.

**Payment declines are scoped to the payment line**, by explicit instruction: a refused card
explains why an order is *unpaid*, which is a different question from why an order *closed*. They
render under the Overview's Payment row and appear in neither the list column nor the terminal
banner. Each attempt is listed, because `Payment.failure_reason` keeps only the last decline.

**One correctness detail.** A failed delivery is retried by *reassigning*, so the failure can sit on
a past assignment. The drawer mirrors the backend's own `timeline.delivery_failure` — the latest
assignment carrying a `failed_at`, taken from the newest-first `assignments[]` ordering. Timestamps
are display-formatted strings and are therefore never compared.

**Empty is empty.** `RowReason` renders `null` when there is no reason, so the 4 cancelled orders
with no recorded reason (and every non-terminal row) show the badge alone. Reason text is never
sliced; the list line clips to two lines in CSS with the full string on `title`.

**Deliberately not done** (both are backend/product decisions, held separately at the user's
direction): widening `cancellation_reason` beyond `CharField(50)` — the admin dialog still accepts a
sentence and `AdminCancelOrderView` still does `reason = reason[:50]` — and adding `cancelled_by`,
without which a cancellation does not say whether the sailor or an admin decided.

**Files:** new `lib/terminalReason.ts` · new `components/common/RowReason.tsx` ·
`components/common/LifecycleRail.tsx` · `components/common/OrderDetailDrawer.tsx` ·
`components/common/tableColumns.tsx` · `features/orders/types/order.types.ts` ·
`features/orders/components/OrdersPage.tsx` ·
`features/orders/components/OrderAssignPartnerSection.tsx` ·
`features/intents/types/intent.types.ts` · `features/intents/api/intentApi.ts` ·
`features/intents/components/IntentsPage.tsx` ·
`features/intents/components/IntentReviewDrawer.tsx` · `lib/messages.ts`

**Follow-up (C-18a) — the Orders list ignored the canonical status colours.** Reported from the
screen: a `delivery_failed` row rendered a neutral pill beside a red `cancelled` one.

The cause was not the new reason line. `StatusBadge` picks its colour by matching the **display
label** against a hardcoded list written for generic active/inactive rows — `"cancelled"` and
`"delivered"` are in it, `"delivery failed"` is not, so it fell through to `neutral`. Every other
post-payment status fell through too.

`lib/orderStatuses.ts` already carries a `variant` per status and its own docstring says *"consume
this everywhere order/intent statuses are labelled, ordered, coloured, or explained (Intents,
**Orders**, Assignments, Verification) — never re-declare status keys/labels inline."* The Intents
list obeys that; the Orders list did not, so the status-legend popup and the table were colouring
the same 18 statuses from two different sources. The list now reads the canonical variant off the
**raw status key**, not the label.

Beyond the reported row this also recolours `order_confirmed` (→ success), `partner_assigned`
(→ info) and `items_collected` / `at_port` / `at_berth` (→ teal), all of which were neutral against
a legend that already called them otherwise. `delivered`, `cancelled` and `refunded` are unchanged.

**Verified.** `tsc --noEmit -p tsconfig.json` clean · `biome lint src` **11 errors + 1 warning, all
pre-existing BL-04, zero new** · `vite build` exits 0 · diff carries no new query, mutation or
fetch. `npm run build` still fails at the pre-existing `tsconfig.node.json` TS5096 config error
recorded in [C-17](#c-17--one-delivery-timeline-per-order-drawer--13-aug-2026--authorized-by-user).

### C-19 — `needs_verifier_partner` / `needs_delivery_partner` · 13 Aug 2026 · authorized by user

**The defect these fields fix.** The panel decided "does this order have a partner?" from
`partner_allocated` / an active assignment existing. A paid order whose one active assignment was a
**finished verification** answered *yes* — so the verifier's name filled the PARTNER column, and the
drawer offered **"Reassign Delivery Partner"** for what was actually the first delivery assignment.
Nobody was taking the goods to the vessel. The backend's own note records that three surfaces agreed
with each other and all three were wrong.

`orders/assignment_lifecycle.partner_requirements` is now the single answer, sent on both list
serializers and the detail one. The frontend reads it and derives nothing: not from `status`, not
from `partner_allocated`, `partner_name`, `active_assignment.status`, `can_verify` or `can_deliver`.

**`lib/partnerRequirement.ts`** turns the pair into `verify | deliver | none | unknown`. `unknown` is
deliberate: the flags are documented as booleans that are never null, so an absent one is **reported
in the UI** (`readPartnerNeed` yields `null`, never `false`) rather than read as "nothing needed".

**Where it decides the UI:**

| Surface | Effect |
|---|---|
| Orders drawer | Primary button becomes **Assign Delivery Partner** / **Assign Verification Partner**; picker fetches that capability; hint states the requirement |
| Intents drawer | Footer action and section heading become **Assign Verification Partner**; the picker opens on any unserved verify-phase status, not just `intent_received` |
| Both lists | `PartnerRequirementBadge` under the partner/status cell |

**What these flags do *not* answer — recorded because it shaped the implementation.** They say the
order is *short of* a partner, not whether the admin *may* assign one. Read against
`assignment_lifecycle`: an order at `partner_assigned` has its deliverer and reports `false`, and a
`delivery_failed` order also reports `false` — the failed assignment deliberately stays active
(`is_active` untouched, failure recorded as a stamp), while that module's own docstring calls
reassignment the documented recovery. Gating the picker on the flags alone would therefore have
removed the retry path from the exact screen that exists to run it. So the flags drive **the
requirement and its wording**; each screen keeps its existing rule for when a picker is offered
(`closed` / `payment_pending` on Orders, `partner_verifying` on Intents), and with nothing
outstanding the control degrades to the plain "Reassign" it has always been.

**Terminology corrected.** The intents drawer's own labels read "Assign / Reassign **Delivery**
Partner" — the wrong capability on every action of a `can_verify` surface. Now "Verification
Partner" throughout, matching the backend's `needs_verifier_partner` ↔ `can_verify` pairing.

**Untouched by instruction:** the 409 `requires_confirmation` path. The backend has *proposed* that a
completed verifier should not require confirmation for a first delivery assignment but has not
implemented it, so the existing handling stands until they confirm. Until then Case B still raises
the misleading *"This order is currently assigned to FE Verifier…"* dialog on the second click.

**Found, not changed (out of scope):** `features/express/components/ExpressItemDrawer.tsx:84` still
does `isReassign = !!item.partner_allocated` — the same defect on the Express screen, which reads the
same `OrderListSerializer` and therefore already receives the new fields.

**Files:** new `lib/partnerRequirement.ts` · new `components/common/PartnerRequirementBadge.tsx` ·
`features/orders/types/order.types.ts` · `features/orders/components/OrdersPage.tsx` ·
`features/orders/components/OrderAssignPartnerSection.tsx` · `features/intents/types/intent.types.ts`
· `features/intents/api/intentApi.ts` · `features/intents/components/IntentsPage.tsx` ·
`features/intents/components/IntentReviewDrawer.tsx` · `lib/messages.ts`

**Verified.** `tsc --noEmit -p tsconfig.json` clean · `biome lint src` **11 errors + 1 warning, all
pre-existing BL-04, zero new** · `vite build` exits 0 · `partner_allocated` no longer appears in any
Orders or Intents decision (remaining hits are comments and the out-of-scope Express screen).

### C-20 — Special Requests consumes the 2026-08-14 contract · 14 Aug 2026 · authorized by user

**Audit first, then the backend closed four gaps.** Reviewing the built screen against the
Special Request API doc found three frontend defects and produced four backend questions; the
backend shipped answers to all four, and this entry is the frontend half.

**Three findings from the audit:**

1. The **"Order ID" column showed the `SR…` reference**. An order only exists once the sailor
   pays, and its `AM…` number wasn't in the payload at all. Renamed to **Reference**; the order
   number now appears on the detail with a link into the Orders screen.
2. The **status filter sat in the toolbar** beside search, implying it rescoped the cards. It
   doesn't — the cards are the status breakdown and the endpoint ignores `?status`. Moved to the
   **STATUS column header**, the same correction made on Orders and Intents in
   [C-11](#c-11--status-filter-moved-to-the-column-header--11-aug-2026--authorized-by-user).
3. The list was **ordered alphabetically by raw status** (`accepted, pending, quote_sent…`) while
   reading as a queue — finished work on top, the two pending rows below it. Fixed server-side:
   `?sort=workflow` is now the default. **No client-side sort was added** — it would reorder ten
   rows of N and be wrong across pages.

**Cards now follow `search` and never `status`.** Confirmed against this repo before accepting
the backend's reasoning: `AdminOrderStatsView` and `IntentRequestsStatsView` behave identically,
so this makes the three screens consistent rather than special. No "all time" disclaimer needed.

**`awaiting_rebill` is nested, not a seventh card** — it is a slice of `sourcing_confirmed`, so it
renders through `StatCard.breakdown` (the mechanism the intents substitution sub-buckets already
use). As a peer it would count the same requests twice and break the five-sum-to-total contract.
Its row-level counterpart is the new `rebill_requested` field, so the card names a worklist the
table can now identify — that field was added at this session's request precisely because
positional inference under the workflow sort dies at a page boundary.

**The quote screen stopped flying blind.** The admin detail now carries `shipping_address`,
`port`, `anchorage`, `category`, `order`, `platform`, `notes`, `quote_description` and the split
image lists. Consequences here: a Destination block (the delivery was previously being priced
unseen), and **`category_id` is no longer sent on every quote** — it prefills from the request's
own category and is omitted unless changed, so re-quoting can no longer silently re-file a
request. It is still form-required, which now bites only on a legacy row that has no category —
exactly when the API demands one.

**`pending_delivery_changes` renders as a before/after diff.** The staged snapshot is not applied
until generate-bill folds it in, so the current values stay in the rows above and the changed
keys are struck through against their replacements. Includes the anchorage note: a port change
without an anchorage clears the existing one when quoted.

**The description split.** `description` / `notes` are the sailor's and are relabelled as such;
`quote_description` is the admin's and is written by the quote form. **The quote box renders only
when `quote_description` is non-empty** — no identical-string heuristic. That was possible
because the backend *withdrew* its own backfill: it had assumed the surviving `description` on a
quoted row was the admin's text, and real rows disproved it (they still carry the `"\n\nNotes: …"`
marker only the submit path writes, evidence the panel's prefill-and-resend workaround meant the
overwrite mostly never happened). Neither field is touched on historical rows, so
`quote_description` is `""` there and the box simply doesn't appear.

**Also:** `quote_description` is omitted from the payload when unchanged, since an omitted key now
leaves the previous quote alone — which is what a re-quote that only moves the price wants.

**Files:** `features/special-requests/types/specialRequest.types.ts` ·
`features/special-requests/api/specialRequestApi.ts` ·
`features/special-requests/components/SpecialRequestsPage.tsx` ·
`features/special-requests/components/SpecialRequestDetailDrawer.tsx` ·
`features/special-requests/components/GenerateBillDialog.tsx` ·
`features/special-requests/schemas/specialRequest.schema.ts` · `lib/messages.ts`

**Still open (backend, not requested here):** sailors cannot upload images (gap #1); the rebill
counter is invisible to the sailor (gap #3); `request-changes` has no departure-after-arrival
check, so the UI must validate it (gap #4).

**Verified.** `tsc --noEmit -p tsconfig.json` clean · `biome lint src` **11 errors + 1 warning,
all pre-existing BL-04, zero new** · `vite build` exits 0. One transient regression was caught and
fixed during the run: `GetSpecialRequestStatsParams | void` tripped `noConfusingVoidType` (12
errors), the same rule an order-stats union hit earlier; the union was unnecessary since the page
always passes an argument.

---

## 11. Method

Every result above is a command executed against the running system at commit `e4f1373`, not an
inference from source. Route, operation and endpoint counts were extracted mechanically — RTK Query
operations by matching `builder.query` / `builder.mutation` declarations, Postman counts by walking
the collection JSON. The `03 · Admin Panel` subsections sum to exactly 202, independently matching
the prior audit's figure.

The drift check was run against the live backend with the collection under test passed explicitly,
not against a copy.

**Limitation.** §7 is not a caveat, it is the finding: this baseline covers static and contract
state completely and runtime UI state not at all. It is a floor to measure from, not a statement
that the console works.
