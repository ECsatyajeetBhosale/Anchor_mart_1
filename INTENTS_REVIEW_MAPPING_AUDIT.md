# Intents → Review drawer — field mapping audit

**Date:** 11 August 2026 · commit `e4f1373`
**Screen:** `/intents?page=1` → row action **Review** (`IntentReviewDrawer`)
**Evidence:** two screenshots supplied by the user, signed in as `subadmin@yopmail…` (role `admin`),
drawer open on **AM202608100003**, status `verification_submitted`.
**Mode:** **Read-only.** Frontend mapping code compared against the live Django serializers. No code
modified.
**Classification legend:** [QA_BASELINE.md §2](./QA_BASELINE.md) — 🔴 regression · 🟠 existing defect ·
🟡 product decision · ⚪ environment/data

---

## Summary

Seven items checked, **three confirmed defects**, all visible in the supplied screenshots and all
pre-existing. The most serious one makes the drawer state the wrong lifecycle stage.

| # | Finding | Class | Visible in screenshot | Status |
| - | ------- | ----- | --------------------- | ------ |
| **F1** | Lifecycle rail reads a field the endpoint never sends → **wrong stage, non-monotonic ladder** | 🟠 | Yes — "Stage 2 of 10" | ✅ **Fixed** |
| **F2** | `expected_stay` was deleted from the backend → **STAY column is permanently "—"** | 🟠 | Yes — every row | ✅ **Fixed** |
| **F3** | Rail labels drawn from two vocabularies; only 6 of 10 keys resolve | 🟠 | Yes — mixed casing/truncation | ✅ **Fixed** |
| F4 | `ORDER TOTAL $0.00` on an unbilled intent | 🟡 needs decision | Yes | ✅ **Fixed** |
| F5 | OWNER column shows a raw email for one admin | ⚪ data | Yes — `admin@gmail.com` | ✅ **Fixed (data)** |
| F6 | `substitution_needed` has two disjoint definitions | 🟡 needs confirmation | Card reads 0 | ⏸ **Open — §11** |
| F7 | List-row `portId` never populates | ✅ **not a defect** — verified harmless | — | ➖ no action |
| **F8** | Items & Pricing shows **"Checking…" for already-verified items** | 🟠 | Yes — all 3 items | ✅ **Fixed** |
| **F9** | Pricing breakdown reads **$0.00 under $693.42 of line items** | 🟠 | Yes | ✅ **Fixed** |

> **Fixes applied 11 Aug 2026**, authorized by the user, after this audit was accepted. See
> §12 for what changed and [QA_BASELINE.md §10 C-02](./QA_BASELINE.md) for the baseline entry.
> Six of the seven are closed; **F6 is a product question and is the only thing still open** — it
> is written up as a decision request in §11.

Everything else checked mapped correctly. §8 lists what passed, so the clean areas are on record too.

---

## F1 🟠 — The lifecycle rail is reading a field this endpoint does not send

**This is the important one.** The drawer says **"Stage 2 of 10 — Sourcing"**. The backend's own
answer for this order is **Stage 4 of 10 — "Awaiting your confirmation"**.

### What the screenshot shows

Segment 1 teal (done) · segment 2 navy (**active**) · segment 3 teal (**done**) · segments 4–10 muted.
A completed stage rendered *after* the active one — a ladder that cannot be true.

Three elements on the same screen disagree about where this order is:

| Element | Claim |
| ------- | ----- |
| Status badge | `VERIFICATION SUBMITTED` |
| Lifecycle rail | Stage 2 of 10 — *Sourcing* |
| NEXT STEP banner | "All items available — ready to bill" |

### Root cause

The rail is timeline-driven — 10 segments, so it is rendering `fromSteps()` from
`GET /order-timeline/`, not the 6-stage `fromStatus()` fallback.

The backend builds those steps in
[`orders/timeline.py`](../../AnchorMartBackend/backend/orders/timeline.py) and emits:

