# AnchorMart Admin — Frontend/Backend Integration Audit

**Date:** 11 August 2026
**Scope:** 202 admin endpoints · 204 frontend endpoint constants · 362 backend routes
**Status:** Phases 1–6 complete. No code modified.

An evidence-based comparison of the admin console against the Django backend it drives. The
headline result is that endpoint coverage is effectively complete — the defects that remain are in
pagination, capability gating, and error surfacing, not in missing integrations.

---

## 1. Audit summary

| Status | Count |
| ------ | ----- |
| Complete | 199 |
| Partial | 11 |
| Missing | 0 |
| Broken | 3 |
| Backend-only / no UI required | 3 |
| Needs product decision | 1 |

**Nothing is missing.** All 202 admin endpoints in the Postman collection are integrated except
three, and each of those three is a deliberate exclusion with documented evidence. *Broken* counts
the three call sites that silently truncate their result set. *Partial* counts backend filters and
capability gates the UI does not yet use.

---

## 2. Method — which source won, and why

The brief's precedence order is backend → Postman → frontend. Two measurements let me apply it
without guessing.

**Backend and Postman agree exactly.** The backend ships its own drift checker,
`manage.py check_postman_coverage`. Run against this collection it reports *"No drift. Collection
matches the URL conf"* across 362 live routes. Any discrepancy found below is therefore
frontend-side — with one exception, noted as F6.

**Neither documents response bodies.** The OpenAPI schema at `/api/schema/` describes 385
operations but carries a response schema for only **4** of them, and the Postman collection has
**zero** saved example responses. Response shapes in this audit are read from the Django
serializers and views directly, cross-checked against the 337 Postman test scripts that assert on
fields.

> Endpoint paths were resolved by transpiling the frontend's constants with esbuild and evaluating
> them, not by pattern-matching source text — a regex pass initially produced two false positives by
> matching `SUGGEST` inside `SUGGESTION_PRODUCTS` and `REFUND` inside `REFUND_QUOTE`.

---

## 3. Integration matrix — coverage by area

| Area | Endpoints | Integrated | Status | Note |
| ---- | --------: | ---------: | ------ | ---- |
| Orders | 25 | 25 | Complete | List · detail · ownership · cancel/refund · intents · substitutions · deltas |
| Catalog (categories · products · variants) | 24 | 24 | Complete | Full CRUD both directions |
| Promotion | 23 | 23 | Partial | Integrated, but list filters unused — F3 |
| Partner | 20 | 18 | Backend-only / no UI required | 2 KPI endpoints deferred to Build-2 — F7 |
| Dashboard | 12 | 11 | Backend-only / no UI required | 1 legacy counts endpoint superseded — F7 |
| Emergency spares (marine) | 12 | 12 | Complete | Categories + products |
| Surprise gifts | 9 | 9 | Complete | Config · ships · per-order |
| Help & FAQ | 9 | 9 | Complete | Types + entries |
| Admin users | 8 | 8 | Needs product decision | Governance-gated server-side, ungated in UI — F2 |
| Chat | 7 | 7 | Complete | Includes WebSocket proxy |
| Ports & saved products | 6 | 6 | Needs product decision | Port writes are super-admin only — F2 |
| Sailors | 6 | 6 | Needs product decision | Delete is `data.account_erasure` — F2 |
| Special requests | 6 | 6 | Complete | — |
| Ship agents | 5 | 5 | Complete | Frontend matches serializer; Postman does not — F6 |
| Notification campaigns | 5 | 5 | Complete | — |
| Analytics | 4 | 4 | Complete | — |
| Seller requests | 4 | 4 | Complete | — |
| Account deletion requests | 4 | 4 | Complete | — |
| Express | 3 | 3 | Complete | — |
| Ratings | 3 | 3 | Complete | — |
| Payments (billing) | 3 | 3 | Complete | — |
| Audit trail | 2 | 2 | Complete | — |
| Outbound messages (ledger) | 2 | 2 | Complete | — |
| **Total** | **202** | **199** | | |

Assignment endpoints are counted inside *Partner*. The three Broken call sites in F1 sit within
areas otherwise marked Complete — coverage and correctness are scored separately here.

---

## 4. Verified findings

### F1 · P1 · Broken — Three list calls silently return half the rows they ask for

**Failure.** Three call sites request `page_size: 100`. `CustomPagination` sets
`max_page_size = 50`, and DRF caps rather than errors — `_positive_int(…, cutoff)` returns
`min(ret, cutoff)`. The response is a valid 50-row page, so nothing surfaces as an error.

