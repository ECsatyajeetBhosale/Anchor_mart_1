# Flow 28 — Delivery Partner Lifecycle, Availability & Assignment

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`28-delivery-partner-lifecycle-validation.md`](./28-delivery-partner-lifecycle-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

---

# Executive Summary

| | |
|---|---|
| **Flow Name** | Delivery Partner Lifecycle, Availability & Assignment |
| **Business Objective** | Staff the dock, let partners manage their own availability, and route each order to a capable, free partner |
| **Flow Type** | Administrative |
| **Primary Actors** | Admin · Delivery Partner · Background System (KPI rollup) |
| **Platforms** | `ADMIN` · `PARTNER` · `SYS` · SMTP · Twilio |
| **Django Apps** | `admin_panel` (partner views, KPI views) · `partner_app` (self-service) · `user` (`DeliveryPartnerProfile`) · `orders` (`DeliveryAssignment`) · `analytics` (KPIs) |
| **Models** | `DeliveryPartnerProfile`, `DeliveryAssignment`, `User`, `DailyPartnerMetrics`, `AuditLog`, `DeleteMyAccountRequest` |
| **Total APIs** | **19** (13 admin · 4 partner self-service · 2 KPI) |
| **Related flows** | 1 (partner auth), 5 (verification assignment), 6 (verification console), 10 (delivery execution), 16/36 (ratings feed KPIs) |
| **Documentation Version** | 1.2 — 2026-08-03 (capability audit GL1–GL4 applied; v1.1 = 2026-07-21 findings F-01…F-05) |
| **Documentation Status** | ✅ 19 of 19 routes documented, verified against the running route table |

> **Behaviour changed 2026-07-21 — all five validation findings resolved.** The one that affects
> what this document describes: **an order awaiting payment (`payment_pending`) is no longer
> assignable** — a delivery partner can only be assigned once the order is paid. The picker, the
> assign write, and the unassigned queue now share one `required_capability` definition. The
> others were a PUT method, malformed-id handling, and filter validation (mechanical).

> **Behaviour changed again 2026-08-03 — capability audit GL1–GL4 (`MD/todo.md`).** Four changes
> to what this chapter describes:
> 1. **Capability is now enforced at the write itself**, on `DeliveryAssignment`, not only inside
>    `AdminAssignOrderSerializer`. Any creation path that skips the serializer now gets a **403**.
> 2. **Verification assignments are distinguishable from delivery assignments.** New assignment
>    status **`verified`**; verify jobs are stamped `verifying` at creation. Previously every
>    assignment of either kind was written as `assigned`.
> 3. **A finished verification stops counting as live work** — so `on_duty`, `active_deliveries`
>    and the `available` filter no longer over-report.
> 4. **The partner app is told its own capability**, on both sign-in and profile.
> 5. **New: `GET /partner/history/?user_id=`** — the per-partner job history behind the KPI
>    numbers (API 6b). Previously an admin could see a partner's success rate but had no way
>    to see which orders produced it.
>
> The phase→capability mapping **moved** to `orders/assignment_lifecycle.phase_for`;
> `required_capability` is now a thin alias over it. Frontend contract for the partner app:
> `MD/PARTNER_CAPABILITY_FRONTEND_GUIDE.md`.

> **Scope.** This chapter covers **staffing and routing** — creating partners, their
> self-service, assigning orders, the assignment boards, and the KPI dashboard. It stops at the
> point a partner starts *acting* on an assignment: **stock verification is Flow 6**, the
> **delivery milestones (reject / advance / deliver / report-failed) are Flow 10**, and
> **partner sign-in is Flow 1**.

---

# Phase 1 — Understand the Flow

## Business purpose

Delivery partners never self-register. An admin provisions each one (a `User` with
`role=delivery_partner` plus a `DeliveryPartnerProfile`) and invites them by email and/or
WhatsApp. From then on the partner manages their own availability, and the admin routes orders
to whichever partner is **capable** (right task type) and **available** at the **right port**.
Every routing decision and availability change is audited, so "why was nobody available?" is
answerable after the fact.

## The three states a partner can be in

The list endpoint's `?status=` filter defines them (`partner_views.py:109-167`):

| State | Definition |
|---|---|
| **available** | Active account **AND** `is_available` toggle on **AND** not on duty |
| **on_duty** | Has an in-progress `DeliveryAssignment` (**derived**, not stored) |
| **inactive** | Blocked account (`user.is_active = False`) |

> **`on_duty` is derived, not a field.** Only `is_available` is stored. "In progress" =
> assignment status ∈ `{assigned, verifying, picked_up}` (`IN_PROGRESS_STATUSES`).
>
> **`verified` is deliberately NOT in that set (2026-08-03).** A partner who has submitted their
> availability report keeps the assignment (`is_active` stays true — they are still the one on the
> hook if the order comes back for re-verification), but their *work* is done, so they are **not**
> on duty and become `available` again. This is what stopped finished verifiers from reading as
> busy indefinitely.
>
> ⚠️ **`IN_PROGRESS_STATUSES` and `is_active` answer different questions — do not swap them.**
> The status list means *"actively working right now"* (`on_duty`, `active_deliveries`, the
> assignments board). `is_active` means *"still holds this order"* (the delete guard). Using the
> list where ownership was meant is how a partner still holding an order briefly became deletable.

## Two orthogonal capabilities

A partner carries two independent flags — a partner can verify-only, deliver-only, or both:

| Flag | Grants |
|---|---|
| `can_verify` | May be assigned **stock-verification** tasks (intent-stage availability check, Flow 6) |
| `can_deliver` | May be assigned **delivery** tasks (post-payment pickup → deliver, Flow 10) |

A partner with **neither** is rejected at create/update — they could be given no work.

## The assignment engine

`AdminAssignOrder` (`partner_views.py:278`) is the heart of the flow:

1. **Ownership** — `manage_gate` (409 unclaimed / 403 wrong owner) — assignment is a governed order write.
2. **Validation** (`AdminAssignOrderSerializer`) — the order exists and isn't terminal; the
   partner exists, is active, is available, and **has the capability the order's phase needs**.
3. **Capability by phase** — `phase_for(order)` (`orders/assignment_lifecycle.py`) is the
   **single definition** of which work an order needs; `required_capability` is a thin alias over
   it. Shared by the picker, this write, the unassigned queue **and the model-level guard**: the
   pre-payment intent funnel needs a **verifier**, the paid delivery funnel needs a **deliverer**,
   and an order **awaiting payment (`payment_pending`) is assignable to neither** (verification is
   done, delivery waits for payment).
4. **Capability is enforced at the write, not only here** *(changed 2026-08-03, GL1)*. The
   serializer still rejects a mismatch with a **400** and still fires first, so an admin gets the
   friendlier error. Behind it, `DeliveryAssignment` itself refuses the row — in both `clean()`
   **and** `save()` — raising `CapabilityViolation` → **403**. Both are needed: DRF's
   `ModelSerializer.save()` never calls `full_clean()`, so a `clean()`-only rule would be skipped
   by exactly the paths that matter, while a `save()`-only rule would leave the Django admin
   unguarded. **Reaching the 403 means a write path skipped the serializer** — which is precisely
   what it exists to catch, since the serializer used to be the *only* guard.
   *Scope:* creation only, and capability only. It does not re-check on update (see "Revoking a
   capability" below), and it takes no view on assignability when the order has no phase at all —
   that stays the serializer's rule.
5. **Reassignment keeps history** — an order already assigned to a *different* partner needs
   `confirm=true` (else **409 `requires_confirmation`**); on confirm, the prior active assignment
   is deactivated and a fresh active one is created. An in-progress row is closed
   `status=reassigned`; a row already at **`verified` keeps its status** *(2026-08-03)* — relabelling
   it would erase the record that this partner did the verification work. Same partner → no-op 200.
6. **Transition + notify** — the order advances (`partner_verifying` for verify, `partner_assigned`
   for delivery) through the guarded `transition_order`, the action is audited, and the partner
   is notified via the dispatcher (preference-gated + FCM-pushed).

## The verification assignment lifecycle

*(Added 2026-08-03.)* A verify job and a delivery job are now distinguishable on the assignment row:

| Moment | Assignment status | `is_active` |
|---|---|---|
| Assigned for verification | `verifying` | ✅ |
| Report submitted (order → `verification_submitted`) | **`verified`** | ✅ — still holds the order |
| Order sent back for re-verification (→ `partner_verifying`) | back to `verifying` | ✅ |
| Reassigned to someone else | stays `verified` | ✖ |

> **Why the assignment stays active after the work is done — and is not closed.** `add_items_service`
> sends an **unpaid** order back to `partner_verifying` when the sailor adds lines, and deliberately
> does **not** reassign: it relies on the same partner still holding the job. Closing the assignment
> when the report lands would strand that order with no partner and nothing telling an admin to
> reassign. So the *status* records that the work finished while `is_active` records who still owns
> it — which is also why `on_duty` reads off the status list, not off `is_active`.

## Revoking a capability — rostering, not an emergency stop

*(Policy decided 2026-08-03.)* Removing `can_deliver` (or `can_verify`) means **"stop sending this
kind of work"**. It does **not** stop work already in hand: a partner at the berth holding the
sailor's goods still completes the handover, because stopping them strands cargo and the vessel
sails without it. Two levers already stop a partner instantly and unambiguously:

| Lever | Effect mid-delivery |
|---|---|
| Block the account (`is_active: false`) | **401** — immediate |
| Reassign the order | **404** for the old partner — immediate |
| Revoke a capability | no effect on current work; no new assignments of that type |

So that an admin is never left believing a revoke stopped something, the update endpoint now
returns a **`capability_change`** block listing the in-flight work it did *not* affect — see the
`partner_detail_update/` API below.

## SLA deadline

`deliver_by` is the admin's optional override, else `_compute_deliver_by` →
`delivery_policy.calculate_deadline` — a config-driven per-type SLA (express / emergency /
fastest, tightest wins) plus the anchorage's difficulty. **Normal orders get no hard deadline**
(`None`); `expected_departure` is guidance instead.

## The four admin boards

| Board | Endpoint | Shows |
|---|---|---|
| **a · Active assignments** | `active-assignments/` | Every in-progress assignment across all orders |
| **b · Unassigned orders** | `unassigned-orders/` | Assignable orders with no active assignment |
| **c · Assignment history** | `order-assignments/` | Every assignment (incl. closed) for one order |
| **d · Order timeline** | `order-timeline/` | The delivery-milestone ladder for one order (shared builder with the customer track screen) |

## Soft-delete is guarded

Deleting a partner is **blocked (409) while they still hold an order** — reassign or finish it
first. The guard keys on `is_active` on the assignment, **not** on `IN_PROGRESS_STATUSES`
*(corrected 2026-08-03)*: a partner whose verification is complete is not "in progress" but does
still hold the order, and deleting them would strand it if the order came back for re-verification.

On delete, the profile is soft-deleted **and** the account is blocked (`is_active=False`) so they
can no longer sign in.

## KPIs (admin-only)

`ListPartnerKpisView` / `GetPartnerKpisView` read the **#30 analytics rollup** (settled days
pre-aggregated, today merged live) — one indexed read, not a scan of every assignment. Three
definitions are load-bearing:

- **Rejection rate, not acceptance rate** — there's no accept action (an assignment starts
  `assigned`), so acceptance isn't observable.
