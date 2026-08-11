# Phase 7 — Implementation report (F1, F2, F4) + F5 investigation

**Date:** 11 August 2026
**Companion to:** [API_INTEGRATION_AUDIT.md](./API_INTEGRATION_AUDIT.md)
**Backend changes:** none. No file outside `anchor-mart-admin/src` was modified.

Every change below is traced to a backend fact. Where evidence ran out I stopped and recorded a
decision instead of guessing — those are in §5.

---

## 1. Test results

| Check | Before | After |
| ----- | ------ | ----- |
| Type check (`tsc -p tsconfig.json --noEmit`) | PASS | **PASS** |
| Lint (`biome lint src`) | 12 findings | **12 findings** (unchanged — all pre-existing a11y/style in shared components) |
| Production build (`npm run build`) | FAIL (F5) | **FAIL (F5, untouched — see §4)** |
| `vite build` alone | not measured | **PASS — full `dist/` produced** |
| Changed modules served by Vite | — | **8/8 HTTP 200** |
| Frontend tests | none exist | none exist |

No end-to-end run against a signed-in session: that needs admin and sub-admin credentials I do not
have. Everything below is verified by reading the backend view/serializer and by type/lint/transform
checks. **The permission hiding and the server-side search are not yet confirmed against a live
login.**

---

## 2. F1 — pagination and server-side search

### Root cause

`CustomPagination.max_page_size = 50`. DRF's `_positive_int(..., cutoff)` returns
`min(requested, 50)` (`rest_framework/pagination.py:256-263`, `_positive_int` line 30), so an
over-large `page_size` yields a short page that looks complete. The partner list asked for 100, got
50, and then filtered *that* in the browser — so on a deployment with more than 50 partners,
searching for the 51st reported "no results" for a partner that exists.

### Verified before changing anything

`AdminPartnerList` reads `search`, `status` and `is_active` server-side, and `search` matches
`partner_id`, `user__email`, `user__first_name`, `user__last_name`.

### Changes

| File | Change |
| ---- | ------ |
| `src/lib/constants.ts` | New `API_MAX_PAGE_SIZE = 50`, documenting that over-asking is capped, not rejected |
| `src/features/partners/types/partner.types.ts` | New `GetPartnersParams` (`page`/`limit`/`search`/`status`) and `PARTNER_PAGE_SIZE` |
| `src/features/partners/api/partnerApi.ts` | `getPartners` now takes params and sends `page`, `page_size`, `search`, `status` |
| `src/features/partners/components/PartnersPage.tsx` | Removed the client-side `filteredPartners`; URL-driven `page`/`search`, 300 ms debounce, `searchLoading`, real pagination — mirrors `SailorsPage` exactly |
| `src/features/assignments/api/assignmentApi.ts` | `page_size: 100` → `API_MAX_PAGE_SIZE` on active-assignments and assignable-partners |
| `src/features/assignments/components/AssignmentsPage.tsx` | Explicit `undefined` arg after the query signature changed |

### Behaviour change to be aware of

The matched field set moved with the search. Client-side matched **name, partner id, port**;
the server matches **partner id, email, first name, last name**. So partner search now finds by
email and no longer by port. The server-side set is the correct one to build on — it is the only one
that can see beyond the current page — but it is a real difference, not a pure bug fix.

### Not changed, deliberately

`getAssignablePartners` and `getActiveAssignments` still fetch one page and render it as the whole
list. Asking for 50 instead of 100 makes the request honest, but past 50 active assignments the
board still shows only the first page. Adding paging to a board-style surface is a product change,
not a bug fix — see §5.

---

## 3. F2 — hiding super-admin-only actions

### Rule applied

Backend contract is the source of truth. A control is hidden when, and only when, the view behind it
declares a `required_feature` in the `GOVERNANCE` set, which `ROLE_FEATURES` grants to
`super_admin` alone. Everything in `OPERATIONAL` was left visible — notably **Deals**
(`promo.deal`) and **catalog create/delete** (`catalog.manage`), which sub-admins legitimately hold.

**Hiding is a UX gate, not security.** Every handler still calls the API and still surfaces the
server's refusal through `getApiMessage`; nothing here is trusted by the backend.

### Changes

| Capability | Control hidden | File |
| ---------- | -------------- | ---- |
| `promo.coupon` | "Create coupon" button; per-coupon edit/delete; coupon-table row click (opens the edit form) | `rewards/components/RewardsPage.tsx`, `rewards/components/ActiveCouponsCard.tsx` |
| `promo.coupon` | Assignment "Add" button and per-row remove | `rewards/components/CouponAssignmentsTab.tsx` |
| `finance.config` | "Configure points" button | `rewards/components/RewardsPage.tsx` |
| `finance.credit` | Bonus-points "Add" (grant) | `rewards/components/BonusPointsTab.tsx` |
| `finance.credit_override` | Bonus-points per-row "Clear" | `rewards/components/BonusPointsTab.tsx` |
| `platform.port_config` | Port "Add", row edit/delete actions, and row click (opens the edit drawer) | `catalog-ops/components/PortsPage.tsx` |
| `governance.admin_users` | Whole "Security" block (reset password / activate-deactivate / delete) and the Save button; Cancel becomes Close | `account-management/components/AdminUserDetailDrawer.tsx` |