The partner list is the damaging one: it fetches 100 *because filtering and search are applied
client-side*. On a deployment with more than 50 partners, an admin searching for a partner beyond
the 50th gets "no results" for a partner that exists.

**Evidence**

- `AnchorMart/paginators.py:6` — `max_page_size = 50`
- `rest_framework/pagination.py:256-263` → `_positive_int` line 30 — `min(ret, cutoff)`
- `partnerApi.ts:255` — `GET /partner/list/`, comment reads "filtering/search is applied
  client-side, so fetch a generous page"
- `assignmentApi.ts:102` — `GET /partner/active-assignments/`
- `assignmentApi.ts:126` — `GET /partner/assignable-partners/`
- Both views confirmed to use `CustomPagination`

The codebase already knows the limit elsewhere: `OutboundMessagesPage.tsx:25` comments "The API
caps `page_size` at 50".

**Action.** Lower the three requests to 50 and page properly, or move partner search server-side —
the backend already reads `search` on two of these three endpoints (see F3).

---

### F2 · P1 · Needs product decision — 16 super-admin-only actions are offered to sub-admins

**Failure.** 84 backend views declare a `required_feature`. Sixteen require a capability in the
`GOVERNANCE` set, which `ROLE_FEATURES` grants only to `super_admin`. All sixteen are integrated in
the frontend, and the feature areas that expose them apply no capability gate — a sub-admin sees
the control, clicks it, and receives a 403.

**Scope**

| Capability | Actions |
| ---------- | ------- |
| `promo.coupon` | coupon add/update/delete + assignment add/delete (5) |
| `governance.admin_users` | admin update/status/reset-password/delete (4) |
| `platform.port_config` | port add/update/delete (3) |
| `finance.credit` | add bonus points |
| `finance.credit_override` | delete bonus points |
| `finance.config` | update loyalty config |
| `data.account_erasure` | delete sailor |

**Evidence.** `admin_panel/permissions/registry.py` — `GOVERNANCE` set and `ROLE_FEATURES`;
`PortsPage.tsx:121,128,149` renders edit/delete/add with no gate; `grep useAdminAccess` returns
nothing in `features/rewards`, `features/settings`, `features/sailors`, or `features/catalog-ops`.
The one existing gate is `CreateUserDrawer.tsx:53`, which correctly restricts admin-tier role
options.

**Decision needed.** The *restriction* is established by the backend and needs no product input.
What needs a decision is the *treatment*: hide these controls from sub-admins entirely, or show
them disabled with an explanation. Hiding is quieter; disabling teaches the tier boundary. I have
not chosen one.

---

### F3 · P2 · Partial — Backend list filters that no UI reaches

Server-side filters exist and are unused. These are capability gaps, not defects — except where
they compound F1.

| Filter | Endpoints |
| ------ | --------- |
| `search` | coupons list, coupon report, bonus points, deals list, active assignments, unassigned orders |
| `order_status` | active assignments |
| `category`, `sort_by_created_at` | deals list |
| `catalog_type` | variants list |
| `from_date`, `to_date` | partner history |
| `rank_by` | dashboard top products |
| `is_emergency` | order stats |
| `is_express` | products list |

**Evidence.** Params read by `AdminActiveAssignments` and `AdminUnassignedOrders` confirmed in
`partner_views.py`; the assignments page has no search input at all (grep over
`features/assignments/components`).

**Action.** Wire `search` server-side where a search box already exists; treat the rest as backlog.

---

### F4 · P2 · Partial — Three delete handlers discard the backend's reason

**Failure.** `catch (_error)` followed by a fixed string, so a 403, 404, or a 409 with a specific
reason all render as the same sentence. 59 of 64 files that call `.unwrap()` use `getApiMessage`;
these three do not.

**Evidence.** `CategoriesPage.tsx:112`, `EmergencyCategoriesPage.tsx:111`, `ShipAgentsPage.tsx:93`.

**Action.** Fall back to `getApiMessage(err)` before the fixed string, matching the pattern used
everywhere else.

---

### F5 · P0 · Broken — Production build does not run

**Failure.** `npm run build` exits 2 and produces no `dist/`:

```
tsconfig.node.json(8,35): error TS5096: Option 'allowImportingTsExtensions' can only be used
when either 'noEmit' or 'emitDeclarationOnly' is set.
```

