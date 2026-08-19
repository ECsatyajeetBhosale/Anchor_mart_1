# Stats Cards Standardization — Audit (phase 1, no code changes)

Scope: the four stats APIs standardized on `{ total, status_counts, type_counts }`.
Date: 2026-08-19. Repo: `anchor-mart-admin`.

---

## 0. Headline

Three of the four screens are **currently broken on screen** — they read the old flat
field names, the payload no longer has them, so every card renders `0`. The Express
**Items** half and the `type_counts` chips are the only parts still reading the right
nesting level, which is exactly why the Intents screenshot shows all cards at `0` while
the type chips read `All · 81 / Marine Emergency · 6 / Regular · 75`.

| API | Screen | Reads today | Status |
|---|---|---|---|
| `orders/intents/stats/` | Intents | `total_intents`, `new_intents`, `pending_intent`, `in_sourcing`, … (flat root) | **Broken** — all cards 0, header "0 open intents" |
| `orders/orders/stats/` | Orders | `all_orders`, `new`, `in_progress`, … (flat root) | **Broken** — all cards 0, header total 0 |
| `express/stats/` | Express Orders | `orders.total_orders`, `orders.new`, … (one level too shallow) | **Broken** — all 8 order cards 0 |
| `express/stats/` | Express Catalog | `items.total_products`, `items.total_variants`, … | **Correct** — `items` never changed |
| `special-requests/special-request-stats/` | Special Requests | `total_requests`, `pending`, … (flat root) | **Broken** — `total_requests` gone; the status keys survive only because they were already at root, which the new contract moved under `status_counts` |

One change is already in the tree from the previous turn: `toIntentStats` in
`src/features/intents/api/intentApi.ts` normalizes the new payload back onto the **old
flat names**. It makes the Intents cards correct on screen, but it violates naming rule
§2 of this task (it manufactures `total_intents` / `new_intents` rather than keeping
`total` / `status_counts.new`), so it should be **reworked, not kept**, when the
implementation phase starts.

---

## 1. Where each API is called, transformed, and rendered

