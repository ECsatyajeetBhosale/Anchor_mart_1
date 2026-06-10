# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Where the code lives

The active application is the React/TypeScript SPA in **`anchor-mart-admin/`**. Run all commands from that directory.

The repo root also contains a **legacy static-HTML demo** (`index.html`, `css/`, `js/app.js`, `serve.js`, the large `anchormart-admin-*.html` files, `README.md`). This is the old mocked-login prototype and is not the app under development — ignore it unless explicitly asked.

`PROJECT_RULES.md` (repo root) is the authoritative coding-convention doc. Read it before writing feature code; the conventions below are the load-bearing subset plus things not obvious from a single file.

## Commands

All from `anchor-mart-admin/`:

```bash
npm run dev      # Vite dev server on http://localhost:3000 (opens browser)
npm run build    # tsc -b (typecheck) then vite build
npm run preview  # serve the production build
npm run check    # Biome lint + format with --write (run before committing)
npm run lint     # Biome lint only
npm run format   # Biome format with --write
```

- **Formatting/linting is Biome**, not ESLint/Prettier. A Husky pre-commit hook runs `biome check --write` via lint-staged on staged `*.{ts,tsx,js,jsx,json}`.
- **No test runner is wired up.** `PROJECT_RULES.md` asks for smoke tests and `src/test/setup.ts` exists, but `package.json` has no `test` script and Vitest is not installed. Do not assume `npm test` works — if tests are needed, the runner must be added first.

## Architecture

**Stack:** React 19, Vite 6, Redux Toolkit + RTK Query, React Router 7, Tailwind CSS 4 (via `@tailwindcss/vite`), shadcn-style UI on Radix primitives, React Hook Form + Zod, `sonner` for toasts.

**Feature-sliced layout.** Code is organized under `src/features/<name>/` (each owns `api/`, `components/`, `hooks/`, `types/`, `schemas/`, `slice/`, and a barrel `index.ts`). Import features only through their barrel — never deep paths. Use the `@/` alias for all imports. See `PROJECT_RULES.md` for the mandatory per-feature folder structure and the new-feature checklist.

**Migration in progress:** most pages still live in `src/pages/*.tsx` as full implementations and are routed directly in `AppRouter.tsx`. Only `auth` and `products` have been migrated to `src/features/`. When adding/migrating, page components belong in `features/<name>/components/`, and `src/pages/<Name>Page.tsx` should become a thin re-export wrapper.

**Data layer — single RTK Query API.** `src/lib/fetchUtils.ts` defines the one `baseApi` (`createApi`). Every feature adds endpoints via `baseApi.injectEndpoints()` — never call `createApi` again, and do not use raw `fetch`/`axios`. The store (`src/store/index.ts`) wires `baseApi.reducer` + `baseApi.middleware` plus the `auth` slice. Cache invalidation uses the `tagTypes` declared in `fetchUtils.ts` (`Products`, `Orders`, `Sailors`, etc.) — see `features/products/api/productApi.ts` for the providesTags/invalidatesTags pattern.

**Auth.** Django REST Framework **Token** auth (header is `Authorization: Token <token>`, *not* Bearer). `prepareHeaders` in `fetchUtils.ts` injects it from `state.auth.token`. The `auth` slice (`features/auth/slice/authSlice.ts`) persists token + user to `localStorage` (`am_admin_token`, `am_admin_user`) and rehydrates on load. `ProtectedRoute` gates all dashboard routes on `auth.isAuthenticated`.

**API base URL.** In **dev**, `baseUrl` is `/api` so requests hit the Vite proxy (`vite.config.ts`), which forwards to `VITE_API_BASE_URL`'s origin and adds the `ngrok-skip-browser-warning` header — this avoids CORS. In **prod**, `baseUrl` is `VITE_API_BASE_URL` directly. Set `VITE_API_BASE_URL` in `.env` (see `.env.example`); it currently points at an ngrok tunnel to a Django backend.

### Known gotcha: duplicate route constants