Reads were left open throughout: a sub-admin still sees the coupon table, the bonus-point balances,
the port directory and the admin-user profile. They lose the write entry points, not the visibility.

### 15 controls, not 16

The audit listed 16 governance endpoints. Only **15** had a UI control to hide.
`DELETE /superadmin/sailors/sailor/{id}/delete/` (`data.account_erasure`) is wired in
`sailorApi.ts` and exported from the feature barrel, but **`useDeleteSailorMutation` has no caller
anywhere in `src`** — there is no delete-sailor button to hide. Nothing was added: inventing a
destructive UI for an unused endpoint is exactly what the brief rules out.

---

## 4. F5 — build failure, investigated not fixed

**Genuinely pre-existing.** `tsconfig.node.json` is unmodified against `HEAD`, and the committed
content is byte-identical to what is on disk. It dates to `28af123`, the initial template→React
migration commit.

**Why it fails.** `composite: true` forces emit; `allowImportingTsExtensions` requires `noEmit` or
`emitDeclarationOnly`. The two contradict, so `tsc -b` refuses with TS5096 before `vite build` ever
runs.

**Can the frontend be deployed without it? Yes.** `npx vite build` alone exits 0 and produces a
complete bundle:

```
dist/index.html                     1.06 kB │ gzip:   0.56 kB
dist/assets/index-DpRBdak1.css    117.70 kB │ gzip:  22.06 kB
dist/assets/index-B05D63rz.js   1,800.64 kB │ gzip: 502.46 kB
✓ built in 11.55s
```

The failing `tsc -b` step contributes **nothing** to `dist/`: the app project sets `noEmit: true`,
so `tsc -b` is purely a typecheck gate. This is a broken build *script*, not a broken *app*. Type
safety is still verifiable today via `tsc -p tsconfig.json --noEmit`, which passes.

**There is a second defect underneath it, and it explains the first.** `composite: true` on the node
project means `tsc -b` *emits* — and its output is committed:

```
anchor-mart-admin/vite.config.js      ← emitted from vite.config.ts
anchor-mart-admin/vite.config.d.ts
anchor-mart-admin/tsconfig.node.tsbuildinfo
anchor-mart-admin/tsconfig.tsbuildinfo
```

Vite resolves `vite.config.js` **before** `vite.config.ts` (`DEFAULT_CONFIG_FILES` in
`node_modules/vite/dist/node/constants.js:64`), and the dev-server log confirms it in practice:
`[vite] vite.config.js changed, restarting server...`. The two files are currently equivalent, so
nothing misbehaves — but **any future edit to `vite.config.ts` will be silently ignored.**

**Recommendation, for the record — not applied.** Adding `"noEmit": true` beside `"composite": true`
is the correct fix for the correct reason: it resolves TS5096 *and* stops `tsc -b` regenerating the
shadowing `vite.config.js`. The four committed artifacts above should be deleted and gitignored in
the same change. That is a build-tooling change and belongs in its own commit, separate from these
API fixes.

---

## 5. Decisions required — not implemented

1. **Same truncation class, 13 more call sites (new — extends F1).** The audit's grep found literal
   `page_size: 100`; it missed callers passing `limit: 100`. `BaseListCategoriesView` also uses
   `CustomPagination`, so category/product/sailor **picker dropdowns silently omit options past the
   50th** in: `ProductsPage`, `ProductAddDrawer`, `ProductEditDrawer`, `SparesPage`,
   `SpareProductAddDrawer`, `SpareProductEditDrawer`, `GenerateBillDialog`, `BonusPointsTab`,
   `CouponAssignmentsTab`, `DealFormDrawer` (×2), `useProductSales`, `SuggestReplacementPanel`.
   Lowering 100→50 changes nothing functionally — they already receive 50. The real fix is a
   searchable/typeahead picker or a paged fetch, which is a UX decision per picker. **Not touched.**

2. **Assignments board beyond 50 rows.** As above — needs a product call on paging a board.

3. **Partner search now matches email, not port.** Flagged in §2. If port matching matters to
   admins, that is a backend change to `AdminPartnerList`, not a frontend one.

4. **Unused backend filters (F3) remain unused** — `search` on coupons/deals/bonus-points/
   assignments, `order_status`, `catalog_type`, date ranges. No UI exists for them; adding filter
   controls is a product decision.

---

## 6. Full list of changed files

```
src/lib/constants.ts                                            F1
src/features/partners/types/partner.types.ts                    F1
src/features/partners/api/partnerApi.ts                         F1
src/features/partners/components/PartnersPage.tsx               F1
src/features/assignments/api/assignmentApi.ts                   F1
src/features/assignments/components/AssignmentsPage.tsx         F1
src/features/rewards/components/RewardsPage.tsx                 F2
src/features/rewards/components/ActiveCouponsCard.tsx           F2
src/features/rewards/components/BonusPointsTab.tsx              F2
src/features/rewards/components/CouponAssignmentsTab.tsx        F2
src/features/catalog-ops/components/PortsPage.tsx               F2
src/features/account-management/components/AdminUserDetailDrawer.tsx  F2
src/features/catalog/components/CategoriesPage.tsx              F4
src/features/emergency-categories/components/EmergencyCategoriesPage.tsx  F4
src/features/ship-agents/components/ShipAgentsPage.tsx          F4
```

15 files. No backend files touched. `tsconfig.node.json` deliberately left alone.
