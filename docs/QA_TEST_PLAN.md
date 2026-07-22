# AnchorMart Admin Panel — QA Test Plan & Execution Report

> **Status:** Draft in progress. Test cases are authored from a full source-code
> audit. "Actual Result" / "Status" columns are filled during **live execution**
> (dev server + backend). Where a defect is provable from code alone, it is
> pre-marked with a **🐞 STATIC FINDING** and a severity.

## 1. Purpose & scope

Page-by-page QA plan for the React/TS admin SPA in `anchor-mart-admin/`. Covers UI,
functionality, validation, filters, search, sorting, pagination, CRUD, modals/drawers,
API integration (request/response/loading/empty/error), role-based access, and
edge/negative cases.

## 2. How to read this document

**Test Case ID:** `<PAGE>-<NN>` (e.g. `PRD-01`). **Priority:** High / Medium / Low.
**Status:** Pass / Fail / Blocked / **Not Executed** (default until run).

**Type legend:** ✅ Positive · ⛔ Negative · 📏 Boundary · 🔒 Validation · 🌐 API · 🧩 Edge.

## 3. Critical context — integrated vs. mock pages

Per `CLAUDE.md`, **most `src/pages/*` are static mock prototypes** (hardcoded arrays,
no real API); only some `features/*` are API-integrated. Testing a mock page against a
backend is meaningless, so each page below is tagged:

- **🟢 INTEGRATED** — real RTK Query endpoints; full API test cases apply.
- **🟡 PARTIAL** — some real data, some mock/placeholder behavior.
- **🔴 MOCK** — hardcoded UI only; test UI/interactions, not data/API.

*(This table is completed after the full scan — see §5 page index.)*

## 4. Test environment & preconditions (global)

| Item | Value |
|---|---|
| App | `cd anchor-mart-admin && npm run dev` → http://localhost:3000 |
| Auth | DRF **Token** (`Authorization: Token <token>`), persisted to `localStorage` (`am_admin_token`, `am_admin_user`) |
| API base | dev: Vite proxy `/api` → `VITE_API_BASE_URL` (ngrok); prod: direct |
| Roles | `admin` (sub-admin) · `super_admin` — different gate behavior (Flow 27) |
| Page size | Fixed `limit = 10`; DRF sends `page` + `page_size` |

**Global preconditions for all authenticated pages:** a valid admin token exists and
`auth.isAuthenticated === true`; backend reachable.

---

## 5. Cross-cutting test cases (apply to all pages)

| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| GEN-01 | Route protection | 🔒 | Not logged in | Visit any dashboard route directly (e.g. `/products`) | Redirected to `/login`; `ProtectedRoute` blocks | High |
| GEN-02 | Token rehydration | ✅ | Logged in | Refresh the browser | Session persists (token/user rehydrated from `localStorage`) | High |
| GEN-03 | Logout | ✅ | Logged in | Click sidebar logout | Token/user cleared, redirect to `/login`, success toast | High |
| GEN-04 | Auth header | 🌐 | Logged in | Inspect any API request | Header `Authorization: Token <token>` present (NOT Bearer) | High |
| GEN-05 | 401 handling | ⛔ | Expired/invalid token | Trigger any query | Request 401s; user sees error state (verify no infinite spinner) | High |
| GEN-06 | Sidebar navigation | ✅ | Logged in | Click each sidebar item | Correct route loads; active item highlighted | Medium |
| GEN-07 | Sidebar collapse | ✅ | Logged in | Toggle collapse; hover items | Collapsed shows tooltips; expand restores labels | Low |
| GEN-08 | Unknown route | 🧩 | Logged in | Visit `/does-not-exist` | Redirects to `/dashboard` (catch-all) | Low |
| GEN-09 | Deep-link filters | 🧩 | Logged in | Open a list page URL with `?page=2&search=x&status=…` | Filters/search/page restored from URL | Medium |
| GEN-10 | Network failure | ⛔ | Backend down | Load any integrated list | `DataTable` shows error row + Retry; Retry refetches | High |
| GEN-11 | Search debounce | ✅ | On a list page | Type quickly in search | Debounced (~300ms); resets to page 1; in-input spinner | Medium |
| GEN-12 | Filter resets page | 🧩 | On page 3 | Change any filter/search | Resets to page 1 | Medium |

---

## 6. Page: Products 🟢 INTEGRATED

**Route:** `/products` · **Files:** `features/products/` (source-of-truth page)

### Features
- `PageHeader` + `SearchFilters` (search, 300ms debounce) + "Add Product" button
- `StatsGrid` KPI cards
- `DataTable`: typed columns, thumbnail w/ fallback, two-line name/desc, currency, status badge, **status column filter**, row-click → edit, `TableActions` (edit/delete)
- Built-in pagination (limit 10), loading spinner, error+retry, empty message
- Add drawer / Edit drawer (`ProductFormModal` switch), Zod-validated RHF form
- Delete via `ConfirmDialog`
- URL-driven state (`?page`, `?search`, `?status`)

### APIs
| Hook | Endpoint (`PRODUCT_ENDPOINTS`) | Method | Notes |
|---|---|---|---|
| `useGetProductsQuery` | `/superadmin/products/get-products/` | GET | params `page`, `page_size`, `search`, status |
| `useCreateProductMutation` | `/superadmin/products/add-product/` | POST | invalidates PARTIAL-LIST |
| `useUpdateProductMutation` | `/superadmin/products/update-product/{id}/` | PATCH | |
| `useDeleteProductMutation` | `/superadmin/products/delete-product/{id}/` | DELETE | |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| PRD-01 | List load | 🌐✅ | Products exist | Open `/products` | Table shows page 1 (≤10 rows), correct columns, pagination reflects `count` | High |
| PRD-02 | Loading state | 🌐 | Slow network | Open page | Spinner shows while fetching, then table | Medium |
| PRD-03 | Empty state | 🧩 | No products | Open page | "No products" empty message, no pagination | Medium |
| PRD-04 | Error + retry | ⛔ | Backend down | Open page → restore → Retry | Error row shown; Retry refetches successfully | High |
| PRD-05 | Search | ✅ | Products exist | Type a known name | Server-side `?search=` filters; resets to page 1; spinner in input | High |
| PRD-06 | Search no-match | 🧩 | — | Search gibberish | Empty message | Low |
| PRD-07 | Status filter | ✅ | Mixed statuses | Use status column filter | `?status`/`is_active` sent; list filtered; "All" resets | High |
| PRD-08 | Pagination | ✅ | >10 products | Click page 2 | `?page=2`; new rows; URL updated | High |
| PRD-09 | Add — happy | 🌐✅ | — | Add product, valid fields, submit | POST fires; drawer closes; success toast; list auto-refreshes (tag) | High |
| PRD-10 | Add — validation | 🔒⛔ | — | Submit empty/invalid | Zod field errors; red focus; no POST | High |
| PRD-11 | Add — API error | ⛔ | Force 400 | Submit | Drawer stays open (data preserved); error toast with backend reason (`getApiMessage`) | High |
| PRD-12 | Edit — happy | 🌐✅ | Product exists | Row-click → edit → save | PATCH fires; closes; toast; row updates | High |
| PRD-13 | Edit — readonly fields | 🔒 | — | Inspect fields API doesn't accept | Shown disabled/hinted "not sent"; excluded from payload | Medium |
| PRD-14 | Delete — confirm | 🌐✅ | Product exists | Delete → confirm | DELETE fires; toast; row removed (tag refetch) | High |
| PRD-15 | Delete — cancel | ✅ | — | Delete → cancel | No request; dialog closes | Medium |
| PRD-16 | Currency format | 📏 | — | Inspect price cell | 2-decimal formatting | Low |
| PRD-17 | Long text truncation | 📏 | Long name/desc | Inspect cell | Truncated w/ `title` tooltip | Low |
| PRD-18 | Row action stopPropagation | 🧩 | — | Click edit/delete icon on a clickable row | Only the action fires, not row-click | Medium |

