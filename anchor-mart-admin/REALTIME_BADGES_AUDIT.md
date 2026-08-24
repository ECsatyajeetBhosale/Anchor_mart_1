# Realtime Badges — Audit & Implementation Plan

**Contract:** "Realtime Badges — Admin Panel Integration Guide" (2026-08-24), `ws/events/`.
**Scope of this document:** what the admin panel already has, what is missing, and the
order in which to build it.
**Status:** Steps 1–5 are **implemented** (see the "Delivered" section at the end). Step 6
is two product decisions and is still open.
**Backend status:** Phase 1 live (socket, auth, snapshot, count definitions). Phase 2
(publish calls at trigger sites) not yet shipped — so `connect`/`sync` snapshots arrive,
spontaneous `changed` frames do not. The wire format is final, so we build against it now.

---

## Part 1 — Audit

### 1.1 What already exists and can be reused

| Asset | Where | Verdict |
|---|---|---|
| Native-WebSocket client with capped backoff, fatal-auth halting, clean teardown | `src/features/chat/lib/chatSocket.ts` | **Pattern to copy, not a class to reuse** — see §1.3 |
| `/ws` dev proxy with `ws: true` | `vite.config.ts:67` | **Done.** Both sockets share it; no config work |
| Socket origin resolution (dev relative / prod from `VITE_API_BASE_URL`, `ws:`/`wss:` scheme match) | `chatSocket.ts` `resolveSocketUrl()` | **Extract and share** — the logic is identical, only the path differs |
| Auth token in Redux, `Token <key>` scheme | `src/features/auth/slice/authSlice.ts` | **Done.** Same token the contract wants in `?token=` |
| Single app shell, mounted once | `src/components/common/Layout.tsx` | **The mount point.** Satisfies §7 "one socket per tab" naturally |
| RTK Query tag system, `PARTIAL-LIST` + `STATS` ids on every queue | `src/lib/fetchUtils.ts` + each feature api | **Done.** Gives us precise, per-queue invalidation with no new plumbing |
| `setupListeners(store.dispatch)` attached | `src/store/index.ts` | **Done.** `refetchOnFocus` is available for the §5 focus-sync path |
| Sidebar badge rendering (`nav-badge`, `badgeVariant`) | `src/components/common/AppSidebar.tsx:133` | **Renders fine, has no data source** — see §1.2 |

The chat socket is genuinely good prior art: it already gets right the one thing a generic
reconnecting wrapper gets wrong — "accept, send an `auth_error` frame, then close" — which
is exactly the shape `ws/events/` uses.

### 1.2 The badges today are fabricated

`src/lib/navigation.ts` carries **hardcoded** badge strings, despite its own doc comment
saying *"Only set this from real data"*:

| Nav item | Line | Hardcoded | Socket key |
|---|---|---|---|
| Notifications | ~194 | `"5"` | **none — not in the contract** |
| Support | ~207 | `"3"` | **none — not in the contract** |
| Seller Requests | ~402 | `"4"` (warning) | `seller_requests` |
| Verifications | ~173 (commented out) | `"3"` | `verifications` |
| Assignments | ~166 (commented out) | `"4"` | n/a |

Those are the numbers visible in the running app right now. They never move and match
nothing. This is not a cosmetic issue for this project — it is the same class of defect the
comment was written to prevent, and shipping real counts into two of these while the other
two stay fake would be worse than today, because half the sidebar would then look
trustworthy.

### 1.3 Contract coverage gaps — the seven counters vs. the seven screens

The socket always sends **all seven** keys. The panel can only show five of them today:

| `counts` key | Screen exists? | Nav entry? | Badge today? | Notes |
|---|---|---|---|---|
| `intents` | ✅ `/intents` | ✅ | ✗ | ready |
| `orders` | ✅ `/orders` | ✅ | ✗ | ready |
| `express_orders` | ✅ `/express-orders` | ✅ | ✗ | ready |
| `special_requests` | ✅ `/requests` | ✅ | ✗ | ready |
| `seller_requests` | ✅ `/sellers` | ✅ | fake `"4"` | ready |
| `verifications` | ✅ `/verification` | **parked (commented out)** | fake `"3"` | screen is built and routed but hidden from the drawer |
| `delivery_failed` | ✗ **no dedicated screen** | ✗ | ✗ | contract says "the orders list filtered to failed" — that filtered view does not exist as a destination |

Two decisions are needed from product before those last two rows can ship; neither blocks
the rest (§2.6).

### 1.4 Where the contract and our existing socket code disagree

Copying `ChatSocket` verbatim would be wrong in four specific ways:

1. **Fatal codes differ.** Chat halts on `blocked` / `invalid_token` / `missing_token`.
   Events adds **`token_expired`** and **`no_badge_scope`**. Retrying a `no_badge_scope`
   account forever is exactly the loop §9 warns about.
2. **A second fatal frame type.** Events sends `forbidden` as well as `auth_error`. Chat
   only knows the latter.
3. **Close codes must also be honoured.** §6 says stop on **4001 / 4003 / 4403**. Chat
   ignores close codes entirely and trusts the frame. If the frame is lost or arrives
   malformed, we would reconnect into a dead token — so the events socket must halt on
   *either* signal.
4. **No outbound queue.** Chat queues `NewMessage` frames across a blip. Events sends only
   `sync`, and a queued `sync` is worthless — the server pushes a full snapshot on connect
   anyway. Queuing one would also risk tripping the 5s rate limit on reconnect.

Backoff: chat's `[1s, 2s, 5s, 10s, 30s]` ladder already satisfies §6 (capped, exponential).
Reuse it.

### 1.5 Other findings