- **On-time rate covers SLA-bound orders only** — only express/emergency/fastest carry a
  `deliver_by`, so `sla_bound_deliveries` ships beside the rate.
- **A rate with no samples is `null`, never `0`** — an unrated partner is missing data, not bad.

KPIs are **admin-only by decision** — showing partners their own scorecard is a
people-management call for the client to make deliberately, not inherit from the build.

---

# Phase 2 — Discover the Complete Flow

```
ADMIN — provisioning
  ├─ POST /superadmin/partner/create/         User(role=partner, OTP-only) + profile → invite email/WhatsApp
  ├─ GET  /superadmin/partner/list/           ?status=available|on_duty|inactive · search
  ├─ GET  /superadmin/partner/stats/          total partners · active deliveries
  ├─ GET  /superadmin/partner/partner_detail/         ?user_id=
  ├─ PATCH/superadmin/partner/partner_detail_update/  edit / block (audited both flag groups)
  └─ DELETE /superadmin/partner/delete/       ?user_id= — 409 if they still hold an order

PARTNER — self-service
  ├─ GET/PATCH /partner/profile/              view / edit own profile
  ├─ PATCH     /partner/availability/         toggle 'Available for orders' (audited)
  ├─ GET       /partner/port/                 the port they service
  └─ POST      /partner/request-account-deletion/   admin reviews (no duplicate open request)

ADMIN — routing
  ├─ GET  /superadmin/partner/assignable-partners/   ?order_id= → capability + port scoped
  ├─ POST /superadmin/partner/assign-order/          manage_gate → validate → (confirm reassign) → assign + transition + notify
  │        ├─ 409 requires_confirmation  (already assigned to another partner)
  │        ├─ 200 already_assigned       (same partner)
  │        └─ 201 assigned               (prev closed 'reassigned', order → partner_verifying | partner_assigned)
  ├─ GET  /superadmin/partner/order-assignments/     history for one order
  ├─ GET  /superadmin/partner/active-assignments/    board a
  ├─ GET  /superadmin/partner/unassigned-orders/     board b
  └─ GET  /superadmin/partner/order-timeline/        board d (shared milestone builder)

ADMIN — performance (reads the #30 rollup) Note: Do not implement this APIS this will be done in Build-2 
  ├─ GET  /superadmin/partner/kpis/           per-partner, ranked, period-scoped
  └─ GET  /superadmin/partner/kpi-detail/     ?user_id= one partner + day-by-day trend
```

