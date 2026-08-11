# Flow 27 — Admin Order Ownership & Governance

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`27-admin-order-ownership-validation.md`](./27-admin-order-ownership-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.** They collide
> with this document's flow numbering throughout the codebase. Quotes below preserve
> them verbatim; do not cross-map them.

---

# Executive Summary

| | |
|---|---|
| **Flow Name** | Admin Order Ownership & Governance |
| **Business Objective** | Make exactly one admin accountable for each order, while keeping reads open to the whole admin tier |
| **Flow Type** | Administrative · **cross-cutting** — it governs writes owned by other flows |
| **Primary Actors** | Admin (sub-admin) · Super Admin |
| **Platforms** | `ADMIN` (`/api/superadmin/`) |
| **Django Apps** | `admin_panel` (`order_ownership.py`) · `orders` (the `Order` model + audit) |
| **Models** | `Order` (`assigned_admin`), `User`, `AuditLog`, `AuditChain` |
| **Services** | `can_manage`, `manage_gate`, `claim_order`, `reassign_order`, `release_order`, `admin_brief`, `is_super_admin` |
| **State Machines** | **None.** Ownership is a nullable FK, not a status field. There is no `VALID_TRANSITIONS` table |
| **External Integrations** | None |
| **Total APIs** | **4 dedicated** (claim · reassign · release · assignable-admins picker) — plus **16 endpoints in other flows** that enforce the gate |
| **Previous Flow** | Flow 01 (admin signs in) |
| **Next Flow** | Whichever order write the admin came to perform — Flows 5, 6, 7, 10, 11, 12, 20 |
| **Documentation Version** | 1.1 — 2026-08-07 (adds release + assignable-admins, shipped 2026-08-06; records the `order.own` feature gate) |
| **Documentation Status** | ✅ 4 of 4 dedicated routes documented, verified against the running route table. Three validation findings are now **closed**: **F-01** (`review-report` ungated), **F-03** (no way to obtain `admin_id`) and **F-11** (no test asserted gate *presence*) |

---

# Phase 1 — Understand the Flow

## Business purpose

A new order is **unassigned**. The first sub-admin to press "Manage Order" **claims**
it and becomes its single accountable owner. From then on only that owner — or any
super admin — may mutate the order. The owner or a super admin may hand it to another
admin.

The design goal is accountability, not confidentiality: **ownership is enforced on
writes only.** Every admin can still see every order. The codebase states the reason
directly (`order_ownership.py:9-10`):

> *"Ownership is enforced on **writes only**; every admin can still see every order
> (single port, flat tiers — no port-scoping)."*

This is a **cross-cutting flow**. It owns two endpoints of its own, but its real
surface is the one-line guard that 16 order-mutating endpoints across six other flows
are expected to call.

## Entry point

| Trigger | Endpoint |
|---|---|
| Admin opens an unclaimed order and taps "Manage Order" | `POST /api/superadmin/orders/order/<order_id>/claim/` |

## Exit point

| Outcome | Condition |
|---|---|
| **Success** | `Order.assigned_admin` is set; the admin may now perform any gated write |
| **Handover** | Reassigned to another active admin-tier account |
| **Released** | `assigned_admin` becomes `NULL` — either explicitly via `POST /orders/order/<order_id>/release/` (API 3, added 2026-08-06), or as a side effect of the owning admin's account being deleted (`SET_NULL`) |

## Actors

| Actor | Participation |
|---|---|
| **Admin** (`role = admin`, the sub-admin tier) | Claims orders; may write only to orders they own; may reassign only orders they own |
| **Super Admin** (`role = super_admin`) | **Bypasses the gate entirely** on every order, claimed or not; may reassign any order |

Both tiers pass `IsAdminUser` identically (`admin_panel/admin_auth_utils.py:3-5`) — the
tier distinction is made **inside** the ownership functions, not by the permission
class.

## Models

| Model | File · Line | Role |
|---|---|---|
| `Order.assigned_admin` | `orders/models.py:190-194` | `FK(User, on_delete=SET_NULL, null=True, blank=True, related_name="managed_orders", db_index=True)`. **`NULL` = unassigned** |
| `User` | `user/models.py:57` | The owner; must be `is_active` and admin-tier to receive a reassignment |
| `AuditLog` / `AuditChain` | `orders/models.py` | `ORDER_CLAIMED` (`:1129`), `ORDER_REASSIGNED` (`:1130`), `ORDER_RELEASED` (`:1135`) |

> `SET_NULL` is deliberate — the comment at `orders/models.py:189` reads *"SET_NULL so
> deleting an admin account frees the order."* Deleting an admin silently returns all
> their orders to the unassigned pool.

## Services — the whole governance surface is seven functions

| Callable | File · Line | Behaviour |
|---|---|---|
| `is_super_admin(user)` | `order_ownership.py:22-23` | `user.role == SUPER_ADMIN` |
| `can_manage(user, order)` | `:26-28` | `is_super_admin(user) or order.assigned_admin_id == user.id` |
| `manage_gate(user, order)` | `:39-63` | Returns an error `Response` if the user may **not** manage the order, else `None` |
| `claim_order(order_id, admin)` | `:66-102` | Atomic first-come claim. Returns `(order, error_response)` |
| `reassign_order(order_id, target_admin_id, actor)` | `:105-153` | Hand-over. Returns `(order, error_response)` |
| `release_order(order_id, actor)` | `:156-207` | Return the order to the unassigned pool. Returns `(order, error_response)` |
| `admin_brief(admin)` | `:210-220` | Compact `{id, name, email}` owner descriptor, shared with the assignable-admins picker |

**The gate contract** — every order-mutating admin view is expected to call it
immediately after resolving the order (`order_ownership.py:42-46`):

```python
gate = manage_gate(request.user, order)
if gate:
    return gate
```

| Caller | Result |
|---|---|
| Super admin | ✅ Always allowed |
| The assigned owner | ✅ Allowed |
| Order unassigned (`assigned_admin_id is None`) | **409** — `{"detail": "Claim this order (Manage Order) before making changes."}` |
| Owned by another sub-admin | **403** — `{"detail": "This order is managed by another admin."}` |

> **409 before 403.** An unclaimed order is a *conflict* (claim it first), not a
> permission failure. Only a genuinely wrong owner produces 403. Clients must
> distinguish these — 409 is recoverable by calling claim; 403 is not.

## Concurrency design

All three mutating functions wrap their work in `transaction.atomic()` and take a row lock:

```python
Order.objects.select_for_update(of=("self",))
    .filter(is_deleted=False, id=order_id)
    .select_related("assigned_admin")
    .first()
```

`of=("self",)` is load-bearing and explained in-code (`order_ownership.py:75-76`,
`:113-114`, `:158-159`): `select_related("assigned_admin")` is an **outer join on a nullable FK**,
which `FOR UPDATE` cannot lock — so the lock is narrowed to the `Order` row alone.
Two admins claiming the same order concurrently are serialised; exactly one wins.

## Signals · Celery tasks · Notifications

**None, on all three counts.** No signal, no background task, and **no notification is
sent to anyone when an order is claimed, reassigned, or released** — including to the
admin who just lost ownership.

## Audit

All three mutations write an audit entry via `record_audit` (Flow 34):

| Action | `orders/models.py` | Metadata |
|---|---|---|
| `ORDER_CLAIMED` | `:1129` | `admin_id`, `admin_email` |
| `ORDER_REASSIGNED` | `:1130` | `to_admin_id`, `to_admin_email`, `from_admin_id`, `from_admin_email` (both `None` when previously unassigned) |
| `ORDER_RELEASED` | `:1135` | `from_admin_id`, `from_admin_email`, `released_by_id`, `released_by_email` — the last two differ from the first two when a super admin releases someone else's order |

Idempotent no-ops — re-claiming an order you already own, reassigning to the current
owner, or releasing an already-unassigned order — return early **before** the audit call,
so they produce no entry. For release this is deliberate: recording a release that
released nothing would put a false custody event in a permanent chain
(`order_ownership.py:188-190`).

---

# Phase 2 — Discover the Complete Flow

## Sequence diagram

```
ADMIN opens an order
  │
  ├─ GET .../orders/…  →  reads are UNRESTRICTED for the whole admin tier
  │                        response carries assigned_admin (null = unclaimed)
  │
  ├─ assigned_admin == null ──▶ [Manage Order button enabled]
  │     │
  │     ▼
  │   POST /orders/order/<id>/claim/
  │     │ transaction.atomic + select_for_update(of="self")
  │     ├─ order not found ────────────▶ 404
  │     ├─ already MINE ───────────────▶ 200 (idempotent, NO audit)
  │     ├─ owned by someone else ──────▶ 409 + {assigned_admin: {...}}
  │     └─ unassigned → assign + AUDIT ▶ 200
  │
  ├─ assigned_admin == me ────▶ [all writes permitted]
  │     │
  │     ▼  any of the 16 gated endpoints
  │   manage_gate(user, order) ──▶ None → proceed
  │
  ├─ assigned_admin == someone else, I am a sub_admin
  │     │
  │     ▼  any gated endpoint
  │   manage_gate ──▶ 403 "This order is managed by another admin."
  │     │
  │     └─ I am a super_admin instead ──▶ gate returns None, proceed
  │
  ├─ HANDOVER
  │   GET /orders/assignable-admins/?search=  ──▶ picker: [{id, name, email}, …]
  │   POST /orders/order/<id>/reassign/  { admin_id }
  │     │ actor must be super_admin OR current owner ──▶ else 403
  │     │ target must be is_active AND admin-tier ────▶ else 404
  │     │ target already owns it ─────────────────────▶ 200 (no-op, NO audit)
  │     └─ reassign + AUDIT ─────────────────────────▶ 200
  │
  └─ RELEASE (undo a mis-clicked claim)
      POST /orders/order/<id>/release/
        │ actor must be super_admin OR current owner ──▶ else 403
        │ already unassigned ─────────────────────────▶ 200 (no-op, NO audit)
        └─ assigned_admin = NULL + AUDIT ────────────▶ 200

assigned_admin also returns to NULL without any call when the owning admin's User
row is deleted (SET_NULL).
```

## The enforced surface — 16 endpoints in other flows

This is the flow's real content. Every row below is an endpoint **owned by another
flow** that enforces this flow's rule.

| # | Endpoint | Write | Owning flow |
|---|---|---|---|
| 1 | `POST /orders/suggest/` | Stage a replacement-variant suggestion | 6 |
| 2 | `POST /orders/suggest-new-product/` | Create product + variant, suggest it | 6 |
| 3 | `POST /orders/release-suggestion/` | Release suggestions, move status | 6 |
| 4 | `POST /orders/order/<id>/cancel/` | Cancel a pre-payment order | 12 |
| 5 | `POST /orders/order/<id>/reject-intent/` | Terminal intent rejection | 5 |
| 6 | `POST /orders/order/<id>/refund/` | Stripe refund → `REFUNDED` | 12 |
| 7 | `POST /orders/order/<id>/raise-delta/` | Create `DeltaPayment`, move location | 11 |
| 8 | `POST /orders/order/<id>/deltas/<delta_id>/withdraw/` | Withdraw an open surcharge | 11 |
| 9 | `POST /orders/order/<id>/location-reports/<rid>/dismiss/` | Dismiss a location report | 11 |
| 10 | `POST /orders/order/<id>/location-reports/<rid>/apply/` | Apply rebill location | 11 |
| 11 | `POST /payments/create-bill/` | Set fees → `PAYMENT_PENDING` | 7 |
| 12 | `PUT/PATCH /payments/update-bill/` | Recompute bill, kill open sessions | 7 |
| 13 | `POST /payments/generate-link/` | Fees + Stripe checkout link | 7 |
| 14 | `POST /ship-agents/order/<id>/set/` | Set/clear ship agent + snapshot | 2 |
| 15 | `POST /partner/assign-order/` | Assign a delivery partner | 10 |
| 16 | `POST /partner/review-report/` | Mark an availability report reviewed | 6 |

In all 16, the gate is the **first statement after the order is resolved**. In the three
two-object cases (#8, #9, #10) it deliberately precedes the secondary fetch, so an
unauthorised caller cannot probe whether a delta or report exists.

> **Two changes since v1.0 (this register was 17 rows).**
> **`POST /partner/review-report/` joined it** — validation finding **F-01** (an order-scoped
> write with no ownership gate) is fixed. **The two gift endpoints left it** —
> `/gifts/orders/<id>/grant/` and `/revoke/` are now deliberately ungated (product decision,
> 2026-07-28): a gift carries no money, never enters the order's financial path, and a ship's
> orders are routinely unassigned, so requiring a claim made *every* per-order grant 409. See
> "Deliberately not gated" below.
>
> **The register is now machine-checked.** `admin_panel/tests/test_order_gate_coverage.py`
> walks the URL resolver, discovers every admin view that writes order-scoped data, and fails
> if one neither calls `manage_gate` nor appears in its `EXEMPT` map with a stated reason — and
> fails again if an exemption goes stale. This closes **F-11**, the root cause behind F-01 and
> F-02: no test asserted the gate's *presence*, only its behaviour where it already was.

## Deliberately not gated

| Endpoint | Why |
|---|---|
| `POST /orders/order/<id>/claim/` | Authorisation *is* the `select_for_update` first-come lock. Gating it would be circular — you cannot require ownership to acquire ownership |
| `POST /orders/order/<id>/reassign/` | Authorisation is inside `reassign_order` (`order_ownership.py:123-127`), which applies the same owner-or-super-admin rule |
| `POST /orders/order/<id>/release/` | The gate would give the **wrong** answer here, not merely an unnecessary one: `manage_gate` 409s an unassigned order ("claim it first"), while releasing an already-unassigned order must succeed as a no-op. Authorisation is inside `release_order` (`order_ownership.py:191-195`), same owner-or-super-admin rule. Recorded in the EXEMPT list of `admin_panel/tests/test_order_gate_coverage.py`, which fails if the view is ever left ungated *and* unclassified |
| `GET /orders/assignable-admins/` | GET; a read-only picker |
| `POST /gifts/orders/<id>/grant/` · `/revoke/` | **Product decision, 2026-07-28** (was gated until then): a gift carries no money and never enters the order's financial path, while a ship's orders are routinely unassigned — so the gate made *every* per-order grant 409. Reasoning in the `admin_panel/views/gift_views.py` module docstring |
| `GET /orders/order/<id>/refund-quote/` | GET; `refunds.refund_quote(...)` is explicitly side-effect-free |
| All admin order **reads** | By design — see the module docstring |

Every row here is also recorded in the `EXEMPT` map of
`admin_panel/tests/test_order_gate_coverage.py` with its reason. That test fails both ways:
an ungated order write that is not exempt, **and** an exemption that no longer applies.

---

# Phase 3 — API Documentation

## Flow-wide conventions

| Header | Notes |
|---|---|
| `Content-Type: application/json` | All four endpoints |
| `Authorization: Token <key>` | All four. Admin tokens **never expire** (Flow 01) |
| `server-secret-key` | **Not required** — `/api/superadmin/` is middleware-exempt |

The three write endpoints (APIs 1–3) are `[IsAuthenticated, IsAdminUser, HasFeature]`
with `required_feature = Feature.ORDER_OWN` ("claim and hand over orders"). API 4, the
picker, is `[IsAuthenticated, IsAdminUser]` only — deliberately open to **both** admin
tiers, since a sub-admin who owns an order needs to name a reassign target. A caller
whose role lacks `order.own` gets **403** `{"detail": "Your role does not permit this
action (claim and hand over orders). Ask a super admin."}` before any of the logic below
runs; see [`MD/ADMIN_PERMISSIONS_FRONTEND.md`](../../ADMIN_PERMISSIONS_FRONTEND.md) for
the role→feature matrix.

All four return errors under `{"detail": …}` — except the two `admin_id` field errors on
API 2, which use the DRF field shape `{"admin_id": ["…"]}`.

---

## API 1 · Claim an order ("Manage Order")

| Field | Value |
|---|---|
| **Purpose** | Become the single accountable owner of an unassigned order |
| **Business Reason** | The precondition for every other admin write on that order |
| **Endpoint** | `/api/superadmin/orders/order/<uuid:order_id>/claim/` |
| **Method** | `POST` |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsAdminUser`, `HasFeature` → `Feature.ORDER_OWN` (`orders_views.py:1188-1189`) |
| **Path Parameters** | `order_id` — UUID |
| **Query Parameters / Request Body** | **None.** The body is ignored entirely |

**Success — 200**
```json
{
  "message": "You are now managing this order.",
  "order_id": "3c9a1e7f-2b84-4d05-9c61-8a7f3e2d1b40",
  "assigned_admin": {
    "id": "0d3f2c1a-9b8e-4d7c-a6f5-1e2b3c4d5e6f",
    "name": "Ravi Kumar",
    "email": "ops@anchormart.example"
  }
}
```
`name` falls back to the email when no first/last name is set.

**Idempotent.** Claiming an order you already own returns the same 200 and writes
**no** audit entry (`order_ownership.py:77-78`).

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 404 | `{"detail": "Order not found."}` | Unknown or soft-deleted order |
| **409** | `{"detail": "This order is already being handled by another admin.", "assigned_admin": {"id": …, "name": …, "email": …}}` | Another admin holds it — **the current owner is returned** so the UI can show who to ask |
| 401 / 403 | DRF default | Unauthenticated / not admin-tier |

> A **super admin does not bypass this endpoint.** `claim_order` has no
> `is_super_admin` branch — a super admin claiming an order owned by someone else gets
> the same 409. They do not need to claim it: the gate lets them write regardless.
> Use **reassign** (API 2) to take ownership.

**Validation Rules** (`admin_panel/order_ownership.py` · `claim_order` · 58-94)
- `transaction.atomic()` + `select_for_update(of=("self",))` — concurrent claims are
  serialised; exactly one wins.
- Soft-deleted orders are excluded (`is_deleted=False`).

**Database Changes** — `Order.assigned_admin` UPDATE (`update_fields=["assigned_admin",
"updated_at"]`); one `AuditLog` `ORDER_CLAIMED` entry.
**Notifications / Background Tasks / State Changes** — None. The order's `status` is
untouched.
**Next API** — any of the 16 gated endpoints.
**Related APIs** — API 2.

---

## API 2 · Reassign an order to another admin

| Field | Value |
|---|---|
| **Purpose** | Hand accountability to a different admin |
| **Business Reason** | Shift handover, escalation, or covering an absent owner |
| **Endpoint** | `/api/superadmin/orders/order/<uuid:order_id>/reassign/` |
| **Method** | `POST` |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsAdminUser`, `HasFeature` → `Feature.ORDER_OWN` (`orders_views.py:1208-1209`) |
| **Path Parameters** | `order_id` — UUID |

**Request Body**
```json
{ "admin_id": "7b1e4c92-3a6d-4f18-b205-9c8e1a2f6d34" }
```

| Field | Required | Rules |
|---|---|---|
| `admin_id` | ✅ | Must be a valid UUID **and** resolve to a `is_active=True` account with role `admin` or `super_admin` |

**Who may call it** — a **super admin** (any order) **or the order's current owner**.
Note this is a *different* rule from `manage_gate`: an unassigned order cannot be
reassigned by a sub-admin at all, because there is no current owner to match.

**Success — 200**
```json
{
  "message": "Order reassigned.",
  "order_id": "3c9a1e7f-2b84-4d05-9c61-8a7f3e2d1b40",
  "assigned_admin": { "id": "7b1e…", "name": "Priya Nair", "email": "priya@anchormart.example" }
}
```

Reassigning to the account that already owns it is a **no-op** — 200, no write, no
audit entry (`order_ownership.py:130-131`).

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"admin_id": ["This field is required."]}` | Missing or empty |
| 400 | `{"admin_id": ["Must be a valid UUID."]}` | Malformed |
| 404 | `{"detail": "Order not found."}` | Unknown or soft-deleted order |
| 403 | `{"detail": "Only the current owner or a super admin can reassign this order."}` | Caller is neither |
| **404** | `{"admin_id": ["No active admin with this id."]}` | Target missing, inactive, or not admin-tier — note this is a **404 with a field-shaped body** |

> **How does the client obtain `admin_id`?** From **API 4**, `GET
> /orders/assignable-admins/`. Until 2026-08-06 no endpoint listed admin accounts at all,
> which is what validation finding **F-03** recorded; the picker closes it.

**Validation Rules** (`admin_panel/order_ownership.py` · `reassign_order` · 105-153)
— same atomic + row-lock pattern as API 1; actor authorisation, then target
resolution, then the no-op check.

**Database Changes** — `Order.assigned_admin` UPDATE; one `AuditLog`
`ORDER_REASSIGNED` entry carrying both the previous and new owner.
**Notifications** — **None.** Neither the losing nor the gaining admin is told.
**Next API** — the new owner may now use any gated endpoint.
**Related APIs** — API 1, API 3 (release instead of handing over), API 4 (the picker).

---

## API 3 · Release an order back to the unassigned pool

*Added 2026-08-06.*

| Field | Value |
|---|---|
| **Purpose** | Undo a claim — return the order to the pool so any admin can take it |
| **Business Reason** | Without it, the only way out of a claim was for **someone else** to reassign the order. Since `admin_user_service.assert_no_open_orders` refuses to deactivate or delete an admin who still owns open orders, one mis-clicked "Manage Order" could pin the claimer's own account until a super admin intervened. A one-click mistake needs a one-click undo |
| **Endpoint** | `/api/superadmin/orders/order/<uuid:order_id>/release/` |
| **Method** | `POST` |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsAdminUser`, `HasFeature` → `Feature.ORDER_OWN` (`orders_views.py:1249-1250`) |
| **Path Parameters** | `order_id` — UUID |
| **Query Parameters / Request Body** | **None.** The body is ignored entirely |

**Who may call it** — a **super admin** (any order) **or the order's current owner** —
the same rule as API 2, because releasing is a handover to nobody rather than a
different kind of authority.

**Success — 200**
```json
{
  "message": "Order released to the unassigned pool.",
  "order_id": "3c9a1e7f-2b84-4d05-9c61-8a7f3e2d1b40",
  "assigned_admin": null
}
```
`assigned_admin` is **always literal `null`** on success — it is the post-state, not a
descriptor of who released it.

**Idempotent.** Releasing an order that is already unassigned returns the same 200 and
writes **no** audit entry (`order_ownership.py:186-190`). Note the ordering consequence:
the already-unassigned check runs *before* the owner-or-super-admin check, so **any**
caller who holds `order.own` — not only the owner or a super admin — gets a 200 on an
already-unassigned order. There is nothing to take away, so there is nothing to authorise.

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 404 | `{"detail": "Order not found."}` | Unknown or soft-deleted order |
| 403 | `{"detail": "Only the current owner or a super admin can release this order."}` | Caller is a sub-admin who is not the current owner |
| 403 | `{"detail": "Your role does not permit this action (claim and hand over orders). Ask a super admin."}` | Caller's role lacks `order.own` |
| 401 / 403 | DRF default | Unauthenticated / not admin-tier |

**Validation Rules** (`admin_panel/order_ownership.py` · `release_order` · 156-207)
- `transaction.atomic()` + `select_for_update(of=("self",))` — same lock as APIs 1 and 2.
- Soft-deleted orders are excluded (`is_deleted=False`).
- **Deliberately not restricted by order status.** An unassigned order is the normal
  state for new work, so returning one to the pool is never destructive — a paid,
  partly-fulfilled order can be released just as a fresh one can.
- **No `manage_gate` call**, and that is the point rather than an omission: the gate 409s
  an unassigned order, which is exactly the state this endpoint must accept as a no-op.

**Database Changes** — `Order.assigned_admin` UPDATE to `NULL`
(`update_fields=["assigned_admin", "updated_at"]`); one `AuditLog` `ORDER_RELEASED`
entry recording both the losing owner and the actor.
**Notifications / Background Tasks / State Changes** — None. The order's `status` is
untouched, and the admin who lost the order is **not** told.
**Next API** — the order is claimable again by anyone (API 1).
**Related APIs** — API 1 (claim), API 2 (reassign, the alternative when a specific
person should take over).

---

## API 4 · List assignable admins (the reassign target picker)

*Added 2026-08-06.*

| Field | Value |
|---|---|
| **Purpose** | The pick-list behind the "Reassign to…" control — supplies the `admin_id` API 2 requires |
| **Business Reason** | Reassignment was unusable from the panel without it |
| **Endpoint** | `/api/superadmin/orders/assignable-admins/` |
| **Method** | `GET` |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsAdminUser` (`orders_views.py:1276`). **No feature required** — open to both admin tiers, unlike the super-admin-only admin-users table in Flow 31 |
| **Path Parameters** | None |

**Query Parameters**

| Param | Type | Default | Rules |
|---|---|---|---|
| `search` | string | — | Case-insensitive **contains** match against `first_name` **OR** `last_name` **OR** `email`. Whitespace-trimmed; blank/whitespace-only is treated as absent. Does **not** match the composed display name, so "Ravi Kumar" as a single term matches nothing |
| `page` | int | `1` | Standard `CustomPagination` |
| `page_size` | int | `10` | Max **50**; a larger value is clamped, not rejected |

**Who is returned** — every `is_active=True`, `is_deleted=False` account with role
`admin` or `super_admin`, **excluding the caller** (reassigning to yourself is a no-op
the API already treats as such, and offering it in a picker only invites a mis-click).
Ordered by `first_name`, `last_name`, `id` — `id` breaks ties so pagination is stable
across pages when two admins share a name.

**Success — 200**
```json
{
  "count": 12,
  "next": "http://<host>/api/superadmin/orders/assignable-admins/?page=2",
  "previous": null,
  "results": {
    "message": "Assignable admins fetched successfully",
    "data": [
      { "id": "7b1e4c92-3a6d-4f18-b205-9c8e1a2f6d34", "name": "Priya Nair", "email": "priya@anchormart.example" },
      { "id": "0d3f2c1a-9b8e-4d7c-a6f5-1e2b3c4d5e6f", "name": "Ravi Kumar", "email": "ops@anchormart.example" }
    ]
  }
}
```

| Field | Notes |
|---|---|
| `id` | Pass this as `admin_id` to API 2 |
| `name` | `"first last"`, falling back to the **email** when both name parts are blank |
| `email` | Present so two admins with the same display name can be told apart |

**Three fields and no more, deliberately.** The picker does not expose another admin's
order load, account status, or who created them — that is what Flow 31's admin-users
table is for, and it is restricted to super admins.

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 404 | DRF default (`{"detail": "Invalid page."}`) | `page` beyond the last page |
| 401 / 403 | DRF default | Unauthenticated / not admin-tier |

**Database Changes** — none (read-only).
**Notifications / Background Tasks** — none.
**Next API** — API 2, with the chosen `id` as `admin_id`.
**Related APIs** — API 2.

---

## Reading ownership from the order endpoints

The client needs `assigned_admin` to decide whether to show "Manage Order", "Managed by
…", or a disabled state. It is exposed on three order serializers, all via
`_assigned_admin_brief` (`admin_panel/serializers/orders_serializers.py:32-38`):

| Serializer | Line | Screen |
|---|---|---|
| Order detail | `:380`, `:442` | Order detail |
| Order list | `:523`, `:537` | Orders list |
| Intent list | `:648`, `:661` | Intent screen |

Shape — `null` when unassigned, otherwise:
```json
{ "id": "0d3f…", "name": "Ravi Kumar", "email": "ops@anchormart.example" }
```

All three list querysets apply `select_related("assigned_admin")`
(`orders_views.py:186`, `:332`), so there is no N+1.

> ⚠️ **The chat screen returns a different shape.** `admin_panel/serializers/
> chat_serializers.py:77-80` builds its own inline descriptor — `{"id", "name"}` with
> **no `email`**, and derives `name` via `_display_name` rather than the
> first/last-with-email fallback. The same order can therefore present two different
> owner descriptors depending on which screen read it. See validation finding **F-06**.

---

## What happens next

| Condition | Continue to |
|---|---|
| Order claimed, admin proceeds to price it | **Flow 7** — Order Billing & Payment |
| Admin proceeds to verify stock / substitute | **Flow 6** — Stock Verification & Substitution |
| Admin assigns a delivery partner | **Flow 10** — Delivery Fulfilment |
| Admin cancels or refunds | **Flow 12** — Order Cancellation & Refund |
| Claim or reassign audited | **Flow 34** — Audit Trail & Tamper-Evidence |

---

## Source reference

| Concern | File |
|---|---|
| The whole governance module — gate, claim, reassign, release | [`admin_panel/order_ownership.py`](../../backend/admin_panel/order_ownership.py) |
| Claim / reassign / release / picker views | [`admin_panel/views/orders_views.py`](../../backend/admin_panel/views/orders_views.py) (1183-1302) |
| Routes | [`admin_panel/urls/orders_urls.py`](../../backend/admin_panel/urls/orders_urls.py) (48-54) |
| Feature gate (`order.own`) | [`admin_panel/permissions/registry.py`](../../backend/admin_panel/permissions/registry.py) · [`gates.py`](../../backend/admin_panel/permissions/gates.py) · [`MD/ADMIN_PERMISSIONS_FRONTEND.md`](../../ADMIN_PERMISSIONS_FRONTEND.md) |
| `Order.assigned_admin` | [`orders/models.py`](../../backend/orders/models.py) (188-194) |
| Audit actions | [`orders/models.py`](../../backend/orders/models.py) (1129-1135) · [`orders/audit.py`](../../backend/orders/audit.py) |
| Owner descriptor for the UI | [`admin_panel/serializers/orders_serializers.py`](../../backend/admin_panel/serializers/orders_serializers.py) (32-38) |
| Admin role permission | [`admin_panel/admin_auth_utils.py`](../../backend/admin_panel/admin_auth_utils.py) |
| Tests | [`admin_panel/tests/test_order_ownership.py`](../../backend/admin_panel/tests/test_order_ownership.py) · [`test_order_gate_coverage.py`](../../backend/admin_panel/tests/test_order_gate_coverage.py) (sweeps every admin order write for a gate or an explicit exemption) |
