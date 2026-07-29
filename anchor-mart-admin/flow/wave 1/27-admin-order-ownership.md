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
| **Services** | `can_manage`, `manage_gate`, `claim_order`, `reassign_order`, `is_super_admin` |
| **State Machines** | **None.** Ownership is a nullable FK, not a status field. There is no `VALID_TRANSITIONS` table |
| **External Integrations** | None |
| **Total APIs** | **2 dedicated** (claim · reassign) — plus **17 endpoints in other flows** that enforce the gate |
| **Previous Flow** | Flow 01 (admin signs in) |
| **Next Flow** | Whichever order write the admin came to perform — Flows 5, 6, 7, 10, 11, 12, 20 |
| **Documentation Version** | 1.0 — 2026-07-20 |
| **Documentation Status** | ✅ 2 of 2 dedicated routes documented, verified against the running route table. ⚠️ **Read findings F-01 and F-03 before building the admin order screen** |


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
surface is the one-line guard that 17 order-mutating endpoints across six other flows
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
| **Released** | `assigned_admin` becomes `NULL` — **only** as a side effect of the owning admin's account being deleted (`SET_NULL`). There is no "release" or "unclaim" endpoint |


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
| `AuditLog` / `AuditChain` | `orders/models.py` | `ORDER_CLAIMED` (`:1030`) and `ORDER_REASSIGNED` (`:1031`) |


> `SET_NULL` is deliberate — the comment at `orders/models.py:189` reads *"SET_NULL so
> deleting an admin account frees the order."* Deleting an admin silently returns all
> their orders to the unassigned pool.


## Services — the whole governance surface is five functions


| Callable | File · Line | Behaviour |
|---|---|---|
| `is_super_admin(user)` | `order_ownership.py:22-23` | `user.role == SUPER_ADMIN` |
| `can_manage(user, order)` | `:26-28` | `is_super_admin(user) or order.assigned_admin_id == user.id` |
| `manage_gate(user, order)` | `:31-55` | Returns an error `Response` if the user may **not** manage the order, else `None` |
| `claim_order(order_id, admin)` | `:58-94` | Atomic first-come claim. Returns `(order, error_response)` |
| `reassign_order(order_id, target_admin_id, actor)` | `:97-145` | Hand-over. Returns `(order, error_response)` |


**The gate contract** — every order-mutating admin view is expected to call it
immediately after resolving the order (`order_ownership.py:34-38`):


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


Both mutating functions wrap their work in `transaction.atomic()` and take a row lock:


```python
Order.objects.select_for_update(of=("self",))
   .filter(is_deleted=False, id=order_id)
   .select_related("assigned_admin")
   .first()
```


`of=("self",)` is load-bearing and explained in-code (`order_ownership.py:67-68`,
`:105-106`): `select_related("assigned_admin")` is an **outer join on a nullable FK**,
which `FOR UPDATE` cannot lock — so the lock is narrowed to the `Order` row alone.
Two admins claiming the same order concurrently are serialised; exactly one wins.


## Signals · Celery tasks · Notifications


**None, on all three counts.** No signal, no background task, and **no notification is
sent to anyone when an order is claimed or reassigned** — including to the admin who
just lost ownership.


## Audit


Both mutations write an audit entry via `record_audit` (Flow 34):


| Action | Metadata |
|---|---|
| `ORDER_CLAIMED` | `admin_id`, `admin_email` |
| `ORDER_REASSIGNED` | `to_admin_id`, `to_admin_email`, `from_admin_id`, `from_admin_email` (both `None` when previously unassigned) |


Idempotent no-ops — re-claiming an order you already own, or reassigning to the current
owner — return early **before** the audit call, so they produce no entry.


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
 │     ▼  any of the 17 gated endpoints
 │   manage_gate(user, order) ──▶ None → proceed
 │
 ├─ assigned_admin == someone else, I am a sub_admin
 │     │
 │     ▼  any gated endpoint
 │   manage_gate ──▶ 403 "This order is managed by another admin."
 │     │
 │     └─ I am a super_admin instead ──▶ gate returns None, proceed
 │
 └─ HANDOVER
     POST /orders/order/<id>/reassign/  { admin_id }
       │ actor must be super_admin OR current owner ──▶ else 403
       │ target must be is_active AND admin-tier ────▶ else 404
       │ target already owns it ─────────────────────▶ 200 (no-op, NO audit)
       └─ reassign + AUDIT ─────────────────────────▶ 200