## API sequence table

| Step | Platform | API |
|---|---|---|
| 1 | ADMIN | `POST /api/superadmin/partner/create/` |
| 2 | ADMIN | `GET /api/superadmin/partner/list/` |
| 3 | ADMIN | `GET /api/superadmin/partner/stats/` |
| 4 | ADMIN | `GET /api/superadmin/partner/partner_detail/` |
| 5 | ADMIN | `PATCH /api/superadmin/partner/partner_detail_update/` |
| 6 | ADMIN | `DELETE /api/superadmin/partner/delete/` |
| 7 | PARTNER | `GET/PATCH /api/partner/profile/` |
| 8 | PARTNER | `PATCH /api/partner/availability/` |
| 9 | PARTNER | `GET /api/partner/port/` |
| 10 | PARTNER | `POST /api/partner/request-account-deletion/` |
| 11 | ADMIN | `GET /api/superadmin/partner/assignable-partners/` |
| 12 | ADMIN | `POST /api/superadmin/partner/assign-order/` |
| 13 | ADMIN | `GET /api/superadmin/partner/order-assignments/` |
| 14 | ADMIN | `GET /api/superadmin/partner/active-assignments/` |
| 15 | ADMIN | `GET /api/superadmin/partner/unassigned-orders/` |
| 16 | ADMIN | `GET /api/superadmin/partner/order-timeline/` |
| 17 | ADMIN | `GET /api/superadmin/partner/kpis/` |Note: Do not implement this APIS this will be done in Build-2 
| 18 | ADMIN | `GET /api/superadmin/partner/kpi-detail/` |Note: Do not implement this APIS this will be done in Build-2 

