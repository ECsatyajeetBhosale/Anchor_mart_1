# QA_TEST_MATRIX — Phase 1: master traceability matrix

**Built at:** commit `e4f1373` · 11 August 2026
**Mode:** **Read-only.** No code modified, no tests written.
**Inputs joined:** `anchor-mart-admin/flows/` (40 documents, Waves 1–8) + `AnchorMart.postman_collection.json`
(342 requests, 202 admin) + the frontend route table (29 routes) + 205 RTK Query operations.
**Companions:** [QA_BASELINE.md](./QA_BASELINE.md) — the frozen floor · [TEST_PLAN.md](./TEST_PLAN.md) —
the route-centric view of the same system.

> **This document is the approval gate.** Nothing after Phase 1 should be executed until the rows
> below are agreed. Once approved, every later phase reports into this matrix and nowhere else.

---

## 1. How to read this

`TEST_PLAN.md` cut the system **by screen** — useful for building a test harness. This document cuts
it **by business flow** — useful for answering *"have we tested AnchorMart?"* Same system, two
indexes; neither replaces the other.

### Column definitions

| Column | Question it answers | Green when |
| ------ | ------------------- | ---------- |
| **UI** | Does an admin screen exist for this flow? | The screen renders with real data, as both roles |
| **APIs** | How many admin endpoints does it own? | Every one has been observed on the wire from the UI |
| **Positive** | Does the happy path work? | Every documented success path completes and persists across a browser refresh |
| **Negative** | Does it fail correctly? | Invalid input produces the *backend's own* message on the *correct field* — not a generic toast |
| **Permission** | Does it behave correctly for both tiers? | Verified as super-admin **and** sub-admin, at both layers (UI control hidden **and** API returns 403) |
| **E2E** | Does the whole journey work? | The flow completes across every portal it touches (§6) |

### Status vocabulary

`⬜` not started · `🟨` in progress · `✅` pass · `❌` fail · `⛔` blocked · `➖` not applicable

Every status that is not `✅` or `➖` must carry a classification from
[QA_BASELINE.md §2](./QA_BASELINE.md): 🔴 regression / 🟠 existing / 🟡 expected / ⚪ environment.

### One deliberate decision about the Permission column

**Every flow starts at `⬜`, including flows with no visible role gate.** The console holds 25
`isSuperAdmin` checks but only 4 capability checks, while the backend grants 21 features to a
sub-admin and 31 to a super-admin. Whether the 23 feature modules with *no* gate genuinely need none
is an open question — so "no gate required" is a **finding to be established**, not an assumption to
be inherited. Marking those rows `➖` up front would quietly assert the answer.

---

## 2. The matrix

Grouped by wave, matching the `flows/` directory so any row can be traced to its source document in
one step. **Admin API counts are folder-owned** — see §3 for the reconciliation that makes them sum
to exactly 202.

### Wave 1 — foundation

| Flow | Admin UI route | APIs | UI | Positive | Negative | Permission | E2E |
| ---- | -------------- | ---: | -- | -------- | -------- | ---------- | --- |
| **01** Authentication | `/login`, `/login/otp` | 4 †⁺ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **02** Profile · Vessel · Account | `/sailors`, `/ship-agents` | 11 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **26** Media upload | *shared control* ‡ | 1 † | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **27** Admin order ownership | `/orders` | 4 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |

† In `00 · Setup` / `99 · Teardown`, outside the 202. ⁺ Plus `GET /admin/me/`, which lives in the
Admin Users folder and is owned by Flow 31. ‡ `ImageUploadField` — no route of its own; exercised
through `/products` and `/spares`.

**Flow 27 is the console's own permission model** — claim, release, reassign, and "a super admin may
act on anyone's order". It is the single highest-value Permission row in the matrix.

### Wave 2 — the order funnel