### A. Order Intents — `GET /superadmin/orders/intents/stats/`
- Endpoint: [src/lib/apiEndpoints.ts:369](src/lib/apiEndpoints.ts#L369) `INTENT_ENDPOINTS.GET_STATS`
- Query + transform: [src/features/intents/api/intentApi.ts:280-292](src/features/intents/api/intentApi.ts#L280-L292) (`getIntentStats`), normalizer at [intentApi.ts:64-100](src/features/intents/api/intentApi.ts#L64-L100)
- Type: [src/features/intents/types/intent.types.ts:352-381](src/features/intents/types/intent.types.ts#L352-L381) `IntentStats`, `IntentTypeCounts`
- Cards: [src/features/intents/components/IntentsPage.tsx:80-164](src/features/intents/components/IntentsPage.tsx#L80-L164) (`FUNNEL_STAT_CONFIG` 6 cards + `CLOSED_STAT_CONFIG` 2 cards), assembled at [:312-355](src/features/intents/components/IntentsPage.tsx#L312-L355), rendered via `StatsGrid` at [:741](src/features/intents/components/IntentsPage.tsx#L741)
- `confirmed_today` is a standalone line, not a card: [:745-751](src/features/intents/components/IntentsPage.tsx#L745-L751)
- `total` is the **page subtitle**, not a card: [:711](src/features/intents/components/IntentsPage.tsx#L711)
- `type_counts` → pill toggle: [:305-308](src/features/intents/components/IntentsPage.tsx#L305-L308)
- Only consumer: `IntentsPage`. No other screen reads intent stats.

### B. Regular Orders — `GET /superadmin/orders/orders/stats/`
- Endpoint: [src/lib/apiEndpoints.ts:316](src/lib/apiEndpoints.ts#L316) `GET_ORDER_STATS`
- Query + transform: [src/features/orders/api/orderApi.ts:255-267](src/features/orders/api/orderApi.ts#L255-L267) — transform is a bare `{data}` unwrap, no field mapping
- Type: [src/features/orders/api/orderApi.ts:64-108](src/features/orders/api/orderApi.ts#L64-L108) `OrderStats` (lives in the api file, not in `types/`)
- Cards: [src/features/orders/components/OrdersPage.tsx:141-209](src/features/orders/components/OrdersPage.tsx#L141-L209) `STAT_CONFIG` (6 cards), value read through `pickStat` at [:251-259](src/features/orders/components/OrdersPage.tsx#L251-L259) and [:621](src/features/orders/components/OrdersPage.tsx#L621)
- `all_orders` is the page subtitle: [:901](src/features/orders/components/OrdersPage.tsx#L901)
- `type_counts` → pill toggle: [:602-607](src/features/orders/components/OrdersPage.tsx#L602-L607) — still correct
- Only consumer: `OrdersPage`.

### C. Express Dashboard — `GET /superadmin/express/stats/`
- Endpoint: [src/lib/apiEndpoints.ts:301](src/lib/apiEndpoints.ts#L301) `GET_EXPRESS_STATS`
- Query + transform: [src/features/express/api/expressApi.ts:272-292](src/features/express/api/expressApi.ts#L272-L292) — bare `{data}` unwrap
- Types: [src/features/express/types/expressItem.types.ts:209-266](src/features/express/types/expressItem.types.ts#L209-L266) — `ExpressItemStats`, `ExpressOrderStats`, `ExpressStats`
- Items cards: [src/features/express/components/ExpressPage.tsx:149-185](src/features/express/components/ExpressPage.tsx#L149-L185) — reads `stats.items.*`, **already matches the contract**
- Orders cards: [src/features/express/components/ExpressOrdersPage.tsx:91-200](src/features/express/components/ExpressOrdersPage.tsx#L91-L200) — reads `stats.orders.total_orders` and `stats.orders.<status>` directly; both need to move to `orders.total` and `orders.status_counts.<status>`
- The two halves are already consumed by two different screens and never merged — §3's "do not mix items and orders" is satisfied.

### D. Special Requests — `GET /superadmin/special-requests/special-request-stats/`
- Endpoint: [src/lib/apiEndpoints.ts:467](src/lib/apiEndpoints.ts#L467) `GET_STATS`
- Query + transform: [src/features/special-requests/api/specialRequestApi.ts:133-142](src/features/special-requests/api/specialRequestApi.ts#L133-L142) — bare `{data}` unwrap
- Type: [src/features/special-requests/types/specialRequest.types.ts:130-146](src/features/special-requests/types/specialRequest.types.ts#L130-L146) `SpecialRequestStats`
- Cards: [src/features/special-requests/components/SpecialRequestsPage.tsx:75-123](src/features/special-requests/components/SpecialRequestsPage.tsx#L75-L123) `STAT_CONFIG` (6 cards incl. a Total card), value at [:167](src/features/special-requests/components/SpecialRequestsPage.tsx#L167)
- `awaiting_rebill` renders as a **sub-line inside** the Sourcing Confirmed card, not a 7th card: [:171-180](src/features/special-requests/components/SpecialRequestsPage.tsx#L171-L180) — deliberate, it is contained in `sourcing_confirmed`
- Only consumer: `SpecialRequestsPage`.

---

## 2. Findings

### F1 — Old field names still assumed (blocking, all four APIs)
| File | Line | Reads | Should read |
|---|---|---|---|
| `intents/types/intent.types.ts` | 352-373 | `total_intents`, `new_intents`, `pending_intent`, `in_sourcing`, `in_verification`, … | `total`, `status_counts.{new,pending,sourcing,verification,…}` |
| `intents/components/IntentsPage.tsx` | 91, 99, 107, 115, 124, 132, 151, 159, 711 | flat `IntentStats` keys | `status_counts` tokens |
| `orders/api/orderApi.ts` | 64-95 | `all_orders` + flat status keys | `total` + `status_counts.*` |
| `orders/components/OrdersPage.tsx` | 162-208, 621, 901 | `pickStat(stats, ["new"])`, `["all_orders"]` | `status_counts.new`, `total` |
| `express/types/expressItem.types.ts` | 233-248 | `orders.total_orders` + flat statuses | `orders.total` + `orders.status_counts.*` |
| `express/components/ExpressOrdersPage.tsx` | 112, 128, 149, 158, 170, 181, 190, 199 | `orderStats?.<status>` | `orderStats?.status_counts?.<status>` |
| `special-requests/types/specialRequest.types.ts` | 130-146 | `total_requests` + flat statuses | `total` + `status_counts.*` |
| `special-requests/components/SpecialRequestsPage.tsx` | 85, 167, 178-179 | `key: "total_requests"`, `stats[key]` | `total`, `status_counts[key]` |

**Not to be touched** (same words, different meaning — these are *order status tokens*,
not stats fields): `pending_intent` in [orderStatuses.ts:37](src/lib/orderStatuses.ts#L37),
[LifecycleRail.tsx:19](src/components/common/LifecycleRail.tsx#L19),
[Timeline.tsx:33](src/components/common/Timeline.tsx#L33),
[intentAction.ts:23,37](src/features/intents/lib/intentAction.ts#L23),
[IntentReviewDrawer.tsx:78](src/features/intents/components/IntentReviewDrawer.tsx#L78),
and the `filter:` values in both page configs. Likewise
`dashboard.types.ts:54 pending_intents` and `analytics.types.ts:34 total_orders` belong
to the **dashboard** and **analytics** endpoints, which are outside this task's four APIs.

### F2 — The already-applied intents normalizer contradicts naming rule §2
[intentApi.ts:64-100](src/features/intents/api/intentApi.ts#L64-L100) maps
`total → total_intents`, `status_counts.new → new_intents`, etc. It restores the screen,
but it is exactly the "different frontend interpretation" §2 forbids. Recommended
resolution: delete the flattening, type `IntentStats` as the API shape
(`{ total, status_counts, confirmed_today, type_counts }`), and change the 10 card
configs to `key: "new" | "pending" | …` read from `status_counts`.

### F3 — Card values are read four different ways (§3 consolidation target)
Presentation is **already shared**: [StatCard.tsx](src/components/common/StatCard.tsx) +
[StatsGrid.tsx](src/components/common/StatsGrid.tsx), used by 21 screens. What is
duplicated is the *reading and formatting* layer:
- `pickStat(stats, keys[])` with a string index signature — [OrdersPage.tsx:251](src/features/orders/components/OrdersPage.tsx#L251)
- `(stats?.[c.key] ?? 0).toLocaleString()` — [IntentsPage.tsx:315](src/features/intents/components/IntentsPage.tsx#L315), [SpecialRequestsPage.tsx:167](src/features/special-requests/components/SpecialRequestsPage.tsx#L167)
- `count(value)` helper, defined twice — [ExpressPage.tsx:38](src/features/express/components/ExpressPage.tsx#L38), [ExpressOrdersPage.tsx:37](src/features/express/components/ExpressOrdersPage.tsx#L37)
- `formatStat(value)` helper, defined twice more — [AnalyticsPage.tsx:31](src/features/analytics/components/AnalyticsPage.tsx#L31), [useDashboard.ts:26](src/features/dashboard/hooks/useDashboard.ts#L26)

Four spellings, and two of them disagree on what `undefined` means: `count()` renders
`0`, `formatStat()` renders `—`. Proposal: one `src/lib/stats.ts` exposing a
`StatsResponse` shape (`total`, `status_counts`, optional `type_counts`) plus a
`statValue(stats, key, state)` reader, with each screen keeping its own
`{ key, label, icon, variant, filter }` config. The shared layer never learns what `new`
means — §4 holds.

### F4 — `OrderStats` is typed with an index signature, defeating type checking
[orderApi.ts:94](src/features/orders/api/orderApi.ts#L94):
`[key: string]: number | OrderTypeCounts | undefined`. This is why the Orders cards
compile fine while reading fields the API no longer returns — a typo or a stale name is
invisible to `tsc`. The standardized `status_counts` map should be typed as an explicit
optional-field interface (or `Partial<Record<OrderStatusKey, number>>`), not an open index.

### F5 — Stats errors are silently rendered as `0` (§7 violation, all four screens)
None of the five call sites destructure `isError`/`isSuccess` from the stats query:
[IntentsPage.tsx:287-291](src/features/intents/components/IntentsPage.tsx#L287-L291),
[OrdersPage.tsx:580-584](src/features/orders/components/OrdersPage.tsx#L580-L584),
[ExpressPage.tsx:144](src/features/express/components/ExpressPage.tsx#L144),
[ExpressOrdersPage.tsx:91](src/features/express/components/ExpressOrdersPage.tsx#L91),
[SpecialRequestsPage.tsx:163](src/features/special-requests/components/SpecialRequestsPage.tsx#L163).
A 500 from the stats endpoint is indistinguishable from a genuine zero. The list tables
*do* handle their own error state (`isError` → `M.FETCH_ERROR`), so the pattern exists;
the cards just never adopted it. Fix: three-state value — `—` while loading, `—` (plus
an error affordance) on failure, `value ?? 0` on success.
Note the loading placeholder itself is also inconsistent: Intents/Orders/SR use a
literal `"—"`, Express uses `M.DASH`.

### F6 — Zero values (§6): currently correct everywhere, keep it that way
Every call site already uses `?? 0`, never `|| 0` or `|| "-"`. `sourcing: 0` will render
`Sourcing 0`. No card is conditionally hidden on a zero value. One nuance to preserve
deliberately: `type_counts` chips distinguish `undefined` (render bare label) from `0`
(render `· 0`) — [messages.ts:784-785](src/lib/messages.ts#L784-L785). That is not
zero-hiding; it is "the API did not send a count".

### F7 — No frontend-derived totals exist (§5): clean
Grep found no arithmetic over stats fields anywhere — no `emergency + regular`, no
reduce over buckets. `type_counts.all` is consumed directly. Nothing to fix; the risk is
only that the implementation phase must not introduce any.

### F8 — "Total" is a card on two screens and a subtitle on two others
- Card: Special Requests (`Total Requests`), Express Orders (`Total Orders`)
- Page subtitle: Intents ("81 open intents"), Orders ("143 orders")

The task's §1.A mapping says `total → Total Intents card`. The current subtitle
treatment is a deliberate, documented choice ([IntentsPage.tsx:70-79](src/features/intents/components/IntentsPage.tsx#L70-L79),
[OrdersPage.tsx:148-152](src/features/orders/components/OrdersPage.tsx#L148-L152)): a
total card sitting beside the six buckets it is the sum of reads as a seventh bucket.
**This is a product decision, not a bug** — flagging rather than deciding. Note the
premise behind that comment is now explicitly withdrawn by §1.A ("do not assume all
status cards add up to `total`").

### F9 — Stale doc comments that will mislead the next reader
Not code bugs, but they assert contracts the standardized payload changes:
- [intent.types.ts:373](src/features/intents/types/intent.types.ts#L373) "`type_counts.all == total_intents`"
- [orderApi.ts:67-69](src/features/orders/api/orderApi.ts#L67-L69) "the buckets sum to `all_orders`"
- [expressItem.types.ts:222-232](src/features/express/types/expressItem.types.ts#L222-L232) "`sum(buckets) <= total_orders`"
- [expressItem.types.ts:255](src/features/express/types/expressItem.types.ts#L255) "**Takes no query params, deliberately**" — but [expressApi.ts:275-287](src/features/express/api/expressApi.ts#L275-L287) sends ten. Pre-existing contradiction, unrelated to this task; worth resolving separately.

### F10 — No usable test infrastructure (blocked two acceptance criteria)
`package.json` had no test runner, no `test` script, and no `*.test.*` file existed
anywhere in `src/`. The one trace of an earlier attempt was a stub
`src/test/setup.ts` holding a single `@testing-library/jest-dom/vitest` import, with
neither the dependency nor a config behind it. "Add tests for the stats response
mapping/components" and "run the relevant frontend test suite" therefore required
**introducing Vitest**. Resolved in the implementation phase below (user approved
Vitest + React Testing Library).

---

## 3. Contract mismatches requiring backend input

Per §9, stopping and reporting rather than inventing:

1. **Intents `type_counts.all` vs `total`.** Both are 81 in the sample, and the frontend
   currently documents them as equal. §1.A says not to assume the status cards sum to
   `total`; it says nothing about whether `type_counts.all` is guaranteed to equal
   `total`. The pill chips and the total card would disagree if it ever diverges.
   Question for backend: are they the same population by definition?
2. **Express orders has no `type_counts`.** The other three responses carry one (or, for
   Special Requests, deliberately none). Express Orders currently has no type filter, so
   nothing is broken — confirming it is intentionally absent, not omitted.
3. **Cancelled (59) exceeds most funnel buckets and sits outside `total` (81).** §1.A
   confirms this is expected ("cancelled … represent different parts of the lifecycle"),
   so the frontend will keep rendering it as a terminal card outside the total. Recording
   it so nobody later "fixes" the apparent arithmetic.

No mismatch found that cannot be solved on the frontend.

---

## 4. Proposed implementation plan (not yet executed)

1. `src/lib/stats.ts` — shared `StatsResponse` shape + `statValue()` reader + one
   loading/error/success formatter. No business meaning, no status vocabulary.
2. Retype the four responses to mirror the wire exactly: `IntentStats`, `OrderStats`,
   `ExpressOrderStats`, `SpecialRequestStats` → `{ total?, status_counts?, … }`.
   Delete `toIntentStats`'s flattening (F2); keep only `{data}` unwrapping.
3. Repoint the five screens' card configs to `status_counts` tokens; keep every existing
   `filter:`, `variant:`, icon, breakdown nesting, and click-to-filter behaviour.
4. Add `isError` to all five stats hooks and render a distinct error state (F5),
   standardizing the loading placeholder on `M.DASH`.
5. Update the stale doc comments (F9).
6. Tests (pending the decision below).

Estimated blast radius: 9 files, ~5 of them config-only edits.


---

## 5. Implementation (phase 2 — completed)

Audit findings F1–F5 and F9 are fixed; F6 and F7 were already clean and stayed that way.
F8 was answered "keep as-is": Intents and Orders keep the total in the page subtitle,
Special Requests and Express Orders keep their Total cards. No layout changed.

### New files
| File | What it is |
|---|---|
| `src/lib/stats.ts` | The shared reading layer: `StatusStats` / `TypedStats` envelope types, `statsState`, `statusCount`, `statText`, `statusText`, `statsError`. Knows the `{ total, status_counts, type_counts }` envelope and nothing about what any token means. |
| `src/lib/stats.test.ts` | 23 tests over the four documented payloads, verbatim. |
| `src/components/common/StatsGrid.test.tsx` | 6 tests: zero renders as `0`, loading and error dash out, the error line and retry, and that the grid can't tell one screen's `new` from another's. |

### Changed
| File | Change |
|---|---|
| `src/features/intents/types/intent.types.ts` | `IntentStats` → `TypedStats<IntentStatusKey, IntentTypeKey> & { confirmed_today }`; new exported key unions. |
| `src/features/intents/api/intentApi.ts` | Flattening normalizer removed — back to a plain `{data}` unwrap (F2). |
| `src/features/intents/components/IntentsPage.tsx` | Card keys → `status_counts` tokens; `total` for the subtitle; three-state values; grid error + retry. |
| `src/features/orders/api/orderApi.ts` | `OrderStats` → `TypedStats<OrderStatusKey, OrderTypeKey>`; **index signature removed** (F4). |
| `src/features/orders/components/OrdersPage.tsx` | `pickStat` deleted; `keys: string[]` → one typed `key`; `total` for the subtitle; three-state values; grid error + retry. |
| `src/features/express/types/expressItem.types.ts` | `ExpressOrderStats` → `StatusStats<ExpressOrderStatusKey>`; `items` untouched. |
| `src/features/express/components/ExpressOrdersPage.tsx` | `orders.total` + `orders.status_counts.*`; local `count()` deleted. |
| `src/features/express/components/ExpressPage.tsx` | `items` reads unchanged; local `count()` deleted; three-state values. |
| `src/features/special-requests/types/specialRequest.types.ts` | `SpecialRequestStats` → `StatusStats<SpecialRequestStatusKey>`. |
| `src/features/special-requests/components/SpecialRequestsPage.tsx` | `key: "total"` reads the aggregate, everything else a bucket; `awaiting_rebill` stays a sub-line. |
| `src/components/common/StatsGrid.tsx` | Optional `error` / `onRetry` — one failure affordance for every deck. |
| `src/lib/messages.ts` | `COMMON.STATS.{DASH,ERROR}`; stale "buckets sum to total" / `total_intents` prose corrected. |
| `vite.config.ts`, `package.json`, `src/test/setup.ts` | Vitest + jsdom + RTL; `npm test` / `npm run test:watch`. |

### Verification
- `npx tsc --noEmit` — clean.
- `npm test` — 29 passed, 2 files.
- `npm run build` — succeeds.
- `npx biome check` on every touched file — clean. (`vite.config.ts` keeps three
  pre-existing findings — `path` vs `node:path`, import order, formatting — that were
  already there before this work and are left alone.)

### Still open
The three questions in §3 above are for the backend, and none of them block the frontend.