---

# Phase 3 — API Documentation

## Flow-wide conventions

| Header | Notes |
|---|---|
| `Authorization: Token <key>` | All 18 |
| `server-secret-key` | Required on `/api/partner/…`; **`/api/superadmin/…` is exempt** |

- Admin endpoints: `[IsAuthenticated, IsAdminUser]`; the **assign** write additionally passes `manage_gate`.
- Partner endpoints: `[IsAuthenticated, IsDeliveryPartner]`, scoped to `request.user`.
- Admin partner lookups are by **`?user_id=`** (the partner's `User` id), not the profile id.

---

## API 1 · Create a partner

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/partner/create/` · `POST` |
| **View** | `AdminCreatePartner` · serializer `AdminCreatePartnerSerializer` |

Creates an **OTP-only** `User` (`set_unusable_password`, no password in the invite) plus the
profile, then invites by whatever channels were given.

> ### ⚠️ Error shape changed 2026-07-30 — breaking for error rendering
>
> Validation errors are now returned as **bare field keys** (`{"email": ["…"]}`), per
> CLAUDE.md §3. They were previously wrapped in an **`{"errors": {…}}` envelope**.
>
> **Changed from the Flow 31 pass, not this one.** The identical wrapper existed on
> `POST /api/superadmin/admin/create-user/` and was found there (**GC3**); a check for the
> copy-paste turned it up here too — the two endpoints are the same shape ("provision a user +
> invite over email/WhatsApp"), and this one is the nearest sibling. Fixing only Flow 31's
> would have relocated the inconsistency rather than closing it, and left this one to be
> rediscovered in a future Flow 28 pass.
>
> **Anything reading `response.errors.<field>` must now read `response.<field>`.** The change
> is silent if missed — the request fails either way, only the rendering differs.

**Request Body**

| Field | Required | Rules |
|---|---|---|
| `email` | ⚠️ | Unique; **at least one** of email / whatsapp_number required |
| `whatsapp_number` | ⚠️ | If given and not already E.164, `country_code` is required |
| `country_code` | conditional | Required with a non-E.164 WhatsApp number |
| `first_name`, `last_name` | ✖ | |
| `partner_id` | ✖ | Unique; auto-generated (`next_partner_id()`) if omitted |
| `assigned_port` | ✖ | A live `PortAddress` id |
| `is_available` | ✖ | default `true` |
| `can_verify`, `can_deliver` | ✖ | default `true`; **at least one must be true** |

**Success — 201** — `{ "message", "invited_via": ["email","whatsapp"], "partner": {…} }`.
WhatsApp-only partners get a synthesized non-deliverable login email.

**Errors** — 400 (missing contact, duplicate email/partner_id, no capability), 401/403.

---

## API 2 · List partners

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/partner/list/` · `GET` |
| **View** | `AdminPartnerList` |
| **Query** | `search` · `status` = `available` \| `on_duty` \| `inactive` · `is_active` (legacy) · pagination |

Paginated partners with `on_duty` and `total_deliveries` annotated. `results` is an object:
`{ "message", "data": [ … ] }`. Each row (`AdminPartnerSerializer`): `user_id`, `partner_id`,
`name`, `email`, `whatsapp_number`, `port`, `is_available`, `can_verify`, `can_deliver`,
`is_active`, `joined`, `total_deliveries`, `on_duty`.

---

## API 3 · Partner stats

`GET /api/superadmin/partner/stats/` · `AdminPartnerStats` → `{ "total_partners",
"active_deliveries" }` (in-progress assignments). No filters.

---

## API 4 · Partner detail

`GET /api/superadmin/partner/partner_detail/?user_id=` · `AdminPartnerDetail` → one
`AdminPartnerSerializer`. 404 on unknown/deleted.

---

## API 5 · Update / block a partner

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/partner/partner_detail_update/?user_id=` · **`PATCH`** |
| **View** | `AdminPartnerDetailUpdate` · serializer `AdminUpdatePartnerSerializer` |

Partial update of profile fields (`partner_id`, `assigned_port`, `is_available`, `can_verify`,
`can_deliver`) and mirrored user fields (`email`, `first_name`, `last_name`, `country_code`,
`whatsapp_number`, `is_active` = block/unblock). Availability and capability edits are audited
**separately** (they answer different questions). Resulting state must keep ≥1 capability.

> Accepts **both PUT and PATCH** (both partial), per CLAUDE.md §4a. *(A prior gap where only
> PATCH was wired was fixed 2026-07-21 — validation F-01.)*

**Success — 200** returns the updated `AdminPartnerSerializer` row. **When and only when the
request REVOKES a capability** (`true` → `false`), an extra `capability_change` key is added
*(2026-08-03)*. Granting a capability, or editing any other field, leaves the response shape
exactly as before — existing admin clients are unaffected.

```json
{
  "…": "usual AdminPartnerSerializer fields",
  "capability_change": {
    "revoked": ["can_deliver"],
    "unaffected_in_flight": {
      "count": 2,
      "truncated": false,
      "orders": [
        { "order_id": "b21f…", "order_number": "AM-10241",
          "status": "at_berth", "status_display": "At Berth",
          "assignment_status": "assigned" }
      ]
    },
    "message": "2 delivery assignments already in progress are NOT affected and will run to completion. To stop this partner now, reassign the order(s) or block the account."
  }
}
```

| Key | Meaning |
|---|---|
| `revoked` | Which capability field(s) this request turned off — `can_verify`, `can_deliver`, or both |
| `unaffected_in_flight.count` | **Exact** number of the partner's active assignments in the revoked capability's phase. `0` is still reported — "nothing was running" is the answer, not an omission |
| `unaffected_in_flight.truncated` | `true` when `orders` was capped (20 rows); `count` remains exact |
| `unaffected_in_flight.orders` | The affected orders, so the UI can offer a reassign shortcut per row |
| `message` | Ready-to-display copy. **Surface this** — it is what stops an admin believing the revoke stopped something |

Scoped **by phase**: revoking `can_deliver` never reports a verification assignment, and vice
versa. Uses the same `phase_for` definition as the assignment engine.

---

## API 6 · Delete a partner

`DELETE /api/superadmin/partner/delete/?user_id=` · `AdminDeletePartner`. **409** if the partner
still holds an order (any active assignment). Otherwise soft-deletes the profile **and** blocks
the account.

---

## API 6b · Partner work history — "how is this partner working?"

*(Added 2026-08-03.)*

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/partner/history/?user_id=` · **`GET`** |
| **View** | `ListPartnerHistoryView` · serializer `AdminPartnerHistoryRowSerializer` |

The **jobs behind the KPI numbers**. `kpi-detail/` gives rollup aggregates and a trend line;
this gives the individual assignments that produced them — the drill-down the KPI screen
previously had nowhere to go to.

> ⚠️ **Do not use `GET /orders/?partner_id=` for this.** That filter matches
> `assignments__is_active=True`, and delivering an order **closes** its assignment — so it
> returns the partner's *current workload* and silently omits every completed delivery.
> `?partner_id=` + `?status=delivered` returns **empty, always**. It is a workload view.

**One flat list, deliberately not split by capability.** The admin's question is about the
person, and `outcome` already separates the kinds of work that matter — a finished
verification reads `verified`, a finished delivery reads `delivered`. The partner's
capability flags ride in the header so the reader knows what kind of partner they are looking
at; they do not reshape the payload.

| Param | Type | Default | Values |
|---|---|---|---|
| `user_id` | UUID | **required** | 404 if unknown or soft-deleted |
| `outcome` | string | — | `delivered`, `failed`, `verified`, `in_progress`, `rejected`, `reassigned`, `cancelled`. Anything else → **400** |
| `period` | string | **all time** | `today`, `week`, `month` — applied to `assigned_at` |
| `from_date` / `to_date` | `YYYY-MM-DD` | — | Overrides `period` |
| `search` | string | — | Matches **order number** only |
| `page` / `page_size` | int | 1 / 10 (max 50) | |

> **Defaults to ALL TIME**, unlike the KPI screens which default to a month. Silently hiding
> a partner's older work behind an unrequested 30-day window is what makes a history screen
> untrustworthy.

**Success — 200**
```json
{ "count": 24, "next": "…", "previous": null,
  "results": {
    "message": "Partner history fetched successfully",
    "period": "all",
    "partner": { "user_id": "…", "partner_id": "DP-00124", "name": "Ravi Kumar",
                 "email": "ravi@…", "port": "Port of Singapore",
                 "can_verify": true, "can_deliver": false,
                 "is_available": true, "is_active": true },
    "summary": { "total_jobs": 24, "delivered": 18, "failed": 2, "verified": 3,
                 "in_progress": 1, "rejected": 0, "reassigned": 0, "cancelled": 0,
                 "delivery_success_rate": 90.0, "on_time_rate": 83.3,
                 "sla_bound_deliveries": 12 },
    "data": [
      { "assignment_id": "…", "order_id": "…", "order_number": "AM202608030002",
        "order_status": "delivered", "order_status_display": "Delivered",
        "outcome": "delivered", "outcome_display": "Delivered", "status": "delivered",
        "assigned_at": "…", "first_action_at": "…", "picked_up_at": "…",
        "completed_at": "…", "failed_at": null, "deliver_by": "…",
        "on_time": true, "rejection_reason": "", "rating": 5 }
    ] } }
```

Three rules the frontend needs:

- **`summary` ignores `?outcome=`.** It is computed from the period-scoped set *before* the
  outcome filter, so clicking an outcome narrows the list while the header keeps showing the
  whole picture — the counts and the list can never contradict each other.
- **`on_time` is `true` / `false` / `null`.** Only express / emergency / fastest orders carry
  a `deliver_by`; for everything else punctuality is not a question with an answer, and
  `null` says so. Rendering `null` as "late" would mark every normal delivery a failure.
- **Rates are `null`, not `0`, with no samples** — an untested partner is missing data, not a
  failing one. Same rule as the KPI endpoints, so the two screens agree.

> **`rejected` / `reassigned` / `cancelled` rows do not say whether the job was verification
> or delivery.** Those three statuses overwrite `verifying` / `verified`. That is fine for
> this screen — "this partner rejects a lot" is the signal, and the flavour doesn't change it
> — but **do not build a capability-partitioned view on this data** without first adding an
> explicit `job_kind` column. Deriving it from `status` would be wrong for exactly the rows
> that matter.

**History is not filtered by *current* capability.** Capability is present-tense; history is
not. A partner who was "both" and is now deliver-only keeps their verification history —
hiding it because a flag changed would falsify the record.

---

## APIs 7–10 · Partner self-service

| API | Endpoint | View | Notes |
|---|---|---|---|
| 7 | `GET/PATCH /api/partner/profile/` | `PartnerProfile` | View / partial-edit own profile. **GET returns `can_verify` / `can_deliver`** *(added 2026-08-03)* so the app can render the right screens — see below |
| 8 | `PATCH /api/partner/availability/` | `PartnerAvailability` | `{ "is_available": bool }` → toggles; the change is **audited** (`changed_by: partner`) so "nobody was available" is answerable |
| 9 | `GET /api/partner/port/` | `GetPartnerPort` | `{ "port": {…} | null }` |
| 10 | `POST /api/partner/request-account-deletion/` | `PartnerRequestAccountDeletion` | Admin reviews; **400** if a request is already open (no duplicates) |

**API 7 · `GET /api/partner/profile/` — 200.** `can_verify` / `can_deliver` were added 2026-08-03;
the same two fields also ride on the sign-in response (Flow 1, API 12), so the app knows its shape
before the first render rather than only after the first profile fetch.

```json
{ "id": "0d3f…", "partner_id": "DP-00124", "name": "Ravi Kumar",
  "email": "ravi@anchormart.example", "whatsapp_number": "9876543210",
  "country_code": "+65", "date_of_birth": "1990-04-11", "gender": "male",
  "profile_picture": "https://…/media/profile/abc.jpg",
  "port": "Port of Singapore", "port_id": "7c1e…",
  "is_available": true, "joined": "2026-01-14",
  "can_verify": true, "can_deliver": false }
```

> **Capability is read-only to the partner.** `PartnerProfileUpdateSerializer` accepts only
> `first_name`, `last_name`, `date_of_birth`, `whatsapp_number`, `country_code` — a PATCH carrying
> `can_deliver: true` is **silently ignored (200, unchanged)**, not an error. Capability is an
> admin decision; a partner cannot grant themselves work.
>
> Full frontend contract, including how each capability shape changes the screens:
> [`../../PARTNER_CAPABILITY_FRONTEND_GUIDE.md`](../../PARTNER_CAPABILITY_FRONTEND_GUIDE.md).

---

## API 11 · Assignable partners

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/partner/assignable-partners/` · `GET` |
| **View** | `AdminAssignablePartners` |
| **Query** | `order_id` (recommended) · `port_id` (override) · pagination |

Available, active partners. With `?order_id=`, scoped to the **capability the order's phase
needs** (verify vs deliver) and defaulted to the order's port. `?port_id=` overrides the port.
With neither, returns **all** available partners (capability un-filtered). Bad `order_id` → 400.

---

## API 12 · Assign / reassign an order

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/partner/assign-order/` · `POST` |
| **View** | `AdminAssignOrder` · serializer `AdminAssignOrderSerializer` · **`manage_gate`** |

**Request Body**
```json
{ "order_id": "…", "delivery_partner_id": "…", "deliver_by": "2026-07-22T15:00:00Z", "confirm": false }
```

| Field | Required | Rules |
|---|---|---|
| `order_id` | ✅ | Exists, not terminal (`NON_ASSIGNABLE_STATUSES`) |
| `delivery_partner_id` | ✅ | A partner: active, available, **capability matches the order's phase** |
| `deliver_by` | ✖ | Admin override; else computed by the SLA policy |
| `confirm` | ✖ | `true` to reassign an order held by another partner |

**Responses**

| Status | Body | Condition |
|---|---|---|
| 201 | `{ "message", "assignment": {…} }` | Assigned; prior (if any) closed `reassigned`; order transitioned + partner notified |
| 200 | `{ "already_assigned": true, … }` | Already assigned to this same partner |
| 409 | `{ "requires_confirmation": true, "current_assignment": {…} }` | Assigned to a *different* partner and `confirm` was false |
| 409 / 403 | `manage_gate` | Order unclaimed / owned by another admin |
| 400 | serializer errors | Terminal order · partner blocked / unavailable / wrong capability |

---

## APIs 13–16 · The boards

| API | Endpoint | View | Returns |
|---|---|---|---|
| 13 | `GET /order-assignments/?order_id=` | `AdminOrderAssignments` | All assignments for one order, newest first. **400** if `order_id` missing |
| 14 | `GET /active-assignments/` | `AdminActiveAssignments` | In-progress assignments; `?search=` · `?order_status=` |
| 15 | `GET /unassigned-orders/` | `AdminUnassignedOrders` | Assignable orders with no active assignment; `?search=` |
| 16 | `GET /order-timeline/?order_id=` | `AdminOrderTimeline` | Milestone ladder (`steps` / `terminal_state` / raw `history`), shared with the customer track screen |

> APIs 13 and 16 validate `order_id` (via `_required_uuid`) → a missing or malformed value is a
> clean **400**. *(A prior unhandled-500 on a malformed id was fixed 2026-07-21 — validation F-02.)*

---

## API 17 · KPI leaderboard; Note: Do not implement this APIS this will be done in Build-2 

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/partner/kpis/` · `GET` |
| **View** | `ListPartnerKpisView` |

Per-partner KPIs over a time window, ranked. **Only partners with activity in the window appear**
(a partner who did nothing has no KPIs — padding with zero-rows would make every rate read as a
failure). Paginated.

**Query parameters** — the only filters are time-window + sort; there is **no text search and no
port/capability filter**.

| Param | Values | Notes |
|---|---|---|
| `ordering` | `delivered` · `assigned` · `rejected` · `failed` · `rejection_rate` · `delivery_success_rate` · `on_time_rate` · `avg_rating` · `avg_delivery_hours` · `avg_response_minutes` | Prefix `-` for descending. **Default `-delivered`.** Unknown key → **400** with the allowed list |
| `period` | `today` · `week` (rolling 7 days) · `month` (rolling 30 days, **default**) | |
| `from_date` & `to_date` | `YYYY-MM-DD`, **both required** | A custom range — **overrides `period`**; `from > to` or a bad date → 400 |
| `page`, `page_size` | integers | Pagination |

**Success — 200** — `results` is an **object** wrapping the ranked list:
```json
{ "count": 5, "next": null, "previous": null,
  "results": {
    "message": "Partner KPIs fetched successfully",
    "period": "month", "ordering": "-delivered",
    "data": [ { …KPI row… }, … ] } }
```

## API 18 · One partner + trend

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/partner/kpi-detail/?user_id=<uuid>` · `GET` |
| **View** | `GetPartnerKpisView` |

`user_id` **required** (400 if missing; **404** on unknown/deleted). Same `period` / `from_date` /
`to_date` params as API 17 (no `ordering`/pagination — one partner). Adds a **day-by-day `series`**
(each entry is a KPI row for that date), **capped at 180 days** — beyond that `series` is `[]` and
`series_truncated` is `true`. Unlike API 17, returns a zero-row for a partner with no activity.

**Success — 200**
```json
{ "period": "month",
  "partner": { "user_id", "partner_id", "email", "is_available", "can_verify",
               "can_deliver", "is_active" },
  "kpis": { …KPI row… },
  "series": [ { "date": "2026-07-09", …KPI row… } ],
  "series_truncated": false }
```

## The KPI row — fields & formulas

Every rate **ships with its denominator**, and is **`null` when it has no samples** — `null`
means "no data", **`0` means measured-and-genuinely-zero**. Render them differently (e.g. "—" vs
"0%").

| Field | Meaning / formula |
|---|---|
| `assigned` | Assignments **opened** in the window |
| `delivered` · `rejected` · `failed` | Milestones **reached** in the window |
| `rejection_rate` | `rejected / assigned` (%). **No accept action exists**, so this — not acceptance rate — is the observable measure. `null` when `assigned = 0` |
| `delivery_success_rate` | `delivered / (delivered + failed)` (%). `null` when nothing concluded |
| `on_time_rate` | `on_time_deliveries / sla_bound_deliveries` (%). **SLA-bound = express/emergency/fastest only** |
| `sla_bound_deliveries` · `on_time_deliveries` | The denominator + numerator behind `on_time_rate` |
| `avg_delivery_hours` | Mean assigned→delivered duration, hours. `null` when none |
| `avg_response_minutes` · `responded_count` | Mean assigned→first-action, minutes (+ sample size) |
| `avg_rating` · `ratings_count` | Mean customer delivery rating (2 dp) + count |
| `tag_counts` | Delivery-rating quick-tag tallies, e.g. `{"on_time": 3}` |

> **`delivered: 1, rejected: 1, assigned: 0` is not a contradiction:** the counters use different
> bases — `assigned` counts assignments *opened* this window, while `delivered`/`rejected` count
> milestones *reached* this window. An assignment opened earlier but delivered now lands in
> `delivered` without adding to `assigned` — which is exactly why `rejection_rate` can be `null`
> (0 assignments opened) while `delivered` is non-zero.

---

## What happens next

| Outcome | Next |
|---|---|
| Order → `partner_verifying` | **Flow 6** — the partner submits an availability report |
| Order → `partner_assigned` | **Flow 10** — the partner advances the delivery milestones |
| Delivery rating submitted | **Flow 16/36** — feeds these KPIs |
| Partner blocked / deleted | Account can no longer sign in (Flow 1) |

---

## Source reference

| Concern | Location |
|---|---|
| Admin partner views | `admin_panel/views/partner_views.py:71-595` |
| KPI views | `admin_panel/views/partner_kpi_views.py` |
| Partner self-service | `partner_app/views/profile_views.py` |
| Phase → capability mapping | `orders/assignment_lifecycle.py` (`phase_for`, `VERIFY_PHASE_STATUSES`, `DELIVER_PHASE_STATUSES`, `PHASE_CAPABILITY_FIELD`, `CapabilityViolation`) — **the single definition**, moved here 2026-08-03 |
| Serializers + capability rules | `admin_panel/serializers/partner_serializers.py` (`required_capability` → alias of `phase_for`, `ASSIGNABLE_STATUSES`, `NON_ASSIGNABLE_STATUSES`, `AdminAssignOrderSerializer`) |
| Capability boundary guard | `orders/models.py` → `DeliveryAssignment.clean()` / `.save()` / `._capability_error()` |
| Verify-assignment status sync | `orders/assignment_lifecycle.sync_verify_assignment_status`, hooked into `orders/lifecycle.transition_order` |
| Tests | `partner_app/tests/test_capability_probe.py` (30) · `admin_panel/tests/test_partner_capabilities.py` |
| Profile model | `user/models.py:460` (`DeliveryPartnerProfile`) |
| Assignment model | `orders/models.py:741` (`DeliveryAssignment`, #31 milestone stamps) |
| SLA policy | `orders/delivery_policy.py` (`calculate_deadline`) |
| KPI rollup source | `analytics/partner_reads.py`, `analytics/models.py` (`DailyPartnerMetrics`) |