| Flow | Admin UI route | APIs | UI | Positive | Negative | Permission | E2E |
| ---- | -------------- | ---: | -- | -------- | -------- | ---------- | --- |
| **03** Product discovery | `/products`, `/categories` | 10 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **04** Cart management | `/orders` — Open Carts | *shared w/ 14* | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **05** Order intent | `/intents` | 3 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **06** Stock verification · substitution | `/intents`; `/verification` **parked** | 4 + 5⛔ | 🟨 | ⬜ | ⬜ | ⬜ | ⬜ |
| **07** Order billing · payment | `/intents` — bill dialog | 3 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **08** Discount application | `/rewards` — config only | *shared w/ 30* | 🟨 | ⬜ | ⬜ | ⬜ | ⬜ |
| **10** Delivery fulfilment · tracking | `/orders`, `/partners`; `/assignments` **parked** | 1 + 5⛔ | 🟨 | ⬜ | ⬜ | ⬜ | ⬜ |
| **14** Order history · detail | `/orders` | 5 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **28** Delivery partner lifecycle | `/partners` | 9 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |

Three rows open at `🟨`, not `✅`. Flows **06** and **10** each lose an admin screen to
[BL-06](./QA_BASELINE.md#bl-06--three-screens-built-but-unroutable) — 10 of the 12 stranded endpoints
are here. Flow **08** has no admin screen for discount *application* at all; the console only
configures coupons, and application happens sailor-side.

### Wave 3 — alternate order paths

| Flow | Admin UI route | APIs | UI | Positive | Negative | Permission | E2E |
| ---- | -------------- | ---: | -- | -------- | -------- | ---------- | --- |
| **09** Express order placement | `/express` | 3 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **13** Special request | `/requests` | 6 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **15** Order amendment | `/orders` | *shared w/ 11* | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |

### Wave 4 — order changes and money out

| Flow | Admin UI route | APIs | UI | Positive | Negative | Permission | E2E |
| ---- | -------------- | ---: | -- | -------- | -------- | ---------- | --- |
| **11** Ship location change | `/orders` | 5 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **12** Order cancellation · refund | `/orders` | 4 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |

**Phase 8 gating:** Flow 12 moves money out. It must not run against arbitrary orders — see §7.

### Wave 5 — communication

| Flow | Admin UI route | APIs | UI | Positive | Negative | Permission | E2E |
| ---- | -------------- | ---: | -- | -------- | -------- | ---------- | --- |
| **21** Notification inbox · preferences | `/notifications` | *shared w/ 32* | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **22** Transactional messaging | `/messages` **parked** | 2⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **23** Realtime chat · support | `/chat`, `/support`, `/order-chats` | 7 + WS | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **32** Notification campaigns | `/notifications` | 5 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |

**Flow 22 is fully blocked** — its only screen is parked, so the outbound email/WhatsApp delivery
ledger cannot be inspected through the UI at all. Classification: 🟡 (BL-06, deliberate).

**Flow 23 is the only WebSocket flow** (`/ws`, proxied with `ws: true`) and the only one with a
polling presence loop. It needs a different harness from every other row.

### Wave 6 — engagement

| Flow | Admin UI route | APIs | UI | Positive | Negative | Permission | E2E |
| ---- | -------------- | ---: | -- | -------- | -------- | ---------- | --- |
| **16** Post-delivery feedback · ratings | `/ratings` | 3 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **17** Back-in-stock waitlist | `/products` — announce | *shared w/ 03, 29a* | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **18** Referral · loyalty points | `/rewards` | 7 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **19** Deal of the day | `/rewards` | 8 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **20** Surprise gift program | `/gifts` | 9 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **20a** Ship crew intent nudge | *none — Celery* | 0 | ➖ | ➖ | ➖ | ➖ | ➖ |

### Wave 7 — administration

| Flow | Admin UI route | APIs | UI | Positive | Negative | Permission | E2E |
| ---- | -------------- | ---: | -- | -------- | -------- | ---------- | --- |
| **24** Seller onboarding · review | `/sellers` | 4 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **25** Help & FAQ | `/settings/faqs` | 9 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **29** Catalog structure | `/categories` | 7 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **29a** Merchandising · availability | `/products` variants, `/express` | 7 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **29b** Marine emergency spares | `/spares`, `/emergency-categories` | 12 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **29c** Ports · anchorages | `/ports`, `/saved-products` | 6 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **30** Promotion · loyalty | `/rewards` | 8 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **31** User account administration | `/account-management` | 12 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **33** Admin dashboard · analytics | `/dashboard`, `/analytics` | 16 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **34** Admin audit trail | `/audit` | 2 | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |

**Flow 31 is the governance flow** — create, deactivate, reset password, soft-delete admin users,
plus deletion-request review. Almost every control is super-admin only. With Flow 27, these two rows
carry most of the Permission risk in the console.

**Flow 34** is role-scoped *server-side*: a sub-admin sees only `category=order` entries, and chain
verification is super-admin only. That makes it the cleanest Permission test in the matrix — the
expected difference is observable in the response body, not just in a hidden button.

### Wave 8 — background

| Flow | Admin UI route | APIs | UI | Positive | Negative | Permission | E2E |
| ---- | -------------- | ---: | -- | -------- | -------- | ---------- | --- |
| **35** Order lifecycle timers | *none — Celery* | 0 | ➖ | ➖ | ➖ | ➖ | ➖ |
| **36** Nightly aggregation · retention | *none — Celery* | 0 | ➖ | ➖ | ➖ | ➖ | ➖ |

Flows 20a, 35 and 36 have no admin surface by design. They are listed so the matrix accounts for all
40 documents; their observable effects surface inside other flows (a timer expiry changes an order's
state on `/orders`; a nightly rollup changes `/analytics`).

---

## 3. Reconciliation — all 202 admin endpoints are owned

Flow→endpoint mapping is many-to-many, so per-flow counts in §2 **overlap and deliberately do not
sum to 202**. Ownership is assigned at the Postman *folder* level instead, where it is exactly
one-to-one. This table is the proof that nothing is unassigned.

| Postman folder (`03 · Admin Panel`) | n | Owner | Also serves |
| ----------------------------------- | -: | ----- | ----------- |
| Dashboard | 12 | 33 | |
| Analytics | 4 | 33 | |
| Orders · List & Detail | 5 | 14 | 04 |
| Orders · Ownership | 4 | 27 | |
| Orders · Cancel & Refund | 4 | 12 | |
| Orders · Intents | 3 | 05 | |
| Orders · Substitutions | 4 | 06 | |
| Orders · Delta Payment & Location Reports | 5 | 11 | 15 |
| Promotion · Coupons | 5 | 30 | 08 |
| Promotion · Coupon Assignments | 3 | 30 | |
| Promotion · Bonus Points | 4 | 18 | |
| Promotion · Deal of the Day | 8 | 19 | |
| Promotion · Loyalty Program | 3 | 18 | |
| Partner · Partners | 6 | 28 | |
| Partner · Order Assignment | 5 | 10 | ⛔ parked |
| Partner · Verification | 5 | 06 | ⛔ parked |
| Partner · Performance | 3 | 28 | |
| Partner · Timeline | 1 | 10 | |
| Catalog · Categories | 7 | 29 | 03 |
| Catalog · Products | 10 | 03 | 17 |
| Catalog · Variants | 7 | 29a | 17 |
| Emergency · Spare Categories | 6 | 29b | |
| Emergency · Spare Products | 6 | 29b | |
| Express | 3 | 09 | 29a |
| Special Requests | 6 | 13 | |
| Surprise Gifts | 9 | 20 | |
| Sailors | 6 | 02 | 31 |
| Seller Requests | 4 | 24 | |
| Account Deletion Requests | 4 | 31 | |
| Ship Agents | 5 | 02 | |
| Ports & Saved Products | 6 | 29c | |
| Help & FAQ | 9 | 25 | |
| Ratings | 3 | 16 | |
| Payments (billing) | 3 | 07 | |
| Chat | 7 | 23 | |
| Notification Campaigns | 5 | 32 | 21 |
| Outbound Messages | 2 | 22 | ⛔ parked |
| Audit Trail | 2 | 34 | |
| Admin Users | 8 | 31 | 01 (`/admin/me/`) |
| **Total** | **202** | | |

**Outside the 202:** admin authentication is not in the Admin Panel folder. Admin login (×2),
`login-with-otp`, `verify-otp` and the presigned-upload URL are in `00 · Setup` (11 requests, all
portals); admin logout is in `99 · Teardown`. Flows 01 and 26 own those.

**Coverage arithmetic:** 202 owned − 12 stranded behind parked screens (BL-06) = **190 endpoints
reachable through the admin UI**. That 190 is the denominator for every UI coverage claim in this
programme.

---

## 4. Where the weight is

Ranked by admin endpoints owned — this sets the Phase 4–6 order.

| Rank | Flow | APIs | Screen | Why it is heavy |
| ---: | ---- | ---: | ------ | --------------- |
| 1 | **33** Dashboard · analytics | 16 | `/dashboard`, `/analytics` | 10 independent queries on one screen; read-only, so cheap to test |
| 2 | **31** Account administration | 12 | `/account-management` | Governance — nearly every control super-admin only |
| 3 | **29b** Marine spares | 12 | `/spares`, `/emergency-categories` | Two full CRUD surfaces |
| 4 | **02** Profile · vessel | 11 | `/sailors`, `/ship-agents` | Two CRUD surfaces + detail drawers |
| 5 | **03** Product discovery | 10 | `/products` | Deepest form in the console; media upload; variants |
| 6 | **28** Partner lifecycle | 9 | `/partners` | Capability model + performance history |
| 6= | **20** Surprise gifts | 9 | `/gifts` | 6 mutations, vessel-scoped |
| 6= | **25** Help & FAQ | 9 | `/settings/faqs` | Two entity types (types + FAQs) |
| 9 | **19** Deal of the day | 8 | `/rewards` | Scheduling + product picker (BL-03 site) |
| 9= | **30** Promotion · loyalty | 8 | `/rewards` | Coupons + assignments, 3 capability gates |

`/rewards` hosts flows **08, 18, 19, 30** — 23 endpoints, 6 tables, 4 tabs and all three capability
gates in the console. **It is the single densest screen and should be scheduled first in Phase 4**,
not last: it will surface more harness problems per hour than any other screen.

---

## 5. Screens with no flow, flows with no screen

Both directions of the join, so neither is silently dropped.

**Screens carrying no flow of their own** — all are shared UI, exercised through other rows:
`components/common/` (40 components — `DataTable`, `Pagination`, `ConfirmDialog`, `SearchFilters`,
`DateRangePicker`, …), and the `media` module (Flow 26).

**Flows with no admin screen:** 20a, 35, 36 (Celery, by design) and 22 (parked). Flow 08 has a
partial screen — configuration only, no application path.

**Endpoints with no UI:** the 12 behind parked screens. Listed in [QA_BASELINE.md BL-06](./QA_BASELINE.md#bl-06--three-screens-built-but-unroutable).

---

## 6. Phase 7 business journeys — the cross-portal problem

The four journeys in the QA programme are **not admin-only**, and this changes how Phase 7 must be
built. Established from the collection's structure during Phase 0.

### Journey A — Regular order

| Leg | Portal | Driven by | Source |
| --- | ------ | --------- | ------ |
| Browse → Cart → Place intent | Customer | **API** | `01 · Customer` — Browse (9), Regular Cart (4), Placing an order (4) |
| Sourcing → Verification | **Admin** | **UI** | `/intents` — substitutions (4); verification screen ⛔ parked |
| Billing | **Admin** | **UI** | `/intents` — bill dialog (3) |
| Payment | Customer | **API** | `01 · Customer` — Payment (4) |
| Confirmation | **Admin** | **UI** | `/orders` |
| Assignment | **Admin** | **API** ⛔ | Assignments screen parked — API only |
| Pickup → Port → Berth → Delivery | Partner | **API** | `02 · Delivery Partner` — Work Queue (5), Delivery (4) |

### Journey B — Express
Product → Express cart → Payment → Confirmation → Assignment → Delivery. Skips the sourcing funnel
(direct-pay). Admin leg: `/express` (3) + `/orders`.

### Journey C — Marine emergency
Marine catalog → Marine cart → Intent → Verification/Sourcing → Billing → Payment → Confirmation →
Delivery. Shares Journey A's sourcing funnel; admin catalog leg is `/spares` +
`/emergency-categories` (12).

### Journey D — Special request
Special request → Sourcing → Generate bill → Quote → Customer payment → Order → Assignment →
Delivery. Admin leg: `/requests` (6) — the most admin-heavy of the four, and the best Phase 7
starting point for that reason.

> **Consequence.** Only the admin frontend exists in this repository. Journeys A–D therefore require
> a **hybrid harness**: customer and partner legs driven through the API, admin legs driven through
> the UI, with state handed between them. This is achievable — the collection carries 337 assertions
> and the drift check proves it matches the backend — but `newman` is not installed, and the two
> legs must share order IDs and tokens. **Phase 7 is a harness-build task, not just a test-writing
> task.** Budget for it accordingly.

---

## 7. Definition of done — when a cell turns green

A cell is `✅` only against evidence. "It looked fine" is not a result.

**UI** — screen renders with real data as **both** roles; browser console clean; loading, empty and
error states each observed at least once.

**Positive** — every documented success path completes; the network request and response were
observed; the list refreshed; **and the record survives a browser refresh.** Persistence is the step
most often skipped and the one that catches optimistic-update bugs.

**Negative** — for each form: required-missing, wrong format, duplicate, boundary values (zero,
negative, oversized). The assertion is not "an error appeared" but *"the backend's own message
appeared on the correct field."* A meaningful 400 rendered as a generic *"Something went wrong"* is
a **fail**, not a pass.

**Permission** — exercised as super-admin and sub-admin, at **both layers**: the UI control is
absent for the tier that lacks it, **and** calling the endpoint directly returns 403. Passing one
layer only is a fail. *UI hiding is not security; the backend 403 is.*

**E2E** — the journey completes across every portal it touches, with state verified at each handoff.

**Every non-green cell carries a classification** (🔴/🟠/🟡/⚪) and a defect ID. An unclassifiable
finding is recorded as *unclassified* and escalated — never guessed.

---

## 8. Phase → column mapping

| Phase | Fills | Rows |
| ----- | ----- | ---- |
| 2 — Auth & roles | **Permission** for 01, 27, 31, 34 | 4 |
| 3 — UI smoke | **UI** | all 36 with a screen |
| 4 — CRUD | **Positive** | all CRUD flows |
| 5 — Search / filter / pagination | **Positive** (list surfaces) | 36 tables |
| 6 — Forms & validation | **Negative** | all form flows |
| 7 — Business flows | **E2E** | journeys A–D |
| 8 — Payments | **Positive** + **Negative** | 07, 08, 12, 15, 18, 30 |
| 9 — State machine | **Negative** | 05, 09, 12, 13, 15 |
| 10 — Delivery | **Positive** + **Permission** | 10, 28 |
| 11 — Notifications & chat | all | 21, 22⛔, 23, 32 |
| 12 — Storage | **Positive** + **Negative** | 26, and every flow with images |
| 13 — Failure & recovery | **Negative** | all |
| 14 — Security | **Permission** | all |
| 15 — Responsive & browser | **UI** | all |
| 16 — Regression | re-run | all |
| 17 — Production | environment | ➖ |
| 18 — Release gate | roll-up | §9 |

Phases 2 and 14 both fill **Permission** deliberately: Phase 2 establishes the two-tier baseline on
the four governance flows; Phase 14 attacks it adversarially — direct URLs, tampered payloads, IDOR
attempts — across all rows.

---

## 9. Release gate roll-up

Populated at Phase 18 from the rows above. Areas map to flows, not screens.

| Area | Flows | Manual | AI | API | E2E | Status |
| ---- | ----- | ------ | -- | --- | --- | ------ |
| Auth | 01 | ⬜ | ⬜ | ⬜ | ⬜ | |
| Permissions | 27, 31, 34 | ⬜ | ⬜ | ⬜ | ⬜ | |
| Catalog | 03, 17, 29, 29a, 29b, 29c | ⬜ | ⬜ | ⬜ | ⬜ | |
| Orders | 04, 05, 06, 09, 11, 13, 14, 15 | ⬜ | ⬜ | ⬜ | ⬜ | |
| Payments | 07, 08, 12, 18, 30 | ⬜ | ⬜ | ⬜ | ⬜ | |
| Delivery | 10, 28 | ⬜ | ⬜ | ⬜ | ⬜ | |
| Notifications & chat | 21, 22, 23, 32 | ⬜ | ⬜ | ⬜ | ⬜ | |
| Engagement | 16, 19, 20, 24, 25 | ⬜ | ⬜ | ⬜ | ⬜ | |
| Storage | 26 | ⬜ | ⬜ | ⬜ | ⬜ | |
| Admin ops | 02, 33 | ⬜ | ⬜ | ⬜ | ⬜ | |
| Security | all | ⬜ | ⬜ | ⬜ | ⬜ | |

Final classifications: **PASS · FAIL · BLOCKED · EXPECTED · NEEDS CLIENT DECISION · PRODUCTION-ONLY**.

---

## 10. Open questions — needed before Phase 2 starts

Four decisions. The first two are hard blockers; work cannot begin without them.

1. **Test accounts (⛔ blocks Phase 2).** The collection ships `satyajeet@ecinfosolutions.com` and
   `rushi@gmail.com` with **blank passwords**; the previous E2E run used a *different* sub-admin,
   `sub.admin@anchormart.test`. **Which pair is canonical, and what are the credentials?** It also
   needs confirming that the chosen sub-admin holds exactly the 21 `OPERATIONAL` features — a
   sub-admin with a hand-edited feature list would invalidate every Permission row.

2. **Write policy (⛔ blocks Phase 4).** Phases 4, 8 and 9 must create, update and delete records.
   **May tests write to the dev database?** If yes, on which order fixtures — Phase 8 must never
   touch a real order. If no, the programme is limited to read paths and permission checks.

3. **Parked screens (🟡).** Flows 06, 10 and 22 lose an admin surface, and 12 endpoints are
   unreachable. **Ship them, or record them as out of scope for this release?** Flow 22 is fully
   blocked either way.

4. **Flow 08 scope.** Discount *application* is sailor-side; the console only configures coupons.
   Confirm the admin-side scope is configuration only, so the row can be closed honestly rather than
   left permanently amber.

---

## 11. Method and limitations

Counts were extracted mechanically, not estimated: RTK Query operations by matching
`builder.query`/`builder.mutation` declarations across every feature's `api/` directory; Postman
counts by walking the collection JSON. The 39 admin folders sum to exactly 202, independently
matching the prior audit. Flow→screen mapping comes from `Flow NN` references in source comments
where present and from flow-document titles where absent; the two agree everywhere both exist.

**What this matrix does not establish.** Every `✅` in the **UI** column means *a route exists and
renders this flow's feature module* — established from the route table, **not** from opening a
browser. No screen has been rendered, no control clicked. Those cells become meaningful only when
Phase 3 replaces the structural claim with an observed one. Every other column is `⬜` for the
honest reason: nothing has been tested yet.