---

## 7. Page: Categories 🟢 INTEGRATED

**Route:** `/categories` · **Files:** `features/catalog/`

### Features
Mirrors Products: header/search/add, `StatsGrid` (Total/Active/Inactive from a **stats
endpoint**), `DataTable` w/ thumbnail, scope badge, parent, product-count, status filter,
row-click edit, delete confirm. Add/Edit drawers; Edit adds an **Active** `Switch`.

### APIs
| Hook | Endpoint (`CATEGORY_ENDPOINTS`) | Method |
|---|---|---|
| `useGetCategoriesQuery` | `/superadmin/categories/get-categories/` | GET (`page`,`page_size`,`search`,`is_active`) |
| `useGetCategoryStatsQuery` | `/superadmin/categories/category-stats/` | GET |
| `useCreateCategoryMutation` | `/superadmin/categories/add-category/` | POST |
| `useUpdateCategoryMutation` | `/superadmin/categories/update-category/{id}/` | PATCH |
| `useDeleteCategoryMutation` | `/superadmin/categories/delete-category/{id}/` | DELETE |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| CAT-01 | List load | 🌐✅ | Categories exist | Open `/categories` | Rows from `results.data`; pagination from `count` | High |
| CAT-02 | Stats cards | 🌐✅ | — | Open page | Total/Active/Inactive from stats API; fallback "-" while loading | Medium |
| CAT-03 | Search | ✅ | — | Search a name | `?search=` server-side; page→1 | High |
| CAT-04 | Status filter | ✅ | Mixed | Filter Active/Inactive | `is_active=True/False` sent; list filtered | High |
| CAT-05 | Pagination | ✅ | >10 | Page 2 | Correct page/URL | High |
| CAT-06 | Add — happy/validation/error | 🌐🔒⛔ | — | Add valid / empty name / forced 400 | Success closes+toast+refetch; name-required error; error toast keeps drawer | High |
| CAT-07 | Edit incl. Active toggle | 🌐✅ | Category exists | Edit, flip Active, save | PATCH incl. `is_active`; toast; row reflects | High |
| CAT-08 | Image path field | 🔒 | — | Enter path (not upload) | Sent as `image` string; hinted "not a file upload" | Low |
| CAT-09 | Delete confirm/cancel | 🌐✅ | — | Delete→confirm / cancel | DELETE + toast + refetch / no-op | High |
| CAT-10 | Empty / error+retry / loading | 🧩⛔🌐 | — | As Products PRD-02/03/04 | Same behaviors | Medium |

---

## 8. Page: Ship Agents 🟢 INTEGRATED  *(built this cycle — Flow 02)*

**Route:** `/ship-agents` · **Files:** `features/ship-agents/`

### Features
Header/search (name/company/email/mobile), "Add Agent", `StatsGrid` (Total/Global/Owned —
**derived from two scoped count queries**, no stats endpoint), `DataTable` (anchor icon,
name/company two-line, contact two-line, **scope badge + scope column filter**, owner,
orders count, created), row-click edit, delete confirm. Add/Edit drawers (Zod: name
required, **contact rule** mobile-or-email).

### APIs
| Hook | Endpoint (`SHIP_AGENT_ENDPOINTS`) | Method | Notes |
|---|---|---|---|
| `useGetShipAgentsQuery` | `/superadmin/ship-agents/` | GET | `page`,`page_size`,`search`,`scope`(global\|owned); **`results` is a plain array** |
| `useCreateShipAgentMutation` | `/superadmin/ship-agents/create/` | POST | owner always global |
| `useUpdateShipAgentMutation` | `/superadmin/ship-agents/{id}/update/` | PATCH | |
| `useDeleteShipAgentMutation` | `/superadmin/ship-agents/{id}/delete/` | DELETE | soft-delete, returns 200 (not 204) |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| SHA-01 | List load | 🌐✅ | Agents exist | Open `/ship-agents` | Rows from `data.results` (plain array); count-based pagination | High |
| SHA-02 | Stats derivation | 🌐🧩 | — | Open page | Global + Owned counts from scoped queries; Total = sum; "-" while loading | Medium |
| SHA-03 | Search (multi-field) | ✅ | — | Search by mobile / company / email | Server-side OR match; page→1 | High |
| SHA-04 | Scope filter | ✅ | Global + owned exist | Filter Global / Owned / All | `?scope=global\|owned`; list filtered; "All" clears | High |
| SHA-05 | Add — happy | 🌐✅ | — | Add name + mobile, submit | POST; global agent created; toast; refetch | High |
| SHA-06 | Add — contact rule | 🔒⛔ | — | Submit name only (no mobile/email) | Zod error "Provide at least a mobile or email"; no POST | High |
| SHA-07 | Add — invalid email | 🔒⛔ | — | Enter malformed email | Email validation error | Medium |
| SHA-08 | Edit any agent | 🌐✅ | Owned agent exists | Edit a sailor-owned agent, save | PATCH; ownership NOT transferred; toast | High |
| SHA-09 | Delete soft | 🌐✅ | — | Delete → confirm | DELETE; 200 message; row gone; warns snapshot kept | High |
| SHA-10 | Delete idempotency | 🧩⛔ | Already deleted | Re-delete same id (if reachable) | 404 surfaced gracefully | Low |
| SHA-11 | Empty / error+retry / loading | 🧩⛔🌐 | — | Standard states | Correct | Medium |
| SHA-12 | 🐞 Regression: response shape | 🌐 | — | Verify list renders | **FIXED this cycle** — `results` is a plain array, not `results.data`. Confirm no empty-table regression | High |

---

## 9. Page: Orders 🟡 PARTIAL  *(list real; drawer largely mock; agent-bind + cancel real)*

**Route:** `/orders` · **Files:** `pages/OrdersPage.tsx` + `features/orders/`,
`components/common/OrderDetailDrawer.tsx`

### Features
- Header: search (180ms), status dropdown filter, **DateRangePicker (UI only)**, **Export (mock toast)**
- Segmented status **chips with hardcoded counts** (client-side filter)
- `DataTable`: id, source ("—"), sailor avatar, items summary, ship/terminal, changed-anchorage ("—"), partner, payment (colored), coupon, total, status, actions (view/message/cancel)
- Detail drawer (`OrderDetailDrawer`): status badges, **fallback mock timeline**, order info, items, total, footer (Reassign/Notify **mock**, Cancel **real**)
- **Ship-agent section (Flow 02 · API 17)** in drawer: current agent, picker, Manage-Order (claim), Assign/Update/Clear, gate hints
- **Cancel order (real)**: row action + drawer button → `ConfirmDialog` → real mutation