RELEASE: there is no unclaim endpoint. assigned_admin returns to NULL only when
the owning admin's User row is deleted (SET_NULL).
```


## The enforced surface — 17 endpoints in other flows


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
| 14 | `POST /gifts/orders/<id>/grant/` | Manually grant a surprise gift | 20 |
| 15 | `POST /gifts/orders/<id>/revoke/` | Revoke a pending gift | 20 |
| 16 | `POST /ship-agents/order/<id>/set/` | Set/clear ship agent + snapshot | 2 |
| 17 | `POST /partner/assign-order/` | Assign a delivery partner | 10 |


In all 17, the gate is the **first statement after the order is resolved**. In the four
two-object cases (#8, #9, #10, #15) it deliberately precedes the secondary fetch, so an
unauthorised caller cannot probe whether a delta, report, or gift exists.


> **This register is not exhaustive of what *should* be gated.** Two admin order writes
> do **not** call the gate. See validation findings **F-01** and **F-02** before
> assuming any admin order write is protected.


## Deliberately not gated


| Endpoint | Why |
|---|---|
| `POST /orders/order/<id>/claim/` | Authorisation *is* the `select_for_update` first-come lock. Gating it would be circular — you cannot require ownership to acquire ownership |
| `POST /orders/order/<id>/reassign/` | Authorisation is inside `reassign_order` (`order_ownership.py:115-119`), which applies the same owner-or-super-admin rule |
| `GET /orders/order/<id>/refund-quote/` | GET; `refunds.refund_quote(...)` is explicitly side-effect-free |
| All admin order **reads** | By design — see the module docstring |


---


# Phase 3 — API Documentation


## Flow-wide conventions


| Header | Notes |
|---|---|
| `Content-Type: application/json` | Both endpoints |
| `Authorization: Token <key>` | Both. Admin tokens **never expire** (Flow 01) |
| `server-secret-key` | **Not required** — `/api/superadmin/` is middleware-exempt |


Both endpoints are `[IsAuthenticated, IsAdminUser]`, and both return errors under
`{"detail": …}` — except the two `admin_id` field errors on API 2, which use the DRF
field shape `{"admin_id": ["…"]}`.


---


## API 1 · Claim an order ("Manage Order")


| Field | Value |
|---|---|
| **Purpose** | Become the single accountable owner of an unassigned order |
| **Business Reason** | The precondition for every other admin write on that order |
| **Endpoint** | `/api/superadmin/orders/order/<uuid:order_id>/claim/` |
| **Method** | `POST` |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsAdminUser` (`orders_views.py:1146`) |
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
**Next API** — any of the 17 gated endpoints.
**Related APIs** — API 2.


---


## API 2 · Reassign an order to another admin


| Field | Value |
|---|---|
| **Purpose** | Hand accountability to a different admin |
| **Business Reason** | Shift handover, escalation, or covering an absent owner |
| **Endpoint** | `/api/superadmin/orders/order/<uuid:order_id>/reassign/` |
| **Method** | `POST` |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsAdminUser` (`orders_views.py:1166`) |
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


> **How does the client obtain `admin_id`?** **It cannot.** No endpoint in the codebase
> lists admin accounts. See validation finding **F-03** — this makes the endpoint
> unusable from the admin panel as built.


**Validation Rules** (`admin_panel/order_ownership.py` · `reassign_order` · 97-145)
— same atomic + row-lock pattern as API 1; actor authorisation, then target
resolution, then the no-op check.


**Database Changes** — `Order.assigned_admin` UPDATE; one `AuditLog`
`ORDER_REASSIGNED` entry carrying both the previous and new owner.
**Notifications** — **None.** Neither the losing nor the gaining admin is told.
**Next API** — the new owner may now use any gated endpoint.
**Related APIs** — API 1.


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
| The whole governance module — gate, claim, reassign | [`admin_panel/order_ownership.py`](../../backend/admin_panel/order_ownership.py) |
| Claim / reassign views | [`admin_panel/views/orders_views.py`](../../backend/admin_panel/views/orders_views.py) (1134-1190) |
| Routes | [`admin_panel/urls/orders_urls.py`](../../backend/admin_panel/urls/orders_urls.py) (46-47) |
| `Order.assigned_admin` | [`orders/models.py`](../../backend/orders/models.py) (188-194) |
| Audit actions | [`orders/models.py`](../../backend/orders/models.py) (1030-1031) · [`orders/audit.py`](../../backend/orders/audit.py) |
| Owner descriptor for the UI | [`admin_panel/serializers/orders_serializers.py`](../../backend/admin_panel/serializers/orders_serializers.py) (32-38) |
| Admin role permission | [`admin_panel/admin_auth_utils.py`](../../backend/admin_panel/admin_auth_utils.py) |
| Tests | [`admin_panel/tests/test_order_ownership.py`](../../backend/admin_panel/tests/test_order_ownership.py) |