There are **two** API-path files and they disagree:
- `src/lib/constants.ts` — `APP_ROUTES` (navigation) and an `API_ROUTES` whose products endpoints are `/superadmin/products/...`.
- `src/lib/apiEndpoints.ts` — a *second* copy of `API_ROUTES` plus `PRODUCT_ENDPOINTS` / `CATEGORY_ENDPOINTS` pointing at different `/superadmin/catalog/...` paths.

The live products/catalog features import from **`apiEndpoints.ts`** (`PRODUCT_ENDPOINTS`, `CATEGORY_ENDPOINTS`), while routing/other code uses `constants.ts`. When touching API paths, confirm which file the feature actually imports before editing. `APP_ROUTES` lives only in `constants.ts`.

## Conventions that matter (from PROJECT_RULES.md)

- **No hardcoded URLs, API paths, or route strings** — use `APP_ROUTES` / the endpoint constants.
- **Forms:** React Hook Form + Zod, schema in `features/<name>/schemas/`, type via `z.infer`, connected with `zodResolver`.
- **Styling:** Tailwind utility classes only — no inline `style={{}}`, no CSS-in-JS. `Layout` owns page padding (`px-2 py-4`); don't add conflicting padding to page roots.
- **UI components:** reuse `src/components/ui/` (shadcn-style primitives) and `src/components/common/` (layout/shared) before writing one-off HTML controls.
- **Display strings** go in `src/lib/messages.ts` (i18n-readiness), not inline in components.
- Redux slices are for **client/UI state only** — server data belongs to RTK Query, never stored in slices.

# Product Page UI & Development Standards

The **Products feature** (`src/features/products/`, rendered by `ProductsPage.tsx`) is the **source of truth** for this app's UI patterns, component usage, styling, data presentation, and API integration. It is the only fully component-driven, API-integrated page. Any new module — Category, Shop, User, Order, Vendor, etc. — and any refactor of an existing page **must** follow the rules below and reuse these components rather than introducing new patterns.

All design values live as **CSS custom properties** in `src/index.css` (defined under `:root`). **Never hardcode hex colors, px sizes, radii, or shadows** — reference the tokens (via Tailwind arbitrary values `bg-[var(--token)]` or the `.btn`/`.card`/`.form-input` utility classes). The token families: `--navy-*`, `--teal-*`, `--amber-*`, semantic `--success|danger|warning|info|neutral|purple|green-*`, surfaces `--surface|--surface-alt|--surface-hover|--surface-input|--bg`, borders `--border-xs|sm|md|lg`, text `--t1..--t5`, `--radius-xs|sm|md|lg|xl`, `--shadow-*`/`--sh-*`, `--shadow-focus-teal|navy|red`.

## Shadcn components — mandatory reuse (read before building any UI)

**Always use the project's existing shadcn components when working on a page.** Before writing any control or piece of UI, check whether an equivalent already exists and use it. **Do not hand-roll a control (input, select, switch, dialog, table, etc.) that already exists as a shadcn component.** If you encounter UI that was **manually implemented but a shadcn component exists for it, replace the manual implementation with the shadcn component** as part of your change.

Available shadcn components in **`src/components/ui/`** — reuse these (do not duplicate them):
`Badge`, `Button`, `Card` (+ `CardHeader/Title/Description/Content/Footer`), `DataTable`, `Dialog`, `Input`, `Pagination`, `SearchInput`, `Select` (+ `SelectTrigger/Content/Item/Value`), `Sheet`, `Switch`, `Tabs`, `Textarea`. Plus thin wrappers in **`src/components/common/`** that compose them: `DropdownSelect` (Select), `SearchFilters`/`Search`, `StringListField` (Input list), `StatCard`/`StatsGrid` (Card), `PageHeader`, `FormField`/`FormRow`, `StatusBadge` (Badge), `TableActions`, `ColumnFilterHeader`, `ConfirmDialog` (Dialog), `DynamicTabs` (Tabs). Toasts use **`sonner`** (`toast.*`) — do not build a custom notification system.