### APIs
| Hook | Endpoint | Method | Notes |
|---|---|---|---|
| `useGetOrdersQuery` | `/superadmin/orders/orders/` | GET | `page`,`page_size`,`search`,`status`; `results` = plain array |
| `useSetOrderShipAgentMutation` | `/superadmin/ship-agents/order/{id}/set/` | POST | `{ ship_agent_id }` required-nullable |
| `useClaimOrderMutation` | `/superadmin/orders/order/{id}/claim/` | POST | Flow 27 gate |
| `useCancelOrderMutation` | `/superadmin/orders/order/{id}/cancel/` | POST | **path corrected to singular `order/`**; full contract is Flow 12 |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| ORD-01 | List load | 🌐✅ | Orders exist | Open `/orders` | Rows from `results` array; pagination from `count` | High |
| ORD-02 | Search | ✅ | — | Search order/customer | `?search=` server-side | High |
| ORD-03 | Status dropdown filter | 🧩 | — | Pick a status | **Client-side** filter of current page only (backend status not wired) — verify expected scope | Medium |
| ORD-04 | Segment chips | 🧩 | — | Click a chip | Client-side filter; **counts are hardcoded mock** — flag as not real | Low |
| ORD-05 | Pagination | ✅ | >10 | Page 2 | Correct | High |
| ORD-06 | Open detail drawer | ✅ | — | Row-click / View | Drawer opens with order info | High |
| ORD-07 | Timeline | 🧩 | — | Inspect timeline | **Fallback mock timeline** (hardcoded dates) — not real | Low |
| ORD-08 | Reassign / Notify buttons | 🧩 | — | Click | **Mock toasts only** — no API | Low |
| ORD-09 | Ship-agent — picker loads | 🌐✅ | Agents exist | Open drawer | Dropdown populated from ship-agents list | High |
| ORD-10 | Ship-agent — assign (owned/super) | 🌐✅ | Order claimed / super admin | Pick agent → Assign | POST fires; success toast; binding set | High |
| ORD-11 | Ship-agent — claim gate | 🔒🌐 | Sub-admin, unclaimed | Try assign | "Manage Order" shown; assign disabled until claim; claim → assign works | High |
| ORD-12 | Ship-agent — closed order | ⛔ | Delivered/Cancelled/Refunded | Open drawer | Controls disabled; "order closed" hint | Medium |
| ORD-13 | Ship-agent — other admin | ⛔ | Owned by another (known) | Open drawer | Disabled; "managed by another admin" hint | Medium |
| ORD-14 | Ship-agent — clear | 🌐✅ | Agent bound | Click Clear | POST `{ship_agent_id:null}`; cleared toast | Medium |
| ORD-15 | Ship-agent — API errors | ⛔🌐 | Force 409/403 | Attempt | Real backend message via `getApiMessage` toast | High |
| ORD-16 | Cancel — happy | 🌐✅ | Cancellable order, owned/super | Cancel → confirm | POST cancel; success toast; row status refreshes (tag) | High |
| ORD-17 | Cancel — gate 409 | ⛔🌐 | Sub-admin unclaimed | Cancel → confirm | 409 message surfaced; dialog behavior correct | High |
| ORD-18 | Cancel — drawer button | ✅ | Drawer open | Cancel Order in drawer | Routes through same real handler (uses UUID) | Medium |
| ORD-19 | Cancel — loading | 🌐 | — | Confirm cancel | Confirm button shows loading; no double-submit | Medium |
| ORD-20 | 🐞 Data gap: ship_agent/assigned_admin | 🧩 | — | Open drawer for order w/ known agent/owner | **List serializer may omit these** → drawer shows "No agent"/"unknown owner" until list includes them or a detail fetch is added. Verify against backend | Medium |
| ORD-21 | 🐞 Assumption: cancel contract | 🌐 | — | First real cancel | Confirm singular `order/` path works and no request body/reason is required (Flow 12 unverified) | High |

---

## 10. Page: Sailors 🟢 INTEGRATED

**Route:** `/sailors` · **Files:** `features/sailors/`

### Features
Header + search (300ms server-side) + status dropdown; `StatsGrid` (Total Sailors, Loyalty
Pts, Referrals/Month); **hand-rolled filter tabs** (All/Active/Inactive); `DataTable`
(avatar+name+email, contact, joined, orders, loyalty pts, status, View/Edit) with **`LIMIT=6`**;
Add/Edit `Sheet` (plain `useState` form, Active `Switch`); read-only detail drawer.

### APIs
| Hook | Endpoint (`SAILOR_ENDPOINTS`) | Method | Notes |
|---|---|---|---|
| `useGetSailorsQuery` | `/superadmin/sailors/sailors-list/` | GET | `page`,`page_size`,`search`,`status`; shape-agnostic extractor |
| `useGetSailorStatsQuery` | `/superadmin/sailors/stats/` | GET | unwraps `{data}` |
| `useGetSailorQuery` | `/superadmin/sailors/sailor/{id}/` | GET | skip until drawer open |
| `useCreateSailorMutation` | `/superadmin/admin/create-user/` | POST | `role:"customer"`, `country_code` +prefixed |
| `useUpdateSailorMutation` | `/superadmin/sailors/sailor/{id}/update/` | PATCH | code without "+" |
| `useToggleStatusMutation` | `/superadmin/sailors/sailor/{id}/status/` | POST | only when toggle changed |
| `useDeleteSailorMutation` | `.../delete/` | DELETE | **defined but UNUSED (no UI)** |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| SLR-01 | List load + shape tolerance | 🌐✅ | Sailors exist | Open `/sailors` | Rows render regardless of `results[]`/`results.data[]`/`data[]`/array | High |
| SLR-02 | Stats cards | 🌐✅ | — | Open page | 3 KPIs from stats API | Medium |
| SLR-03 | Server search | ✅ | — | Search name/email | `?search=`; page→1; in-input spinner | High |
| SLR-04 | Status dropdown vs tabs conflict | 🧩⛔ | — | Set a tab ≠ All, then use dropdown | 🐞 **STATIC (Low):** tab silently overrides dropdown → dropdown appears to do nothing | Medium |
| SLR-05 | Pagination `LIMIT=6` | 📏 | >6 sailors | Page 2 | 6/page (🐞 **STATIC (Low):** deviates from mandated 10) | Medium |
| SLR-06 | Add — happy | 🌐✅ | — | Fill first name+email, save | POST create-user; close+toast+refetch | High |
| SLR-07 | Add — validation | 🔒⛔ | — | Submit missing first name/email | `toast.error`; no POST. 🐞 **STATIC (Med):** no email-format/phone validation (no Zod) | High |
| SLR-08 | Edit + status toggle | 🌐✅ | Sailor exists | Edit, flip Active, save | PATCH update; `status` POST only if toggle changed | High |
| SLR-09 | Detail drawer merge | 🧩 | — | Open a row | Opens with row data, refined by detail fetch; blank-field guard | Medium |
| SLR-10 | "Message" button | 🧩 | — | Click Message | 🐞 **STATIC (Low):** stub toast, no real action | Low |
| SLR-11 | Country-code prefix logic | 🔒 | — | Create then edit same sailor | "+" added on create, stripped on update — verify backend accepts both | Medium |

---

## 11. Page: Delivery Partners 🟡 PARTIAL

**Route:** `/partners` · **Files:** `features/partners/`

### Features
Header + **client-side** search (name/id/port); `DataTable` (avatar, id, port/zone, joined,
total deliveries, View/Message/Delete) with **no pagination** (`page_size:100`); Onboard drawer
(RHF+Zod); Detail/Edit drawer (fetch by `user_id`, PATCH); delete `ConfirmDialog`. **List is
mirrored into local `useState`.**

### APIs
| Hook | Endpoint (`PARTNER_ENDPOINTS`) | Method | Notes |
|---|---|---|---|
| `useGetPartnersQuery` | `/superadmin/partner/list/` | GET | `page_size:100`; extracts `results.data[]` |
| `useGetPartnerDetailQuery` | `/superadmin/partner/partner_detail/` | GET | param `user_id` |
| create | `/superadmin/partner/create/` | POST | `role:"delivery_partner"` |
| update | `/superadmin/partner/partner_detail_update/` | PATCH | `user_id` param **and** in body |
| delete | `/superadmin/partner/delete/` | DELETE | param `user_id` |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| PTR-01 | List load | 🌐✅ | Partners exist | Open `/partners` | Rows from `results.data`; **no pagination** — 🐞 **STATIC (Med):** >100 partners silently truncated | High |
| PTR-02 | Client-side search | 🧩 | — | Search name/id/port | Filters local copy (not server) | Medium |
| PTR-03 | Onboard — Zod validation | 🔒⛔ | — | Submit bad email / code / whatsapp | Field errors: email `.email()`, code `^\+\d{1,4}$`, whatsapp `^\d{7,15}$`; first name required | High |
| PTR-04 | Onboard — happy | 🌐✅ | — | Valid submit | POST create; close+toast; list resyncs | High |
| PTR-05 | Edit — prefill + update | 🌐✅ | Partner exists | Open detail, edit, save | Detail fetched by `user_id`; PATCH; toast | High |
| PTR-06 | Delete — optimistic | 🌐⛔ | Partner exists | Delete → confirm | 🐞 **STATIC (Med):** row removed from local array immediately; if API fails the row is already gone (desync) — verify rollback | High |
| PTR-07 | Stale local-copy desync | 🧩⛔ | — | Create/edit, then search | 🐞 **STATIC (Med):** `useState` mirror + `useEffect` resync can desync with client search/optimistic edits | Medium |
| PTR-08 | Hardcoded metrics | 🧩 | — | Inspect earnings/rating/vehicle | 🐞 **STATIC (Low):** `"-"`/empty — not in list API though type documents them | Low |
| PTR-09 | "Message" button | 🧩 | — | Click | Stub toast | Low |
| PTR-10 | Detail badge staleness | 🧩 | — | Open detail | Status badge from row (`s`), not detail response — may be stale | Low |

