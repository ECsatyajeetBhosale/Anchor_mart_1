# Merge notes — realtime badges (`dev_pratap` → `main`)

Written because the backend's FE-questions doc flagged that the two branches disagree about
Verifications, and the disagreement got **sharper** after the design changed. Verified
against `origin/main` and `HEAD` (`dev_pratap` @ `a863d25`), not recalled.

## The situation

| | `origin/main` | `dev_pratap` (this branch) |
|---|---|---|
| `src/features/realtime/` | **absent** | the whole feature |
| Verifications nav entry | **live**, with `badge: "3"` | **removed** — folded into Intents |
| Verifications route | **live** | parked (commented) |
| Assignments nav entry | **live**, with `badge: "4"` | parked (commented) |
| Assignments route | **live** | parked (commented) |
| `NavItem.badge?: string` | exists | **removed** — replaced by `badgeKeys?: BadgeQueue[]` |

`navigation.ts` diverges by ~428 lines and `AppRouter.tsx` by ~94, so both **will** conflict.
Everything else about the feature merges additively — `main` has no realtime code to fight.

## What is safe, and what is not

**Safe: the fake badges cannot survive silently.** `main`'s entries carry `badge: "3"` and
`badge: "4"`, and this branch deleted the `badge` field from `NavItem`. Any of them surviving
a merge is a **TypeScript error**, not a silent regression. The compiler is the backstop here,
so a botched resolution fails the build rather than shipping invented numbers to operators.

**Not safe: an orphan route can survive silently.** `AppRouter.tsx` and `navigation.ts` are
separate files. If the router resolution keeps `main`'s live routes while the nav resolution
keeps ours, the result is:

- `/verification` and `/assignments` reachable **by URL**, with no sidebar entry
- **no compile error** — the routes are valid, the pages exist
- Verifications quietly back as a screen, which is the thing that was deliberately folded

This is the one to check by hand after merging.

## Checklist

1. **`navigation.ts`** — take **ours** wholesale for the `NavItem` interface and the
   Orders & Delivery section. Confirm afterwards that:
   - `NavItem` has `badgeKeys`, and **no** `badge` field
   - there is **no** `key: "verification"` and **no** `key: "delivery-failed"` entry
   - Intents reads `badgeKeys: ["intents", "verifications"]`
   - Orders reads `badgeKeys: ["orders", "delivery_failed"]`
2. **`AppRouter.tsx`** — take **ours**. Confirm both `VERIFICATION` and `ASSIGNMENTS` routes
   and their page imports are commented out. This is the step with no compiler safety net.
3. **`fetchUtils.ts`** — take **ours** (`baseQueryWithAuth`). `main` has a bare
   `fetchBaseQuery` with no 401 handling; losing the wrapper reopens that gap.
4. **`store/index.ts`** — the `realtime` reducer must be registered, or every selector reads
   `undefined` and the sidebar throws.
5. **`index.css`** — `.nav-dot` must survive, or the activity marker renders as nothing.
6. Then: `npx tsc --noEmit && npx vitest run && npm run build`. All three are clean on this
   branch (274 tests), so any failure is a merge artefact rather than pre-existing.

## Decisions this branch encodes, so a merge does not quietly undo them

- **Verifications and Failed Deliveries have no sidebar entries.** Both are filters of lists
  that already exist (`verification_submitted` is an intent status; failed deliveries are
  orders with their own card on the Orders screen). Their counters ride the parent entries'
  markers.
- **Assignments stays parked** for a different reason: no counter in the badge contract
  covers it at all.
- **The sidebar shows an activity marker, not counts.** A count on a queue like Orders is
  never zero and so stops being a signal; the numbers live on each screen's own cards.