- **The manual refresh button is a stub.** `src/components/common/Header.tsx:26` —
  `handleRefresh()` fires a toast and nothing else ("Future API reload trigger logic can go
  here"). §9 explicitly says *"Keep your manual refresh button"* as the backstop for a
  broken socket. Right now there is no backstop; it is a placebo. This should be fixed as
  part of this work, not after it.
- **`refetchOnMountOrArgChange: true` is already on**, so data is fresh *per navigation*.
  The socket's job is the screen left open, which is precisely what that flag does not
  cover — the tradeoff is documented in `fetchUtils.ts` and this work closes it.
- **No polling to remove.** Nothing currently polls these seven queues, so this is purely
  additive; there is no "fix for polling that turns back into polling" risk to unwind
  (§4), only one to avoid creating.
- **Store has no non-RTKQ slice besides `auth`** — the counts need one.
- **`delivery_failed` is already a known status** in `src/lib/orderStatuses.ts:170` and a
  dashboard field, so the count definition lines up with what the panel already models.

---

## Part 2 — Implementation Plan

Six steps. Steps 1–4 are the working feature; 5–6 are hardening and the product decisions.

### Step 1 — Share the socket URL resolver

Move `resolveSocketUrl()` out of `features/chat/lib/chatSocket.ts` into
`src/lib/socketUrl.ts`, taking the path as an argument:

```ts
export function resolveSocketUrl(path: string, token: string): string
```

Chat calls it with `"/ws/chat/"`, events with `"/ws/events/"`. The dev/prod branch, the
`ws:`/`wss:` scheme match and the malformed-URL fallback are already correct — this is a
move plus a parameter, not a rewrite. Chat's call site changes by one line.

*Files:* new `src/lib/socketUrl.ts`; edit `features/chat/lib/chatSocket.ts`.

### Step 2 — The `realtime` feature

New `src/features/realtime/`, mirroring the existing feature-folder convention.

**`types/realtime.types.ts`**
```ts
export interface BadgeCounts {
  intents: number; orders: number; express_orders: number;
  special_requests: number; seller_requests: number;
  verifications: number; delivery_failed: number;
}
export type BadgeQueue = keyof BadgeCounts;
/** `changed` also carries the two snapshot markers, which are not queues. */
export type BadgeChanged = BadgeQueue | "connect" | "sync";
export type EventsAuthErrorCode =
  | "missing_token" | "invalid_token" | "token_expired" | "blocked" | "no_badge_scope";
```
Plus `BadgeFrame`, `EventsErrorFrame` and a `SocketStatus` reused from chat's types.

**`lib/eventsSocket.ts`** — the client. Same skeleton as `ChatSocket`, with the four
divergences from §1.4:
- `FATAL_AUTH_CODES = {missing_token, invalid_token, token_expired, blocked, no_badge_scope}`
- `FATAL_CLOSE_CODES = {4001, 4003, 4403}`, checked in `onclose` **before** scheduling
- handles `forbidden` identically to `auth_error`
- `send()` drops rather than queues when the socket is down
- a `sync()` method with a **client-side 5s guard** so we never spend a `rate_limited`
  round-trip on a mistake we can see coming

**`slice/realtimeSlice.ts`** — `{ counts: BadgeCounts | null, status: SocketStatus,
authError: string | null, lastAt: string | null }`. One reducer, `applyBadge`, that
**overwrites** `counts` wholesale (§9: absolute, never a delta). Registered in
`src/store/index.ts`.

**`hooks/useRealtimeBadges.ts`** — binds socket → store → cache:
- builds the socket once per token, tears down on unmount/logout
- on every `badge` frame: `dispatch(applyBadge(frame.counts))`
- then, **only if that queue's screen is the one on-screen**, invalidate its tags (§4)
- `sync()` on `visibilitychange` → visible, guarded by the 5s rule

**`index.ts`** — barrel, matching the other features.

### Step 3 — Selective refetch (`changed` → tags)

The mapping is one table, and every tag id in it already exists:

| `changed` | Route | Invalidate |
|---|---|---|
| `intents` | `/intents` | `Intents:PARTIAL-LIST`, `Intents:STATS` |
| `orders` | `/orders` | `Orders:PARTIAL-LIST`, `Orders:STATS` |
| `express_orders` | `/express-orders` | `ExpressItems:PARTIAL-LIST`, `ExpressItems:STATS` |
| `special_requests` | `/requests` | `SpecialRequests:PARTIAL-LIST`, `SpecialRequests:STATS` |
| `seller_requests` | `/sellers` | `Sellers:PARTIAL-LIST`, `Sellers:STATS` |
| `verifications` | `/verification` | `Verifications:PARTIAL-LIST`, `Verifications:STATS` |
| `delivery_failed` | `/orders` (failed filter) | `Orders:PARTIAL-LIST`, `Orders:STATS` |
| `connect` / `sync` | — | **nothing** — snapshot only, set the numbers |

Guarded by the current route so we refetch the visible list and nothing else. `frame.id` is
**not** used to fetch a detail record — advisory only (§3, §9); we may later use it to
deep-link, and a 403/404 there would be correct behaviour rather than a bug.

Note `Orders` is the target for two keys, and the orders list already invalidates
`Intents:PARTIAL-LIST` on some mutations — no conflict, but worth keeping in mind when the
failed-deliveries view lands.

### Step 4 — Wire the badges to real data

1. **Strip the fabricated badges** from `navigation.ts` — `notifications: "5"`,
   `support: "3"`, `sellers: "4"`. Nothing in the contract feeds Notifications or Support,
   so those two lose their pill outright rather than keeping a fake one.
2. **Add a `badgeKey?: BadgeQueue`** field to `NavItem` — the nav config declares *which
   counter* an item shows, never a number. That keeps the "only from real data" rule
   structurally enforceable instead of a comment people can miss again.
3. **`AppSidebar`** reads `state.realtime.counts` and renders
   `counts[item.badgeKey]` when it is `> 0`. Zero renders **no pill**, not a "0" — an empty
   queue should look empty. The existing `nav-badge` markup is unchanged.
4. **Mount the hook in `Layout.tsx`** — one call, above `<AppSidebar>`. One socket for the
   whole app (§7).

### Step 5 — Make the manual refresh button real

`Header.handleRefresh()` currently only toasts. Point it at
`dispatch(baseApi.util.invalidateTags([...]))` for the tags of the current route, and have
it also fire `sync()` so the badges re-snapshot with it. This is the documented backstop for
a silently-dead socket (§9) and it should not stay a placebo while we ship a feature whose
failure mode it exists to cover.

### Step 6 — The two product decisions

Neither blocks steps 1–5; both leave a counter arriving with nowhere to show it.

- **`verifications`** — the Verifications screen is built and routed but its nav entry is
  commented out. Restoring the entry (with its route in `routes/AppRouter.tsx`) is a
  two-line change once someone confirms the screen should be visible again.
- **`delivery_failed`** — there is no destination. Options: a "Failed Deliveries" nav entry
  pointing at `/orders` with a preset status filter, or a status chip on the Orders screen
  carrying the count. The first matches the contract's wording and gives the badge a home;
  the second is less nav clutter. **Recommendation: the nav entry**, since a badge needs a
  row to sit on.

Until these land, the two counters are received and stored and simply not rendered — which
is harmless, and is why they are last.

### Testing

Vitest is configured and the codebase has real unit-test coverage (82 tests across intents
alone), so these are worth writing:

- `eventsSocket.test.ts` — halts on each of the five fatal codes; halts on 4001/4003/4403
  closes; **reconnects** on 1006/1001; backoff is capped and exponential; `forbidden` is
  treated as fatal; `sync` is dropped when closed rather than queued.
- `realtimeSlice.test.ts` — `counts` is overwritten, never accumulated (the §9 delta trap).
- `badgeRefetch.test.ts` — the `changed` → tags table, including that `connect`/`sync`
  invalidate nothing and that an off-screen queue is not refetched.

### Risks

| Risk | Mitigation |
|---|---|
| Phase 2 not shipped — no `changed` frames yet | Snapshots still arrive on connect, so badges are correct at page load from day one. Test the `changed` path against a hand-sent frame |
| Two sockets, one tab | Different paths, independent instances; contract §7 says they don't interfere. Chat's socket is per-screen, events' is per-app — keep it that way |
| Reconnect storm | Capped exponential backoff, reused from chat; fatal codes halt outright |
| Counts drift from the screen they link to | Backend imports the dashboard's own definitions (§8), so drift means a backend bug, not a frontend reconciliation problem. Do not re-derive counts client-side |
| "assigned to me" counts absent in v1 (§8) | Counts are global. Don't label the badges as personal work |

### Suggested order

Steps 1 → 2 → 3 → 4 is one coherent PR (the feature). Step 5 is a small independent PR.
Step 6 waits on product.


---

## Part 3 — Delivered

Steps 1–5 are built, typechecked, linted and tested (206 tests pass, production build clean).

| Step | Status | Files |
|---|---|---|
| 1 — shared URL resolver | done | new `src/lib/socketUrl.ts`; `features/chat/lib/chatSocket.ts` now calls it |
| 2 — realtime feature | done | `src/features/realtime/` — `types/`, `lib/eventsSocket.ts`, `lib/badgeRefetch.ts`, `slice/`, `hooks/`, `index.ts`; reducer registered in `src/store/index.ts` |
| 3 — selective refetch | done | `lib/badgeRefetch.ts` — the seven-queue table, route-gated |
| 4 — real badges | done | `src/lib/navigation.ts` (`badge` → `badgeKey`), `AppSidebar.tsx`, `Layout.tsx` mounts the hook |
| 5 — manual refresh | done | `Header.tsx` — now invalidates the open screen's caches and fires a `sync` |
| 6 — product decisions | **open** | Verifications nav entry; a home for `delivery_failed` |

**Tests:** 40 new, across three files.
`eventsSocket.test.ts` (24) — all five fatal auth codes halt; `forbidden` behaves as
`auth_error`; 4001/4003/4403 closes halt *without a frame*; 1006/1001/1012 reconnect; the
backoff ladder is exponential, capped at 30s and resets after a successful connect; `sync`
is dropped rather than queued while closed and is refused inside the 5s window; a non-JSON
frame is ignored; teardown cancels pending reconnects and fires no handler afterwards.
`badgeRefetch.test.ts` (9) — the queue→tags table, that an off-screen queue refetches
nothing, and that `/express-orders` is not read as nested under `/express`.
`realtimeSlice.test.ts` (7) — counts start null (not zeroed), overwrite rather than
accumulate, and clear on logout.

### Deviations from the plan

- **`QueueTag` is typed off `baseApi`'s own tag union**, not `{type: string}` as sketched.
  The compiler rejected the loose version, correctly: a mistyped tag name invalidates
  nothing at all, and the symptom would be a list that quietly stops refreshing.
- **`requestBadgeSync()` is a module-level handle**, not context or a prop. The socket is
  owned by the shell and the refresh button lives in the header; there is exactly one of
  each.
- **The visibility re-sync also calls `connect()`**, not just `sync()` — a socket that died
  while the tab was hidden needs waking, and reconnecting snapshots by itself.
- **`counts` is `null` before the first frame**, not zeroed, and a zero renders **no pill**.
  "Not heard yet" and "nothing outstanding" must not look the same.

### Known-not-done

- The two Step 6 decisions. `verifications` and `delivery_failed` are received and stored
  and simply not rendered until they have a row to sit on.
- Three pre-existing a11y lint errors in `AppSidebar.tsx` (`useButtonType`,
  `useKeyWithClickEvents`, `noSvgWithoutTitle`) are untouched — they predate this work.


---

# Phase 2 — Audit & Plan

**Contract revision:** 2026-08-24, "Fully live". Phase 1 + Phase 2 both shipped.
**Status:** all five changes (A–E) **implemented**. 229 tests pass; typecheck, lint and
production build clean.

## P2.1 — What actually changed in the contract

The wire format is unchanged, exactly as promised, so nothing already built is invalidated.
Three things are new, and only the last two are substantive:

1. **Spontaneous `changed` frames now arrive** for all seven queues. Everything built in
   Phase 1 was integrated against this path but had only ever been exercised by
   `connect`/`sync` snapshots. The code path is no longer hypothetical — it is now the
   common case, under real traffic volumes (600 orders in the current dataset).
2. **A documented publish gap:** *soft-deleting an order publishes no frame.* The number is
   wrong until the next snapshot — reconnect or `sync`.
3. **A new §8 subsection, "When a frame is not sent":** the server publishes only when a
   count actually *moves*. `at_port → at_berth` keeps the order in the `orders` bucket, so
   **no frame is sent** — the milestone changed, the badge did not.

## P2.2 — What that exposes in the delivered code

Five findings. Two are correctness, three are the difference between "wired up" and "holds
up under live traffic".

### F1 — No recovery path for the soft-delete gap (correctness)

The contract's own answer to its gap is "the next snapshot — reconnect or `sync`". We have
exactly two triggers for either: a socket drop, and the tab regaining visibility. **An admin
who leaves the panel open and focused has neither.** A soft-deleted order therefore leaves a
badge overstated indefinitely — the one failure the contract names, with no path back.

This is the finding that most justifies its own fix: the gap is documented as
self-correcting, and in our client it currently does not self-correct.

### F2 — The Dashboard shows the same numbers and never refreshes (correctness)

`badgeRefetch.ts` has no binding for `/dashboard`, but the dashboard renders the very same
counts: `Dashboard:STATS` (`in_progress`, `intent_received`, `delivery_failed`),
`Dashboard:ACTION-REQUIRED`, and `Orders:DASHBOARD-LIVE`. With frames now flowing, an admin
sitting on the Dashboard watches the sidebar badge tick up **while the card beside it holds
the old number**. Two numbers, one screen, disagreeing — which is precisely the failure §8
says cannot happen ("a badge can never disagree with the screen it links to"). It cannot
happen *server-side*; we reintroduce it client-side by refreshing one and not the other.

### F3 — One refetch per frame, with no coalescing

`onBadge` dispatches `invalidateTags` synchronously per frame. Frames are independent
messages, so RTK Query sees N separate invalidations and issues **N list requests**. During
a burst — a partner submitting a batch, a Celery timer sweeping, several admins working the
same queue — an admin parked on `/orders` triggers a request per frame. The §4 rule ("only
refetch the list the user is looking at") is honoured, but its *purpose* — not turning a fix
for polling back into polling — is not.

### F4 — Every frame re-renders the sidebar, even when nothing moved

`applyBadge` always writes a new `counts` object. `AppSidebar` selects `state.realtime.counts`,
so identical counts still produce a new reference and a re-render. Snapshots make this
routine: every `sync` and every reconnect re-renders the sidebar with the numbers it already
had.

### F5 — Nothing records that in-bucket milestones send no frame

New §8 makes explicit that `at_port → at_berth` publishes nothing. Our Orders screen has no
other live path, so those transitions are invisible until a manual refresh or a navigation.
That is *correct behaviour per the contract*, but it is a standing trap: the next person to
read `useRealtimeBadges` will reasonably assume the orders list is live and file a bug when
a milestone does not appear. It needs writing down where that assumption would be made.

## P2.3 — Plan

Five changes, all inside `src/features/realtime/` plus one comment elsewhere. No contract
work, no new endpoints.

| # | Fixes | Change |
|---|---|---|
| **A** | F3 | **Coalesce refetches.** New `lib/refetchCoalescer.ts`: queues arriving within a 300ms trailing window collapse into one invalidation carrying the union of their tags. A burst of twelve frames becomes one request |
| **B** | F4 | **Skip no-op count writes.** `applyBadge` compares the seven keys and keeps the existing object when they are unchanged, so the sidebar re-renders only when a number actually moves. `lastAt` still advances — it is not selected by any component |
| **C** | F2 | **Bind the Dashboard.** Any queue frame, while on `/dashboard`, invalidates `Dashboard:STATS`, `Dashboard:ACTION-REQUIRED` and `Orders:DASHBOARD-LIVE`. All seven counters feed those cards, and the coalescer makes the breadth cheap |
| **D** | F1 | **Safety-net `sync`.** A 2-minute interval while the tab is visible, paused while hidden. Counters only — no list refetch — so it is two orders of magnitude cheaper than the polling this feature replaced, and it is the documented recovery path for the soft-delete gap |
| **E** | F5 | **Write down the "no frame when the bucket is unchanged" rule** in `useRealtimeBadges`, where someone would otherwise assume the lists are live |

**On D and the "don't reinvent polling" rule.** A 2-minute counter-only `sync` is not the
polling this feature removed: it fetches no rows, touches no list endpoint, and is one small
frame on an already-open socket. It exists because the contract documents a hole that only a
snapshot closes, and because §9 is explicit that the socket is best-effort. The rate limit is
one per 5s; 120s is well clear of it.

### Tests

- `refetchCoalescer.test.ts` — a burst collapses to one flush; tags are unioned and
  de-duplicated; a later burst flushes separately; `dispose()` cancels a pending flush.
- `realtimeSlice.test.ts` — identical counts preserve the object reference; a changed count
  replaces it; `lastAt` advances either way.
- `badgeRefetch.test.ts` — the dashboard binding fires for every queue on `/dashboard` and
  for none of them elsewhere.


## P2.4 — Delivered

| # | Status | Files |
|---|---|---|
| A — coalesce refetches | done | new `lib/refetchCoalescer.ts`; `hooks/useRealtimeBadges.ts` pushes through it |
| B — skip no-op count writes | done | `types/realtime.types.ts` (`sameCounts`), `slice/realtimeSlice.ts` |
| C — dashboard binding | done | `lib/badgeRefetch.ts` (`DASHBOARD_TAGS`, `tagsForQueues`) |
| D — safety-net sync | done | `hooks/useRealtimeBadges.ts` — 120s while visible, paused while hidden |
| E — document the no-frame rule | done | `hooks/useRealtimeBadges.ts` doc comment |

**Tests:** 23 new (63 in the feature, 229 across the app).
`refetchCoalescer.test.ts` (8) — a twelve-frame burst collapses to one flush; distinct
queues are all carried; the window is trailing and does not extend; a later burst flushes
separately; `flush()` on an empty queue is a no-op; `dispose()` drops a pending flush and
ignores later pushes.
`badgeRefetch.test.ts` (+13) — the dashboard binding fires for all seven queues on
`/dashboard`, for none of them elsewhere, and only once per burst; batches union and
de-duplicate across queues sharing a screen.
`realtimeSlice.test.ts` (+2) — identical counts preserve the object reference while
`lastAt` still advances; one changed number swaps it.

### Deviations from the plan

- **`tagsForRoute` now delegates to `tagsForQueues`** rather than keeping its own loop. It
  was duplicating the de-duplication logic, and routing it through the new function also
  gave the manual refresh button dashboard coverage for free.
- **The safety-net interval is started/stopped by visibility**, not merely skipped when
  hidden — a background tab nobody is reading has no stale numbers worth correcting, and it
  re-snapshots the moment it returns.

### Still open (deferred by agreement)

- Step 6, both halves: the Verifications nav entry, and a home for `delivery_failed`.
- "Assigned to me" counts — server-side plumbing exists, counts are global in v1.


---

# Phase 3 — Audit & Plan (final)

**Contract revision:** unchanged from Phase 2 — same text, same "Fully live" status. So this
phase is not new integration work: it is closing what the first two phases left open, and
auditing the parts of the contract we accepted but never acted on.
**Status:** A–C **implemented**. 240 tests pass; typecheck, lint and build clean. G4/G5 remain
open by agreement and are listed in "Open questions" below.

## P3.1 — Contract coverage, section by section

| § | Requirement | State |
|---|---|---|
| 2 | connect with `?token=`, no secret header | ✅ |
| 3 | `badge` / `auth_error` / `forbidden` / `error` frames | ⚠️ parsed correctly, but the **"What to do" column is not acted on** — see G1 |
| 4 | `changed` → refetch the visible list only | ✅ (+ dashboard, Phase 2) |
| 5 | `sync`, rate-limited to 1/5s | ✅ client-side guard |
| 6 | capped exponential backoff, no retry on 4001/4003/4403 | ✅ frame **and** close-code |
| 7 | one socket per tab, fanned out through the store | ✅ mounted in `Layout` |
| 8 | count definitions; no frame when the bucket is unchanged | ✅ documented in the hook |
| 9 | absolute counts · advisory `id` · no retry loop · visible list only · keep manual refresh | ✅ all five |

Everything mechanical is done. What remains is one contract requirement we skipped, one
false comment, one invisible failure mode, and the two parked product decisions.

## P3.2 — Findings

### G1 — The `auth_error` "What to do" column is ignored (correctness)

§3 gives each code a prescribed action: `invalid_token` / `token_expired` → *send the user to
login*; `blocked` → *log out, show the blocked message*; `no_badge_scope` → *don't retry*.
We store the detail string in `state.realtime.authError` and **do nothing else**. Nothing
reads it. An admin whose token dies keeps a fully-rendered panel with frozen badges and no
indication anything is wrong.

### G2 — The reason we skipped G1 was factually wrong

The Phase 1 comment justifying it reads: *"Sending the admin to login from here would fight
the REST layer's own 401 handling."* **There is no REST 401 handling.** `grep` for `401`
across `src/` finds one unrelated API comment and nothing else — no `baseQuery` wrapper, no
middleware, no interceptor. So not only is nothing fighting us, the socket's `auth_error` is
currently **the only signal in the entire app** that a token has died. The comment asserts a
safeguard that does not exist, which is worse than no comment.

### G3 — A dead socket is invisible (§9's own warning)

§9: *"A user who leaves a screen open for an hour with a broken socket sees stale numbers…"*
We track `state.realtime.status` faithfully and render it nowhere. The badges look identical
whether the socket is live or has been down for an hour. The Phase 2 safety-net sync
narrows the window but cannot close it — a halted socket never syncs again.

The chat feature already solved this exact problem and has the copy for it
(`MESSAGES.CHAT.SOCKET`: Live / Reconnecting… / Offline), so there is a house pattern to
follow rather than a design to invent.

### G4 / G5 — The two parked decisions

Unchanged from Step 6, but the audit turned up a fact that reshapes G5:

**The Orders screen already has a Failed Deliveries destination.** `OrdersPage` ships a KPI
card (`id: "delivery-failed"`, `filter: "delivery_failed"`) that sets
`?status=delivery_failed`, and `delivery_failed` is already in `ORDER_FILTER_KEYS`. So
`/orders?status=delivery_failed` is a real, working, linkable view **today** — the contract's
"the orders list filtered to failed" exists; it just has no badge on it.

That kills the "build a screen" option and leaves a narrower question, with a real
constraint: **`NavLink` matches on pathname only.** A nav entry pointing at
`/orders?status=delivery_failed` would light up whenever `/orders` is active and vice versa —
and this codebase has already been bitten by exactly that (`constants.ts` records
`ADMIN_USERS` / `DELETION_REQUESTS` being split into separate *paths* because `?tab=` deep
links "would have lit up every entry sharing the path").

**Verifications (G4):** both the nav entry *and* the route are commented out
(`AppRouter.tsx:33` and `:117`) — it is parked more deliberately than Phase 1 recorded.
Restoring it is three uncomments, but whether it *should* come back is a product call.

## P3.3 — Plan

Implement G1–G3 (correctness and the contract's own instructions). Leave G4/G5 as questions,
per agreement.

| # | Fixes | Change |
|---|---|---|
| **A** | G2 | Delete the false comment; replace it with what is actually true |
| **B** | G1 | Act on the codes as §3 prescribes: a new `lib/authFailure.ts` classifying each code into `logout-to-login` / `logout-blocked` / `inert`, and the hook dispatching `logout()` + a toast for the first two. `no_badge_scope` and `missing_token` stay inert — neither is a login problem (`missing_token` is our own bug, `no_badge_scope` means this account type has no badges at all) |
| **C** | G3 | A `ConnectionStatus` indicator in the header, rendered **only when the socket is not open**, so the happy path is visually unchanged. Reuses the chat feature's Live/Reconnecting/Offline vocabulary |

### Why B is safe to do now, having skipped it once

The original objection was a conflict that does not exist (G2). The remaining risk is a
spurious logout, and the classification guards it: only the three codes §3 explicitly maps to
a login action trigger one, and each is terminal — the socket has already halted, so there is
no retry that could recover the session anyway.

### Tests

- `authFailure.test.ts` — every code maps to its prescribed action; an unknown code is inert
  (a code we have not been taught must never log anyone out).
- `realtimeSlice.test.ts` — status transitions drive the indicator's three states.


## P3.4 — Delivered

| # | Status | Files |
|---|---|---|
| A — remove the false comment | done | `hooks/useRealtimeBadges.ts` |
| B — act on auth codes | done | new `lib/authFailure.ts`; hook dispatches `logout()` + toast; `slice/` now keeps `authCode` beside `authError` |
| C — connection indicator | done | new `components/ConnectionStatus.tsx`; mounted in `components/common/Header.tsx`; copy in `MESSAGES.REALTIME` |

**Tests:** 11 new (74 in the feature, 240 across the app). `authFailure.test.ts` asserts §3's
"What to do" column row by row, plus four unrecognised codes that must stay inert.

### Deviations from the plan

- **The slice gained `authCode`.** The indicator has to tell `no_badge_scope` (nothing is
  broken, nothing to retry) apart from a real outage, and the stored detail is server prose,
  not something to branch on. My first cut branched on a constant and was wrong.
- **No manual redirect on logout.** The router already sends an unauthenticated admin to
  login and `logout()` flips `isAuthenticated`; navigating as well would race it.
- **`<output>` rather than `<div role="status">`** — it carries the role natively.
- **The indicator stays silent before the first connection**, so a page load does not flash
  a warning during the second it takes to connect.

---

# Open questions — ANSWERED 2026-08-24 by the backend team, and implemented

All six were answered in "Realtime Badges — FE Open Questions: Audit, Decisions, Plan".
The FE-side work (Q1–Q5) is built; see "Question resolutions" at the end of this file.
The original questions are kept below for the record.

### Q1 — Should the Verifications screen come back?

`verifications` counts orders in `verification_submitted` and arrives on every frame, but
both the nav entry (`navigation.ts`) and the route (`AppRouter.tsx:33`, `:117`) are commented
out. The screen is built. Restoring it is three uncomments; whether it *should* return is not
ours to decide — it was parked deliberately. Until then the counter is received, stored and
never rendered.

### Q2 — Where does `delivery_failed` live?

The audit changed this question. **A destination already exists:** `OrdersPage` has a Failed
Deliveries KPI card that sets `?status=delivery_failed`, and that status is already a valid
list filter. So the contract's "orders list filtered to failed" is a working view today — it
just carries no badge. The options:

- **(a) Badge the existing KPI card.** Zero new navigation, no routing risk. But the count
  only shows once you are already on Orders.
- **(b) A "Failed Deliveries" nav entry at its own path** (e.g. `/orders/failed`) that presets
  the filter. Gives the badge a permanent home. This is the shape the codebase already chose
  for `ADMIN_USERS` / `DELETION_REQUESTS`.
- **(c) A nav entry pointing at `/orders?status=delivery_failed`.** Simplest to write and
  **the one to avoid**: `NavLink` matches on pathname only, so it and Orders would light up
  as active together — the exact trap `constants.ts` records having been bitten by before.

**Recommendation: (b)**, with (a) as the cheap interim. A badge needs a row to sit on.

### Q3 — Should a dying token log the admin out of the whole panel?

Implemented as yes for `invalid_token` / `token_expired` / `blocked`, because there is no
other 401 handling in the app and the alternative is an admin working against a screen whose
data is frozen. Worth confirming: it means a socket-only failure ends a REST session that
might still have been valid. The conservative alternative is to show the banner and let the
next failed REST call decide — but nothing today makes that call.

### Q4 — Should the panel have global 401 handling at all?

Out of scope for this contract, but the audit surfaced it and it is the more complete fix for
Q3: no `baseQuery` wrapper, no middleware, nothing anywhere in `src/` handles a 401. Every
REST call in the panel currently fails silently against a dead token. The badge socket is
papering over a gap that belongs to the API layer.

### Q5 — "Assigned to me" counts

The contract notes the server-side plumbing exists but v1 counts are global. Nothing in the
UI implies otherwise today, but if per-admin badges are wanted, that is a backend switch
first and a small frontend change second.

### Q6 — Live milestones on the order detail screen

§8 is explicit that in-bucket transitions (`at_port → at_berth`) publish nothing, and that
live milestones are "a different feature and this socket is not it". If admins expect an
order detail drawer to update itself, that needs its own contract.


---

# Question resolutions (implemented 2026-08-24)

250 tests pass; typecheck, lint and production build clean.

| Q | Decision | Built |
|---|---|---|
| Q1 Verifications | Restore it; leave Assignments parked | ✅ nav entry, route + page import, `badgeKey: "verifications"` |
| Q2 `delivery_failed` | Option (b) — its own path | ✅ `/orders/failed`, nav entry, `OrdersPage defaultStatus` |
| Q3 logout on dying token | Keep it — but on the **frame**, never a close code | ✅ already true; now asserted by test |
| Q4 global 401 | Yes — the real fix | ✅ `baseQueryWithAuth` in `lib/fetchUtils.ts` |
| Q5 "mine" counts | Five queues only; alongside `counts` | ✅ types + slice; **UI still to be decided** |
| Q6 live milestones | Closed, will not be built | — nothing to do |

### Q1 — the placeholder-badge trap was already defused

The backend audit flagged that uncommenting the parked entries as-is would ship fake numbers
(`badge: "4"` on Assignments, `badge: "3"` on Verifications). Phase 1 had already removed
every hardcoded badge and replaced the field with `badgeKey`, so there was no literal left to
ship — Verifications came back reading its live counter, and Assignments has no badge at all.

### Q2 — the collision runs both ways

The backend flagged that `/orders?status=…` would light up Orders. `/orders/failed` has the
**mirror** problem: `NavLink` treats a descendant route as active, so Orders would stay lit on
the Failed Deliveries screen. Fixed with a `navEnd` flag on `NavItem`, set on Orders only.
Safe here because the router has no other `/orders/*` route — every route in `AppRouter` is a
flat top-level path.

`defaultStatus` is a *default*, not a lock: the dropdown still writes `?status=`, so an admin
who arrives from the badge can widen the view without being bounced to another route.

### Q3 — verified, not assumed

`EventsSocket.onclose` halts on 4001/4003/4403 but never calls `onAuthError`, so logout can
only ever fire from an `auth_error` / `forbidden` frame. That was already the behaviour; it is
now pinned by four tests, because it is exactly the property that would rot silently and sign
admins out on every wifi drop.

`token_expired` stays mapped to logout even though admin tokens never expire — it costs
nothing and the mapping should not quietly disagree with the published contract.

### Q4 — 401 only, deliberately

A 403 does **not** log out. It is an authorisation verdict on one endpoint — a sub-admin
reaching for a super-admin screen — and ending their session over it would be a bug.

### Q5 — stored, not yet shown

Types and slice handle `mine`; `MineCounts` is typed over the five owner-scoped queues so the
two that have no owner field are excluded *by the type*, not by a runtime check. `null` when
the server omits it, kept from the previous frame rather than blanked, so "this server does
not report mine" never renders as "none of it is mine".

**No UI yet — that is the one open item left.** The backend's own analysis rules out the
obvious design: a sidebar-wide "mine" toggle would be lying about Special Requests and Seller
Requests. See the question below.

### Bug found while wiring Q2

`AppSidebar` mapped only `badgeVariant === "warning"`, so `info` and `success` silently
rendered as the base style — which is *danger* red. Nothing hit it before (only Seller
Requests set a variant, and it was `warning`), but Failed Deliveries would have been the
second. All four variants are now mapped.

---

# Remaining open item

### Q5b — how should "mine" counts be shown?

The data is arriving and stored; nothing renders it. A sidebar-wide toggle is ruled out by the
backend's audit — `SpecialRequest` and `SellerProfile` have no owner field, so two of the
seven entries cannot answer "mine" at all. Options:

- **(a) A second number on the five scoped entries** (e.g. `3 / 12`) — always visible, no
  mode to be in, and the two unscoped entries simply show one number. Needs a legend or
  tooltip so the pair is not read as a fraction of something else.
- **(b) A toggle that dims rather than hides** — switching to "mine" greys the two entries
  that cannot answer instead of showing a wrong number.
- **(c) Leave it unrendered** until an operator actually asks for it. The plumbing is in
  place and costs nothing to carry.

**Recommendation: (c) for now, (a) when it is wanted.** Nobody has asked for this view yet,
and (a) is the only option that never has to explain a mode.


---

# Cleanup pass — Audit & Plan (2026-08-24)

**Contract revision:** `mine` is now formalised in §3 and §8 (it was delivered ahead of the
doc in the previous round). No other section changed.
**Status:** A–E **implemented**. 248 tests pass; typecheck, lint and build clean. Open
questions untouched — see "Remaining open item".

## C.1 — Contract delta

Only `mine` is new in the text, and the implementation already matches it. Two rules are now
stated explicitly that were previously inferred:

1. **`mine` is present on every admin frame** — an admin who owns nothing gets five zeroes,
   *never* a missing object. We treat it as optional, which stays correct (defensive against
   an older server) but our comment says "absent on older servers" without recording the
   contract's actual guarantee.
2. **Never synthesise `special_requests` / `seller_requests` as `0`** — *"'you own none of
   these' and 'these cannot be owned' are different statements"*. Our `MineCounts` type
   already excludes both structurally, so this cannot be got wrong here. ✅

No code change is required by the contract. What follows is housekeeping from the three
phases.

## C.2 — Findings

### C1 — Dead exports

Three symbols exist and nothing uses them:

| Symbol | Where | Verdict |
|---|---|---|
| `isSessionEnding` | `lib/authFailure.ts` | Redundant — the hook needs the *action* to pick its message, so it calls `authFailureAction` directly. Only its own tests use it |
| `OWNED_BADGE_QUEUES` | `types/realtime.types.ts` | Written for a "mine" UI that does not exist yet |
| `EventsSyncFrame` | `types/realtime.types.ts` | Declared, never referenced — the socket sends an untyped `{ type: "sync" }` literal |

### C2 — Dead copy

`MESSAGES.REALTIME.CONNECTING` has zero references. `ConnectionStatus` stays silent before
the first connection by design, so the "Connecting…" state it was written for never renders.

### C3 — Stale nav comments (drift caused by this work)

Two claims in `navigation.ts` were true when written and are now false:

- *"The order funnel and nothing else: **four** queues"* — Orders & Delivery now has **six**
  entries, and the ordering rationale still describes Special Requests as last when
  Verifications and Failed Deliveries now follow it.
- *"Orders & Delivery and Operations … are **the two carrying live count badges**"* — badges
  now live in **Orders & Delivery (6)** and **Account Management (1)**. Operations carries
  **none**: Notifications and Support lost their fabricated pills in Phase 1 and have no
  counter in the contract.

The second is the one worth fixing carefully — it is the file's stated rationale for its own
section order, and it now argues from a fact that is no longer true.

### C4 — `mine` comment understates the guarantee

`BadgeFrame.mine` and `RealtimeState.mine` describe absence only as "older servers". The
contract now guarantees presence on every admin frame and spells out the
do-not-synthesise-zero rule. Worth recording both, since the next person to touch this will
be the one building the toggle.

### Not findings

Checked and correct, listed so the pass is auditable: `EMPTY_BADGE_COUNTS`, `sameCounts`,
`RefetchCoalescer`, `tagsToInvalidate`, `AuthFailureAction`, `MineCounts`, `OwnedBadgeQueue`
are all referenced. `/orders/failed` resolves a Header page title correctly (exact-path
match) and is covered by `tagsForRoute`. No `TODO`/`FIXME` in the feature.

## C.3 — Plan

Small and entirely subtractive except C2b.

| # | Change |
|---|---|
| **A** | Delete `isSessionEnding` and `OWNED_BADGE_QUEUES` with their tests |
| **B** | Put `EventsSyncFrame` to work typing the socket's outbound frame, rather than deleting it — the one outbound message in the protocol should not be an untyped literal |
| **C** | Delete `MESSAGES.REALTIME.CONNECTING` |
| **D** | Correct the two stale `navigation.ts` comments |
| **E** | Record the contract's actual `mine` guarantee on both type and slice |

Open questions stay open — Q5b (how to show "mine") is untouched.


## C.4 — Delivered

| # | Status | Change |
|---|---|---|
| A | done | `isSessionEnding` and `OWNED_BADGE_QUEUES` deleted, with the two tests that were their only callers |
| B | done | `EventsSyncFrame` now types the socket's outbound frame instead of sitting unused beside an untyped literal |
| C | done | `MESSAGES.REALTIME.CONNECTING` deleted; the comment now records *why* there is no connecting state rather than leaving the gap unexplained |
| D | done | Both stale `navigation.ts` comments corrected |
| E | done | The contract's `mine` guarantee recorded on `BadgeFrame.mine` and `RealtimeState.mine` |

Test count moved 250 → 248: the two removed are `isSessionEnding`'s, deleted with the
function. No coverage was lost — `authFailureAction` is still asserted row by row, and
`isSessionEnding` was only ever a restatement of it.

### Note on D

The section-order comment was not simply wrong, it was *arguing from* something that had
become false — using "these are the two sections with live badges" as evidence for the
ordering. Rather than delete the claim, the comment now separates the two ideas: sections are
ordered by whether work **arrives** in them unbidden, and which of them the backend happens
to count is a different question with a different answer (Operations carries no badge at all
now). Left as-is, the next person to touch the file would have had a rationale that its own
data contradicts.

### Verified clean, not changed

`EMPTY_BADGE_COUNTS`, `sameCounts`, `RefetchCoalescer`, `tagsToInvalidate`,
`AuthFailureAction`, `MineCounts`, `OwnedBadgeQueue` are all referenced. `/orders/failed`
resolves its Header page title by exact-path match and is covered by `tagsForRoute`. No
`TODO`/`FIXME` anywhere in the feature. Lint is clean across `features/realtime`, `lib` and
`routes` — the only remaining warnings in the repo are pre-existing a11y issues in
`AppSidebar.tsx`, `DataTable.tsx` and `ProfileDrawer.tsx`, none of them touched by this work.


---

# Activity-marker redesign — Audit & Plan (2026-08-24)

**Driver:** the panel is dropping per-queue numbers in the sidebar for an **activity marker
(`*`)**, and folding Verifications and Failed Deliveries into Intents and Orders rather than
giving them their own screens.

**Contract revision:** the backend answered both asks and withdrew a third thing.
**Status:** A–G **implemented**. 257 tests pass; typecheck, lint and build clean. One item
needs a product decision — see M.3 and "Open decision" below.

## M.1 — Contract deltas

| Change | Effect on us |
|---|---|
| **`delta: "up" \| "down" \| null` added** | The marker's gate. `changed` fires in *both* directions, so `changed` alone would mark the admin's own completions |
| **`changed` confirmed bidirectional** | Confirms the workaround was needed; `delta` replaces it, and better — it is derived from the **row**, not the totals, so one-in-one-out no longer masks an arrival |
| **Soft-delete gap withdrawn** | Nothing soft-deletes an order; `Order.is_deleted` has no production writer. The hole was theoretical |
| **In-bucket transitions stay silent** | Confirmed as requested. No change |
| **New: `order_confirmed` is not in `orders`** | See M.3 — this is the significant finding |

## M.2 — What the withdrawal invalidates

The Phase 2 safety-net `sync` (120s while visible) was justified **primarily by the
soft-delete gap** — its doc comment names it as "the one failure the contract names, with no
path back". That gap no longer exists, so the stated reason is now false.

**Keep the timer, fix the reason.** It still earns its place for a different failure: §9's
best-effort warning, and specifically a socket that is up but silently dead (a proxy holding
a half-open connection). A halted socket never syncs again on its own. But the comment must
stop citing a hole that was withdrawn, or the next person will delete the timer when they
notice the justification is stale.

## M.3 — The finding: under today's definitions, a newly paid order marks nothing

This is the one thing that would have shipped broken, and it is worth stating plainly.

`orders` means **in progress**, and `order_confirmed` is deliberately excluded (the Orders
screen counts it separately as `new`). So when a sailor pays:

- the order appears on the Orders screen as `new`
- the frame we receive is `changed: "intents"`, `delta: "down"` — the intent *left* the funnel
- `orders` does not go `up` until a delivery partner is assigned, which is a later,
  **admin-initiated** step

So the single event an activity marker most exists to announce — *money arrived, a real order
is here* — **lights nothing**, and correctly so under our own `delta === "up"` gate.

**We cannot fix this on the frontend.** `intents`-down also fires on reject and cancel, so it
is not a proxy for "paid". And `counts.orders` excludes the bucket entirely, so no comparison
of totals can reveal it. It needs the backend's option **(a)**: a new `new_orders` counter.

Implementing to the current contract means shipping with this hole. The plan below therefore
builds the mapping as a **list per nav entry**, so adding `new_orders` is one array element
rather than a refactor.

## M.4 — Rebinding, and a bug it fixes

Folding changes which screen each counter refreshes:

| Queue | Was | Now | Why |
|---|---|---|---|
| `verifications` | `/verification` | **Intents** | `verification_submitted` is an intent status (`IntentsPage.tsx:215`) — those rows are already on the Intents list |
| `delivery_failed` | `/orders/failed` | **Orders** | unchanged in effect; the dedicated route goes away |

The first also **fixes a live bug**: once `/verification` is unrouted, a
`changed: "verifications"` frame would match no screen and refetch **nothing at all**, even
with the admin sitting on the Intents list those rows appear in.

## M.5 — Plan

| # | Change |
|---|---|
| **A** | Add `delta` to the frame type and thread it through |
| **B** | `activity` state in the slice — a per-queue boolean, set on `delta === "up"` when the admin is elsewhere, cleared when they open the screen |
| **C** | `NavItem.badgeKey` → `badgeKeys: BadgeQueue[]`, so one entry can watch several queues (Intents ← intents + verifications; Orders ← orders + delivery_failed) |
| **D** | Sidebar renders the marker instead of the count |
| **E** | Unwind the two dedicated screens: nav entries, routes, `ORDERS_FAILED`, `OrdersPage.defaultStatus`, and the `navEnd` flag that only existed for `/orders/failed` |
| **F** | Rebind `verifications` → Intents caches (M.4) |
| **G** | Correct the safety-sync comment (M.2) |

**Marker state is in-memory, deliberately.** It cannot be rebuilt after a reload: a reconnect
snapshot arrives as `changed: "connect"` with no queue name, so there is nothing to replay
from. Persisting to `localStorage` would preserve a marker whose cause the admin may already
have dealt with in another tab. A fresh session starting clean is the honest default.

### Tests
- `delta` gating: `up` marks, `down` and `null` do not, snapshots never mark.
- Not marked while the admin is already on that queue's screen.
- Cleared on navigating to a watched screen; folded entries clear both queues.
- `verifications` refetches the Intents caches.


## M.6 — Delivered

| # | Status | Files |
|---|---|---|
| A `delta` | done | `types/realtime.types.ts` — `BadgeDelta`, `BadgeFrame.delta` |
| B activity state | done | `slice/realtimeSlice.ts` — `activity`, `markActivity`, `clearActivity` |
| C folded keys | done | `lib/navigation.ts` — `badgeKey` → `badgeKeys: BadgeQueue[]` |
| D marker UI | done | `AppSidebar.tsx`, `.nav-dot` in `index.css`, `MESSAGES.REALTIME.NEW_ACTIVITY` |
| E unwind screens | done | `navigation.ts`, `AppRouter.tsx`, `constants.ts` (`ORDERS_FAILED` gone), `OrdersPage` (`defaultStatus` gone) |
| F rebind verifications | done | `lib/badgeRefetch.ts` — now the Intents caches |
| G safety-sync comment | done | `hooks/useRealtimeBadges.ts` |

**Tests:** 9 new (86 in the feature, 257 across the app) — `delta` gating, activity
mark/clear including the two-queue Intents case, and `queuesForRoute`.

### The three gates on the marker

Written down because each one, left out, turns the marker from signal into noise:

1. **`delta === "up"` only.** `changed` fires in both directions, so without this an admin
   marks their own sidebar every time they complete an order. `"down"` and `null` stay quiet.
2. **Not while the admin is on that screen.** Marking the screen under their cursor is
   telling them about work they can already see.
3. **Snapshots never mark** — `connect`/`sync` name no queue, so there is nothing to
   attribute the movement to. Handled by the existing `isBadgeQueue` guard.

### Marker state is in-memory, deliberately

It cannot be rebuilt after a reload — a reconnect snapshot carries no queue name — and
persisting it would resurrect markers whose cause the admin may have handled in another tab.
A fresh session starting clean is the honest default.

---

# Open decision — `order_confirmed` (backend §8) — **RESOLVED, see the Signals section**

**Under the contract as it stands, a newly paid order raises no marker anywhere.** `orders`
means *in progress* and excludes `order_confirmed`; payment produces
`changed: "intents", delta: "down"`, which our `delta === "up"` gate correctly ignores.
`orders` does not go up until a partner is assigned — an admin-initiated step.

This cannot be worked around on the frontend: `intents`-down also fires on reject and cancel,
and `counts.orders` excludes the bucket entirely, so no comparison of totals reveals it.

**Recommendation: option (a)** — a new `new_orders` counter (`order_confirmed`, paid,
non-express). It is additive, breaks nothing, keeps the badge and the dashboard card in
agreement, and it is the event "a new order arrived" actually means. Option (b) makes the
badge permanently disagree with the dashboard; option (c) accepts the hole.

The mapping is already a list per nav entry, so adopting (a) is one array element:
`badgeKeys: ["orders", "delivery_failed", "new_orders"]`.


---

# Signals (`type: "signal"`) — Audit & Plan (2026-08-24)

**Status:** A–D **implemented**. 274 tests pass; typecheck, lint and build clean.

## S.1 — What changed

One new frame type, **additive**. Nothing about `badge`, `counts`, `mine`, auth or reconnect
changes.

```
{ type: "signal", stage, previous_stage, screen, order_id, order_number, at }
```

It exists because counters structurally *cannot* express the work chain: every hand-off
inside the intent funnel is a move **within** the `intents` bucket, so the membership diff is
correctly silent for exactly the transitions the chain is made of. A signal says "the ball is
now in your court" and always means work **arrived** — there is no direction to check.

**It resolves the open `order_confirmed` decision.** Payment now produces
`signal{stage: order_confirmed, screen: "orders"}`, so no `new_orders` counter is needed —
and unlike that counter it also covers **express** orders, which skip the funnel and are in no
bucket until a partner is assigned. The counter definitions are unchanged and still agree
with the dashboard cards.

## S.2 — Findings

### S1 — Signals are currently dropped on the floor (the gap)

`EventsSocket.onmessage` ends with `if (frame.type === "badge") …`. A `signal` frame matches
no branch and is **silently discarded** — no error, no log, nothing. Every case the feature
exists for (a partner submitting a report, a sailor paying, a delivery failing) arrives and
vanishes. This is the whole of the work.

### S2 — `screen` is a subset of `BadgeQueue`, and that is convenient rather than lucky

The four `screen` values — `intents`, `verifications`, `orders`, `delivery_failed` — are all
existing `BadgeQueue` keys. So a signal can reuse the machinery already built: `markActivity`,
`queuesForRoute`, and the coalescer's `tagsForQueues`. In particular the folding still works
without a special case:

| signal `screen` | folds onto | via |
|---|---|---|
| `verifications` | **Intents** entry | `badgeKeys: ["intents", "verifications"]` |
| `delivery_failed` | **Orders** entry | `badgeKeys: ["orders", "delivery_failed"]` |

We must still **validate** it rather than trust it: an unrecognised `screen` from a future
server version must be ignored, not marked against a queue we guessed.

### S3 — Signals need the same two gates as badges, minus the delta

- **No `delta` check** — a signal always means arrival. Checking one would drop every signal.
- **Still don't mark the screen the admin is on.** If they are on Intents when a verification
  arrives, the list refetches and the row appears; marking it as well is telling them about
  work already in front of them.
- **Still refetch through the coalescer.** §3b says a signal names the screen to *light and
  refetch*. Going through the coalescer also means the badge frame that often accompanies the
  same event (e.g. a new intent produces both) collapses into one request rather than two.

### S4 — Signals must not touch `counts`

`signal` carries no counts. The handler must not write `counts`, `mine` or `lastAt` — the
`badge` frame stays the sole source of numbers, and the two arrive independently.

### Deliberately not doing

`stage`, `previous_stage`, `order_number` and `order_id` are **not** stored. The marker does
not need them, and this pass has just finished removing fields nothing read. They are the
raw material for a toast ("AM202608240001 moved from Partner Verifying") or a deep link, and
both are UI decisions nobody has asked for. Noted, not built.

## S.3 — Plan

| # | Change |
|---|---|
| **A** | `SignalFrame` type; add it to `EventsInboundFrame`; `SignalScreen` typed as the four keys |
| **B** | `onSignal` handler on the socket, dispatched before the `badge` branch |
| **C** | Hook: validate `screen`, refetch through the coalescer, mark unless the admin is already there |
| **D** | Tests: signals are delivered, unknown `screen` ignored, no marking on the current screen, counts untouched |


## S.4 — Delivered

| # | Status | Files |
|---|---|---|
| A | done | `types/realtime.types.ts` — `SignalFrame`, `SignalScreen`, `isSignalScreen`, added to `EventsInboundFrame` |
| B | done | `lib/eventsSocket.ts` — `onSignal` handler, dispatched before falling off the end |
| C | done | `hooks/useRealtimeBadges.ts` — validate, refetch through the coalescer, mark unless already there |
| D | done | 17 new tests (108 in the feature, 274 across the app) |

**Tests:** signals are delivered rather than dropped; a signal never reaches `onBadge` and a
badge never reaches `onSignal`; `isSignalScreen` accepts the four hand-off screens and
rejects the three real-but-never-signalled queues (`express_orders`, `special_requests`,
`seller_requests` — all valid `BadgeQueue` keys, so a looser check would have let them
through) as well as unknown values. A `realtime.types.test.ts` was added along the way, which
also picked up `sameCounts`, previously covered only indirectly through the slice.

### What this resolved

The `order_confirmed` hole is closed **without a new counter**. Payment arrives as
`signal{stage: order_confirmed, screen: "orders"}` and lights the Orders marker. It also
covers **express** orders, which the proposed `new_orders` counter would have missed entirely
— express skips the funnel and is in no bucket until a partner is assigned. `counts` is
unchanged and still agrees with the dashboard cards.

### Why signals reuse the badge machinery unchanged

`SignalScreen` is typed as a strict subset of `BadgeQueue`, so `markActivity`,
`queuesForRoute` and the coalescer's `tagsForQueues` all work on a signal with no translation
layer — and the sidebar folding needs no special case: `screen: "verifications"` folds onto
the Intents entry and `screen: "delivery_failed"` onto Orders, because those entries already
watch those keys.

Pushing signals through the **same coalescer** matters for a second reason beyond bursts: one
event often produces both frames (a new intent raises a signal *and* a badge), which would
otherwise be two list requests for one arrival.

### Deliberately not built

`stage`, `previous_stage`, `order_number` and `order_id` are received and **not stored**. The
marker does not need them, and the cleanup pass immediately before this one was spent
removing fields nothing read. They are the raw material for a toast ("AM202608240001 moved
from Partner Verifying") or a deep link into the order — both are UI decisions nobody has
asked for yet. The data is one line away in the handler if wanted.


---

# FE-questions doc, re-audited (2026-08-24)

The "FE Open Questions: Audit, Decisions, Plan" doc was re-checked against the code. **Five of
its six answers are already implemented**; one item was still live.

| Q | State |
|---|---|
| Q1 Verifications | Implemented, then **superseded by the product decision to fold it into Intents**. The doc's real finding — hardcoded placeholder badges — was defused in Phase 1, before the entry was ever restored |
| Q2 `delivery_failed` | Implemented as `/orders/failed`, then **superseded by the same fold** |
| Q3 logout rule | Implemented and pinned by four tests (`close codes never imply an auth failure`) |
| Q4 global 401 | Implemented — `baseQueryWithAuth`, 401 only |
| Q5 `mine` | Implemented — `OwnedBadgeQueue` types the five scopeable queues. UI still open (Q5b) |
| Q6 live milestones | Closed by the backend; nothing to build |
| **Branch note** | **Still live — see below** |

## The one live item: `main` and `dev_pratap` disagree, and it got worse

The doc warned that `main` has Verifications live while `dev_pratap` has it parked. Verified,
and the gap has widened since it was written, because the design reversed twice:

- `origin/main` has **both** Verifications and Assignments live — nav entries *and* routes —
  each carrying a hardcoded badge (`"3"` and `"4"`).
- This branch **removed** the Verifications entry entirely and deleted `NavItem.badge`.
- `navigation.ts` diverges by ~428 lines, `AppRouter.tsx` by ~94. Both will conflict.
  `main` has no `src/features/realtime/` at all, so the rest merges additively.

**The good news, and it is worth knowing:** the fake badges **cannot** survive silently.
`badge: "3"` against a `NavItem` that no longer has a `badge` field is a TypeScript error, so
a botched resolution fails the build rather than shipping invented numbers to operators.

**The risk that has no compiler backstop:** `AppRouter.tsx` and `navigation.ts` are separate
files. A resolution that keeps `main`'s routes while keeping our nav leaves `/verification`
and `/assignments` reachable **by URL with no sidebar entry** — valid TypeScript, no error,
and Verifications quietly back as a screen after it was deliberately folded.

Written up as a checklist in **`MERGE_NOTES_REALTIME.md`**, since the merge itself is done by
hand outside this session.