---

## 12. Page: Verifications 🟡 PARTIAL (core action is a stub)

**Route:** `/verification` · **Files:** `features/verification/`

### Features
`PageHeader` (title only — **no search/stats/tabs/add**); `DataTable` (Enquiry ID, partner,
total, available, unavailable, status, Suggest action) `LIMIT=10`; row-click opens
`SubstituteDrawer` only when unavailable>0; drawer = item name + price-diff `DynamicTabs`.

### APIs
| Hook | Endpoint (`VERIFICATION_ENDPOINTS`) | Method | Notes |
|---|---|---|---|
| `useGetVerificationReportsQuery` | `/superadmin/partner/verification-reports/` | GET | `page`,`page_size`,`search`; consumes **`data.results` directly (no guard)** |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| VER-01 | Reports load | 🌐✅ | Reports exist | Open `/verification` | Rows from `data.results` array; pagination | High |
| VER-02 | Response-shape fragility | 🌐⛔ | Backend wraps `results.data` | Load | 🐞 **STATIC (High):** no `transformResponse` guard → table silently empty if envelope differs | High |
| VER-03 | Row opens drawer only if action needed | 🧩 | Report w/ 0 unavailable | Click row | No drawer (only when unavailable>0) | Medium |
| VER-04 | Suggest substitute | ⛔🌐 | Unavailable items | Fill name → Send | 🐞 **STATIC (High):** **stub — no API call**; `priceDiff` discarded. Core feature non-functional | High |
| VER-05 | Substitute validation | 🔒 | — | Send with empty name | `toast.error` name required | Medium |
| VER-06 | Status color correctness | 🧩 | Failed/cancelled report | Inspect badge | 🐞 **STATIC (Low):** non-("in progress"/"resolved") may render green incorrectly | Low |
| VER-07 | Dead mock code | 🧩 | — | (code review) | 🐞 **STATIC (Low):** `mockVerifications.ts` imported nowhere | Low |

---

## 13. Page: Assignments 🟡 PARTIAL (active table is mock)

**Route:** `/assignments` · **Files:** `features/assignments/`

### Features
Header + "New Assignment"; left = **mock** active-assignments `DataTable` (no pagination,
row→`OrderDetailDrawer` with **fabricated data**); right = `UnassignedOrdersCard` (live, urgent
badge); `AssignPartnerDrawer` (native date picker default today + live partner list). 

### APIs
| Hook | Endpoint (`ASSIGNMENT_ENDPOINTS`) | Method | Notes |
|---|---|---|---|
| `useGetUnassignedOrdersQuery` | `/superadmin/partner/unassigned-orders/` | GET | maps `res.results[]` |
| `useAssignOrderMutation` | `/superadmin/partner/assign-order/` | POST | `{order_id, delivery_partner_id, deliver_by, confirm:false}` |
| `useGetPartnersQuery` | (reused) | GET | selectable partner list |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| ASN-01 | Unassigned list load | 🌐✅ | Unassigned orders exist | Open `/assignments` | Right card shows live orders + urgent count | High |
| ASN-02 | No loading/error UI | ⛔ | Backend slow/down | Load | 🐞 **STATIC (Med):** unassigned query has no `isLoading`/`isError` surfaced — blank card | Medium |
| ASN-03 | Field-meaning mismatch | 🧩⛔ | — | Inspect unassigned card text | 🐞 **STATIC (High):** `port` holds a formatted **amount**, `items` holds **status** — labels misleading | High |
| ASN-04 | Assign — happy | 🌐✅ | Order + partner | New Assignment → pick partner + date → confirm | POST assign (`confirm:false`); optimistic move; toast | High |
| ASN-05 | Assign — validation | 🔒 | — | Confirm w/o partner | Confirm disabled until partner picked; date free-form (no future check) | Medium |
| ASN-06 | Active table is mock | 🧩 | — | Inspect left table | 🐞 **STATIC (High):** `MOCK_ASSIGNMENTS`; reassign only mutates local state | High |
| ASN-07 | Order-detail fabricated | 🧩 | — | Click an active row | 🐞 **STATIC (High):** identical fake detail every row (`Sailor`, `IMO 0123456`, `$70.00`) | High |
| ASN-08 | Optimistic enquiry hack | 🧩 | — | Assign then inspect new row | 🐞 **STATIC (Low):** `id.replace("#AM","ENQ-")`, `eta:"ASAP"` fragile | Low |

---

## 14. Page: Seller Requests 🟢 INTEGRATED

**Route:** `/sellers` · **Files:** `features/sellers/`

### Features
Search (300ms), status filter (all/pending/reviewing/approved/rejected), 4 stats cards,
`DataTable` (applicant avatar, email, business, products[trunc], documents[badge], submitted,
status, eye), pagination, review drawer with **Approve/Reject** (reject reason dropdown + message).

### APIs
| Hook | Endpoint (`SELLER_ENDPOINTS`) | Method | Notes |
|---|---|---|---|
| `useGetSellerRequestsQuery` | `/superadmin/sellers/requests/` | GET | `page,page_size,search,status`; plain `results[]` |
| `useGetSellerRequestStatsQuery` | `/superadmin/sellers/stats/` | GET | |
| `useApproveSellerMutation` | `/superadmin/sellers/{id}/approve/` | POST | |
| `useRejectSellerMutation` | `/superadmin/sellers/{id}/reject/` | POST | `{reason, message?}` |
| ~~`GET_DETAIL`~~ | `/superadmin/sellers/seller-detail/` | GET | 🐞 **defined but never called** |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| SEL-01 | List + stats load | 🌐✅ | Requests exist | Open `/sellers` | Rows + 4 KPIs | High |
| SEL-02 | Search / status filter / pagination | ✅ | — | Exercise each | Server-side; page→1 | High |
| SEL-03 | Approve | 🌐✅ | Pending request | Open drawer → Approve | POST approve; toast; list+stats refetch | High |
| SEL-04 | Reject w/ reason | 🌐✅ | Pending request | Reject reason + message → Reject | POST reject `{reason,message}`; list refetch | High |
| SEL-05 | Reject success uses red toast | 🧩 | — | Reject | 🐞 **STATIC (Low):** success shows `toast.error` styling | Low |
| SEL-06 | No reject confirmation | ⛔ | — | Click Reject immediately | 🐞 **STATIC (Med):** fires even if reason/message untouched; no confirm | Medium |
| SEL-07 | Drawer detail placeholders | 🧩 | — | Open drawer | 🐞 **STATIC (Med):** Products/Documents show "-" (detail endpoint unused) | Medium |
| SEL-08 | Empty / error+retry / loading | 🧩⛔🌐 | — | Standard | Correct | Medium |

---

## 15. Page: Marine Emergency Spares 🟢 INTEGRATED (read-only)

**Route:** `/spares` · **Files:** `features/spares/`

### Features
Search (300ms), **1 stats card (Total)**, `DataTable` (avatar, category, price, variants, rating,
status), pagination, **read-only** detail drawer. **No status filter, no CRUD.**