```python
steps.append({
    "key": key,
    "label": label,
    "status": step_status,   # "done" | "active" | "pending"  ← the authoritative field
    "at": fmt(reached_at) if reached_at else None,
})
```

The frontend transform at
[assignmentApi.ts:180-187](anchor-mart-admin/src/features/assignments/api/assignmentApi.ts#L180-L187)
reads a different field entirely:

```ts
const done = getProp(raw, "is_done") ?? getProp(raw, "done") ?? getProp(raw, "completed");
...
is_done: typeof done === "boolean" ? done : !!at,
```

**`is_done`, `done` and `completed` are all absent from this response.** The `status` field is
discarded, and the defensive fallback `!!at` silently takes over — redefining "done" as *"this
milestone has a timestamp."*

### Why that produces exactly this screenshot

`at` is stamped from the order's **status history**, per milestone:

```python
("sourcing",       "Sourcing items",         3, [S.SOURCING]),
("items_verified", "Items verified at shop", 5, [S.VERIFICATION_SUBMITTED, S.PARTNER_VERIFYING]),
```

This order never held an explicit `sourcing` status, so `sourcing.at` is `null`. It *is* at
`verification_submitted`, so `items_verified.at` is populated. Under the `!!at` rule:

| Milestone | `at` | Frontend verdict | Backend `status` |
| --------- | ---- | ---------------- | ---------------- |
| `intent_received` | set | done | **done** |
| `sourcing` | **null** | **active** ← first "not done" | **done** |
| `items_verified` | set | **done** (after an active step) | **done** |
| `awaiting_response` | null | pending | **active** ← the truth |
| `payment_confirmed` … `delivered` | null | pending | pending |

The backend rolls status forward by rank — `progress_rank(verification_submitted) = 5`, so every
milestone of rank ≤ 5 is `done` and rank 6 (`awaiting_response`) is `active`. Its docstring states
the invariant the frontend breaks:

> *"the ladder never shows a `done` step after a `pending` one"*

### Why the wrong field name exists

`is_done` **is** a real backend field — in a **different** serializer.
[`dashboard_serializers.py:127-151`](../../AnchorMartBackend/backend/admin_panel/serializers/dashboard_serializers.py)
builds the *dashboard* live-order timeline with `{key, label, at, is_done, detail}`.

So there are two timeline contracts in the backend, and one frontend type — `OrderTimelineStep`,
which declares `is_done: boolean` and `detail?: string | null` — is used for both. It matches the
dashboard shape and not the order-timeline shape it is actually pointed at.

**Impact.** Every consumer of `getOrderTimeline` shows the wrong stage whenever an order skipped an
intermediate status — which is the normal path, not an edge case. An admin reading "Sourcing" on an
order that is ready to bill will not act on it.

---

## F2 🟠 — `expected_stay` no longer exists; the STAY column can never populate

Every row in the list screenshot shows **`—`** under STAY. It is not missing data — the field was
deleted from the backend.

Migrations `0053_remove_locationreport_expected_stay_and_more` and
`0054_remove_specialrequest_expected_stay_and_more` removed it. The replacement is documented on the
model itself:

```python
expected_departure = models.DateTimeField(
    null=True, blank=True,
    help_text="When the vessel is expected to DEPART … Replaces the old free-text expected_stay duration.")
```

`IntentRequestListSerializer.Meta.fields` ships **`expected_departure`**; `expected_stay` is not in
it. The full-detail `OrderSerializer` likewise ships `expected_departure` only.

Both frontend mappers still read the deleted name:

| Site | Code |
| ---- | ---- |
| [intentApi.ts:144](anchor-mart-admin/src/features/intents/api/intentApi.ts#L144) | `sy: str(intent.expected_stay) \|\| "—"` |
| [intentApi.ts:320](anchor-mart-admin/src/features/intents/api/intentApi.ts#L320) | `expectedStay: str(o.expected_stay) \|\| "—"` |

`str(undefined)` returns `""`, so the `|| "—"` fallback fires on every row, on every order, always.
The column is decorative.

**Note the semantic change, not just the rename.** `expected_stay` was free text ("3 days");
`expected_departure` is an absolute UTC datetime. Whoever fixes this must decide what the column
should display — a departure date, or a duration derived against `ship_arrival_date`.

---

## F3 🟠 — The rail mixes two label vocabularies

[IntentLifecycleRail.tsx:122](anchor-mart-admin/src/features/intents/components/IntentLifecycleRail.tsx#L122):

```ts
label: ORDER_STATUS_BY_KEY[s.key]?.label ?? s.label,
```

The stated intent is sound — *"the rail can't name a stage differently from the popup that explains
it."* But `ORDER_STATUS_BY_KEY` is keyed by **order status**, while timeline steps are keyed by
**milestone**. Only 6 of 10 keys exist in both:

| Resolves via `ORDER_STATUS_BY_KEY` | Falls through to the backend label |
| ---------------------------------- | ---------------------------------- |
| `intent_received`, `sourcing`, `partner_assigned`, `at_port`, `at_berth`, `delivered` | `items_verified` → "Items verified at shop" · `awaiting_response` → "Awaiting your confirmation" · `payment_confirmed` · `picked_up` → "Items picked up — en route" |

This is directly visible in the screenshot: the four fall-through segments carry the backend's longer
sentence-style labels and are the ones clipped — **"ITEMS VERIFIED AT…"**, **"AWAITING YOUR…"**,
**"ITEMS PICKED UP — EN…"**. Segment 1 reads "INTENT RECEIVED" (status vocabulary) where the backend
label is "Request received".

So the rail is half-canonical and half-not, and the four longest labels are exactly the four that
were not meant to be shown.

---

## F4 🟡 — `ORDER TOTAL $0.00` on an intent that has not been billed

The header shows **$0.00** while the banner says "ready to bill". The mapping is faithful —
`total: detail?.total || intent.total` ← `total_amount`, which is genuinely `0` until **Create Bill**
runs (Flow 07). So this is not a mapping error.

It is a presentation decision: `$0.00` reads as *"this order is free"*, not *"not priced yet"*. Given
the primary action on this very drawer is **Create Bill**, showing `—` or "Not billed yet" until a
bill exists would remove the ambiguity.

**Needs a product decision — do not change without one.**

---

## F5 ⚪ — OWNER shows `admin@gmail.com` where another row shows a name

Correct behaviour, bad data. The backend's `_assigned_admin_brief` falls back to email when a name is
blank:

```python
name = f"{admin.first_name} {admin.last_name}".strip() or admin.email
```

and `mapAssignedAdmin` mirrors it exactly. That admin account simply has no first/last name set.
**Fix the record, not the code.** Worth resolving before Phase 2, since owner display appears in the
Flow 27 permission tests.

---

## F6 🟡 — `substitution_needed` means two different things

Both surfaces read the backend faithfully, but the backend defines the term twice, over **disjoint**
statuses:

| Surface | Definition |
| ------- | ---------- |
| Stat card `SUBSTITUTIONS NEEDED` | `Count(status = PENDING_CUSTOMER_RESPONSE)` |
| Row flag / per-item `needs_suggestion` | only when `status == VERIFICATION_SUBMITTED` **and** a line is short |

An order cannot hold both statuses, so **the card and the rows can never corroborate each other** —
the card counts orders whose substitutions were already released to the customer; the rows flag
orders where a shortage has just been reported. The card reading `0` while a row shows a shortage is
expected, not a bug.

Confirm this is intended. If it is, the card's label is the thing to change — it currently invites
the reader to look for matching rows that by construction cannot be there.

---

## F7 ✅ — Checked and clear: the port-scoped substitution search

Worth recording because it looks alarming and is not.

`IntentRequestListSerializer` returns **no** `port_id` — only `port`, a plain string
(`obj.port.port_name`). So the list row's `portId: str(intent.port_id) || str(sa.port_id)` resolves
to `""` unless the `shipping_address` JSON happens to carry one.

Nothing depends on it. `SuggestReplacementPanel` is passed **`detail.portId`**
([IntentReviewDrawer.tsx:831](anchor-mart-admin/src/features/intents/components/IntentReviewDrawer.tsx#L831)),
which comes from the detail endpoint's nested port object (`AdminOrderPortSerializer` → `id`,
`port_code`, `port_name`, …) and is correct. The panel also guards with
`effectivePortId = detail?.portId || portId`.

**No action.** The unused list-row field is dead weight, not a live fault.

---

## 8. Verified correct

Checked against the serializers and mapping cleanly — recorded so the clean surface is on record:

| Field | Source | Note |
| ----- | ------ | ---- |
| `sailor_name` / `sailor_email` | `get_sailor_name` → name-or-email | Frontend fallback chain mirrors it |
| `status` / `status_display` | `get_status_display` | Badge variant via canonical `ORDER_STATUS_BY_KEY` |
| `item_count` / `items_count` | list uses `item_count`, detail uses `items_count` | Frontend reads **both** plus `items.length` — correctly defensive |
| `port` | string in list, nested object in detail | Frontend handles each shape in its own mapper ✓ |
| `anchorage` | string in list, nested in detail | ✓ |
| `assigned_admin` | `{id, name, email}` | `mapAssignedAdmin` matches exactly, incl. the name→email fallback |
| Per-item availability | `available_qty`, `is_available`, `shortfall`, `needs_suggestion`, `reason` | Shortfall derived client-side only when absent — matches the backend formula |
| All 4 stat cards | `total_intents`, `awaiting_payment`, `substitution_needed`, `confirmed_today` | Key names match the aggregate exactly (see F6 for semantics) |
| Ownership actions | `Manage Order` only on `UNASSIGNED`; owned-by-other rows offer `Review` only | Consistent with Flow 27 for a sub-admin |
| Detail financials | `subtotal`, `shipping_fee`, `tax_amount`, `discount_amount`, `total_amount` | All present in `OrderSerializer.fields` |

---

## 10a. F8 🟠 — "Checking…" on items the partner already verified

**The list and detail endpoints carry availability in different places, and the detail mapper only
knew about one of them.**

`IntentRequestListSerializer.get_items` folds the verification outcome into each item row
(`is_available`, `available_qty`, `shortfall`, `needs_suggestion`). The detail endpoint does not:
`AdminOrderItemSerializer.fields` contains **no availability field at all** —

```python
fields = ["id", "variant", "product_name", "sku", "quantity", "unit_price",
          "subtotal", "is_sourcable", "status", "status_display", …]
```

There, the truth lives in the separate nested `availability_reports[].lines[]` collection
(`AvailabilityLineReadSerializer` → `order_item_id`, `requested_qty`, `available_qty`,
`is_available`, `note`). The detail mapper read `r.is_available` off the item and got `undefined`,
so **every item resolved to `available: null` → "Checking…"** — on an order whose Fulfilment tab, in
the same drawer, correctly read "Verified by FE Verifier · AVAILABLE".

**Fixed** by keying the newest report's lines by `order_item_id` and merging them into each item.
The reports are prefetched `.order_by("-submitted_at")`, so index 0 is the live one.

---

## 10b. F9 🟠 — a $0.00 breakdown under $693.42 of priced items

Same root cause as F4, one tab over. `create_order` writes:

```python
subtotal=Decimal("0"), …
total_amount=(subtotal or Decimal("0")) + (shipping_fee or Decimal("0")),
```

and `sync_order_subtotal` — the only thing that computes the real figure — is called exclusively
from `admin_panel/views/payment_views.py`, i.e. **at bill creation**. So before Create Bill, every
order-level financial field is a genuine `0`, while each line item carries its catalog
`unit_price` and computed `subtotal`.

The screen therefore printed three line subtotals ($30.00 + $474.99 + $188.43 = **$693.42**) directly
above a five-row breakdown of `$0.00`, `$0.00`, `$0.00`, `-$0.00`, **Total $0.00**. Every individual
value was faithful to the backend; the composition was nonsense.

**Fixed.** Pre-bill, the breakdown is replaced by a single clearly-labelled **Estimated Total** with
the note *"Indicative value of the available items. Shipping, tax and discounts are set when you
create the bill."* Fields that do not exist yet are no longer invented as zeros. Once a bill exists,
the real breakdown renders exactly as before.

The estimate mirrors the backend's own `compute_subtotal` — Σ (available qty × unit price), capped
at the requested quantity — so it now depends on F8 being correct. **Accepted substitutions are
excluded** (they live in a separate collection), which is why it is labelled an estimate of the
basket rather than a prediction of the bill.

---

## 11. F6 — decision request: what should "Substitutions Needed" count?

**The only item still open.** No code change is correct until this is answered, because both
surfaces currently read the backend faithfully — the ambiguity is in the backend's own vocabulary,
not in the frontend's mapping.

### The situation

| Surface | Backend definition | Counts orders at |
| ------- | ------------------ | ---------------- |
| Stat card **Substitutions Needed** | `Count(status = PENDING_CUSTOMER_RESPONSE)` | Substitutions already released; the sailor is deciding |
| Row flag / per-item `needs_suggestion` | shortage reported **and** `status == VERIFICATION_SUBMITTED` | The partner just reported a shortage; **the admin must act** |

The two statuses are mutually exclusive, so **an order counted by the card can never be a row
flagged in the list, and vice versa.** The card reading `0` while a row shows a shortage is expected
behaviour, not a bug — but no operator would guess that from the label.

### The two readings

**(a) "Work waiting on me."** The card should count orders at `verification_submitted` with a
shortage — the ones the admin must suggest replacements for. This makes the card agree with the row
flags and turns it into a work queue.

**(b) "Substitutions in flight."** The card should keep counting `pending_customer_response` — work
already dispatched to the sailor, which the admin is waiting on rather than acting on.

### Recommendation — (a), with (b) kept as a second card

The Intents screen is a work queue, and the other three cards (Total, Awaiting Payment, Confirmed
Today) all answer *"what is the state of my funnel."* A card that counts something the admin cannot
act on, sitting directly above rows that flag something they must, is the reading most likely to be
misread.

The backend already computes both — `substitution_needed` **and** `awaiting_customer` are separate
keys in the same aggregate, and `IntentStats` in the frontend already types all eleven. So exposing
both is a label change plus one extra card, with **no backend work**:

- **"Substitutions Needed"** → count of `verification_submitted` rows with a shortage *(new backend
  aggregate key, or reuse the row flag)*
- **"Awaiting Customer"** → the existing `pending_customer_response` count, correctly named

**If you prefer (b)**, the fix is smaller still — rename the card to **"Awaiting Customer"** and
nothing else changes. That alone removes the contradiction.

**Not implemented.** Confirm which reading you want and it is a short change either way.

---

## 12. What was changed when the fixes were applied

Applied 11 Aug 2026 under explicit authorization. Verified: `tsc --noEmit` clean · `biome lint`
clean on all 19 touched files · `vite build` exits 0.

| Finding | Files | Change |
| ------- | ----- | ------ |
| F1, F3 | **new** `src/lib/timeline.ts` | `resolveTimelineStates()` — one place that reconciles the two backend ladder contracts. Prefers the endpoint's own `status` verbatim; only derives from `is_done`/`at` for the dashboard shape |
| F1 | `features/assignments/api/assignmentApi.ts` · `types/assignment.types.ts` | Passes `status` through instead of discarding it. Guarded with `isTimelineState()` so a raw history row's order-status is not mistaken for a ladder verdict |
| F1, F3 | `features/intents/components/IntentLifecycleRail.tsx` | Reads the resolved state; label now comes from the step |
| F1, F3 | `components/common/Timeline.tsx` | **Same two bugs, second site** — the Orders drawer had them too |
| F2 | `features/intents/types/intent.types.ts` · `api/intentApi.ts` · `IntentsPage.tsx` · `IntentReviewDrawer.tsx` · `lib/messages.ts` · `features/orders/types/order.types.ts` | `expected_stay` → `expected_departure`, formatted as a date. Column relabelled **Stay → Departure**, drawer field **Expected Stay → Expected Departure** |
| F4 | `features/intents/components/IntentReviewDrawer.tsx` · `lib/messages.ts` | `UNBILLED_STATUSES` gate → renders "Not priced yet" before a bill exists |
| F5 | dev database | `admin@gmail.com` → `Platform Admin` |

**Two judgement calls worth flagging, both reversible:**

1. **F2 shows a departure date, not a derived stay duration.** `expected_departure` is an absolute
   datetime and is set at order creation (`orders/order_service.py`) and validated as required, so it
   populates for intent orders. A date is the literal field with no derivation, and it is the
   actionable deadline — deliver before she sails. If you would rather keep a duration, it is
   `expected_departure − ship_arrival_date` and a one-line change.
2. **F4 gates on status, not on `total === 0`.** A fully discounted order at `payment_pending` is
   genuinely $0.00 and still displays as $0.00; only pre-bill statuses show "Not priced yet".

---

## 9. Recommended order

Audit only — nothing applied. When fixes are authorized:

1. **F1 first.** One transform, but it is wrong on every order that skipped a status, and it
   misinforms the operator about what to do next. The fix is to consume the backend's `status`
   field; the deeper fix is to stop sharing one `OrderTimelineStep` type across two different
   backend contracts.
2. **F2.** Needs the product answer first (departure date, or a derived duration?) — the field was
   not renamed, its meaning changed.
3. **F3.** Cheap once F1 is being touched; same component.
4. **F5.** Data fix, do it before Phase 2 permission testing.
5. **F4 and F6** are decisions, not tasks.

**Regression tests to add when the harness exists** (these belong in
[QA_TEST_MATRIX.md](./QA_TEST_MATRIX.md) rows for Flows 05/06/07):

- An order at `verification_submitted` that never held `sourcing` renders **Stage 4 of 10**, and no
  `done` segment ever follows a non-`done` one.
- The STAY column renders a real value for an order with `expected_departure` set.
- Every rail segment label resolves from a single vocabulary.

---

## 10. Method and limits

Backend truth was read from the live source at `/home/abc/Desktop/AnchorMartBackend/backend` —
`orders/timeline.py`, `admin_panel/serializers/orders_serializers.py`,
`admin_panel/views/orders_views.py`, `admin_panel/views/partner_views.py` and the `catalog`/`orders`
migrations — not from the Postman collection, which carries no example responses
([QA_BASELINE.md BL-08](./QA_BASELINE.md#bl-08--postman-collection-has-zero-saved-example-responses)).

**Not verified against live traffic.** No API call was made with a token
([BL-09](./QA_BASELINE.md#bl-09--test-credentials-blank-two-sub-admin-identities-in-circulation) —
credentials still outstanding). F1, F2 and F3 are nonetheless firm: each is a static contradiction
between a documented serializer output and the field the frontend reads, and all three predict
exactly what the screenshots show. F4 and F6 depend on product intent, not on code. The one item
that genuinely needs live confirmation is whether `sourcing.at` is null for this specific order — the
rendered rail is itself strong evidence that it is.
