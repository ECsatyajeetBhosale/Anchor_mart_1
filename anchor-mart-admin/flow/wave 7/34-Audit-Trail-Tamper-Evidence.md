# Flow 34 — Audit Trail & Tamper-Evidence (Record the action → Verify the chain)


> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`34-admin-audit-trail-validation.md`](./34-admin-audit-trail-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint is fully specified.
>
> Index: [`../../BUSINESS_FLOWS.md`](../../BUSINESS_FLOWS.md)


> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**


---


# Executive Summary


The Audit Trail flow provides a tamper-evident, append-only log of operational and financial actions performed across the AnchorMart system. Every audited mutation generates an entry linked cryptographically via SHA-256 hashes to its subject's previous entry.


**An audit log nobody can query is not a control.** This flow defines both the write-side recording framework and the admin read/verification surface.


The one core concept to understand before reading the endpoints:


> ### Access and retention are split by category on purpose
>
> **ORDER Category = Financial and Order Lifecycle Events.**
> Entries associated with order placement, payment, status changes, refunds, bill generation, and point/gift grants.
> - **Visibility**: Accessible by **any admin** (`admin` or `super_admin`) because any operations admin already has access to order details.
> - **Retention**: **Never pruned.** Financial audit trails are retained indefinitely.
>
> **OPERATIONAL Category = Administrative, Security & System Events.**
> Telemetry regarding sign-ins, failed login attempts, role changes, account blocks/unblocks, coupon modifications, price changes, and partner availability toggles.
> - **Visibility**: Restricted to **super admins** (`super_admin` only). Sub-admins cannot inspect security actions taken against other admins.
> - **Retention**: **Pruned after 365 days** (`AUDIT_OPERATIONAL_RETENTION_DAYS`) by the nightly Celery retention job.


| | |
|---|---|
| **Actors** | Admin (`admin`) · Super Admin (`super_admin`) · System / Background Workers (`SYS`) |
| **Endpoints** | **2** — List audit log · Verify chain integrity |
| **Django Apps** | `admin_panel` (read views & URLs), `orders` (audit core engine, models, verification, tasks) |
| **Models read** | `AuditLog`, `AuditChain`, `User`, `Order` |
| **Models written** | `AuditLog` (appended on mutations), `AuditChain` (head pointer & length updated), `User` |
| **Trigger** | Admin views audit log in control panel; Super Admin runs chain verification; background mutation events occur |
| **Previous Flow** | 33 (Admin Dashboard & Analytics) |
| **Next Flow** | 35 (Order Lifecycle Timers & Expiry) |
| **Documentation Version** | 1.0 — 2026-08-01 |
| **Documentation Status** | ✅ 2 routes fully specified. Behavior verified by **EXECUTING tests and queries** against live database. |


---


# Concepts you need before reading the endpoints


### 1. Cryptographic Hash Chaining (`AuditChain` & `prev_hash`)


Every `AuditLog` entry belongs to a specific subject (e.g. a specific `Order`, `User`, `Coupon`, `Port`, or `Product`).


When an event is recorded via `record_audit()`:
1. The subject's chain head is locked using `AuditChain.objects.select_for_update()`.
2. A new `AuditLog` entry is created with `prev_hash` set to the chain's current `head_hash`.
3. The entry's own SHA-256 digest (`entry_hash`) is computed over its payload and `prev_hash`.
4. The `AuditChain` record updates its `head_hash` and increments `length`.


```
[Genesis Entry]                [Entry 2]                     [Entry 3 (Head)]
entry_hash: 0a8f...   <------  entry_hash: 7d2e...   <------  entry_hash: e91c...
prev_hash:  ""                 prev_hash:  0a8f...           prev_hash:  7d2e...
```


If any entry in the database is modified, deleted out of order, or appended without updating the head pointer, `verify_chain()` detects the break immediately.


### 2. Lock Serialization (Preventing Chain Forks)


Appends serialize on the subject's `AuditChain` row using PostgreSQL row locking (`select_for_update`).


Without per-subject locking, two concurrent appends to the same subject would read the same predecessor and attempt to write identical `prev_hash` values, resulting in a **forked chain** that fails verification. Lock contention is isolated per subject, maintaining high performance across independent entities.


### 3. Hash Versioning (`v1` vs `v2`)


The hashing formula has evolved while maintaining absolute backward compatibility:


- **Version 1 (`v1`)**: Pre-#32 legacy format. Hashed `order_id`, `action`, `actor_id`, `summary`, `metadata`, `created_at`, and `prev_hash`.
- **Version 2 (`v2`)**: Current subject-scoped format. Hashes `action`, `category`, `subject_type`, `subject_id`, `actor_id`, `summary`, `metadata`, `created_at`, and `prev_hash`.


> **Immutability Principle**: Historical `v1` rows are **never re-hashed**. Re-hashing historical rows to match a new schema would alter their digests, making legitimate historical data appear tampered. `verify_chain()` evaluates each entry using the hasher version specified in its `hash_version` column.


### 4. Authorised Truncation vs Tampering (`pruned_before`)


When the Celery task `prune_audit_logs` runs:
1. Operational audit log entries older than 365 days are deleted.
2. The `AuditChain.pruned_before` field is updated with the timestamp of the last pruned entry.


When `verify_chain()` runs on a pruned chain:
- Verification starts from the oldest surviving entry.
- Because `chain.pruned_before` is set, a non-empty `prev_hash` on the first surviving entry is accepted as **authorised retention**.
- If a chain's first entry has a non-empty `prev_hash` but `pruned_before` is `NULL`, `verify_chain()` flags the chain as broken (**unauthorised head deletion**).


### 5. Safe vs Transactional Recording


The engine provides two entry points for recording audit events:


- `record_audit(...)`: **Transactional**. Used for order and financial state changes (refunds, status transitions, point grants). Runs inside the business logic transaction. If audit creation fails, the entire transaction rolls back.
- `record_audit_safe(...)`: **Best-Effort**. Used for operational and security telemetry (sign-in attempts, logout, availability toggles). Exceptions are caught and logged without aborting the main action, ensuring transient database issues do not lock users out.


---


# Authentication & Access Control


Both endpoints require standard JWT/Token authentication with admin privileges:


```http
Authorization: Token <admin_token>
```


### Role-Based Access Scoping


| Role | List Endpoint Access (`GET /api/superadmin/audit/`) | Verify Endpoint Access (`GET /api/superadmin/audit/verify/`) |
|---|---|---|
| `admin` (Sub-Admin) | **Restricted to `category=order` entries.** Sub-admins can view order audit trails. Requesting `category=operational` returns **403 Forbidden**. | **Denied (403 Forbidden).** Chain verification is restricted to super admins. |
| `super_admin` | **Unrestricted.** Can view both `order` and `operational` audit categories. | **Allowed.** Can execute cryptographic verification on any subject. |


---


# Endpoint Reference


## 1. List Audit Trail


Retrieves a paginated list of audit log entries sorted by creation date descending (newest first).


- **HTTP Method**: `GET`
- **URL Path**: `/api/superadmin/audit/`
- **Permissions**: `IsAuthenticated`, `IsAdminUser`


### Query Parameters


| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `subject_type` | `string` | No | Filter by subject type. Must be one of `order`, `user`, `coupon`, `port`, `product`, `partner`, `config`. | `order` |
| `subject_id` | `string` | No | Filter by subject UUID or primary key string. | `3fa85f64-5717-4562-b3fc-2c963f66afa6` |
| `actor_id` | `string` | No | Filter by the user ID of the admin/user who performed the action. Uses index `(actor, -created_at)`. | `12` |
| `action` | `string` | No | Filter by exact audit action string (e.g. `status_change`, `refund`, `login_succeeded`). | `status_change` |
| `category` | `string` | No | Filter by category (`order` or `operational`). Sub-admins requesting `operational` get 403. | `order` |
| `from` | `string` | No | ISO-8601 datetime lower bound (`created_at >= from`). | `2026-07-01T00:00:00Z` |
| `to` | `string` | No | ISO-8601 datetime upper bound (`created_at <= to`). | `2026-07-31T23:59:59Z` |
| `page` | `integer` | No | Page number for pagination. Default `1`. | `1` |
| `page_size` | `integer` | No | Number of records per page. Default `20`. | `20` |


### Success Response (`200 OK`)


```json
{
 "count": 42,
 "next": "http://localhost:8000/api/superadmin/audit/?page=2",
 "previous": null,
 "results": {
   "message": "Audit trail fetched successfully",
   "data": [
     {
       "id": "c1f7b8a2-91d4-4e2b-a81d-7201c6543b12",
       "action": "status_change",
       "action_display": "Order status changed",
       "category": "order",
       "subject_type": "order",
       "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
       "subject_label": "ORD-20260731-9982",
       "actor": {
         "id": "12",
         "email": "admin@anchormart.com",
         "role": "admin"
       },
       "summary": "Status changed from payment_received to order_confirmed",
       "metadata": {
         "from": "payment_received",
         "to": "order_confirmed",
         "note": "Payment verified via webhook"
       },
       "created_at": "2026-07-31T14:22:00.123456+00:00",
       "entry_hash": "e91c7841f23b10b07a4a4911d331908272ef5539209aef82b6b0c2014b2d39aa",
       "prev_hash": "7d2e9014b8a211c42f01991823901b88e1002341b12984102941920491024921",
       "hash_version": 2
     }
   ]
 }
}
```


### Error Responses


- **`400 Bad Request`** (Invalid parameter value)
```json
{
 "subject_type": [
   "Must be one of ['order', 'user', 'coupon', 'port', 'product', 'partner', 'config']."
 ]
}
```


- **`403 Forbidden`** (Sub-admin requesting operational category)
```json
{
 "detail": "Operational audit entries are restricted to super admins."
}
```


---


## 2. Verify Audit Chain


Recomputes SHA-256 hashes sequentially for all entries belonging to a given subject and checks for tampering, content edits, broken links, or tail truncations.


- **HTTP Method**: `GET`
- **URL Path**: `/api/superadmin/audit/verify/`
- **Permissions**: `IsAuthenticated`, `IsAdminUser` (Restricted to **`super_admin`** only)


### Query Parameters


| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `subject_type` | `string` | **Yes** | Subject category (`order`, `user`, `coupon`, `port`, `product`, `partner`, `config`). | `order` |
| `subject_id` | `string` | **Yes** | Subject UUID or primary key string. | `3fa85f64-5717-4562-b3fc-2c963f66afa6` |


### Success Response — Clean Chain (`200 OK`)


```json
{
 "subject_type": "order",
 "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
 "verified": true,
 "error": null,
 "entries": 4,
 "pruned_before": null
}
```


### Success Response — Tampered / Broken Chain (`200 OK`)


> Note: The endpoint returns `200 OK` with `verified: false` and an error description so monitoring systems can parse the payload.


```json
{
 "subject_type": "order",
 "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
 "verified": false,
 "error": "tampered content at c1f7b8a2-91d4-4e2b-a81d-7201c6543b12 (status_change)",
 "entries": 4,
 "pruned_before": null
}
```


Common verification error strings reported in `error`:
- `"tampered content at <id> (<action>)"`: The stored row's fields do not match its `entry_hash`.
- `"broken link at <id> (<action>)"`: The entry's `prev_hash` does not match the previous entry's `entry_hash`.
- `"chain head does not match the last entry (tail truncated)"`: The last surviving entry's hash does not equal `AuditChain.head_hash`.


### Error Responses


- **`400 Bad Request`** (Missing required parameters)
```json
{
 "detail": "Both subject_type and subject_id are required."
}
```


- **`403 Forbidden`** (Non-super admin caller)
```json
{
 "detail": "Chain verification is restricted to super admins."
}
```


---


# Audit Actions & Subjects Reference


### Registered Subject Types (`AuditLog.Subject`)


| Enum Value | Code Label | Handled Models | Label Field |
|---|---|---|---|
| `order` | `ORDER` | `Order` | `order_number` |
| `user` | `USER` | `User` (Sailor, Admin, Partner) | `email` |
| `coupon` | `COUPON` | `Coupon` | `code` |
| `port` | `PORT` | `PortAddress`, `Anchorage` | `name` |
| `product` | `PRODUCT` | `Product`, `ProductVariant` | `name` |
| `partner` | `PARTNER` | `DeliveryPartnerProfile` | `email` |
| `config` | `CONFIG` | `LoyaltyConfig` | — |


### Registered Actions (`AuditLog.Action`) & Categories


| Action Value | Category | Trigger / Event Source |
|---|---|---|
| `status_change` | `ORDER` | Order lifecycle transitions (`transition_order()`) |
| `refund` | `ORDER` | Full or partial refund processing (`process_refund()`) |
| `bill_generated` | `ORDER` | Picking slip / operational bill generation |
| `payment_link` | `ORDER` | Delta payment link dispatch |
| `gift_granted` | `ORDER` | Surprise gift awarded to order |
| `login_succeeded` | `OPERATIONAL` | Successful user/admin authentication |
| `login_failed` | `OPERATIONAL` | Authentication failure (wrong password / blocked) |
| `logout` | `OPERATIONAL` | Explicit session termination |
| `role_changed` | `OPERATIONAL` | User role elevation or demotion |
| `account_created` | `OPERATIONAL` | New user/admin registration |
| `account_blocked` | `OPERATIONAL` | User account suspension |
| `account_unblocked` | `OPERATIONAL` | Account restriction lift |
| `account_deletion_reviewed` | `OPERATIONAL` | GDPR / account deletion request decision |
| `seller_request_reviewed` | `OPERATIONAL` | Seller application approval or rejection |
| `seller_request_resubmitted` | `OPERATIONAL` | Seller resubmission event |
| `coupon_created` | `OPERATIONAL` | New promotion coupon added |
| `coupon_updated` | `OPERATIONAL` | Promotion coupon modified |
| `coupon_deleted` | `OPERATIONAL` | Coupon deletion |
| `port_config_changed` | `OPERATIONAL` | Port or anchorage configuration edit |
| `price_changed` | `OPERATIONAL` | Product/variant base price override |
| `partner_availability_changed` | `OPERATIONAL` | Delivery partner active status toggle |
| `partner_capability_changed` | `OPERATIONAL` | Delivery partner vehicle/capability change |
| `points_adjusted` | `OPERATIONAL` | Admin loyalty points grant/deduction |
| `loyalty_config_changed` | `OPERATIONAL` | Loyalty system configuration update |


---


# Summary Error Reference Table


| HTTP Status | Error Payload | Trigger Condition |
|---|---|---|
| **`400 Bad Request`** | `{"subject_type": "Must be one of [...]"}` | Filter value not in `AuditLog.Subject.values` |
| **`400 Bad Request`** | `{"action": "Must be one of [...]"}` | Filter value not in `AuditLog.Action.values` |
| **`400 Bad Request`** | `{"category": "Must be one of [...]"}` | Filter value not in `AuditLog.Category.values` |
| **`400 Bad Request`** | `{"from": "Must be an ISO-8601 datetime."}` | Datetime query parameter parsing failure |
| **`400 Bad Request`** | `{"detail": "Both subject_type and subject_id are required."}` | Missing required query parameters on verify endpoint |
| **`403 Forbidden`** | `{"detail": "Operational audit entries are restricted to super admins."}` | Sub-admin explicitly passing `?category=operational` |
| **`403 Forbidden`** | `{"detail": "Chain verification is restricted to super admins."}` | Sub-admin calling `/api/superadmin/audit/verify/` |
| **`403 Forbidden`** | `{"detail": "You do not have permission to perform this action."}` | Non-admin user (e.g. Sailor or Partner) accessing audit routes |


---


# Scale, Performance & Concurrency


1. **Indexed Queries**: The read API queries are indexed by `(actor, -created_at)` and `(subject_type, subject_id, -created_at)`. Unfiltered listing orders deterministically by `-created_at`.
2. **Contention Isolation**: Row-level locking during append (`AuditChain.objects.select_for_update()`) operates strictly on the single `(subject_type, subject_id)` row. Appends across different orders or users execute concurrently without locking contention.
3. **Bounded Database Footprint**: Operational telemetry log size is bounded by the 365-day automated retention window (`prune_audit_logs`). Order/financial audit rows are kept indefinitely but isolated in index scans.



