# Flow 31 — User Account Administration (Provision → Inspect → Govern → Erase)


> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`31-user-account-administration-validation.md`](./31-user-account-administration-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint is fully specified.
>
> Index: [`../../BUSINESS_FLOWS.md`](../../BUSINESS_FLOWS.md)


> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**


---


# Executive Summary


The admin's authority over **who exists on the platform**. Four things happen here:


1. **Provision** — create a user of any role and invite them by email and/or WhatsApp.
2. **Inspect** — the Sailors table and one sailor's profile with order and loyalty statistics.
3. **Govern** — edit a sailor, and block/unblock an account.
4. **Erase** — soft-delete an account directly, or review and act on a user's own request to
  be deleted.


Two rules shape everything:


- **Authentication is OTP-only for sailors, sellers and partners**, so no password ever
 appears in an invite. Admin-tier accounts are the one exception — they get a generated
 password emailed at creation, because the panel offers password login as well as OTP.
- **Blocking is immediate and total.** `is_active = False` locks the account out of **both**
 OTP steps — the request step never issues a code, and the verify step refuses even a code
 that was already issued and is still valid.


| | |
|---|---|
| **Actors** | Admin (sub-admin) · Super Admin — **not equivalent here**, see the tier gate below |
| **Endpoints** | **11** — 6 sailor · 1 provisioning · 4 account-deletion review |
| **Django Apps** | `admin_panel` (views + serializers), `user` (models + account service) |
| **Models** | `User`, `VesselProfile`, `DeleteMyAccountRequest`, `DeliveryPartnerProfile`, `SellerProfile`, `AuditLog` |
| **Trigger** | Admin opens Sailors, or needs to create an account, or works the deletion queue |
| **Previous Flow** | 1 (the OTP sign-in this flow governs) |
| **Next Flow** | 28 (partner admin) · 24 (seller review) — role-specific follow-up |
| **Documentation Version** | 1.1 — 2026-07-30 (post-remediation) |
| **Documentation Status** | ✅ 11 routes fully specified. Routes from the running route table; **behaviour verified by EXECUTING every endpoint** against a real database. Includes **4 endpoints built during this pass** (account-deletion review) and the **SEC-1** tier gate. |


---


## ⚠️ The one place sub-admin ≠ super admin


Everywhere else in the admin panel the two tiers are interchangeable. **Not for creating
accounts:**


| Role being created | sub-admin (`admin`) | `super_admin` |
|---|---|---|
| `customer` · `seller` · `delivery_partner` | ✅ | ✅ |
| `admin` · `super_admin` (**admin tier**) | ❌ **403** | ✅ |


```json
{ "detail": "Only a super admin can create admin accounts." }
```


Policy set 2026-07-30. Before it, **any sub-admin could create a `super_admin`** and the
escalation completed in one step — admin-tier accounts are emailed a generated password and
the creator picks the destination address. Tracked as **SEC-1**.


---


# Concepts you need before reading the endpoints


### Derived sailor status


The Sailors table shows a **derived** `status`, computed per row — it is not a stored field:


| Value | Meaning |
|---|---|
| `inactive` | `is_active = False`. Takes precedence over everything. |
| `new` | Active, joined within the last **30 days**, and has **never placed an order**. |
| `active` | Everything else. |


Every read also returns the **raw `is_active` boolean** alongside it, because the block toggle
needs the flag and inferring it from a label is fragile.


### What blocking actually does


`is_active = False` is checked at **both** OTP steps before anything else happens:


| Step | Blocked account |
|---|---|
| `POST /api/v1/user/signin/` (request an OTP) | **403** — no code is sent |
| `POST /api/v1/user/verify-signin-otp/` (verify) | **403** — even with a valid, unexpired code issued before the block |


So a code issued a moment before the block cannot be used after it. Blocking is reversible.


### Deleting an account


Soft delete only — the row stays. **One shared service** does it, so both erasure paths behave
identically ([`user/account_service.py`](../../../backend/user/account_service.py)):


| What happens | |
|---|---|
| All **four** `GenericModel` fields set | `is_deleted`, `is_active=False`, `deleted_at`, `deleted_by` |
| **Coupon assignments revoked** | Hard-deleted, and the **count is reported** in the response |
| **Points balances and history** | **Untouched** — see below |
| Orders | **Untouched** — they are the accounting record |


> **Why points are not zeroed.** Editing a financial record to tidy a dashboard figure is the
> wrong trade: if a deletion is disputed or reversed, the ledger still has to say what the
> account held. The *obligation figure* is corrected where it is computed instead — the
> loyalty overview (**Flow 30 §11**) excludes deleted accounts — so the number is right without
> the history being rewritten. **Blocked accounts are still counted**, because blocking is
> reversible and those points remain a real liability.


### The two erasure paths


| Path | Who starts it |
|---|---|
| `DELETE sailors/sailor/<id>/delete/` (§6) | The admin, unprompted |
| `POST account-deletion/set-status/ {"decision": "complete"}` (§11) | The **user** asked; an admin approved, then completed |


Both call the same service. The second additionally refuses while the account has orders in
flight.


---


# Endpoints — full specification


**Headers:** `Authorization: Token <token>` — role `admin` or `super_admin`.
`/api/superadmin/` is **exempt** from the `server-secret-key` middleware — do **not** send it.
All 11 endpoints are `IsAuthenticated + IsAdminUser` (role-based, not `is_staff`).


| Caller | Result |
|---|---|
| No token | **401** |
| Customer / seller / partner token | **403** |
| `admin` (sub-admin) | **200**, except the admin-tier gate on §7 |


**Pagination** (list endpoints): `page`, `page_size` — default **10**, max **50**, standard DRF
envelope. An out-of-range or non-numeric `page` returns **404** `{"detail": "Invalid page."}`.


**The six sailor endpoints are customer-scoped.** Passing a seller's, partner's or admin's id
to any of them returns **404** — they operate on `role=customer` only.


---


## Sailors


## 1 · `GET /api/superadmin/sailors/stats/` — Sailors cards


No params.


```json
{ "total_sailors": 412, "active": 380, "loyalty_points_issued": 91250, "referrals": 37 }
```


| Field | Exactly what it counts |
|---|---|
| `total_sailors` | Non-deleted `role=customer` accounts. |
| `active` | Of those, `is_active=True`. |
| `loyalty_points_issued` | `SUM(BonusPointHistory.points)` where `action=earned` **and the user is a customer** — lifetime issued, not outstanding. |
| `referrals` | Customers with a `referred_by` set. |


---


## 2 · `GET /api/superadmin/sailors/sailors-list/` — Sailors table


| Query param | Type | Allowed values | Default | Meaning |
|---|---|---|---|---|
| `search` | string | free text | — | Case-insensitive on **`first_name`, `last_name`, `email`, `whatsapp_number`**. |
| `status` | string | **`active`** · **`inactive`** · **`new`** — anything else → **400** | no filter | The derived status above. |
| `page` / `page_size` | int | 1–50 | 10 | |


Ordered **newest first** (`-created_at`). Soft-deleted sailors are excluded.


**Response `200`:**
```json
{
 "id": "bc63…", "full_name": "Old Salt", "email": "sailor@example.com",
 "contact_no": "9991112222",
 "joined": "Jan 12, 2026",
 "ship": "MV Test",
 "orders": 2, "loyalty_pts": 75, "cart_count": 0, "wishlist_count": 0,
 "status": "active", "is_active": true
}
```


| Field | Note |
|---|---|
| `full_name` | First + last, **falling back to the email** when both are blank. |
| `contact_no` | `whatsapp_number`; `null` when unset. |
| `joined` | Display string, `"%b %d, %Y"`. |
| `ship` | The vessel profile's `ship_name`, or `null` when the sailor has no vessel profile. |
| `orders` | **Paid** orders only (`payment_status=completed`). |
| `loyalty_pts` | Sum of **all** `BonusPoints` rows — loyalty **and** referral (one wallet, Flow 30). |
| `cart_count` / `wishlist_count` | Live cart items and saved products. |


All five counts come from **correlated subqueries**, not joins, so a sailor with many orders
does not fan out the row.


**Errors** — `400` `{"status": "Must be active, inactive or new."}`


---


## 3 · `GET /api/superadmin/sailors/sailor/<uuid:sailor_id>/` — Sailor detail


No params.


```json
{
 "id": "bc63…",
 "full_name": "Old Salt",
 "role_label": "Sailor",
 "status": "active",
 "is_active": true,
 "contact": { "email": "sailor@example.com", "whatsapp": "9991112222" },
 "joined": "January 2026",
 "ship": { "ship_name": "MV Test", "imo_number": "9074729",
           "berth_number": "B1", "terminal": "T2" },
 "statistics": { "orders": 2, "avg_order": "200.00", "loyalty_pts": 75 }
}
```


- `role_label` is the constant string `"Sailor"` — this endpoint only ever serves customers.
- `joined` here is `"%B %Y"` (month + year), **not** the `"%b %d, %Y"` of the list row.
- `ship` is `null` when there is no vessel profile.
- `statistics.orders` and `avg_order` cover **paid** orders only; `avg_order` is `"0.00"` when
 there are none.


**Errors** — `404` for an unknown id, a soft-deleted sailor, **or a non-customer account**.


---


## 4 · `PUT` / `PATCH` `/api/superadmin/sailors/sailor/<uuid:sailor_id>/update/` — Edit


**Both verbs are partial** — only keys present in the payload are written.


| Field | Type | Required | Rule |
|---|---|---|---|
| `first_name` | string | ❌ | |
| `last_name` | string | ❌ | |
| `email` | email | ❌ | **Unique across all users**, excluding this sailor. |
| `whatsapp_number` | string | ❌ | |
| `country_code` | string | ❌ | |


**Two fields are refused here, with a `400` rather than silently** (GC1 / GC2, 2026-07-30):


| Field | Result | Why |
|---|---|---|
| `is_active` | **400**, always | Blocking belongs to §5, which records who did it. This endpoint used to write the same flag and audit nothing. |
| `role` | **400 — only when it differs** from the stored role | A round-tripped unchanged `role` (fetch → edit → PUT everything) passes untouched. An actual change attempt is refused; roles are set at creation. |


> Both were previously **accepted and ignored**, answering `200 "Sailor updated successfully."`
> for a field that had no effect. They are rejected explicitly rather than just omitted from
> the serializer, because DRF *ignores* unknown keys — leaving them out would have produced the
> same silent `200`, which is the failure being removed.


**Response `200`:** `{"message": "Sailor updated successfully."}` — note it returns **no
object**; re-read via §3 if the screen needs the updated row.


**Errors**


| Status | Body | Cause |
|---|---|---|
| `400` | `{"is_active": "Blocking is not done here. Use POST /api/superadmin/sailors/sailor/<sailor_id>/status/ — it records who blocked or unblocked the account."}` | Any `is_active` |
| `400` | `{"role": "Role cannot be changed through this endpoint (this account is a 'customer'). Roles are set when the account is created."}` | A **different** role |
| `400` | `{"email": ["A user with this email already exists."]}` | Duplicate email |
| `404` | — | Unknown, deleted, or non-customer |


---


## 5 · `POST /api/superadmin/sailors/sailor/<uuid:sailor_id>/status/` — Block / unblock


| Field | Type | Required | Rule |
|---|---|---|---|
| `is_active` | bool | ✅ | Must be a real JSON boolean — `"yes"`, `"true"` and `1` are all **400**. |


**Response `200`:** `{"message": "Sailor deactivated.", "is_active": false}`


Idempotent — re-sending the same value returns `200` and writes **no** audit entry (nothing
changed). A real transition writes `ACCOUNT_BLOCKED` or `ACCOUNT_UNBLOCKED` with the actor and
the before/after values.


The effect on sign-in is immediate and covers both OTP steps — see the concepts section.


**Errors** — `400` `{"is_active": "This field is required and must be a boolean."}` ·
`404` unknown, deleted, or non-customer.


---


## 6 · `DELETE /api/superadmin/sailors/sailor/<uuid:sailor_id>/delete/` — Soft-delete


No body.


**Response `200`:**
```json
{ "message": "Sailor deleted successfully.", "coupon_assignments_revoked": 1 }
```


Sets all four soft-delete fields, **revokes the sailor's coupon assignments** and reports how
many. Points, history and orders are untouched. Writes an `ACCOUNT_BLOCKED` audit entry with
`reason: "soft_delete"` and the revoked count.


**Errors** — `404` unknown, **already-deleted**, or non-customer.


---


## Provisioning


## 7 · `POST /api/superadmin/admin/create-user/` — Create a user of any role


The one entry point for creating any account. Role-specific follow-up lives elsewhere:
partner profiles in **Flow 28**, seller applications in **Flow 24**.


| Field | Type | Required | Rule |
|---|---|---|---|
| `role` | choice | ✅ | `customer` · `seller` · `delivery_partner` · `admin` · `super_admin`. **Admin-tier values require a super-admin caller** — otherwise **403**. |
| `email` | email | conditional | **Required unless `whatsapp_number` is given.** Unique, **case-insensitively** (`P3-C1@X.IO` collides with `p3-c1@x.io`). Lower-cased on save. |
| `whatsapp_number` | string | conditional | **Required unless `email` is given.** |
| `country_code` | string | conditional | **Required when `whatsapp_number` is given and does not already start with `+`.** |
| `first_name` | string | ❌ | Defaults to `""`. |
| `last_name` | string | ❌ | Defaults to `""`. |


**At least one of `email` / `whatsapp_number` must be present.**


**WhatsApp-only accounts** get a generated placeholder login email —
`wa_<digits>@wa.anchormart.invalid` — because email is the account key. It is non-deliverable,
so those accounts receive no email invite and stay OTP-only.


**Passwords.** Admin-tier accounts created **with a real email** get a generated password,
emailed with the invite, and `is_staff=True` (Django-admin access). Every other role is created
with an unusable password (`is_staff=False`) and signs in by OTP. The password is never
returned in the response.


```json
{ "email": "sailor@example.com", "role": "customer",
 "first_name": "Deck", "last_name": "Hand" }
```


**Response `201`:**
```json
{
 "message": "User created successfully.",
 "invited_via": ["email"],
 "user": { "id": "3371…", "email": "sailor@example.com", "role": "customer",
           "first_name": "Deck", "last_name": "Hand", "whatsapp_number": null }
}
```


`invited_via` lists the channels actually used — `["email"]`, `["whatsapp"]`, or both.


**Errors** — bare field keys, the same shape as every other endpoint in this flow (GC3,
2026-07-30; this endpoint previously wrapped them in an `{"errors": …}` envelope):


| Status | Body | Cause |
|---|---|---|
| `403` | `{"detail": "Only a super admin can create admin accounts."}` | Sub-admin requesting an admin-tier role |
| `400` | `{"role": ["This field is required."]}` | No role |
| `400` | `{"role": ["\"wizard\" is not a valid choice."]}` | Unknown role |
| `400` | `{"email": ["A user with this email already exists."]}` | Duplicate, any case |
| `400` | `{"message": ["Provide at least one of email or whatsapp_number to invite the user."]}` | Neither channel |
| `400` | `{"country_code": ["country_code is required when sending a WhatsApp invite."]}` | Bare number |


> ⚠️ **Breaking change for anything that read `response.errors.<field>`** — it now reads
> `response.<field>`. The sibling `POST /api/superadmin/partner/create/` (**Flow 28**) carried
> the identical envelope and was changed in the same pass, so the two provisioning endpoints
> still match each other.


**Audit.** Every creation writes `ACCOUNT_CREATED` against the **new account**, recording the
actor, the role, whether it is admin-tier, `is_staff`, and the invite channels.


---


## Account-deletion review


> **Built 2026-07-30.** Users can ask to have their account deleted — sailors via
> `POST /api/v1/user/request-account-deletion/`, partners via the partner app. Until this
> existed, acting on those requests was **Django-admin only**, and the `completed` state was
> unreachable: nothing ever carried the deletion out.
>
> **A user may hold only one open request** (`pending` or `approved`) at a time; a second
> submission is refused with `400`. After a rejection they may submit again.


### The state machine


```
pending ──approve──► approved ──complete──► completed   (terminal)
  └─────reject────► rejected                           (terminal)
```


Every other transition is a **409**. `rejected` and `completed` are terminal — an answered
request is not re-answerable.


**Approve and complete are deliberately separate.** Approving is agreeing; completing is
erasing. Fusing them would let one click deactivate a sailor with a delivery in flight.


---


## 8 · `GET /api/superadmin/account-deletion/stats/` — Queue cards


No params.


```json
{ "total": 42, "pending": 7, "approved": 3, "rejected": 30, "completed": 2 }
```


---


## 9 · `GET /api/superadmin/account-deletion/requests/` — Review queue


| Query param | Type | Allowed values | Default | Meaning |
|---|---|---|---|---|
| `status` | string | `pending` · `approved` · `rejected` · `completed` — anything else → **400** | no filter | |
| `role` | string | any `User.Role` value — anything else → **400** | no filter | The requester's role. |
| `user_id` | UUID | valid UUID — malformed → **400** | no filter | |
| `search` | string | free text | — | Case-insensitive on **email, first name, last name, and the user's `reason`**. |
| `page` / `page_size` | int | 1–50 | 10 | |


Ordered **newest first**.


**Response `200`:**
```json
{
 "id": 12,
 "user_id": "ebbe…", "user_email": "sailor@example.com",
 "user_name": "Deck Hand", "user_role": "customer", "user_is_active": true,
 "reason": "Leaving the industry",
 "status": "pending", "status_display": "Pending",
 "reviewed_by_email": null, "reviewed_at": null,
 "admin_note": "", "processed_at": null,
 "created_at": "July 30, 2026, 11:04 AM"
}
```


`id` is an **integer**. §11 takes that integer.


---


## 10 · `GET /api/superadmin/account-deletion/request/` — One request + account footprint


| Query param | Type | Required |
|---|---|---|
| `request_id` | int | ✅ |


Returns the §9 row plus `updated_at` and the three figures an admin needs to judge whether
erasing this account is safe:


| Extra field | Meaning |
|---|---|
| `open_order_count` | Orders **not** in a terminal state. Non-zero blocks completion (§11). |
| `total_order_count` | All orders ever. |
| `outstanding_points` | The account's full points balance (both types). |


**Errors** — `400` missing or non-integer `request_id` · `404` unknown request.


---


## 11 · `POST /api/superadmin/account-deletion/set-status/` — Approve / reject / complete


| Field | Type | Required | Rule |
|---|---|---|---|
| `request_id` | int | ✅ | |
| `decision` | choice | ✅ | **`approve`** · **`reject`** · **`complete`** |
| `admin_note` | string | conditional | **Required (non-blank) when rejecting.** Max 2000. Optional otherwise. |


| Decision | From | Effect |
|---|---|---|
| `approve` | `pending` | Records the decision + reviewer + timestamp. **The account is not touched.** |
| `reject` | `pending` | Same, terminal. Note required. |
| `complete` | `approved` | **Erases the account** via the shared service and marks the request `completed` with `processed_at`. |


The whole decision is **row-locked**, so two admins clicking opposite buttons on the same
request cannot both succeed — the second gets a `409`.


**Response `200`** — the §10 detail shape, refreshed.


**Errors**


| Status | Body | Cause |
|---|---|---|
| `400` | `{"admin_note": ["A note is required when rejecting a deletion request."]}` | Rejection with no note |
| `400` | `{"decision": ["\"x\" is not a valid choice."]}` | Bad decision |
| `404` | `{"detail": "Deletion request not found."}` | Unknown id |
| `409` | `{"detail": "This request is already rejected and cannot be changed."}` | Terminal state |
| `409` | `{"detail": "Only a pending request can be approved; this one is approved."}` | Wrong state for approve/reject |
| `409` | `{"detail": "Only an approved request can be completed. Approve it first."}` | Completing a pending request |
| `409` | `{"detail": "This account still has 2 order(s) in progress. Close or cancel them before deleting the account."}` | **Live orders block completion** |


**Audit.** Every successful decision writes `ACCOUNT_DELETION_REVIEWED` against the account,
carrying the decision, the request id, the resulting status, the note, an `account_deleted`
flag, and — on completion — the count of revoked coupon assignments.


---


# How Flow 31 connects


- **Governs — Flow 1 (Authentication):** blocking here is what the OTP request and verify steps
 check. Deleting removes the account from every sign-in path.
- **Feeds — Flow 28 (Partner Administration) and Flow 24 (Seller Onboarding):** `create-user`
 is the shared entry point; role-specific profile and review work lives in those flows.
- **Boundary — Flow 30 (Promotion & Loyalty):** deleting an account **revokes its coupon
 assignments** and removes its points from the outstanding-obligation figure, while leaving
 the points ledger intact.
- **Downstream — Flow 34 (Audit Trail):** this flow writes `ACCOUNT_CREATED`,
 `ACCOUNT_BLOCKED`, `ACCOUNT_UNBLOCKED` and `ACCOUNT_DELETION_REVIEWED`. All are
 `operational` category (pruned after 365 days).
- **Upstream — the customer and partner apps:** users create the deletion requests this flow
 reviews.