If a control you need has **no** shadcn component yet, prefer wrapping an already-installed Radix primitive and adding it to `src/components/ui/` following the existing pattern (forwardRef + `cn()` + design tokens, like `switch.tsx`/`textarea.tsx`). Installed Radix primitives available to wrap: `alert-dialog`, `checkbox`, `dialog`, `dropdown-menu`, `label`, `progress`, `select`, `separator`, `switch`, `tabs`, `toast`, `tooltip`. Only build something fully custom when no shadcn component and no installed primitive fit.

**Known manual implementations to migrate to a shadcn/Radix component when you touch them:**
- `components/ui/select.tsx` and `components/ui/dialog.tsx` are **custom context-based** implementations even though Radix `react-select`/`react-dialog` are installed. Continue using `Select`/`Dialog` (and `DropdownSelect`/`ConfirmDialog`) as the standard, but when reworking them, rebuild on the Radix primitives.
- Truncation tooltips use the native `title=""` attribute; Radix `tooltip` is installed — use a shadcn `Tooltip` wrapper for richer tooltips when needed.
- `FormField` renders a raw `<label>`; Radix `react-label` is installed if a proper `Label` component is wanted.
- The legacy `src/pages/*` use raw HTML controls and `<input type="checkbox">` toggles — replace these with `Input`/`Select`/`Switch`/`DataTable` etc. when migrating (see Gaps below).

## Page composition (the canonical layout)

Every list/management page is assembled top-to-bottom from these shared components, in this order (see `ProductsPage.tsx`):

1. `PageHeader` (`components/common/PageHeader.tsx`) — `title` + optional `subtitle` + right-aligned `actions` slot. The actions slot holds the `SearchFilters` row and the primary "Add" button.
2. `StatsGrid` (`components/common/StatsGrid.tsx`) — responsive KPI cards.
3. `DynamicTabs` (`components/common/DynamicTabs.tsx`) — optional segmented filter tabs.
4. `DataTable` (`components/ui/data-table.tsx`) — the table + built-in pagination.
5. Drawers/dialogs (`ProductFormModal` → `ProductAddDrawer`/`ProductEditDrawer`, `ConfirmDialog`).

Page-level filter/search/pagination state lives in the **URL query string** via `useSearchParams` (not local state) so it is shareable and survives refresh. Changing any filter or search resets `page` to `1`.

## Typography

Font family is `--font-body` ("Nunito"); monospace is `--font-mono` ("JetBrains Mono", apply with the `.mono` class for IDs/SKUs/paths). Concrete scale (do not invent new sizes/weights):

| Use | Class / size | Weight | Color |
|---|---|---|---|
| Page title | `.pg-title` — 22px, `-0.4px` tracking | 800 | `--t1` |
| Page subtitle | `.pg-sub` — 13px | 500 | `--t3` |
| Section label (in drawers/forms) | `.sec-label` — 10px, uppercase, `1.6px` tracking, trailing rule | 800 | `--t4` |
| Stat value | `.stat-val` — 34px, tabular-nums | 800 | `--t1` |
| Stat label | `.stat-lbl` — 11px, uppercase | 800 | `--t4` |
| Table header | `thead th` — 10.5px, uppercase, `1.1px` tracking | 800 | `--t4` |
| Table body | `tbody td` — 13.5px | 500 | `--t3` |
| Table primary cell | `.td-p` — 13.5px | 700 | `--t1` |
| Table muted/secondary cell | `.td-m` — 12.5px | 500 | `--t4` |
| Table id/code cell | `.td-id` — 12px mono | 600 | `--teal-700` |
| Form label | `.fg-label` — 11.5px, uppercase, `0.5px` tracking | 800 | `--t2` |
| Form hint | `.fg-hint` — 11.5px | 400 | `--t4` |
| Button | 13.5px (`.btn`); `sm` 12.5px; `xs` 11.5px; `lg` 14.5px | 700 | per variant |
| Badge | 11px, uppercase, `0.2px` tracking | 800 (extrabold) | per variant |

## Theme & status colors