Pre-existing and unrelated to API integration, but it blocks the build verification this brief
requires, so it is reported at P0.

**Action.** Add `"noEmit": true` beside `"composite": true` in `tsconfig.node.json` — permitted from
TS 5.6, and this project is on 5.7.2.

---

### F6 · P2 · Partial — Postman's ship-agent update example uses fields that do not exist

The only case where Postman is wrong and the frontend is right. The saved `PATCH` body sends
`phone_number` and `contact_person`. `AdminUpdateShipAgentSerializer.Meta.fields` is
`["name", "mobile", "country_code", "email", "company"]` — neither key exists, and DRF ignores
unknown keys, so that request is a silent no-op. `ShipAgentPayload` in the frontend matches the
serializer exactly.

**Action.** Fix the collection. No frontend change.

---

### F7 · Backend-only / no UI required — Three uncovered endpoints, all intentional

- `GET /superadmin/partner/kpis/` and `/kpi-detail/` — flow 28 marks both *"Do not implement this
  APIS this will be done in Build-2"* (lines 272–273), and `PartnersPage.tsx:47` records the
  deferral.
- `GET /superadmin/dashboard/dashboard/` — labelled "legacy" in the collection; the frontend uses
  the current `/dashboard/dashboard/stats/`.

**Action.** None.

---

## 5. Checked and correct

Recorded so these are not re-investigated, and so the findings above are not mistaken for a general
verdict on the codebase.

- **Auth headers.** All 204 frontend endpoints sit under `/superadmin/`, which
  `ServerSecurityMiddleware` exempts from `server-secret-key`. The collection sends the header
  everywhere as a blanket; the frontend correctly omits it.
- **Response envelopes.** This API returns lists in four different shapes. `unwrapList` in
  `apiResponse.ts` handles all four, including `{count, results: {message, data}}`.
- **Refund contract.** `RefundQuote` matches `AdminRefundQuoteView` field for field. Partial refunds
  send `Idempotency-Key`, generated per submission, with the confirm button disabled while in
  flight.
- **Destructive cascade disclosure.** Category delete deactivates live products; the frontend reads
  `deactivated_products` and shows a distinct message when the count is non-zero — exactly what the
  backend intends.
- **Assignable partners.** Sending only `order_id` is the documented recommended call; port scope
  and capability filter are both derived from the order. `port_id` is an optional override, not a
  missing parameter.
- **Error extraction.** `getApiMessage` handles `{message}`, `{detail}`, `{error}`,
  `non_field_errors`, flat and nested DRF field errors, and the legacy `{errors:{…}}` envelope.
- **Cache invalidation.** Mutations invalidate their detail, list, and stats tags — the refund
  mutation also invalidates its own quote.
- **No dead endpoints.** All 204 endpoint constants are referenced by live code.

---

## 6. Product decisions required

| Question | Established by evidence | Open |
| -------- | ----------------------- | ---- |
| Governance controls for sub-admins (F2) | That 16 actions are super-admin only — `ROLE_FEATURES` is unambiguous | Hide them, or show disabled with a reason |
| Partner search (F1 / F3) | That the current client-side filter is wrong above 50 partners | Move search server-side, or paginate and keep it client-side |
| Unused list filters (F3) | That the backend supports them | Whether admins want these filters at all |

---

## 7. Test results — baseline, before changes

| Check | Command | Result |
| ----- | ------- | ------ |
| Frontend tests | — | **None exist.** No `test` script; no `*.test.*` or `*.spec.*` files. Only `src/test/setup.ts`. |
| Type check | `tsc -p tsconfig.json --noEmit` | PASS |
| Lint | `biome lint src` | 12 findings — all pre-existing a11y/style in shared components, none API-related |
| Production build | `npm run build` | FAIL — F5, exit 2, no `dist/` |
| Backend contract | `manage.py check_postman_coverage` | No drift — 362 routes, 339 covered |
| Live API reachability | `curl` via Vite proxy | PASS — backend on :8000, auth endpoints return 401/400 as expected |

> No end-to-end flow was exercised against a signed-in session — that needs admin credentials,
> which I do not have. Every path was confirmed by status code and by reading the Django view; none
> was confirmed by driving the UI.

---

## 8. Next — Phase 7

F1, F4 and F5 are unambiguous and can be implemented as-is. F2 needs the treatment decision above
before implementation; the `can(feature)` helper in `src/lib/roles.ts` already makes each gate a
one-line check.
