# Money & Totals Audit — AnchorMart Admin

**Date:** 2026-08-20 · **Scope:** every surface that renders an amount · **Read-only — nothing was changed.**

Trigger: the Intent Review drawer showed `Subtotal 10.00 + Shipping 12.00 + Tax 12.00 − Discount 0.00`
against a **Total of 35.00**. The lines are short by exactly $1.00.

---

## Headline

**The frontend does not compute order totals, and that part is right.** Every pricing figure is read
verbatim from the backend; `intentApi.ts` even documents the rule ("`estimated_subtotal` … is read,
never recomputed"). No rounding bug is producing the $1.00 gap.

**The gap is a missing line, not bad arithmetic.** The Intents drawer renders four of the six lines the
backend's own bill is made of. The Orders drawer renders all six. Same order, two screens, two
different breakdowns — and only one of them adds up.

---

## F1 · Intent drawer omits `platform_fee` — **this is the $1.00**  ⬛ High

Flow 07 defines the billed order as:

```json
"subtotal": "70.45", "shipping_fee": "20.00", "tax_amount": "5.00", "platform_fee": "2.00",
"coupon_discount": "0.00", "loyalty_discount": "0.00",
"total_amount": "97.45"      // 70.45 + 20 + 5 + 2 = 97.45 ✓
```

`platform_fee` is a first-class line. It is **collected by the admin** in `CreateBillDialog.tsx:102`
and **written into the total by the backend**. But `intentApi.ts:481-486` never maps it, and
`IntentReviewDrawer.tsx:661-727` never renders it.

Your screenshot: `10 + 12 + 12 + platform_fee − 0 = 35.00` ⟹ **platform_fee = 1.00**, entered on that
order and then hidden from the screen that reviews it.

- **Missing:** `src/features/intents/api/intentApi.ts` (mapping), `IntentReviewDrawer.tsx` (render)
- **Present and correct:** `src/components/common/OrderDetailDrawer.tsx:509`

## F2 · Intent drawer also omits `loyalty_discount`  ⬛ High

Flow 08 keeps two distinct reductions: `discount_amount` (the capped **coupon** discount) and
`loyalty_discount` (points redeemed, capped at remaining shipping). The intent mapper reads only
`discount_amount`. Any order settled partly with points shows a Total lower than its own lines with
nothing on screen to explain it — a second, independent way for this panel to fail to add up.

`OrderDetailDrawer.tsx:510-518` renders it, with the points count in the label.

## F3 · Rows vanish when a value is blank  ⬛ Medium

`IntentReviewDrawer.tsx:685-715` guards every row: `{detail.subtotal && (…)}`. These are **strings**,
so `"0.00"` renders — but a `null` from the backend collapses to `""` and the row disappears entirely.
A breakdown that silently drops a line reads as complete.

The Orders drawer takes the opposite position and says so in a comment at
`OrderDetailDrawer.tsx:493`: *"hiding rows makes the arithmetic harder to follow rather than easier"*.
Two deliberate, opposite policies in one codebase.

## F4 · Requested-items subtotal vs billed subtotal — unexplained, probably not wrong  ⬜ Low-Med

Your screenshot shows one line item at **$188.43** above a billed **Subtotal of $10.00**. The item is
`UNAVAILABLE`, and per `intentApi.ts:476-480` accepted substitutes live in their own collection and are
absent from `items[]`. So the two numbers are almost certainly *both correct* and *about different
things* — requested vs. billed.

Nothing on the panel says so. Worth confirming against a substituted order before treating it as a bug.

---

## F5 · Eight `money()` implementations, no shared source of truth  ⬛ High (systemic)

`src/lib/utils.ts:22` has a correct canonical formatter (`Intl.NumberFormat`, en-US, USD).
**10 call sites use it. 45 use one of eight private copies:**

| # | File | Blank / `null` input | Unparseable | Thousands | Currency |
|---|---|---|---|---|---|
| 1 | `dashboard/lib/orderAdapters.ts:29` | **`$0.00`** ⚠ | `—` | no | hardcoded `$` |
| 2 | `rewards/api/promotionApi.ts:43` | **`$0.00`** ⚠ | `-` (hyphen) | **yes** | `$` |
| 3 | `special-requests/lib/specialRequestFormat.ts:38` | fallback | **no formatting at all** ⚠ | no | `symbolFor(currency)` |
| 4 | `orders/components/RefundOrderDialog.tsx:39` | `—` | raw | no | `$` |
| 5 | `orders/components/OrdersPage.tsx:467` | **`$0.00`** ⚠ | **`$0.00`** ⚠ | no | `$` |
| 6 | `orders/components/OrderLocationDeltaSection.tsx:48` | `—` | raw | no | `$` |
| 7 | `intents/components/LocationChangeBadge.tsx:9` | `null` | raw | no | `$` |
| 8 | `intents/components/IntentReviewDrawer.tsx:121` | `—` | raw | no | `$` |

Three concrete consequences:

**(a) Missing money renders as a confident `$0.00`.** `Number("")` and `Number(null)` are `0`, not `NaN`,
and `Number.isFinite(0)` is `true`. So #1 and #2 print `$0.00` for an absent value. #5 goes further and
coerces *unparseable* input to `$0.00` by design. Live example: `OrdersPage.tsx:532` maps
`platformFee: money(order.platform_fee)` where the field is optional (`order.types.ts:264`) — an order
without one asserts "the platform fee is zero" when the truth is "not reported".

**(b) `$1,250.00` in Rewards, `$1250.00` everywhere else.** Only #2 groups thousands.

**(c) Currency is hardcoded `$` in seven of eight.** Only #3 reads a currency code. For a
multi-port marine platform this is a latent mislabel, not a cosmetic one.

## F6 · Money round-trips through binary floating point  ⬛ Medium

Every helper does `Number(decimalString).toFixed(2)`. The backend sends exact decimal strings;
`toFixed` on a float is not correctly-rounded at the half-cent (`(1.005).toFixed(2) === "1.00"`).
Harmless for display of an already-2dp value, wrong the moment a 3-dp or half-cent value arrives.

Unguarded variants worth noting: `dashboard/lib/orderAdapters.ts:22` and `gifts/components/GiftShipsPage.tsx:265`
both do `` `$${Number(x).toFixed(2)}` `` with **no finite check** — a missing field renders the literal
string **`$NaN`**.

## F7 · Two places where the client actually does money arithmetic  ⬛ Medium

Everywhere else defers to the backend. These two do not:

**`special-requests/GenerateBillDialog.tsx:124`**
```js
const total = price * qty + (request?.is_fastest_delivery ? fastCharge : 0);
```
A float multiply previewing what the sailor will be charged, while the backend computes the real
figure ("`quoted_price` is **per unit**: the backend multiplies by the quantity"). Two implementations
of one rule; they can disagree by a cent, and the admin quotes from the wrong one.

**`orders/RefundOrderDialog.tsx:171`**
```js
quote.delta_refunds.reduce((sum, d) => sum + (Number(d.amount) || 0), 0).toFixed(2)
```
A float sum of surcharge refunds displayed directly above the backend's authoritative
`quote.total_refund`. Same failure shape as F1 — `Initial + Deltas` printed next to a `Total` that was
computed elsewhere, with nothing checking that they agree.

---

## Verdict

| Question | Answer |
|---|---|
| Is the $1.00 gap a frontend calculation bug? | **No** — the frontend computes nothing here. |
| Is it a frontend bug? | **Yes** — F1, an unmapped, unrendered `platform_fee`. |
| Does it apply everywhere? | **No.** The Orders drawer is correct. The **Intents** drawer is the defective one. |
| Anything else structurally wrong? | **Yes** — F5 (eight formatters), F6 (float rounding, `$NaN`), F7 (duplicated business rules). |

**Order to fix:** F1 → F2 → F3 (one panel, restores the arithmetic) · then F5/F6 (consolidate onto
`formatCurrency`, decide once what an absent amount looks like — `—`, never `$0.00`) · then F7.

**To confirm F1 before touching code:** open the same order in **Orders → drawer**, where
`OrderDetailDrawer` renders the Platform Fee row. If it reads `$1.00`, F1 is proven outright.

---

# Addendum — Backend cross-check reconciled (2026-08-20)

A backend audit was run against order **Seed Deck Brush + Seeded Provision Pack**
(`55 + 23 + 0 + 0 − 0 = 78` ✓ against `total_amount`, subtotal matching `compute_subtotal()` exactly).
Below: what that closes, what it leaves open, and where the **frontend** makes the wrong inference.

## Closes F4 — confirmed correct data, presentational gap only

The backend answer is authoritative and better than my guess: `items[]` still holds the *requested*
line (`2 × 45.00 = 90`) while the accepted substitute (`10.00`) lives only under `suggestions`, and
`finalise_paid_order` trims short lines and promotes substitutes into real order lines **at payment**.

So pre-payment, `Σ items.subtotal ≠ subtotal` **by construction**, on every substituted order. Both
numbers are right. Confirmed not to affect fulfilment — picking slips print `line.quantity`/
`line.subtotal` and are generated post-payment, after the trim/promote.

**F4 is therefore not a data bug — it is ours.** The panel prints a line total and a subtotal that
cannot be reconciled, and says nothing about why. Re-filed as a UI gap: the Items table needs to
state that it lists what was *requested*, and the substitute needs to appear in, or beside, the
pricing it actually drives.

## Leaves F1 open — different order

That order has `platform_fee: 0.00` and `tax: 0.00`, so it cannot exercise F1. The screenshot order is
**Marine Grease Cartridge 400 g** — `10 + 12 + 12 − 0` against a Total of `35`. Still a $1.00 gap, still
best explained by an unrendered `platform_fee`. **To settle it:** read that order's
`platform_fee`, or open it under Orders → drawer, where `OrderDetailDrawer.tsx:509` renders the row.

---

## Frontend exposure of the five backend findings

### B2 · `shortfall` hardcoded `0` beside `null` companions — **the frontend takes the bait**  ⬛ High

`intentApi.ts:147-151`:
```js
const shortfall =
  typeof item.shortfall === "number"
    ? item.shortfall                      // ← the hardcoded 0 wins here
    : availableQty !== null
      ? Math.max(0, qty - availableQty)   // ← the rescue that never runs
      : 0;
```
The comment says *"Derive the shortfall when the backend doesn't send it explicitly."* But the backend
**does** send it — as a fabricated `0` — so the derivation is skipped precisely when it was needed.
Then `needsSuggestion` (`:163`) is `false || false || 0 > 0` → **false**. The list row reports a clean,
fully-available order.

Note the asymmetry **inside one mapper**: `available` (`:157`) correctly preserves unknown as `null`
(`typeof item.is_available === "boolean" ? … : null`), while `shortfall` collapses unknown to a
definite `0`. The frontend mirrors the backend's inconsistency instead of absorbing it.

**Client-side hardening available without waiting on the backend:** treat `shortfall` as unknown
whenever `is_available` is not a boolean — the companions already carry that signal.

### B5 · `needs_partner_confirmation` stuck `true` — renders on decided rows  ⬛ Medium

Confirmed to surface twice in `SuggestReplacementPanel.tsx`:
- `:92` — `blockedCount`, shown above the list as the reason Release is blocked
- `:482` — a **warning badge** rendered *immediately beside* `DECISION_LABEL[s.decision]`

So each of the 3 already-decided released suggestions shows `ACCEPTED` and `NEEDS PARTNER CONFIRMATION`
side by side, on the same row. The contradiction is not subtle on screen, and the count above the list
tells the admin a release is blocked when nothing is.

### B4 · `is_available: true` meaning "some" — **frontend is already immune**  ✅ No action

`availabilityState` (`intentApi.ts:125-133`) never treats `is_available: true` as "all available":
```js
if (!a) return { state: "unverified", shortBy: 0 };
if (!a.is_available) return { state: "unavailable", shortBy: 0 };
const shortBy = a.requested_qty - a.available_qty;
return shortBy > 0 ? { state: "short", shortBy } : { state: "available", shortBy: 0 };
```
It derives `short` from the quantities, and `mapAvailability:104` rejects a non-boolean `is_available`
into `null` → `unverified`. A 1-of-2 line renders **SHORT BY 1**, not AVAILABLE. Worth flagging so this
is not "fixed" into a regression.

### B3 · `substitution_needed: false` naming — low risk, but it steers the primary action  ⬜ Low

It feeds `substitutionNeeded` (`intentApi.ts:248, 431`), which `intentAction.ts:98` turns into the
drawer's **primary footer button**: `substitutionNeeded ? "suggest" : "bill"`. On this order the
backend's meaning ("no new decision needed") produces **Bill**, which is correct. The frontend also
ORs in its own item-derived signal rather than trusting the flag alone, which contains the risk.
Naming remains a trap for the next reader.

### B6 · Stale `original_location.expected_departure` — **no frontend exposure**  ✅ No action here

`IntentLocationChange` (`intent.types.ts:97-111`) is the whole of what this console reads from
`location_change`: `state`, `delta_id`, `report_id`, `amount`. `original_location` is never mapped and
never rendered anywhere in `src/`. The snapshot/column disagreement is invisible in the admin UI — so
the backfill is worth doing for the record's integrity, not to fix a screen.

---

## Revised priority

| | Finding | Owner | Why first |
|---|---|---|---|
| 1 | **F1** platform_fee unmapped + **F2** loyalty_discount unmapped | frontend | The breakdown does not add up. Confirm F1 on the Marine Grease order. |
| 2 | **B2** shortfall `0` taken as truth | both | Frontend can harden now; backend should send `null`. |
| 3 | **B5** stale `needs_partner_confirmation` | backend | Backfill the 4 released rows; UI is reading it correctly. |
| 4 | **F3** rows hidden when blank · **F4** requested-vs-billed unexplained | frontend | Same panel as #1 — fix together. |
| 5 | **F5/F6** eight formatters, float rounding, `$NaN` | frontend | Systemic, not order-specific. |
| 6 | **F7** duplicated bill/refund arithmetic · **B3** naming · **B6** snapshot | mixed | Latent. |

---

# Built (2026-08-20)

## Phase 1 — Intents pricing panel

- **F1/F2 mapped.** `platform_fee`, `loyalty_discount` and `loyalty_points_redeemed` now come through
  `intentApi.ts` onto `IntentDetail`. Both were summands of `total_amount` that the panel never showed.
- **F3 — rows always render.** The truthiness guards are gone, replaced by one `PriceLine` component.
  A `$0.00` is a fact (the admin entered no platform fee); an absent row was a question. This adopts
  the policy `OrderDetailDrawer` already argued for in its own comment.
- **F4 — the gap is explained where it is seen.** A note under the Items table states that the list is
  the *request*, and that short quantities and substitutes settle at payment. Shown only when a line is
  short or unavailable — on a clean order the rows do sum, and a caveat about arithmetic that holds is
  noise. Derived from availability rather than by summing line totals and comparing: a float sum of
  decimal strings is the wrong instrument for an equality test.

**Result:** the breakdown now renders all six lines the backend's total is built from.

## Phase 2 — shortfall honesty (B2)

`mapItem` gained a `verified` gate (`typeof item.is_available === "boolean"`). An unverified line no
longer adopts the serializer's fabricated `shortfall: 0`, and `needsSuggestion` no longer counts a
shortfall that was never measured. `is_available: false` remains a verdict and is always honoured.

4 tests added in `intentApi.test.ts` covering the exact payload reported
(`available_qty: null, is_available: null, shortfall: 0, needs_suggestion: false`), plus the inverse
regression (a placeholder `shortfall: 2` must not manufacture a suggestion prompt).

## Phase 3 — one money formatter (F5, F6)

New `src/lib/money.ts` — `formatMoney(value, { fallback, symbol })` + `hasAmount(value)`, 8 tests.
Rejects blank/`null`/unreadable input **before** `Number` sees it, which is the whole of the `$0.00`
bug. Groups thousands via `Intl`, so Rewards is no longer the only screen that does.

**Nine** helpers migrated (one more than the audit found — `express/api/expressApi.ts` had a tenth
copy under a different name). Each keeps its own fallback string; none keeps its own arithmetic.

Seven **inline** `` `$${Number(x).toFixed(2)}` `` sites were also found during the sweep — the same bug
written without a helper, so the original `grep "function money"` missed them. All fixed:
`LiveOrdersCard`, `GiftShipDetailDrawer` (×2), `expressColumns`, `OrdersPage:410`, `ProductEditDrawer`,
and `tableColumns.tsx:188` — the last being the **shared money column**, so that one was rendering
`$NaN` for any feature that used it.

One genuine formatting bug surfaced only because the new tests asked: every helper produced
**`$-12.50`**. `formatMoney` places the sign outside the symbol.

## Not built — F7

The bill preview (`GenerateBillDialog:124`) and the refund delta sum (`RefundOrderDialog:171`) still
compute client-side. Both are previews beside a backend-authoritative figure, and both are genuinely
useful to the admin, so the fix is reconciliation or a caveat rather than deletion — a product call,
not a defect to quietly patch. Left as filed.

## Verification

`tsc -b` clean · `biome check src/` clean in every touched file (9 pre-existing a11y/hook errors remain
in files not touched) · **166 tests pass** (154 before, +12) · production build clean.