- **Primary brand / primary buttons:** `--navy-900` (hover `--navy-800`). Primary CTA = `btn btn-primary` or `<Button variant="primary">`.
- **Accent / secondary brand:** `--teal-*` (focus rings, active selection, links, `--teal-600` for `btn-accent`/`variant="teal"`, links via `variant="link"`).
- **Status badge mapping** (via `StatusBadge` → `Badge` variants): Active/In Stock/Success/Delivered → `success` (green); Inactive/Out of Stock/Cancelled → `danger` (red); Low Stock/Warning/In Progress → `warning` (amber); Verifying/Info → `info` (blue); Featured/Deal/Yes → `amber`; New/default → `neutral`. Always render statuses through `StatusBadge` (`components/common/StatusBadge.tsx`) — never a bare colored `<span>`.
- **Hover states:** rows → `--surface-alt` (clickable rows use `.tr-click` → `--navy-25`); secondary surfaces → `--surface-hover`; primary button lifts `translateY(-1px)` + `--shadow-md`.
- **Borders:** `--border-xs` (row dividers), `--border-sm` (card/table outline), `--border-md` (inputs, default), `--border-lg` (hover/emphasis).
- **Radius:** inputs/buttons `--radius-md` (10px); cards/tables `--radius-lg` (14px); thumbnails/small `--radius-sm` (7px); pills/badges full (`rounded-full`).
- **Shadows/elevation:** cards rest at `--sh-xs`; raised buttons/menus `--shadow-md`; focus rings use `--shadow-focus-teal` (inputs) / `--shadow-focus-navy` (primary) / `--shadow-focus-red` (error).
- **Spacing:** page sections separate by ~22–24px (`.pg-header` `margin-bottom:24px`, `.stats-row` `22px`); drawer body uses `p-6` with `gap-6` between sections; form rows via `FormRow` (1–3 columns).

## Table standards (`DataTable`)

- Always use `DataTable<T>` with a typed `columns: Column<T>[]` array. Do **not** hand-roll `<table>` markup (every legacy page currently does — see Gaps).
- **Column model:** `{ id, header, cell?(row), accessorKey?, className?, headerClassName?, filter? }`. Use `cell` for custom rendering; width/alignment via Tailwind in `className` (e.g. `w-12`, `w-24 text-right`).
- **Header:** uppercase 10.5px on `--surface-alt`; **row height** ~`13px 16px` padding; cells vertically centered.
- **Action column:** last column, right-aligned (`className: "w-24 text-right"`), rendered with `TableActions` (`row` + `actions[]` of `{ icon, title, onClick, variant }`); destructive actions use `variant: "danger"`. Action handlers must `e.stopPropagation()` when the row itself is clickable.
- **Column filters:** make a header interactive by adding a `filter: { value, options, onChange, allLabel? }` to its column — renders `ColumnFilterHeader` (a dropdown with an "All" reset). Used for the Status column; filter value lives in the URL and drives the API query.
- **Row click:** pass `onRowClick` to open the detail/edit drawer (adds `.tr-click`).
- **Built-in states:** `DataTable` renders its own loading spinner, error row (with `onRetry`), and empty message (`emptyMessage`) — pass `isLoading`, `isError`, `error`, `onRetry`, `emptyMessage` rather than implementing these per page.
- **Pagination is built in:** pass `page`, `pages`, `onPageChange`, `showPagination`.
- **Responsive:** the table sits in `.tbl-wrap` (`overflow-x: auto`) inside a `.card` — wide tables scroll horizontally rather than reflow.

## Data display standards

