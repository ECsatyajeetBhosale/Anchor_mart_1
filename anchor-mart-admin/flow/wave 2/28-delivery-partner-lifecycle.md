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
| **Total APIs** | **18** (12 admin · 4 partner self-service · 2 KPI) |
| **Related flows** | 1 (partner auth), 5 (verification assignment), 6 (verification console), 10 (delivery execution), 16/36 (ratings feed KPIs) |
| **Documentation Version** | 1.1 — 2026-07-21 (findings F-01…F-05 resolved post-audit; see validation report) |
| **Documentation Status** | ✅ 18 of 18 routes documented, verified against the running route table |

> **Behaviour changed 2026-07-21 — all five validation findings resolved.** The one that affects
> what this document describes: **an order awaiting payment (`payment_pending`) is no longer
> assignable** — a delivery partner can only be assigned once the order is paid. The picker, the
> assign write, and the unassigned queue now share one `required_capability` definition. The
> others were a PUT method, malformed-id handling, and filter validation (mechanical).

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
3. **Capability by phase** — `required_capability(order.status)` is the **single "is it
   assignable?" definition**, shared by the picker, this write, and the unassigned queue: the
   pre-payment intent funnel needs a **verifier**, the paid delivery funnel needs a **deliverer**,
   and an order **awaiting payment (`payment_pending`) is assignable to neither** (verification is
   done, delivery waits for payment). Enforced **in the serializer**, not just filtered in the
   list, so a partner id posted directly can't bypass it.
4. **Reassignment keeps history** — an order already assigned to a *different* partner needs
   `confirm=true` (else **409 `requires_confirmation`**); on confirm, the prior active assignment
   is closed `status=reassigned` and a fresh active one is created. Same partner → no-op 200.
5. **Transition + notify** — the order advances (`partner_verifying` for verify, `partner_assigned`
   for delivery) through the guarded `transition_order`, the action is audited, and the partner
   is notified via the dispatcher (preference-gated + FCM-pushed).

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

Deleting a partner is **blocked (409) while they have an in-progress delivery** — reassign or
finish it first. On delete, the profile is soft-deleted **and** the account is blocked
(`is_active=False`) so they can no longer sign in.

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
  └─ DELETE /superadmin/partner/delete/       ?user_id= — 409 if an in-progress delivery

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

---

## API 6 · Delete a partner

`DELETE /api/superadmin/partner/delete/?user_id=` · `AdminDeletePartner`. **409** if the partner
has an in-progress delivery. Otherwise soft-deletes the profile **and** blocks the account.

---

## APIs 7–10 · Partner self-service

| API | Endpoint | View | Notes |
|---|---|---|---|
| 7 | `GET/PATCH /api/partner/profile/` | `PartnerProfile` | View / partial-edit own profile |
| 8 | `PATCH /api/partner/availability/` | `PartnerAvailability` | `{ "is_available": bool }` → toggles; the change is **audited** (`changed_by: partner`) so "nobody was available" is answerable |
| 9 | `GET /api/partner/port/` | `GetPartnerPort` | `{ "port": {…} | null }` |
| 10 | `POST /api/partner/request-account-deletion/` | `PartnerRequestAccountDeletion` | Admin reviews; **400** if a request is already open (no duplicates) |

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
| Serializers + capability rules | `admin_panel/serializers/partner_serializers.py` (`required_capability`, `NON_ASSIGNABLE_STATUSES`, `AdminAssignOrderSerializer`) |
| Profile model | `user/models.py:460` (`DeliveryPartnerProfile`) |
| Assignment model | `orders/models.py:741` (`DeliveryAssignment`, #31 milestone stamps) |
| SLA policy | `orders/delivery_policy.py` (`calculate_deadline`) |
| KPI rollup source | `analytics/partner_reads.py`, `analytics/models.py` (`DailyPartnerMetrics`) |