### APIs
| Hook | Endpoint (`SPARE_ENDPOINTS`) | Method | Notes |
|---|---|---|---|
| `useGetSpareProductsQuery` | `/superadmin/emergency-spares/products/` | GET | `page,page_size,search`; `results.data[]` |
| `useGetSpareStatsQuery` | `/superadmin/emergency-spares/products/stats/` | GET | |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| SPR-01 | List + stats | 🌐✅ | Products exist | Open `/spares` | Rows from `results.data`; Total card | High |
| SPR-02 | Search / pagination | ✅ | — | Exercise | Server-side | High |
| SPR-03 | Read-only drawer | ✅ | — | Row-click | Overview shown; Close only | Medium |
| SPR-04 | No status filter despite status column | 🧩 | — | Look for filter | 🐞 **STATIC (Low):** `is_active` shown but not filterable; `stats.active/inactive` unused | Low |
| SPR-05 | Empty / error+retry / loading | 🧩⛔🌐 | — | Standard | Correct | Medium |

---

## 16. Page: Special Requests 🟡 PARTIAL (decision + ship/pricing forms are dead)

**Route:** `/requests` · **Files:** `features/special-requests/`

### Features
Search (300ms), status filter, 4 stats cards, **Excel Export (real)**, `DataTable`, pagination,
detail drawer that **fetches full detail by id** (own loading/error/empty), item gallery,
read-only preferences, **ship/delivery inputs + date/time pickers + pricing (all uncontrolled)**,
Reject/Confirm buttons.

### APIs
| Hook | Endpoint (`SPECIAL_REQUEST_ENDPOINTS`) | Method | Notes |
|---|---|---|---|
| `useGetSpecialRequestsQuery` | `/superadmin/special-requests/get-all-special-requests/` | GET | `results.data[]` |
| `useGetSpecialRequestStatsQuery` | `/superadmin/special-requests/special-request-stats/` | GET | |
| `useGetSpecialRequestDetailQuery` | `/superadmin/special-requests/get-special-requests/` | GET | `product_id`; skip when closed |
| `useExportSpecialRequestsMutation` | `/superadmin/special-requests/export-to-excel/` | GET | blob download, `status` param |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| SPQ-01 | List + stats + filter + search + pagination | 🌐✅ | Requests exist | Exercise | Server-side | High |
| SPQ-02 | Detail drawer fetch | 🌐✅ | — | Row-click | Detail fetched by `product_id`; own loading/error/empty | High |
| SPQ-03 | Excel export | 🌐✅ | — | Click Export | GET blob w/ `Accept:*/*`; file downloads via `downloadBlob`; status filter respected | High |
| SPQ-04 | Export error | ⛔ | Force failure | Export | try/catch toast | Medium |
| SPQ-05 | Reject/Confirm buttons | ⛔🌐 | — | Click Reject/Confirm | 🐞 **STATIC (High):** **stubs — no API**; Confirm toast says "Payment Sent" but nothing sent | High |
| SPQ-06 | Ship/pricing form | ⛔🔒 | — | Fill ship info/IMO/date/price → submit | 🐞 **STATIC (High):** all inputs `defaultValue`-only, **never collected or submitted**; `commPref` unused | High |
| SPQ-07 | Image gallery / no-image | 🧩 | With/without images | Open drawer | Gallery or no-image state | Low |

---

## 17. Page: Express Items 🟢 INTEGRATED (read-only)

**Route:** `/express` · **Files:** `features/express/`

### Features
Search (**180ms**), **status filter via clickable column header**, `DataTable` (order 2-line,
customer, location, items, amount, flags badges, partner, arrival, status), pagination, read-only
drawer. **No stats, no export.**

### APIs
| Hook | Endpoint (`EXPRESS_ENDPOINTS`) | Method | Notes |
|---|---|---|---|
| `useGetExpressItemsQuery` | `/superadmin/express/orders/` | GET | `page,page_size,search,status`; reads `data.results` (plain array, **no guard**) |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| EXP-01 | List load | 🌐✅ | Items exist | Open `/express` | Rows from `data.results` | High |
| EXP-02 | Response-shape assumption | 🌐⛔ | Backend wraps `results.data` | Load | 🐞 **STATIC (Med):** no fallback → silent empty table | Medium |
| EXP-03 | Column-header status filter | ✅ | Mixed statuses | Use header filter | `?status=` sent; list filtered; "All" resets | High |
| EXP-04 | `$NaN` amount | ⛔📏 | Order w/ null `total_amount` | Inspect Amount cell + drawer | 🐞 **STATIC (Med):** `Number(null).toFixed(2)` → **`$NaN`** (no null guard) | High |
| EXP-05 | Search spinner | 🧩 | — | Type in search after first load | 🐞 **STATIC (Low):** uses `isLoading` (only first mount) → **no spinner on later searches** | Low |
| EXP-06 | Flags badges | ✅ | Express/emergency/fastest/location-req order | Inspect Flags | Correct badges | Low |
| EXP-07 | Drawer raw button | 🧩 | — | Open drawer footer | 🐞 **STATIC (Low):** raw `<button>` not shadcn `Button`; odd `IconBolt` on Close | Low |

---

## 18. Page: Intents 🟢 INTEGRATED (Flow 27) — *only fully-migrated legacy page*

**Route:** `/intents` · **Files:** `features/intents/` + `features/orders/` ownership

### Features
Search (300ms), 9-option status filter, `StatsGrid` (4 KPIs), `DataTable` (sailor, items[trunc],
ship, arrival, stay, submitted, status, **Owner cell**, actions), **Flow 27 Claim ("Manage
Order")** per-row w/ in-flight spinner, URL-driven state, pagination, review drawer (mini-stats,
items w/ availability, admin-response form, gate hint, Claim/Reject/Confirm).