- **Truncation:** long text uses `.trunc` (`white-space:nowrap; overflow:hidden; text-overflow:ellipsis`) inside a width-constrained container (Products name/description cap at `max-width:180px`). Always pair a truncated cell with a native `title={fullText}` tooltip so the full value is hover-discoverable.
- **Two-line cells:** primary value as `.td-p` over a muted `.td-m` secondary line (e.g. product name + description).
- **IDs / SKUs / paths / UUIDs:** monospace via `.mono` (or `.td-id` in tables).
- **Currency:** format in the `cell` renderer, e.g. `` `$${Number(value).toFixed(2)}` `` (2 decimals). Keep formatting in the column, not the data layer.
- **Images / thumbnails:** 32–40px square, `objectFit: cover`, `--radius-sm`; render inside a `.prod-thumb` placeholder box that shows a fallback icon when no image exists (see `getProductImage`).
- **Status:** always `StatusBadge`; **booleans/flags:** `Badge` with an icon (e.g. featured → `amber` badge with star).

## Search standards

- Use the shared global search via `SearchFilters` (`components/common/SearchFilters.tsx`), which wraps the `Search` component (`components/common/Search.tsx`) plus any `DropdownSelect` filters and an actions slot. Place it in the `PageHeader` `actions` prop.
- **Placement:** top-right of the page header, left of the primary "Add" button.
- **Debounce:** `searchDebounceMs={300}` is the standard. `Search` debounces internally and only dispatches on actual user input (it holds the callback in a ref so re-renders/pagination don't re-fire it).
- **API integration:** the search term is stored in the URL (`?search=`) and passed to the RTK Query hook, which sends it to the backend as the DRF `?search=` param (empty omitted). Filtering is **server-side**, not client array filtering. Changing the term resets to page 1 and shows the in-input spinner via `searchLoading`.

## Pagination standards

- Use the `Pagination` component (`components/ui/pagination.tsx`) — but normally you get it **for free** through `DataTable` (`showPagination`, `page`, `pages`, `onPageChange`). Don't add a separate pagination bar.
- **Page size:** fixed `limit = 10` per page. Total pages = `Math.ceil(count / limit)`.
- **Backend contract:** DRF pagination — send `page` and **`page_size`** (not `limit`); response is `{ count, next, previous, results: { data: [] } }`. `count` is the grand total used for page math.
- **Positioning/behavior:** right-aligned, inside the table card footer; hidden when there is ≤1 page or while loading/error/empty. Current page lives in the URL (`?page=`).

## Card standards

- Use `Card` (`components/ui/card.tsx`) and its parts (`CardHeader/Title/Description/Content/Footer`). Radius `--radius-lg`, `--border-sm` outline, `--surface` bg, `--sh-xs` shadow, default padding `p-5`; footer sits on `--surface-alt` with a top divider.
- **KPI/stat cards:** use `StatsGrid` + `StatCard` (never bespoke). `StatsGrid` is a responsive grid (`repeat(auto-fit, minmax(188px,1fr))`, gap 14px). `StatCard` takes `{ label, value, icon, variant, delta?, footer?, onClick? }` with a colored top stripe per `variant` (`navy|teal|amber|red|green|purple|blue`).

## Drawer & form standards

- **Drawer:** right-side `Sheet` (`components/ui/sheet.tsx`), `side="right"`, `adjustable`, `defaultWidth={800}`. Structure: `SheetHeader` (icon tile + `SheetTitle` + `SheetDescription`) → scrollable body (`flex-1 overflow-y-auto p-6`) → sticky `SheetFooter` with right-aligned Cancel (ghost) + primary action buttons. Add and Edit are **separate self-contained drawer components** selected by a thin, hook-free switch (`ProductFormModal`) so hook order stays stable.
- **Form library:** React Hook Form + Zod only. Schema in `features/<name>/schemas/<name>.schema.ts`; derive types with `z.infer`; connect via `zodResolver`. Numbers use `z.coerce.number()`.
- **Controls — reuse the shadcn components, never raw HTML controls:** `Input`, `Textarea`, `Switch` (`components/ui/`), `DropdownSelect` (wraps the `Select` primitives) for selects. Booleans use `Switch`. Selects integrate with RHF via `Controller`; text/number inputs via `register`. Editable string arrays (image paths, tags) use the reusable `StringListField` (`components/common/StringListField.tsx`).
- **Field layout:** wrap every control in `FormField` (label + hint + error) and group with `FormRow` (`columns` 1–3). Labels are `.fg-label` (uppercase). Section dividers use `.sec-label`. Long forms group into labelled sections (Basic Information, Media, Pricing, Attributes, …).
- **Validation display:** pass the Zod message to `FormField error={errors.x?.message}` and set the input's `error` flag for the red focus state. Field-level messages only — no alert banners.
- **Read-only fields:** keep fields the API doesn't accept visible but `disabled`/`readOnly`, hint them "not sent", and exclude them from the submit payload (build the payload explicitly from the typed form data — never spread raw form state).

## API & data-management standards

- **Endpoints:** all paths live in `src/lib/apiEndpoints.ts` (grouped constants, id-taking ones are functions). No inline URL strings. (Note: a second `API_ROUTES` exists in `src/lib/constants.ts` — the catalog/products features use `apiEndpoints.ts`; confirm which a feature imports before editing.)
- **Service layer = RTK Query.** One `baseApi` (`src/lib/fetchUtils.ts`); every feature adds endpoints via `baseApi.injectEndpoints()` in `features/<name>/api/<name>Api.ts`. Never `createApi` again, never raw `fetch`/`axios`.
- **Hooks:** queries `useGetXQuery`, mutations `useCreate/useUpdate/useDeleteXMutation`, exported from the api file and re-exported from the feature `index.ts` barrel. A feature may add a thin `use<Feature>` hook for derived shaping, but components may call the generated hooks directly (as `ProductsPage` does).
- **Cache & refetch:** use `tagTypes` + `providesTags`/`invalidatesTags` (declared in `fetchUtils.ts`). List queries provide a `{ type, id: 'PARTIAL-LIST' }` tag; mutations invalidate that tag so the table **auto-refetches** after create/update/delete — no manual refetch calls.
- **Loading/error/empty:** drive `DataTable` props from the query (`isLoading`, `isError`, `onRetry={refetch}`, `emptyMessage`). Don't build bespoke spinners/empty states.
- **Success/error UX:** mutations use `.unwrap()` in a try/catch. On success → close the drawer **then** `toast.success`; the tag invalidation refreshes the table. On failure → keep the drawer open (preserve entered data) and `toast.error`. Surface the real backend reason via the shared `getApiMessage` helper (`src/lib/apiError.ts`), which extracts `message`/`detail`/`non_field_errors`/nested DRF field errors. Toasts via `sonner`.
- **Payload typing:** request payloads are explicit interfaces in `features/<name>/types/` (e.g. `AddProductPayload`, `UpdateProductPayload`); build them field-by-field to match the API contract exactly.

## Gaps in existing pages (migrate toward these standards)

The pages in `src/pages/*` (Sailors, Orders, Intents, Partners, Verification, Assignments, Sellers, Rewards, Inventory, Express, Support, Spares, Analytics, Dashboard, etc.) are **static/mock prototypes** and do **not** yet meet these standards. When working on any of them, migrate toward the Product Page pattern rather than extending the old markup:

- **Hand-rolled tables:** every page builds raw `<table>` markup with inline-styled `<th>/<td>`. → Replace with `DataTable` + typed `columns`.
- **Heavy inline `style={{}}`:** pervasive (50–100+ occurrences per page), violating the Tailwind-only rule. → Move to Tailwind utility classes / design-system classes (`.td-p`, `.td-m`, `.badge`, etc.).
- **No shared search/pagination:** none use `SearchFilters` or the `Pagination`/`DataTable` pagination. → Adopt `SearchFilters` in the header and `DataTable`'s built-in pagination.
- **No API layer:** they render local mock arrays, not RTK Query. → Add a feature slice (`features/<name>/`) with `api/`, `types/`, `schemas/`, and migrate the page component into `features/<name>/components/` with a thin `pages/` re-export wrapper (per the feature-sliced rules above).
- **What they already do right:** all use `PageHeader` and most use `StatsGrid`/`StatCard` — keep those.

Do not introduce new table/search/drawer/badge patterns on these pages; converge on the Product Page implementation.
