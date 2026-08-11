# Flow 05 — Standard & Marine Emergency Order Intent

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`05-order-intent-validation.md`](./05-order-intent-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

---

# Executive Summary

| | |
|---|---|
| **Flow Name** | Standard & Marine Emergency Order Intent |
| **Business Objective** | Turn a cart into a sourcing request that AnchorMart fulfils manually before any money is quoted |
| **Flow Type** | Core |
| **Primary Actors** | Customer (sailor) → Admin (→ Delivery Partner) |
| **Platforms** | `SAILOR` (`/api/orders/`) · `ADMIN` (`/api/superadmin/`) · `SYS` |
| **Django Apps** | `orders` · `admin_panel` · `catalog` |
| **Models** | `Order`, `OrderItem`, `OrderStatusHistory`, `Cart`, `ShipmentAddress`, `AuditLog`, `Notification` |
| **Services** | `build_intent_order`, `create_order`, `location_snapshot`, `transition_order`, `notify_all_admins` |
| **State Machines** | **`Order.Status`** — 19 states, guarded by `can_transition` / `transition_order` (`orders/lifecycle.py`) |
| **External Integrations** | FCM (push, best-effort) |
| **Total APIs** | **6** (2 sailor create · 1 sailor list · 2 admin list/stats · 1 admin reject) |
| **Previous Flow** | Flow 4 — Cart Management |
| **Next Flow** | Flow 6 (Stock Verification) via partner assignment · Flow 7 (Billing) |
| **Documentation Version** | 1.0 — 2026-07-20 |
| **Documentation Status** | ✅ 6 of 6 routes documented, verified against the running route table. ⚠️ **The funnel described in `BUSINESS_FLOWS.md` §5 includes a step that cannot happen — see F-01** |

---

# Phase 1 — Understand the Flow

## Business purpose

A sailor confirms their cart. No price is quoted. AnchorMart creates an **Order at
`intent_received` with all totals zero**, notifies every admin, and an admin then works
it manually — claiming it, having a partner verify stock, and only then billing.

Marine emergency is **not a separate flow**. It differs in exactly three ways: the
source cart, the `is_emergency` flag, and a 24 h SLA. Same endpoint shape, same builder,
same funnel.

## Entry / Exit

| | |
|---|---|
| **Entry** | `POST /api/orders/confirm-intent/` (regular cart) or `POST /api/orders/marine/create/` (marine cart) |
| **Success** | Order reaches `partner_verifying` — driven by partner assignment (Flow 28) |
| **Terminal failure** | `intent_rejected` via the admin reject endpoint |

## The status funnel — documented vs actual

`BUSINESS_FLOWS.md` §5 describes: *"an admin claims the order → the admin works it
through `sourcing` → assigns a `can_verify` partner (→ `partner_verifying`)"*.

**The `sourcing` step does not happen.** No production code path transitions an order
into `sourcing`; the status is written only by seed/management commands. The real funnel
is:

```
intent_received ──────────────────────────────▶ partner_verifying
                  (side effect of partner assignment)
        │
        └──────────▶ intent_rejected   (terminal)
```

The `intent_received → partner_verifying` edge is legal (`orders/lifecycle.py:25`), so
nothing errors — `sourcing` is simply skipped. The same is true of `pending_intent`.
See validation finding **F-01**.

## `Order.Status` — the 19 states

Declared at `orders/models.py:69-91`. The intent funnel occupies the first seven:

| Status | Reachable in production? |
|---|---|
| `intent_received` | ✅ every order starts here |
| `pending_intent` | ❌ **never written** |
| `sourcing` | ❌ **never written** |
| `partner_verifying` | ✅ via partner assignment |
| `verification_submitted` | ✅ Flow 6 |
| `pending_customer_response` | ✅ Flow 6 |
| `payment_pending` | ✅ Flow 7 |
| `intent_rejected` | ✅ **terminal** |

Three states are terminal — `intent_rejected`, `delivered`, `refunded`
(`orders/lifecycle.py:90`). Note `cancelled` is **not** terminal (it can go to
`refunded`), and `partially_delivered` is not either.

## The transition guard

**`transition_order` (`orders/lifecycle.py:108-153`) is the only production writer of
`Order.status`.** Verified across the whole backend — there are zero
`Order.objects.update(status=…)` calls and zero direct assignments outside it.

Every transition:
1. Opens `transaction.atomic()` and takes `select_for_update()` on the Order row —
   **before** reading the status, so the guard check and the write are serialised.
2. Raises `InvalidOrderTransition` if the edge is not in `VALID_TRANSITIONS`. The
   project exception handler maps it globally to **409** with
   `{"detail": "Cannot change order status from 'X' to 'Y'."}` — no view needs a
   try/except.
3. Writes an `OrderStatusHistory` row **and** an `AuditLog` `STATUS_CHANGE` entry in the
   same transaction, so status and history can never diverge.
4. Closes any open delivery assignment.

There is **no self-edge anywhere** in the map, so re-issuing the current status raises
rather than no-oping. This is what makes concurrent transitions safe: of two racing
requests, exactly one wins and the other gets a 409.

> **A history row does not always mean the status changed.** Three admin sites write an
> `OrderStatusHistory` row with `status=order.status` as a timeline breadcrumb — delta
> raised, delta withdrawn, and location applied. Read the `note`, not just the presence
> of a row.

## Orders that skip this flow entirely

| Path | Created at | Why |
|---|---|---|
| Express (Flow 9) | `payment_pending` | Direct-pay, no sourcing |
| Special request (Flow 13) | `payment_pending` | Already quoted |

Both bypass the intent funnel — they are never `intent_received`.

## Signals · Celery · Notifications

No signals. Notifications on intent creation are **synchronous in-app rows** plus a
best-effort Celery FCM push:

| Recipient | Type | Title |
|---|---|---|
| The sailor | `ORDER_UPDATE` | *"Request placed"* |
| Every active admin | `INTENT_RECEIVED` | *"New intent to source"* |

Both carry `target=order`, so the inbox can derive `action_required` from the live order.
Both run **after** the creation transaction commits.

---

# Phase 2 — Discover the Complete Flow

```
SAILOR (cart from Flow 4)
  │
  ├─ POST /orders/confirm-intent/       (regular)   ┐
  └─ POST /orders/marine/create/        (marine)    ├─ same builder,
                                                     │  is_emergency differs
     build_intent_order:
       ├─ transaction.atomic + select_for_update(Cart)   ← locks ONE row: the cart
       ├─ cart empty → 400 "Your cart is empty."
       ├─ collect ALL wrong-catalog-type SKUs  → 400 (returns first)
       ├─ collect ALL unavailable product NAMES → 400
       │     ↑ cart untouched on either; no writes precede these
       ├─ create Order @ intent_received, ALL TOTALS ZERO
       ├─ create OrderStatusHistory "Order intent placed"
       ├─ bulk_create OrderItem (unit_price snapshotted from variant.price)
       ├─ upsert_saved_address
       └─ cart.delete()          ← hard delete, cascades to CartItem
     ── transaction ends ──
       ├─ send_notification(sailor, "Request placed")
       └─ notify_all_admins("New intent to source")
     ▼ 201 {message, order_id, Submitted}
  │
  ├─ GET /orders/intents/            ← sailor's own funnel (7 statuses)
  │
ADMIN
  ├─ GET /superadmin/orders/intents/stats/   ← 12 counters, no filters
  ├─ GET /superadmin/orders/intents/         ← the queue
  ├─ POST /superadmin/orders/order/<id>/claim/     ← Flow 27
  │
  ├─ POST /superadmin/partner/assign-order/  ← Flow 28
  │     └─ side effect: intent_received → partner_verifying ──▶ Flow 6
  │
  └─ POST /superadmin/orders/order/<id>/reject-intent/
        ├─ manage_gate (409 unclaimed / 403 wrong owner)
        ├─ stage check → 400 "use cancel instead"
        ├─ reason required → 400
        └─ transition → intent_rejected (TERMINAL) + notify sailor
```

## API sequence table

| Step | Platform | API | Purpose |
|---|---|---|---|
| 1 | SAILOR | `POST /api/orders/confirm-intent/` | Regular cart → intent |
| 2 | SAILOR | `POST /api/orders/marine/create/` | Marine cart → intent |
| 3 | SAILOR | `GET /api/orders/intents/` | My open intents |
| 4 | ADMIN | `GET /api/superadmin/orders/intents/stats/` | Funnel counters |
| 5 | ADMIN | `GET /api/superadmin/orders/intents/` | The intent queue |
| 6 | ADMIN | `POST /api/superadmin/orders/order/<id>/reject-intent/` | Terminal rejection |

**Referenced, owned elsewhere:** claim/reassign (Flow 27), partner assignment (Flow 28 —
the exit), `GET /api/partner/intents/` (**Flow 6** — it is the partner's verification
work queue, not an intent surface; see BFO-1).

## What "an intent" means — three different answers

| Surface | Statuses included |
|---|---|
| **Sailor** (`/orders/intents/`) | 7 — the full funnel through `payment_pending` |
| **Admin** (`/superadmin/orders/intents/`) | Same 7, **+ `intent_rejected` as a drill-in filter** |
| **Partner** (`/partner/intents/`) | 2 — `intent_received`, `partner_verifying` |

The sailor and admin constants are **defined twice, independently**
(`orders/customer_views.py:60` and `admin_panel/views/orders_views.py:62`) with no
shared import. They currently agree; nothing enforces it. See **F-10**.

---

# Phase 3 — API Documentation

## Flow-wide conventions

| Header | Notes |
|---|---|
| `Authorization: Token <key>` | All 6 |
| `server-secret-key` | `/api/orders/…` only — `/api/superadmin/…` is exempt |

---

## API 1 & 2 · Create an order intent

| Field | Value |
|---|---|
| **Endpoints** | `/api/orders/confirm-intent/` (regular) · `/api/orders/marine/create/` (marine) |
| **Method** | `POST` |
| **Authentication / Permissions** | Token / `IsAuthenticated` — **no role check** (see F-12) |

Both call the same builder. The **only** behavioural difference is `is_emergency`,
derived from the endpoint's expected catalog type, not from inspecting the items.

**Request Body**
```json
{
  "shipping_address": {
    "full_name": "Ravi Kumar", "phone": "9876543210",
    "vessel_name": "MV Ocean Explorer", "imo_number": "9074729",
    "deck": "3", "cabin_number": "312", "section": "Forward",
    "port_name": "Port of Singapore", "anchorage_name": "Eastern Anchorage",
    "delivery_instructions": "Call on arrival"
  },
  "anchorage_id": "b23a…",
  "ship_arrival_date": "2026-08-15",
  "expected_departure": "2026-08-18",
  "is_fastest_delivery": false,
  "platform": "app",
  "note": "Handle with care",
  "ship_agent_id": "7a3e…"
}
```

| Field | Required | Rules |
|---|---|---|
| `shipping_address` | ✅ | Object. `full_name`, `phone`, `vessel_name` required inside |
| `port_id` / `anchorage_id` | ✅ *(one of)* | UUID. An anchorage carries its own port. Mismatch → 400 **only when both are sent** |
| `ship_arrival_date` | ✅ | ISO-8601 or `YYYY-MM-DD`. **Not in the past** (date granularity, local time) |
| `expected_departure` | ✅ | Must be **strictly after** `ship_arrival_date`. **No absolute past check** — see F-11 |
| `platform` | ✅ | `"web"` or `"app"` |
| `is_fastest_delivery` | ✖ | Default `false` |
| `note` | ✖ | Max 2000 chars → `Order.notes` |
| `ship_agent_id` | ✖ | UUID, nullable. Snapshotted onto the order |

> **Nested address errors are not namespaced.** A missing `full_name` returns
> `{"full_name": ["This field is required."]}` at the **response root**, not under
> `shipping_address`. See F-16.

**Success — 201**
```json
{
  "message": "Order Intent created successfully",
  "order_id": "3c9a1e7f-2b84-4d05-9c61-8a7f3e2d1b40",
  "Submitted": "20 Jul 2026, 14:32"
}
```
The marine endpoint returns `"Marine emergency order intent created successfully"`.

> Note the capitalised `"Submitted"` key, and that **`order_number` is not returned** —
> the human-facing reference used in the notification copy and across the admin and
> partner apps. See F-15.

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"detail": "Your cart is empty."}` | No cart, or cart consumed by a concurrent submit |
| 400 | `{"detail": "These items don't belong in this cart: SKU-1, SKU-2. Remove them and try again."}` | Wrong catalog type — **all** offenders listed, by SKU |
| 400 | `{"detail": "No longer available: Rope, Wrench. Please remove these items and try again."}` | Unavailable — **all** offenders listed, by **product name** |
| 400 | `{"expected_departure": "Expected departure must be after the ship's arrival."}` | Departure ≤ arrival (a **string**, not a list) |
| 400 | `{"ship_arrival_date": ["Ship arrival date can't be in the past."]}` | Past arrival |
| 400 | `{"anchorage_id": ["This anchorage doesn't belong to the given port."]}` | Mismatch |
| 400 | `{"port_id": ["Provide port_id or anchorage_id."]}` | Neither sent |
| 500 | — | Mid-build failure (rolls back cleanly), **or** a notification failure **after** commit — see F-02 |

> **The two availability guards are checked in sequence, not together.** A cart with both
> a wrong-type item and unavailable items reports **only the wrong-type list**; the sailor
> fixes it, resubmits, and then learns about the rest. See **F-05**.

**Atomicity** — everything from the cart lock to the cart delete runs in one
`transaction.atomic()` with `select_for_update()` on the **Cart row**. A mid-build
failure rolls back completely and the cart survives (test-covered).

**Double-submit** is handled **structurally, by design** — no idempotency key. The
second request blocks on the cart lock, then finds the cart consumed and returns
400 *"Your cart is empty."* The reasoning is documented in `orders/idempotency.py:3-7`:
keys are reserved for genuinely ambiguous duplicates like partial refunds.

**Database Changes**
1. `Order` INSERT — status `intent_received`, **`subtotal`, `total_amount` and every
   other money field `0`**, `assigned_admin` NULL, `placed_at` now
2. `OrderStatusHistory` INSERT — *"Order intent placed"*
3. `OrderItem` bulk INSERT — `unit_price` snapshotted from `variant.price`, plus
   `product_name` and `sku`
4. `ShipmentAddress` upsert (the delivery address book, Flow 2)
5. `Cart` **hard** DELETE, cascading to `CartItem`

**State Changes** — Order created at `intent_received`.
**Notifications** — sailor + all admins, after commit.
**Next API** — API 3, or the admin queue.

---

## API 3 · My intents (sailor)

| Field | Value |
|---|---|
| **Endpoint** | `/api/orders/intents/` · `GET` |
| **Authentication / Permissions** | Token / `IsAuthenticated` |
| **Query Parameters** | `status`, `type`, `date_from`, `date_to`, `search`, `page`, `page_size` |

**All query params are serializer-validated** before touching the ORM — this is the
cleanest of the flow's list endpoints. `type` accepts `express`, `emergency`, `special`,
`fastest`; `search` is `icontains` on `order_number` only, capped at 100 chars;
`date_from > date_to` → 400.

**Scoping** — `user=request.user` is baked into the base queryset before any filter, and
there is no id-bearing parameter. A sailor cannot see another's intents.

**Success — 200** — DRF paginated envelope (10/page, max 50). Each row:
`id`, `order_number`, `status`, `status_display`, `has_suggestions`, `item_count`,
`items[]`, `location_change`, `parent_order_number`, `ship_arrival_date`,
`expected_departure`, `is_fastest_delivery`, `is_express`, `is_emergency`,
`total_amount`, `intent_received_at`.

> **A rejected intent does not appear here.** `intent_rejected` is outside the sailor's
> funnel set, so it falls into `GET /orders/history/` instead. Passing
> `?status=intent_rejected` is accepted and returns an **empty page**. See F-14.

---

## API 4 · Intent funnel stats (admin)

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/orders/intents/stats/` · `GET` |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsAdminUser` |
| **Query Parameters** | **None** — the view reads nothing from the request |

**Success — 200** — a flat dict of 12 integers, no envelope, no pagination:

```json
{
  "total_intents": 42, "new_intents": 12, "pending_intent": 0, "in_sourcing": 0,
  "in_verification": 9, "substitution_needed": 4, "awaiting_customer": 3,
  "ready_to_bill": 1, "awaiting_payment": 8, "confirmed_today": 5, "rejected": 2
}
```

Computed in a single aggregate query with conditional filters.

> **Three cards need care.** `in_sourcing` and `pending_intent` are **always 0** in
> production (F-01). `confirmed_today` has **no status predicate** — it counts every
> order paid today including delivered and refunded ones, and no list filter can
> reproduce it (F-07). And because this view takes no filters, the cards show **global
> totals while the list below is filtered** (F-08).

> `rejected` is deliberately **excluded** from `total_intents`, so the cards do not sum
> to the total. That is intended, and documented in the source.

---

## API 5 · The intent queue (admin)

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/orders/intents/` · `GET` |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsAdminUser` |
| **Query Parameters** | `status`, `is_express`, `is_emergency`, `search`, `page`, `page_size` |

`status` accepts a pre-confirmation status, `intent_rejected`, or one of two derived
views — `awaiting_customer` / `ready_to_bill`. Anything else, including any
post-confirmation status, returns **400** with a message listing the valid options.
Omitted → the seven open funnel statuses.

> `is_express` / `is_emergency` are coerced permissively: any value that is not
> `true`/`1`/`yes` means **false**, so `?is_express=nonsense` silently filters to
> non-express rather than erroring. See F-19.

**Success — 200** — paginated. Each row adds admin context to the sailor's shape:
`sailor_name`, `sailor_email`, `substitution_needed`, `shipping_address`, `port`,
`anchorage`, **`assigned_admin`** (`null` = unclaimed), `created_at`, and per-item
`available_qty`, `is_available`, `shortfall`, `needs_suggestion`, `reason`.

> **There is no way to filter by owner.** `assigned_admin` is returned per row but no
> `unclaimed`/`mine` parameter exists, so multi-admin queue triage must be done
> client-side and breaks across pagination. See F-09.

> `substitution_needed` on a **row** means "at `verification_submitted` with a short
> line". The **stats** field of the same name counts `pending_customer_response`. Two
> disjoint stages, one name. See F-13.

---

## API 6 · Reject an intent (admin, terminal)

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/orders/order/<uuid:order_id>/reject-intent/` · `POST` |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsAdminUser`, **plus `manage_gate`** |

**Request Body** — `{ "reason": "Nothing sourceable at this port" }`. Required.

**Gate order matters** — ownership, then lifecycle stage, then the reason check:

| Status | Body | Condition |
|---|---|---|
| 409 | `{"detail": "Claim this order (Manage Order) before making changes."}` | Unclaimed (Flow 27) |
| 403 | `{"detail": "This order is managed by another admin."}` | Wrong owner |
| 404 | — | Unknown or soft-deleted order |
| 400 | `{"detail": "An intent can only be rejected before substitutions are released. This order is '<Display>' — use cancel instead."}` | Past the rejectable stage |
| 400 | `{"reason": ["This field is required — tell the sailor why their order can't be fulfilled."]}` | Missing or blank |

**Success — 200** — `{"message": "Intent rejected.", "order_id": "…", "status": "intent_rejected"}`

**Database Changes** — one `transition_order` call setting `intent_rejected` plus
`rejection_reason` (truncated to 500; the history note truncates to 255), with the
`OrderStatusHistory` row, `AuditLog` entry and assignment closure that always accompany a
transition.

**Notifications** — the sailor gets an `ORDER_UPDATE`: *"We couldn't fulfil your order"*,
quoting the reason, with `target=order`.

> **Truly terminal.** `intent_rejected` has no outgoing edges, so no later transition can
> move the order, and it is excluded from partner assignment. Rejection is deliberately
> **not** reachable from `pending_customer_response` — once suggestions are released, the
> correct terminal action is admin cancel (Flow 12).

---

## What happens next

| Condition | Continue to |
|---|---|
| Admin claims the order | **Flow 27** — Admin Order Ownership |
| Partner assigned → `partner_verifying` | **Flow 6** — Stock Verification & Substitution |
| All items available → billing | **Flow 7** — Order Billing & Payment |
| Nothing sourceable | Terminal — `intent_rejected` |

---

## Source reference

| Concern | File |
|---|---|
| Regular intent view | [`orders/views.py`](../../backend/orders/views.py) (`ConfirmIntentView`) |
| Marine intent view | [`orders/marine_views.py`](../../backend/orders/marine_views.py) |
| Shared builder | [`orders/intent_service.py`](../../backend/orders/intent_service.py) |
| Order creation + location snapshot | [`orders/order_service.py`](../../backend/orders/order_service.py) |
| Input contract | [`orders/serializers.py`](../../backend/orders/serializers.py) (`OrderCreateRequestSerializer`) |
| **Status machine** | [`orders/lifecycle.py`](../../backend/orders/lifecycle.py) |
| Sailor intent list | [`orders/customer_views.py`](../../backend/orders/customer_views.py) |
| Admin queue, stats, reject | [`admin_panel/views/orders_views.py`](../../backend/admin_panel/views/orders_views.py) |
| Admin notification fan-out | [`admin_panel/global_notifications.py`](../../backend/admin_panel/global_notifications.py) |
| `Order`, `OrderItem`, `OrderStatusHistory` | [`orders/models.py`](../../backend/orders/models.py) |