### APIs
| Hook | Endpoint | Method | Notes |
|---|---|---|---|
| `useGetIntentsQuery` | `/superadmin/orders/intents/` | GET | `page,page_size,search,status`; defensive extract |
| `useGetIntentStatsQuery` | `/superadmin/orders/intents/stats/` | GET | |
| `useClaimOrderMutation` | `/superadmin/orders/order/{id}/claim/` | POST | 409 names holder via `assigned_admin` |
| ~~`useReassignOrderMutation`~~ | `.../reassign/` | POST | 🐞 **no UI calls it** (can't source `admin_id`) |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| INT-01 | List + stats + filter + search + pagination | 🌐✅ | Intents exist | Exercise | Server-side; URL-driven; page→1 | High |
| INT-02 | Owner cell | 🌐✅ | Claimed + unclaimed intents | Inspect Owner column | Shows owner / unassigned correctly | High |
| INT-03 | Claim (Manage Order) | 🌐✅ | Unassigned intent, sub-admin | Click Manage Order | POST claim; per-row spinner; owner updates; lists invalidate | High |
| INT-04 | Claim conflict 409 | ⛔🌐 | Intent owned by another | Claim | Toast names the holder (from `assigned_admin`) | High |
| INT-05 | Confirm/Reject intent | ⛔🌐 | In drawer | Click Confirm/Reject | 🐞 **STATIC (High):** **stubs — no mutation exists**; response form (price/partner/notes) never submitted | High |
| INT-06 | Hardcoded partner options | 🧩 | — | Open drawer partner dropdown | 🐞 **STATIC (Med):** `PARTNER_OPTIONS` is a mock list | Medium |
| INT-07 | Ownership email-only match | 🧩⛔ | Token email casing differs | Claim then act | 🐞 **STATIC (Med):** "mine" match on email only — may silently fail | Medium |

---

## 19. Auth: Login (password) + OTP 🟢 INTEGRATED

**Routes:** `/login`, `/login/otp` · **Files:** `features/auth/`

### Features
Password login (RHF+Zod, show/hide, error banner, loading); OTP login (2-step, `OtpInput`
auto-submit, resend cooldown 120s syncing to server 429, expired affordance, masked email,
status-branched errors); token persistence/rehydration; logout.

### APIs
| Hook | Endpoint (`API_ROUTES.AUTH`) | Method | Notes |
|---|---|---|---|
| `useLoginMutation` | `/superadmin/admin/login/` | POST | `{email,password}` |
| `useRequestAdminOtpMutation` | `/superadmin/admin/login-with-otp/` | POST | `{email}` |
| `useVerifyAdminOtpMutation` | `/superadmin/admin/verify-otp/` | POST | `{email,otp,device?}` |
| `useLogoutMutation` | `/superadmin/admin/logout/` | GET | 🐞 **never called from UI** |
| ~~`useGetMeQuery`~~ | `/superadmin/auth/me/` | GET | 🐞 **unused — no token re-validation** |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| AUT-01 | Password login happy | 🌐✅ | Valid admin creds | Submit | Token+user stored; navigate Dashboard | High |
| AUT-02 | Password validation | 🔒⛔ | — | Bad email / short password | Zod errors (email valid; password ≥6); no POST | High |
| AUT-03 | Password wrong creds | ⛔🌐 | — | Wrong password | Error banner from backend | High |
| AUT-04 | Show/hide password | ✅ | — | Toggle | Masks/reveals | Low |
| AUT-05 | OTP request | 🌐✅ | Valid admin email | Submit email | OTP sent; step B; masked email | High |
| AUT-06 | OTP verify happy | 🌐✅ | Code received | Enter 4 digits | Auto-submit; token stored; navigate | High |
| AUT-07 | OTP code validation | 🔒⛔ | — | Non-4-digit | `^\d{4}$` enforced | Medium |
| AUT-08 | OTP resend cooldown | 📏🌐 | — | Trigger resend / 429 | Countdown; syncs to server "N seconds" | Medium |
| AUT-09 | OTP status errors | ⛔ | — | 400/403/404 | Branched messages (field / blocked-not-admin / no account) | High |
| AUT-10 | Token rehydration | ✅ | Logged in | Refresh | Session persists | High |
| AUT-11 | Logout server session | ⛔🌐 | Logged in | Click logout | 🐞 **STATIC (Med):** clears local state but **never calls `/logout/`** (sidebar bypasses mutation) — server token not invalidated | High |
| AUT-12 | Auth-route guard | 🧩⛔ | Logged in | Visit `/login` | 🐞 **STATIC (Med):** NOT redirected away — can reopen login while authenticated | Medium |
| AUT-13 | Stale token | 🧩⛔ | Expired token in storage | Load app | 🐞 **STATIC (Med):** reads as authenticated until some API 401 (`getMe` unused) | Medium |
| AUT-14 | Forgot password | 🧩 | — | Click | 🐞 **STATIC (Low):** dead toast, no flow | Low |

---

## 20–23. Mock prototype pages 🔴 MOCK (UI-only; no API)

> These four are **static prototypes** (hardcoded arrays, local-state CRUD, toast-only actions).
> Test **UI/interaction only** — there is no data/API layer to verify. **All four pass a
> `subtitle` prop to `PageHeader`, which is a TypeScript error** (prop not in the interface)
> and the subtitle **never renders**.

### 20. Settings (`/settings`)
Platform-config inputs + toggles, Admin Accounts add/edit/delete, FAQ add/edit/delete, custom modals.

| ID | Feature | Type | Steps | Expected | Priority |
|---|---|---|---|---|---|
| SET-01 | Add Admin validation | 🔒 | Add admin w/o name/email | Blocked (`!name\|\|!email`); no email-format check | Medium |
| SET-02 | Add/Delete FAQ & Admin | ✅ | Add/delete entries | Local array updates + toast | Low |
| SET-03 | Save Changes | 🧩 | Click Save | Toast only — **no persistence** | Medium |
| SET-04 | 🐞 `subtitle` TS error | ⛔ | Build/typecheck | `PageHeader` rejects `subtitle` (line 123); never renders | Medium |
| SET-05 | 🐞 Standards violations | 🧩 | Inspect | Inline styles, native `<select>`/checkbox, custom modal, edit stubs | Low |

### 21. Support (`/support`)
4 hardcoded StatCards, ticket table, activity log, ticket drawer (reply/status/priority), New Ticket modal.

| ID | Feature | Type | Steps | Expected | Priority |
|---|---|---|---|---|---|
| SUP-01 | Create ticket / reply / resolve | ✅ | Exercise | Local mutate + toast | Low |
| SUP-02 | Reply validation | 🔒 | Send empty reply | Blocked | Low |
| SUP-03 | 🐞 `Math.random()` IDs | ⛔ | Create many tickets | Collision risk (line 124) | Medium |
| SUP-04 | 🐞 `subtitle` TS error | ⛔ | Typecheck | Rejected (line 146) | Medium |
| SUP-05 | 🐞 Resolved status color | 🧩 | Resolve ticket | `sc:"info"` (blue) not green | Low |

### 22. Chat Monitor (`/chat`)
Thread sidebar, message pane (auto-scroll), send (local), archive/attachment (toast), profile drawer.

| ID | Feature | Type | Steps | Expected | Priority |
|---|---|---|---|---|---|
| CHT-01 | Send message | ✅ | Type + Enter/Send | Appends locally; thread preview updates | Low |
| CHT-02 | Unread badge clear | ✅ | Open a thread | Badge clears | Low |
| CHT-03 | 🐞 Search box dead | ⛔ | Type in thread search | No `value`/`onChange` — non-functional (line 164) | Medium |
| CHT-04 | 🐞 `subtitle` TS error | ⛔ | Typecheck | Rejected (line 136) | Medium |
| CHT-05 | 🐞 Deprecated `onKeyPress` | 🧩 | Inspect | line 346; "Live"/real-time is cosmetic (no backend) | Low |

### 23. Inventory (`/inventory`)
4 hardcoded KPIs, two hand-rolled tables (stock by location, alerts), Refresh (toast).

| ID | Feature | Type | Steps | Expected | Priority |
|---|---|---|---|---|---|
| INV-01 | Refresh | 🧩 | Click Refresh | Toast only — nothing refetches | Low |
| INV-02 | 🐞 `subtitle` TS error | ⛔ | Typecheck | Rejected (line 32) | Medium |
| INV-03 | 🐞 Fully static | 🧩 | Inspect | No StatsGrid/DataTable; all hardcoded; index keys | Low |

---

## 24. Page: Dashboard 🟡 PARTIAL

**Route:** `/dashboard` · **Files:** `features/dashboard/`

### Features
Welcome hero (date) + two `StatsGrid` rows = 12 stat cards, each `onClick` → navigate.
No search/filter/table/CRUD on the rendered page.

### APIs
| Hook | Endpoint (`DASHBOARD_ENDPOINTS`) | Method | Notes |
|---|---|---|---|
| `useGetDashboardStatsQuery` | `/superadmin/dashboard/dashboard/stats/` | GET | `{period}` or `{from_date,to_date}`; only 5 fields rendered |
| *(fired, discarded)* | live-orders, top-products, active-partners, action-required | GET | 🐞 queried in `useDashboard`, data thrown away |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| DSH-01 | Stats load | 🌐✅ | Backend up | Open `/dashboard` | 4 real cards populate (sailors, partners, orders, intents); rest `"-"` | High |
| DSH-02 | Card navigation | ✅ | — | Click each card | Navigates to the mapped route | Medium |
| DSH-03 | Error toast | ⛔ | Backend down | Load | `getApiMessage` toast; cards show `"-"` | Medium |
| DSH-04 | 🐞 Wasted queries / dead cards | 🧩 | — | Network tab | **STATIC (Med):** 4 extra queries discarded; 5 rich card components + revenue hook unrendered; 8/12 cards hardcoded `"-"` | Medium |
| DSH-05 | 🐞 Inert filters | 🧩 | — | Look for period/date/refresh | **STATIC (Low):** hook owns period/date/refetch but page renders no control — always `period="today"` | Low |
| DSH-06 | Placeholder inconsistency | 🧩 | — | Inspect | **STATIC (Low):** `"—"` (loading) vs `"-"` (no-source) mixed | Low |

---

## 25. Page: Analytics 🟢 INTEGRATED

**Route:** `/analytics` · **Files:** `features/analytics/`

### Features
`PillToggle` period (7/30/Quarter/Year) + `DateRangePicker`; 3 KPI cards; Sales-Trend bar
chart; Orders-by-Category bar chart; Product-wise Sales (product dropdown + metrics + daily
chart). All share one `params` → refetch together. Each chart wrapped in `ChartState`.

### APIs
| Hook | Endpoint (`ANALYTICS_ENDPOINTS`) | Method |
|---|---|---|
| `useGetAnalyticsSummaryQuery` | `/superadmin/analytics/summary/` | GET |
| `useGetSalesTrendQuery` | `/superadmin/analytics/sales-trend/` | GET |
| `useGetOrdersByCategoryQuery` | `/superadmin/analytics/orders-by-category/` | GET |
| `useGetProductSalesQuery` | `/superadmin/analytics/product-sales/` | GET (`product_id` optional) |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| ANL-01 | Summary + 3 charts load | 🌐✅ | Data exists | Open `/analytics` | KPIs + both bar charts + product section render | High |
| ANL-02 | Period toggle | ✅ | — | Switch 7/30/Quarter/Year | All sections refetch with `period` | High |
| ANL-03 | Date range | ✅ | — | Pick a range | Refetch with `from/to`; mutually exclusive w/ period | Medium |
| ANL-04 | Chart states | 🌐⛔🧩 | Force loading/error/empty | Per chart | `ChartState` shows spinner / error+Retry / empty | High |
| ANL-05 | Product selector | ✅ | Products exist | Pick a product | `product_id` sent; metrics + daily chart update | High |
| ANL-06 | 🐞 100-product cap | 📏 | >100 products | Open dropdown | **STATIC (Low):** only first 100 selectable (`limit:100`) | Low |
| ANL-07 | 🐞 Growth color | 🧩 | Negative growth product | Inspect badge | **STATIC (Low):** always green even with ↓ arrow | Low |
| ANL-08 | 🐞 Blank product select | 🧩 | API returns `product:null` | Load | **STATIC (Low):** dropdown shows blank until user picks | Low |

---

## 26. Page: Rewards & Coupons 🟢 INTEGRATED

**Route:** `/rewards` · **Files:** `features/rewards/`

### Features
Loyalty overview card (4 KPIs + rules); Active Coupons card; coupons `DataTable` (**no
pagination**); `CouponFormDrawer` (create+edit, RHF+Zod, date pickers, switches);
`LoyaltyConfigDrawer`; delete `ConfirmDialog`.

### APIs
| Hook | Endpoint (`REWARD_ENDPOINTS`) | Method | Notes |
|---|---|---|---|
| `useGetActiveCouponsQuery` | `/superadmin/promotion/coupons/` | GET | DRF envelope; **no page params** |
| `useCreateCouponMutation` | `/superadmin/promotion/coupons/add/` | POST | |
| `useUpdateCouponMutation` | **`/superadmin/orders/coupons/update/{id}/`** | PATCH | 🐞 different base than list/create |
| `useDeleteCouponMutation` | **`/superadmin/orders/coupons/delete/{id}/`** | DELETE | 🐞 different base |
| `useGetLoyaltyOverviewQuery` | `/superadmin/promotion/loyalty/overview/` | GET | |
| `useGetLoyaltyConfigQuery` / `useUpdateLoyaltyConfigMutation` | `.../loyalty/config[/update]/` | GET/PATCH | |

### Test cases
| ID | Feature | Type | Preconditions | Steps | Expected | Priority |
|---|---|---|---|---|---|---|
| RWD-01 | Loyalty overview + coupons load | 🌐✅ | Data exists | Open `/rewards` | KPIs + coupon rows render | High |
| RWD-02 | Create coupon | 🌐✅🔒 | — | Create, valid fields, save | POST add; toast; list refetch. Zod: code req, value ≥0, dates req | High |
| RWD-03 | Edit coupon | 🌐✅ | Coupon exists | Row-click → edit → save | PATCH update; toast | High |
| RWD-04 | 🐞 Update/delete URL base | 🌐⛔ | — | Edit or delete a coupon | **STATIC (High):** update/delete hit `/orders/coupons/…` vs create/list on `/promotion/coupons/…` — verify not a broken path (likely 404) | High |
| RWD-05 | Delete coupon | 🌐✅ | — | Delete → confirm | DELETE; toast; row gone | High |
| RWD-06 | 🐞 Date-format asymmetry | ⛔🌐 | — | Create coupon, inspect payload | **STATIC (Med):** `valid_from` = `…T00:00:00Z`, `valid_to` = raw `YYYY-MM-DD` — inconsistent; may break backend parsing | High |
| RWD-07 | Loyalty config update | 🌐✅🔒 | — | Configure Points → save | PATCH config; overview refetch. Points int ≥0 | Medium |
| RWD-08 | 🐞 No pagination | 📏 | >1 page of coupons | Scroll | **STATIC (Med):** `showPagination=false`, no page params — only page 1 ever shows | Medium |
| RWD-09 | 🐞 Weak validation | 🔒 | — | Enter non-numeric `point_value`, or `valid_to<valid_from`, or discount>100% | **STATIC (Low):** accepted (no numeric/range/percentage guards) | Medium |
| RWD-10 | 🐞 Duplicate-code key collision | 🧩 | Two coupons same code | Render active card | **STATIC (Low):** React `key={code}` collision | Low |
| RWD-11 | Mutation error handling | ⛔🌐 | Force 400 | Save | Drawer stays open; `getApiMessage` toast | Medium |
| RWD-12 | 🐞 Stale "not wired" comments | 🧩 | — | Code review | **STATIC (Low):** overview/mutations labeled "no backend/not wired yet" though they ARE | Low |

---

## 27. Page: Notifications 🔴 MOCK (broken barrel)

**Route:** `/notifications` · **File:** `pages/NotificationsPage.tsx` (routed directly)

### Features
Compose panel (audience/type/message 280-char/send-time/channel — all raw HTML controls),
"Send Notification" (local only), Recent log (5 hardcoded), "Mark all read" (no-op).

### APIs
**None.** `NOTIFICATIONS.SEND` (`/superadmin/notifications/send/`) declared but never called.

### Test cases
| ID | Feature | Type | Steps | Expected | Priority |
|---|---|---|---|---|---|
| NOT-01 | Send validation | 🔒 | Send empty message | `toast.error`; blocked | Medium |
| NOT-02 | Send (mock) | 🧩 | Send valid message | 🐞 **STATIC (High):** no API call — audience/type/schedule/channel discarded; fake log row only | High |
| NOT-03 | 🐞 Broken feature barrel | ⛔ | Import `@/features/notifications` | **STATIC (Med):** re-exports non-existent `./components/NotificationsPage` — would fail build/runtime (router dodges by importing page file directly) | Medium |
| NOT-04 | Schedule option | 🧩 | Select "Schedule" | 🐞 **STATIC (Low):** no date/time picker appears | Low |
| NOT-05 | Mark all read | 🧩 | Click | 🐞 **STATIC (Low):** no-op toast | Low |
| NOT-06 | 🐞 Standards | 🧩 | Inspect | Raw `<select>/<textarea>`, inline styles, strings not in `messages.ts` | Low |

---

# 28. FINAL TESTING REPORT

## 28.1 Pages tested (23)

| Tier | Pages |
|---|---|
| 🟢 **INTEGRATED (10)** | Products, Categories, **Ship Agents**, Sailors, Sellers, Spares, Express, **Intents**, Analytics, Rewards |
| 🟡 **PARTIAL (5)** | Orders, Partners, Verification, Assignments, Dashboard, Special Requests |
| 🔴 **MOCK (6)** | Settings, Support, Chat, Inventory, Notifications *(+ Auth is integrated, listed separately)* |
| 🔐 **Auth (integrated)** | Password login, OTP login, session/logout |

## 28.2 Test-case counts

| Suite | Cases | | Suite | Cases |
|---|---|---|---|---|
| Cross-cutting (GEN) | 12 | | Special Requests (SPQ) | 7 |
| Products (PRD) | 18 | | Express (EXP) | 7 |
| Categories (CAT) | 10 | | Intents (INT) | 7 |
| Ship Agents (SHA) | 12 | | Auth (AUT) | 14 |
| Orders (ORD) | 21 | | Settings (SET) | 5 |
| Sailors (SLR) | 11 | | Support (SUP) | 5 |
| Partners (PTR) | 10 | | Chat (CHT) | 5 |
| Verification (VER) | 7 | | Inventory (INV) | 3 |
| Assignments (ASN) | 8 | | Dashboard (DSH) | 6 |
| Seller Requests (SEL) | 8 | | Analytics (ANL) | 8 |
| Spares (SPR) | 5 | | Rewards (RWD) | 12 |
| — | | | Notifications (NOT) | 6 |
| | | | **TOTAL** | **≈ 207** |

## 28.3 Execution status

| Phase | Status |
|---|---|
| **Static / code-level verification** | ✅ **Complete** — every page audited from source (features, APIs, request/response shapes, state handling, validations) |
| **Runtime execution (live app + backend)** | ⏳ **Pending** — "Actual Result" / Pass-Fail require the dev server + reachable backend. Not runnable from this environment |

> **Honest limitation:** true Pass/Fail (clicking through against the ngrok backend) has not
> been performed. The **defects below were provable from source alone**; runtime testing will
> confirm them and surface data-dependent issues (real API shapes, auth 401 behavior, etc.).

## 28.4 Bug register (static findings, by severity)

### 🔴 HIGH — production blockers
| # | Page | Bug | Repro |
|---|---|---|---|
| B1 | **Build/CI** | `subtitle` passed to `PageHeader` on Settings/Support/Chat/Inventory — **TypeScript errors**; `npm run build` (`tsc -b`) fails | Run `npm run build` → 4+ TS2322 errors |
| B2 | Special Requests | Reject/Confirm + entire ship/pricing form are **stubs** — no API; "Payment Sent" toast is fake | Open request → fill ship/price → Confirm → nothing sent |
| B3 | Intents | Confirm/Reject intent are **stubs** — no mutation exists; response form discarded | Open intent → Confirm/Reject → toast only |
| B4 | Verification | "Suggest substitute" is a **stub** — core action never calls API | Open report → suggest → Send → toast only |
| B5 | Assignments | Active-assignments table is **fully mock**; order-detail drawer shows **identical fabricated data** every row | Click any active row → same fake sailor/ship/total |
| B6 | Assignments | **Field-meaning mismatch**: `port` renders an amount, `items` renders status | Inspect unassigned card labels |
| B7 | Express | **`$NaN`** when `total_amount` is null (no guard) | Load an order with null amount |
| B8 | Rewards | Coupon **update/delete on a different URL base** (`/orders/coupons/…`) than create/list (`/promotion/coupons/…`) — likely 404 | Edit or delete a coupon, watch Network |
| B9 | Notifications | Send calls **no API**; broken feature barrel (`@/features/notifications` imports a non-existent file) | Send a notification; import the barrel |

### 🟡 MEDIUM
| # | Page | Bug |
|---|---|---|
| B10 | Auth | Logout **never calls `/logout/`** — server token not invalidated (sidebar bypasses the mutation) |
| B11 | Auth | No **auth-route guard** — logged-in user can reopen `/login`; **no token re-validation** (`getMe` unused) → stale token reads as authed until a 401 |
| B12 | Partners | **No pagination** (`page_size:100`) → >100 partners silently truncated; **optimistic delete** removes row before API confirms (no rollback) |
| B13 | Verification / Express | **Response-shape assumed** (`data.results`) with **no defensive guard** → silent empty table if backend uses `results.data` envelope |
| B14 | Rewards | **Date-format asymmetry** (`valid_from` datetime vs `valid_to` date); **no coupon pagination** |
| B15 | Sailors | **No email/phone validation** (no Zod); status **tab silently overrides** the dropdown |
| B16 | Dashboard | 4 queries fired then **discarded**; 5 rich cards + revenue hook **unrendered**; 8/12 cards hardcoded; **filters inert** |
| B17 | Orders | Cancel contract unverified (Flow 12); `ship_agent`/`assigned_admin` may be absent from list → drawer shows "no agent"/"unknown owner" |
| B18 | Sellers | Reject has **no confirmation**; detail endpoint unused → drawer Products/Documents are placeholders |

### 🟢 LOW (cosmetic / standards / hygiene)
Stub "Message" buttons (Sailors/Partners); `Math.random()` ticket IDs (Support); dead search box (Chat); index-based React keys (Support/Chat/Inventory/Notifications); duplicate-code React key (Rewards); growth badge always green (Analytics); placeholder inconsistency (Dashboard); raw HTML controls + inline styles on all mock pages; `LIMIT=6` (Sailors) & `180ms` debounce (Orders/Express) deviating from standards; stale/misleading code comments (Partners/Rewards/Special-Requests); dead mock files (Verification/Assignments); Express search spinner never re-shows; duplicate unused `API_ROUTES` path sets (`constants.ts`).

## 28.5 APIs verified (statically confirmed wired)

**Confirmed correct** (endpoint constant + hook + method + params + tags + states): Products (4), Categories (5), Ship Agents (4) + order-bind (1), Sailors (6), Partners (5), Verification (1), Assignments (2), Sellers (4), Spares (2), Special Requests (4), Express (1), Intents (2) + claim/reassign (2), Orders (list + cancel + claim + set-agent), Analytics (4), Rewards (7), Auth (3 + logout/me).

**⚠️ Verify at runtime:** Rewards update/delete base path (B8); cancel-order singular path + body (B17); Verification/Express response envelope (B13); every mutation's real success/error body (currently handled generically via `getApiMessage`).

**Declared but unused:** `SAILOR delete`, `SELLER GET_DETAIL`, `getMe`, `useLogoutMutation` (from UI), `reassignOrder` (no admin-list source), `NOTIFICATIONS.SEND`.

## 28.6 Recommendations before production release

1. **Fix the build first (B1).** Remove `subtitle` from the 4 mock `PageHeader` calls — the app currently fails `tsc -b`. **Blocker.**
2. **Wire or hide the stub actions (B2–B6, B9).** Intent Confirm/Reject, Special-Request decision + ship/pricing, Verification substitute, Assignments active table, and Notifications send all *look* functional but do nothing. Either implement them (needs the Flow 5/6/7/12 backend contracts) or **disable/label them "coming soon"** so QA/users aren't misled.
3. **Guard data rendering (B7, B13).** Add null guards (`$NaN`) and defensive `results`/`results.data` extraction everywhere (copy the Sailors/Partners pattern).
4. **Verify the Rewards + Cancel endpoint paths against the backend (B8, B17)** before shipping coupon edit/delete and order cancel.
5. **Harden auth (B10, B11).** Call the real `/logout/`, add an auth-route guard, and re-validate the token on load (`getMe`) — current behavior leaks sessions and trusts stale tokens.
6. **Standardize pagination & response handling (B12, B14).** Partners and Rewards silently show only partial data.
7. **Run the runtime pass.** Execute this plan against the live app to fill Pass/Fail and catch data-dependent defects the static audit can't see.
8. **Treat MOCK pages (Settings/Support/Chat/Inventory/Notifications) as not production-ready** — they persist nothing.

---

*End of plan. Static audit complete; runtime execution pending a live environment.*
