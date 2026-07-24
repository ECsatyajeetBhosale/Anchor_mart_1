# Flow 02 — Profile, Vessel & Account Management

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`02-profile-vessel-account-validation.md`](./02-profile-vessel-account-validation.md).
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
| **Flow Name** | Profile, Vessel & Account Management |
| **Business Objective** | Capture the vessel identity and contact details a sailor needs before ordering, and manage the account thereafter |
| **Flow Type** | Core |
| **Primary Actors** | Customer (sailor) · Delivery Partner · Admin · Super Admin |
| **Platforms** | `SAILOR` (`/api/v1/`, `/api/orders/`) · `PARTNER` (`/api/partner/`) · `ADMIN` (`/api/superadmin/`) |
| **Django Apps** | `user` · `orders` (saved addresses, order-agent binding) · `catalog` (port/anchorage lookups) · `admin_panel` · `partner_app` |
| **Models** | `User`, `Address`, `VesselProfile`, `ShipmentAddress`, `ShipAgent`, `DeleteMyAccountRequest`, `WhatsappOtp`, `DeliveryPartnerProfile` |
| **Services** | `upsert_saved_address`, `_resolve_vessel_port_anchorage`, `manage_gate`, `mark_reviewed` |
| **State Machines** | **One, partial** — `DeleteMyAccountRequest.status` (`pending → approved/rejected → completed`). There is no `VALID_TRANSITIONS` table and no `can_transition` guard; `completed` is unreachable in production code |
| **External Integrations** | Twilio (WhatsApp number verification — **owned by Flow 01**, referenced here) |
| **Total APIs** | **17** (10 sailor · 2 partner · 5 admin) |
| **Previous Flow** | Flow 01 (Authentication) — entry is `vessel_profile_completed = false` on `get-profile` |
| **Next Flow** | Flow 5 (Order Intent) once the vessel profile exists |
| **Documentation Version** | 1.0 — 2026-07-20 |
| **Documentation Status** | ✅ 17 of 17 routes documented, verified against the running application's route table. ⚠️ **Read finding F-01 in the validation report before building the ship-agent directory screen** |

---

# Phase 1 — Understand the Flow

## Business purpose

Two separable jobs share this flow because they share the profile screen:

1. **Get the sailor orderable.** A vessel profile (ship name, berth, terminal, contact,
   optionally port/anchorage/section) must exist before the app lets them order. Saving
   one flips `vessel_profile_completed`, which the client reads from `get-profile`.
2. **Maintain the account thereafter** — personal details, the delivery address book,
   the ship-agent contact directory, and account deletion.

## Entry point

| Portal | Endpoint |
|---|---|
| Customer | `GET /api/v1/user/get-profile/` (reads `vessel_profile_completed`) |
| Partner | `GET /api/partner/profile/` |
| Admin | `GET /api/superadmin/ship-agents/` |

## Exit point

| Outcome | Condition |
|---|---|
| **Success** | `VesselProfile` exists; `get-profile` returns `vessel_profile_completed: true` |
| **Terminal** | An account-deletion request is filed (review queue only — see below) |

## Actors

| Actor | Participation |
|---|---|
| **Customer (sailor)** | Owns the profile, vessel profile, personal address, delivery address book, and their own ship-agent entries |
| **Delivery Partner** | Reads and edits a **restricted** subset of their own profile; may file a deletion request |
| **Admin / Super Admin** | Manages the **global** ship-agent directory and may edit any sailor's agent; binds an agent to an order |
| **Background System** | **None.** No Celery task, signal, or scheduled job participates in this flow |

## Three location models — do not confuse them

This is the single most important structural fact in the flow. Three models carry
address-shaped fields and they are **not linked to each other**.

| | `Address` | `VesselProfile` | `ShipmentAddress` |
|---|---|---|---|
| **File** | `user/models.py:121-140` | `user/models.py:144-175` | `user/models.py:178-227` |
| **Cardinality** | `OneToOne`, `related_name="addresses"` | `OneToOne`, `related_name="vessel_profile"` | `ForeignKey` — **many per user** |
| **Role** | The sailor's personal postal address | Standing vessel record; a **prefill template** | The **delivery address book** — what checkout actually uses |
| **Written by** | `UserProfileUpdateSerializer.update` (`user/serializers.py:122`) — the only writer in the backend | `AddVesselProfile` / `UpdateVesselProfile` | `upsert_saved_address` (`user/user_generics.py:207-246`) |
| **Read by** | `get-profile` only | `get-vessel-profile` | `GET /api/orders/saved-addresses/`, plus order snapshots |
| **Port / anchorage FKs** | none | yes | yes |

Consequences a frontend engineer must plan around:

- **`Address` plays no role in delivery.** Updating it has zero effect on where anything
  ships. It is read by exactly one endpoint (`get-profile`) and written by exactly one
  serializer. The overlapping field names (`country`, `city`, `phone`) invite the wrong
  assumption.
- **`VesselProfile` does not feed `ShipmentAddress` on the backend.** The prefill is
  **frontend-only** — the client maps vessel fields onto the shipment-address form. The
  duplicated fields (`vessel_name`, `imo_number`, `deck`, `cabin_number`) are a
  deliberate template → instance → order-snapshot chain, not accidental redundancy.
- **`ShipmentAddress` is written implicitly**, on order create and on a confirmed delta
  move — never by a dedicated address-book endpoint. There is no customer create,
  update, delete, or set-default route for it.

## Models

| Model | File · Line | Notes |
|---|---|---|
| `User` | `user/models.py:57-119` | UUID PK. `vessel_profile_completed` at `:87`; `whatsapp_verified` at `:83`; `gender` **defaults to `male`**, not null (`:75`) |
| `Address` | `user/models.py:121-140` | `phone` is `unique=True` **globally**, not per user (`:128`) |
| `VesselProfile` | `user/models.py:144-175` | 5 required fields; `port`/`anchorage` FKs `SET_NULL` |
| `ShipmentAddress` | `user/models.py:178-227` | `is_default` at `:217`. **No uniqueness constraint of any kind** — including none enforcing one default per user |
| `ShipAgent` | `user/models.py:504-531` | `owner` nullable — **`NULL` means global/admin-managed**. `on_delete=CASCADE` |
| `DeleteMyAccountRequest` | `user/models.py:318-366` | `BigAutoField` PK (unlike its UUID siblings). Status choices at `:319-323` |

## Services

| Callable | File · Line | Behaviour |
|---|---|---|
| `upsert_saved_address(user, shipping_address, port, anchorage)` | `user/user_generics.py:207-246` | Upserts on the natural key `(user, port, anchorage, vessel_name)`, forces `is_default=True`, then demotes every other default for that user — inside `transaction.atomic()` |
| `_resolve_vessel_port_anchorage(attrs)` | `user/serializers.py:130-157` | Shared port/anchorage resolution for add + update. Partial-safe: omitting both keys leaves the existing location untouched; explicit `null` clears it. An anchorage **overrides** a supplied port |
| `manage_gate(user, order)` | `admin_panel/order_ownership.py:31-55` | Admin order-ownership gate — 409 if unclaimed, 403 if another admin owns it |
| `mark_reviewed(admin, status, note)` | `user/models.py:352-360` | Records an admin decision on a deletion request |

## Signals · Celery tasks · Notifications

**None, on all three counts.** No signal receiver, no Celery task, and no
`Notification` row, email, or push is produced anywhere in this flow — including when
an account-deletion request is filed or reviewed.

## WhatsApp number verification — owned by Flow 01

`POST /api/v1/user/whatsapp/send-otp/` and `.../verify-otp/` are a **profile** step
(they issue no token) but are documented as APIs 5 and 6 of
[`01-authentication.md`](./01-authentication.md), since they share that flow's OTP
infrastructure. They are **referenced, not re-documented here**. The overlap is
recorded as BFO-1 in the Flow 01 validation report.

---

# Phase 2 — Discover the Complete Flow

## Sequence diagram

```
SAILOR ONBOARDING (continues from Flow 01)
──────────────────────────────────────────
GET /user/get-profile/
  │ vessel_profile_completed == false
  ▼
[optional] POST /user/whatsapp/send-otp/ → verify-otp/     ← Flow 01, APIs 5-6
  │
POST /user/add-vessel-profile/
  │ 400 if one already exists (OneToOne)
  │ _resolve_vessel_port_anchorage → 400 on bad port/anchorage
  │ CREATE VesselProfile
  │ ── separate, NON-atomic write ──▶ user.vessel_profile_completed = True
  ▼
GET /user/get-profile/  → vessel_profile_completed == true  ──▶ Flow 5 (Order Intent)


ONGOING ACCOUNT MANAGEMENT
──────────────────────────
PATCH /user/update-profile/          (PATCH only — no PUT)
  └─ writes User + get_or_create(Address)

GET   /user/get-vessel-profile/      PATCH /user/update-vessel-profile/  (PATCH only)
                                       └─ never touches vessel_profile_completed

GET   /orders/saved-addresses/       ← READ-ONLY. Hard [:5] slice, no pagination.
   ▲                                    No create/update/delete endpoint exists.
   └── written implicitly by upsert_saved_address on order-create / delta move


SHIP-AGENT DIRECTORY (read-shared, write-private)
─────────────────────────────────────────────────
SAILOR                                  ADMIN
GET  /user/ship-agents/                 GET  /superadmin/ship-agents/?scope=&search=
  │  returns EVERY non-deleted agent      │  same rows + owner_email, orders_count
  │  (own + global + other sailors')      │
POST /user/ship-agents/create/          POST /superadmin/ship-agents/create/
  │  owner = caller                       │  owner = NULL  (always global)
PUT/PATCH /user/ship-agents/<pk>/update/ PUT/PATCH /superadmin/ship-agents/<id>/update/
  │  owner=caller enforced → 404          │  UNSCOPED — may edit any agent
  │  (no customer DELETE exists)         DELETE /superadmin/ship-agents/<id>/delete/
                                          │  soft delete; 200, not 204
                                        POST /superadmin/ship-agents/order/<id>/set/
                                          │  manage_gate → 409 unclaimed / 403 wrong owner
                                          │  409 if order DELIVERED/CANCELLED/REFUNDED
                                          ▼ sets Order.ship_agent + re-snapshots


ACCOUNT DELETION (review queue only — nothing is deleted)
─────────────────────────────────────────────────────────
SAILOR                                  PARTNER
POST /user/request-account-deletion/    POST /partner/request-account-deletion/
  │  IsAuthenticated ONLY                 │  IsAuthenticated + IsDeliveryPartner
  │  NO duplicate guard                   │  duplicate-open guard → 400
  ▼                                       ▼
        DeleteMyAccountRequest(status="pending")
                     │
                     ▼ Django admin action only (no API, no task, no email)
              mark_reviewed → approved / rejected
                     │
                     └── account stays fully active. Nothing is deactivated.
```

## API sequence table

| Step | Platform | API | Purpose | Next |
|---|---|---|---|---|
| 1 | SAILOR | `GET /api/v1/user/get-profile/` | Read profile + `vessel_profile_completed` | 2 or 4 |
| 2 | SAILOR | `POST /api/v1/user/add-vessel-profile/` | Create the vessel record; flips the flag | 3 |
| 3 | SAILOR | `GET /api/v1/user/get-vessel-profile/` | Read it back (nested port/anchorage) | Flow 5 |
| 4 | SAILOR | `PATCH /api/v1/user/update-profile/` | Edit personal details + `Address` | — |
| 5 | SAILOR | `PATCH /api/v1/user/update-vessel-profile/` | Edit the vessel record | — |
| 6 | SAILOR | `GET /api/orders/saved-addresses/` | Read the 5 most recent delivery addresses | Flow 5 |
| 7 | SAILOR | `GET /api/v1/user/ship-agents/` | Browse the agent directory | 8 or Flow 5 |
| 8 | SAILOR | `POST /api/v1/user/ship-agents/create/` | Add a personal agent | 9 |
| 9 | SAILOR | `PUT/PATCH /api/v1/user/ship-agents/<pk>/update/` | Edit an agent the caller owns | — |
| 10 | SAILOR | `POST /api/v1/user/request-account-deletion/` | File a deletion request | — (terminal) |
| 11 | PARTNER | `GET/PATCH /api/partner/profile/` | Read / edit own partner profile | — |
| 12 | PARTNER | `POST /api/partner/request-account-deletion/` | File a deletion request | — (terminal) |
| 13 | ADMIN | `GET /api/superadmin/ship-agents/` | List with `scope` + `search` | 14–17 |
| 14 | ADMIN | `POST /api/superadmin/ship-agents/create/` | Create a **global** agent | — |
| 15 | ADMIN | `PUT/PATCH /api/superadmin/ship-agents/<id>/update/` | Edit **any** agent | — |
| 16 | ADMIN | `DELETE /api/superadmin/ship-agents/<id>/delete/` | Soft-delete any agent | — |
| 17 | ADMIN | `POST /api/superadmin/ship-agents/order/<order_id>/set/` | Bind/clear an agent on an order | Flow 10 |

## The ownership matrix — one table to hold onto

| Operation | Own agent | Another sailor's | Global (`owner = NULL`) |
|---|---|---|---|
| Sailor: **see** in list | ✅ | ✅ | ✅ |
| Sailor: **select** on an order | ✅ | ✅ | ✅ |
| Sailor: **edit** | ✅ | ❌ 404 | ❌ 404 |
| Sailor: **delete** | ❌ *no endpoint exists* | ❌ | ❌ |
| Admin: edit / delete | ✅ | ✅ | ✅ |

The directory is **read-shared and write-private**. Editability is enforced solely by
the `owner=request.user` predicate on the update lookup (`user/views.py:726`), which
returns **404 rather than 403** so the endpoint does not reveal whether an id exists.

---

# Phase 3 — API Documentation

## Flow-wide conventions

| Header | Applies to | Notes |
|---|---|---|
| `Content-Type: application/json` | All write endpoints except API 4 | |
| `Content-Type: multipart/form-data` | API 4 **when sending `profile_picture`** | It is a real file upload, not a path string |
| `server-secret-key: <SERVER_SECRET_KEY>` | `/api/v1/…`, `/api/orders/…`, `/api/partner/…` | **`/api/superadmin/…` is exempt** |
| `Authorization: Token <key>` | All 17 | No endpoint in this flow is public |

- **Error bodies are not uniform.** The `user`-app views are hand-rolled and return
  `{"error": …}`, `{"message": …}`, or a bare DRF error dict depending on the branch.
  Partner and admin endpoints return DRF shapes. **Branch on the HTTP status, never on
  the key.**
- `NON_FIELD_ERRORS_KEY` is `"message"` (`settings.py:198`), so serializer-level
  `validate()` errors surface under `message`, not `non_field_errors`.
- **Timestamp formats differ across this flow.** Ship-agent responses return
  **pre-formatted strings** (`"July 20, 2026, 03:45 PM"`) from `created_at_display`;
  vessel-profile responses return **raw ISO-8601**. Do not write one parser for both.

---

## API 1 · Get the sailor profile

| Field | Value |
|---|---|
| **Purpose** | Read the profile, including the flag that gates ordering |
| **Endpoint** | `/api/v1/user/get-profile/` · **`GET`** |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`user/views.py:188`) |
| **Path / Query Parameters** | None |

**Success — 200**
```json
{
  "message": "User profile",
  "user": {
    "email": "sailor@example.com", "role": "customer",
    "first_name": "Ravi", "last_name": "Kumar",
    "date_of_birth": "1990-04-12", "gender": "male",
    "phone": "9876543210", "address": "12 Marine Drive", "city": "Mumbai",
    "state": "MH", "zip_code": "400001", "country": "India",
    "country_code": "+91", "profile_picture": "/media/profile_pictures/a.jpg",
    "whatsapp_number": "9876543210", "whatsapp_verified": true,
    "vessel_profile_completed": false
  }
}
```

> **No `id` is returned.** If the client needs the user UUID it must come from
> elsewhere.

`phone`, `address`, `city`, `state`, `zip_code`, `country` are sourced from the
reverse `Address` OneToOne (`user/serializers.py:70-75`). When the sailor has no
`Address` row, **all six return `null`** rather than erroring.

**Error Responses** — 500 `{"error": "<str(exception)>"}` only, plus framework 401/403.

**Database Changes / Notifications / Background Tasks** — None.
**Next API** — API 2 when `vessel_profile_completed` is `false`.

---

## API 2 · Add the vessel profile

| Field | Value |
|---|---|
| **Purpose** | Create the standing vessel record and flip the ordering gate |
| **Business Reason** | The completion condition of this entire flow |
| **Endpoint** | `/api/v1/user/add-vessel-profile/` · **`POST`** |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`user/views.py:345`) |
| **Path / Query Parameters** | None |

**Request Body**
```json
{
  "ship_name": "MV Ocean Explorer", "berth_number": "B-12",
  "terminal": "East Terminal", "contact_name": "Ravi Kumar",
  "contact_phone": "9876543210", "email": "ops@vessel.example",
  "imo_number": "9074729", "deck": "3", "cabin_number": "312",
  "section": "Forward",
  "port_id": "6f1c…", "anchorage_id": "b23a…"
}
```

| Field | Required | Rules |
|---|---|---|
| `ship_name` · `berth_number` · `terminal` · `contact_name` · `contact_phone` | ✅ | Max 255 / 100 / 255 / 255 / 30 |
| `email` | ✖ | Email format; nullable, blankable |
| `imo_number` | ✖ | Max 50. **No IMO checksum or format validation** |
| `deck` · `cabin_number` · `section` | ✖ | Max 50 / 50 / 100 |
| `port_id` · `anchorage_id` | ✖ | UUID, nullable |

**Port / anchorage rules** (`_resolve_vessel_port_anchorage`, `user/serializers.py:130-157`)
- Neither key present → location untouched (partial-safe).
- **An anchorage overrides the supplied port** — sending `anchorage_id` alone
  auto-populates `port` from `anchorage.port`.
- Mismatch → 400 `{"anchorage_id": ["This anchorage doesn't belong to the given port."]}`.
- Explicit `null` for both clears the fields.

**Success — 200** *(not 201)*
```json
{
  "message": "Vessel profile added successfully",
  "vessel_profile": {
    "ship_name": "MV Ocean Explorer", "berth_number": "B-12", "terminal": "East Terminal",
    "contact_name": "Ravi Kumar", "contact_phone": "9876543210",
    "imo_number": "9074729", "deck": "3", "cabin_number": "312",
    "email": "ops@vessel.example", "section": "Forward",
    "port_id": "6f1c…", "anchorage_id": "b23a…"
  }
}
```

> **The create response shape differs from API 3.** Here `port_id`/`anchorage_id` are
> **flat UUID strings**, and `id`, `created_at`, `updated_at` and the `"IMO Number"`
> alias are **absent**. Do not reuse one parser across the two.

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"message": "Vessel profile already exists"}` | One already exists (OneToOne) |
| 400 | `{"<field>": ["…"]}` | Field validation |
| 400 | `{"port_id": ["Port not found."]}` / `{"anchorage_id": ["Anchorage not found."]}` | Unknown FK |
| 500 | `{"error": "<str(exception)>"}` | Unhandled |

**Database Changes**
1. `VesselProfile` INSERT.
2. `User.vessel_profile_completed = True` — **only when currently false**
   (`user/views.py:358-360`), written as a **separate, non-atomic** save.

**State Changes** — `vessel_profile_completed` flips **once, permanently**. Nothing
resets it, and **nothing server-side reads it** — the gate is client-side, as the code
comment concedes (`user/views.py:355-357`).
**Next API** — API 3, then Flow 5.

---

## API 3 · Get the vessel profile

| Field | Value |
|---|---|
| **Endpoint** | `/api/v1/user/get-vessel-profile/` · **`GET`** |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`user/views.py:390`) |

**Success — 200**
```json
{
  "message": "Vessel profile",
  "vessel_profile": {
    "id": "9c1e…", "ship_name": "MV Ocean Explorer", "berth_number": "B-12",
    "terminal": "East Terminal", "contact_name": "Ravi Kumar",
    "contact_phone": "9876543210", "email": "ops@vessel.example",
    "imo_number": "9074729", "IMO Number": "9074729",
    "deck": "3", "cabin_number": "312", "section": "Forward",
    "port": { "id": "6f1c…", "port_name": "Port of Singapore", "port_code": "SGSIN" },
    "anchorage": { "id": "b23a…", "anchorage_name": "Eastern Anchorage" },
    "created_at": "2026-07-20T10:15:00Z", "updated_at": "2026-07-20T10:15:00Z"
  }
}
```

> **Two keys carry the IMO number.** `imo_number` may be `null`; `"IMO Number"` — with
> a space — is added in `to_representation` (`user/serializers.py:194-198`) and is
> `""` rather than `null` when absent. Both ship in every response.

`port` and `anchorage` are **nested objects** here (contrast API 2's flat UUIDs), or
`null`. `created_at`/`updated_at` are raw ISO-8601.

**Error Responses** — 404 `{"message": "Vessel profile not found"}` · 500 `{"error": …}`.
**Database Changes** — None.

---

## API 4 · Update the sailor profile

| Field | Value |
|---|---|
| **Endpoint** | `/api/v1/user/update-profile/` · **`PATCH` only** |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`user/views.py:201`) |

> ⚠️ **`PUT` returns 405.** Only `patch` is implemented (`user/views.py:202`).
> `partial=True` is hard-coded, so every field is optional.

**Request Body** — any subset of:

| Field | Notes |
|---|---|
| `first_name` · `last_name` | Max 150 |
| `date_of_birth` | `YYYY-MM-DD` |
| `gender` | **`male` / `female` / `other`** only |
| `country_code` | Max 10 |
| `profile_picture` | **A real file upload** (multipart) — DRF `ImageField`. **Not** an S3 path string |
| `phone` · `address` · `city` · `state` · `zip_code` · `country` | Written to the `Address` row |
| `email` · `role` | **Read-only — silently ignored** |

**Success — 200** — `{"message": "Profile updated successfully", "user": { …14 keys… }}`

> The returned `user` object **omits** `whatsapp_number`, `whatsapp_verified`, and
> `vessel_profile_completed`, which API 1 does return. The two profile payloads are
> different shapes — re-read API 1 after an update if you need those fields.

**Error Responses** — 400 raw DRF error dict (no wrapper key) · 500 `{"error": …}`.

> **`Address.phone` is globally unique** (`user/models.py:128`), not per-user.
> Submitting a phone another account holds surfaces as **500 with the raw database
> error text**, not a 409 or 400. See validation finding F-05.

**Database Changes** — full `User` UPDATE (no `update_fields`); `Address` row
**created on demand** via `get_or_create` and saved, only when an address key was sent.

---

## API 5 · Update the vessel profile

| Field | Value |
|---|---|
| **Endpoint** | `/api/v1/user/update-vessel-profile/` · **`PATCH` only** |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`user/views.py:371`) |

> ⚠️ **`PUT` returns 405** (`user/views.py:372`). `partial=True` hard-coded.

All 12 fields from API 2 are accepted and all are optional. Same
`_resolve_vessel_port_anchorage` rules and the same three 400 bodies.

> Sending `""` for `ship_name`, `berth_number`, `terminal`, `contact_name`, or
> `contact_phone` returns 400 *"This field may not be blank."* — omit them instead.

**Success — 200** — `{"message": "Vessel profile updated successfully", "vessel_profile": {…}}`
(same flat 12-key shape as API 2).

**Error Responses** — 404 `{"message": "Vessel profile not found"}` · 400 · 500.
**State Changes** — **`vessel_profile_completed` is never touched on update.**

---

## API 6 · List saved delivery addresses

| Field | Value |
|---|---|
| **Purpose** | The 5 most recent delivery targets, for pre-fill at order creation |
| **Endpoint** | `/api/orders/saved-addresses/` · **`GET`** |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`orders/customer_views.py:1018`) |
| **Path / Query Parameters** | None — **query params are ignored entirely** |

**Success — 200**
```json
{
  "saved_addresses": [
    {
      "id": "4d2b…",
      "port": { "id": "6f1c…", "port_name": "Port of Singapore", "port_code": "SGSIN" },
      "anchorage": { "id": "b23a…", "anchorage_name": "Eastern Anchorage" },
      "full_name": "Ravi Kumar", "phone": "9876543210", "email": "ops@vessel.example",
      "vessel_name": "MV Ocean Explorer", "imo_number": "9074729",
      "deck": "3", "cabin_number": "312", "section": "Forward",
      "delivery_instructions": "Call on arrival", "is_default": true
    }
  ]
}
```

**Read-only, and capped at 5.** There is a hard, non-configurable Python slice `[:5]`
(`orders/customer_views.py:1023`) — **not** pagination. There is no `count`, `next`,
or `previous`, no `limit`/`offset`, and **the 6th-and-older addresses are unreachable
through the API**.

> **Do not take `[0]` as the default.** The queryset is ordered `-updated_at`, which
> **overrides** the model's `["-is_default", "-created_at"]`. Scan for
> `is_default: true` instead.

**Error Responses** — none in the view; framework 401/403 only.
**Database Changes** — None. The store is written by `upsert_saved_address` during
order create and confirmed delta moves (Flows 5 and 11).

> **There is no create, update, delete, or set-default endpoint for the address book.**
> This is a known, tracked deferral, not an omission in this document.

---

## API 7 · List the ship-agent directory (sailor)

| Field | Value |
|---|---|
| **Purpose** | Browse selectable port contacts |
| **Endpoint** | `/api/v1/user/ship-agents/` · **`GET`** |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`user/views.py:710`) |
| **Query Parameters** | `page`, `page_size` (max **100**) — no search, no filter |

> 🔶 **This list is not owner-scoped.** The queryset is
> `ShipAgent.objects.filter(is_deleted=False)` (`user/views.py:713`) — it returns
> **every** non-deleted agent in the database: the caller's own, admin-created globals,
> **and every other sailor's private contacts**, including their `mobile`, `email` and
> `company`. This is deliberate — the view's docstring and
> `user/tests/test_ship_agents.py:55` both assert it, because any sailor may select any
> agent at checkout. Use `is_mine` / `is_global` to drive affordances. See validation
> finding **F-01** for the exposure this creates.

**Success — 200** — DRF paginated envelope:
```json
{
  "count": 42, "next": "…?page=2", "previous": null,
  "results": [
    {
      "id": "7a3e…", "name": "Singapore Marine Services",
      "mobile": "9876543210", "country_code": "+65",
      "email": "ops@sms.example", "company": "SMS Pte Ltd",
      "is_global": false, "is_mine": true,
      "created_at": "July 20, 2026, 03:45 PM",
      "updated_at": "July 20, 2026, 03:45 PM"
    }
  ]
}
```

| Flag | Meaning |
|---|---|
| `is_global` | `owner_id is None` — admin-managed, available to everyone |
| `is_mine` | `owner_id == request.user.id` — **the only agents the caller may edit** |

> `created_at` / `updated_at` are **pre-formatted display strings**, not ISO-8601.
> No raw timestamp is exposed anywhere in this feature.

**Database Changes** — None.

---

## API 8 · Create a ship agent (sailor)

| Field | Value |
|---|---|
| **Endpoint** | `/api/v1/user/ship-agents/create/` · **`POST`** |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`user/views.py:695`) |

**Request Body** — `{ "name": "…", "mobile": "…", "country_code": "…", "email": "…", "company": "…" }`

| Field | Required | Rules |
|---|---|---|
| `name` | ✅ | Max 255; whitespace-only rejected |
| `mobile` · `country_code` · `email` · `company` | ✖ | Max 30 / 10 / email format / 255 |

**Cross-field rule** — at least one of `mobile` or `email` must be present.

**Success — 201** — the `GetShipAgentSerializer` body, with `is_mine: true`,
`is_global: false`.

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"name": ["This field is required."]}` | Missing |
| 400 | `{"name": ["This field may not be blank."]}` | Empty string |
| 400 | `{"name": ["Name is required."]}` | Whitespace-only |
| 400 | `{"email": ["Enter a valid email address."]}` | Bad format |
| 400 | `{"message": ["Provide at least a mobile number or an email for the agent."]}` | Neither contact — keyed `message` per `NON_FIELD_ERRORS_KEY` |

**Database Changes** — one `ShipAgent` INSERT with `owner = created_by = request.user`.
**There are no uniqueness constraints**, so repeated POSTs create duplicates.

---

## API 9 · Update a ship agent (sailor)

| Field | Value |
|---|---|
| **Endpoint** | `/api/v1/user/ship-agents/<uuid:pk>/update/` · **`PUT` and `PATCH`** |
| **Authentication / Permissions** | Token / `IsAuthenticated` (`user/views.py:723`) |
| **Path Parameters** | `pk` — the agent UUID |

Both verbs are **partial** (`partial=True`, `user/views.py:727`), so `PUT` does not
require a full representation.

**Ownership** — the lookup is
`get_object_or_404(ShipAgent, id=pk, owner=request.user, is_deleted=False)`
(`user/views.py:726`). Another sailor's agent **and** a global agent (`owner = NULL`,
which can never match) both yield **404, not 403** — the endpoint does not reveal
whether the id exists.

**Success — 200** — the `GetShipAgentSerializer` body.

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 404 | `{"detail": "No ShipAgent matches the given query."}` | Unknown, soft-deleted, another sailor's, or global |
| 400 | `{"name": ["Name cannot be empty."]}` | Whitespace-only (note: different wording from API 8) |
| 400 | `{"email": ["Enter a valid email address."]}` | Bad format |

> Unlike API 8, this endpoint has **no cross-field contact check**. `PATCH {"mobile":
> null, "email": null}` is accepted and produces an agent with no reachable contact —
> a state the create endpoint forbids. See validation finding F-07.

**Database Changes** — one full-row UPDATE. `owner` and `created_by` are not
serializer fields and cannot be reassigned.

> **There is no sailor-facing delete endpoint.** A sailor can create and edit agents
> but can never remove one; only an admin can (API 16).

---

## API 10 · Request account deletion (sailor)

| Field | Value |
|---|---|
| **Endpoint** | `/api/v1/user/request-account-deletion/` · **`POST`** |
| **Authentication / Permissions** | Token / **`IsAuthenticated` only** (`user/views.py:567`) — **no role check** |

**Request Body** — `{ "reason": "free text" }`. `reason` is optional, read straight off
`request.data` with a `""` default. **No serializer, no type check, no length cap.**

**Success — 200** — `{"message": "Your account deletion request has been submitted"}`
*(no trailing period — the partner variant has one)*

**Error Responses** — 500 `{"error": "Something went wrong. Please try again."}`.
There is **no 400 and no 409 branch**.

> **There is no duplicate guard.** Every POST inserts another row; a client can file
> unlimited pending requests. The partner endpoint (API 12) *does* guard. See
> validation finding **F-02**.

**Database Changes** — one `DeleteMyAccountRequest` INSERT with `status="pending"`.

> **Filing a request has no effect on the account.** `is_active` is not changed, no
> Celery task runs, no signal fires, and no email or notification is sent. Admin
> "approve" in the Django admin only flips the status string. See **F-03**.

---

## API 11 · Partner profile — read and edit

| Field | Value |
|---|---|
| **Endpoint** | `/api/partner/profile/` · **`GET`** and **`PATCH`** |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsDeliveryPartner` (`partner_app/views/profile_views.py:25`) |

> `PUT`, `POST` and `DELETE` return 405.

**GET / PATCH Success — 200** — both return the same read serializer:
```json
{
  "id": "0d3f…", "partner_id": "DP-00124", "name": "Ravi Kumar",
  "email": "ravi@anchormart.example", "whatsapp_number": "9876543210",
  "country_code": "+91", "date_of_birth": "1990-04-12", "gender": "male",
  "profile_picture": "https://…/media/profile_pictures/a.jpg",
  "port": "Port of Singapore", "port_id": "6f1c…",
  "is_available": true, "joined": "2026-01-15"
}
```
`name` falls back to the email when no first/last name is set.

**PATCH accepts exactly five fields** (`partner_app/serializers/profile_serializers.py:69-75`):
`first_name`, `last_name`, `date_of_birth`, `whatsapp_number`, `country_code`.

`email`, `partner_id`, `port`/`assigned_port`, `is_available`, `can_verify`,
`can_deliver`, `role`, `gender` and `profile_picture` are **intentionally excluded**.
`is_available` has its own endpoint (Flow 28), which audit-logs each flip.

> Two client-visible quirks. **`gender` and `profile_picture` are returned but cannot
> be edited here** — read-only in practice. And **unknown keys are silently ignored,
> not rejected**: `PATCH {"email": "x@y.com"}` returns 200 with the email unchanged
> (asserted at `partner_app/tests/test_profile.py:50-54`). Clients get no feedback for
> a typo'd or forbidden field name.

**Error Responses** — 400 DRF field errors · 403 `{"detail": "Only delivery partners
can access this resource."}`.

**Database Changes** — full `User` UPDATE. The `DeliveryPartnerProfile` row is not touched.

> Changing `whatsapp_number` does **not** reset `whatsapp_verified`. See validation
> finding **F-04**.

---

## API 12 · Request account deletion (partner)

| Field | Value |
|---|---|
| **Endpoint** | `/api/partner/request-account-deletion/` · **`POST`** |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsDeliveryPartner` (`profile_views.py:66`) |

**Request Body** — `{ "reason": "free text" }`, optional, same raw read as API 10.

**Success — 200** — `{"message": "Your account deletion request has been submitted."}`

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| **400** | `{"message": "You already have a pending account deletion request."}` | A `pending` or `approved` request is already open |
| 403 | `{"detail": "Only delivery partners can access this resource."}` | Wrong role |

> The duplicate guard returns **400, not 409** (`profile_views.py:81`), even though
> this project uses 409 for duplicate-write conflicts elsewhere. Pinned by
> `partner_app/tests/test_profile.py:85`.

The guard matches `pending` **and** `approved` but not `rejected` or `completed`, so a
partner whose request was rejected may file a fresh one.

**Database Changes** — one `SELECT … EXISTS`, then at most one INSERT.

---

## API 13 · List ship agents (admin)

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/ship-agents/` · **`GET`** |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsAdminUser` (`ship_agent_views.py:41`) |
| **Query Parameters** | `scope`, `search`, `page`, `page_size` (max **50**) |

| Param | Values | Behaviour |
|---|---|---|
| `scope` | `global` \| `owned` | `global` → `owner IS NULL`; `owned` → `owner IS NOT NULL`; omitted → both. Case-insensitive, whitespace-tolerant |
| `search` | free text | Case-insensitive OR across `name`, `company`, `email`, `mobile` |

**Success — 200** — DRF paginated envelope; each item:
```json
{
  "id": "7a3e…", "name": "Singapore Marine Services", "mobile": "9876543210",
  "country_code": "+65", "email": "ops@sms.example", "company": "SMS Pte Ltd",
  "is_global": true, "owner": null, "owner_email": null,
  "created_by_email": "ops@anchormart.example", "orders_count": 12,
  "created_at": "July 20, 2026, 03:45 PM", "updated_at": "July 20, 2026, 03:45 PM"
}
```

> **The admin payload is a different shape from API 7.** It adds `owner`,
> `owner_email`, `created_by_email`, `orders_count` and **omits `is_mine`** — the admin
> views pass no request context, so it cannot be computed. A shared client-side model
> across the two lists will break.

> `orders_count` counts **all** related orders with no `is_deleted=False` filter, so it
> will not match what the admin sees in the orders list.

**Error Responses** — 400 `{"scope": ["Must be 'global' or 'owned'."]}` · 401 · 403.

---

## API 14 · Create a global ship agent (admin)

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/ship-agents/create/` · **`POST`** |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsAdminUser` (`ship_agent_views.py:71`) |

Same five input fields and the same contact rule as API 8.

> **`owner` is hardcoded to `None`** (`ship_agent_views.py:75`) — every agent created
> here is **global** and selectable by every sailor. There is no `owner` input field
> and no way to create an owned agent through the admin API. `created_by` records the
> acting admin.

**Success — 201** — the admin read body, with `is_global: true`, `owner: null`,
`orders_count: 0`.
**Error Responses** — as API 8, plus 401 · 403.

---

## API 15 · Update any ship agent (admin)

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/ship-agents/<uuid:agent_id>/update/` · **`PUT` and `PATCH`** |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsAdminUser` (`ship_agent_views.py:89`) |

Both verbs partial. The lookup is **deliberately unscoped**
(`ship_agent_views.py:92`) — an admin may edit a sailor-owned agent, which the
docstring describes as the point of an admin path (*"fixing a wrong number a partner
can't reach"*). Editing a sailor's agent **does not transfer or clear ownership**;
`owner` is not a serializer field.

Unlike API 9, this serializer **does** enforce the contact rule, with an instance
fallback: `PATCH {"company": "X"}` alone passes, while
`PATCH {"mobile": null, "email": null}` correctly 400s.

**Error Responses** — 404 `{"detail": "No ShipAgent matches the given query."}` ·
400 `{"name": ["Name is required."]}` · 400 `{"message": ["Provide at least a mobile
number or an email for the agent."]}` · 401 · 403.

---

## API 16 · Delete a ship agent (admin)

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/ship-agents/<uuid:agent_id>/delete/` · **`DELETE`** |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsAdminUser` (`ship_agent_views.py:108`) |

**Soft delete.** Sets `is_deleted=True`, `is_active=False`, `deleted_at`, `deleted_by`
(`ship_agent_views.py:110-120`). `deleted_reason` is **not** set — the endpoint accepts
no reason.

**Success — 200** *(not 204)* — `{"message": "Ship agent deleted."}`

**Not idempotent** — a second DELETE of the same id returns 404, because the lookup
filters `is_deleted=False`.

**Error Responses** — 404 `{"detail": "No ShipAgent matches the given query."}` · 401 · 403.

> **Existing orders keep working, but keep the FK.** `Order.ship_agent` is `SET_NULL`,
> but because this is a *soft* delete no SQL `DELETE` runs — so orders still point at
> the soft-deleted row, alongside their `ship_agent_snapshot`. An order-detail view
> that follows `order.ship_agent` will render a deleted agent unless it filters
> `is_deleted` itself.

> Any admin may delete any agent, including a sailor's own. The sailor has no way to
> see who did it and no way to undo it.

---

## API 17 · Bind or clear a ship agent on an order (admin)

| Field | Value |
|---|---|
| **Purpose** | Record which port contact the delivery partner should coordinate with |
| **Endpoint** | `/api/superadmin/ship-agents/order/<uuid:order_id>/set/` · **`POST`** |
| **Authentication / Permissions** | Token / `IsAuthenticated`, `IsAdminUser` (`ship_agent_views.py:126`) |
| **Path Parameters** | `order_id` |

**Request Body** — `{ "ship_agent_id": "7a3e…" }` or `{ "ship_agent_id": null }` to clear.

> The field is **required but nullable**. The key must be present — `null` is the
> explicit "clear it" signal, while **omitting the key is a 400**, not a clear.

**Evaluation order matters** — order lookup → **ownership gate** → status gate → body
validation. A malformed body against an unclaimed order returns the 409, not the 400.

**Ownership gate** (`manage_gate`, `admin_panel/order_ownership.py:31-55`) — the same
rule as every other admin order write (Flow 27): a `super_admin` may always proceed;
otherwise the caller must be the order's `assigned_admin`.

**Success — 200**
```json
{
  "message": "Ship agent updated.",
  "order_id": "3c9a…",
  "ship_agent": { …admin read body… }
}
```
Clearing returns `"Ship agent cleared."` and `"ship_agent": null`.

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 404 | `{"detail": "No Order matches the given query."}` | Unknown or soft-deleted order |
| **409** | `{"detail": "Claim this order (Manage Order) before making changes."}` | Order unclaimed |
| 403 | `{"detail": "This order is managed by another admin."}` | Another sub-admin owns it |
| **409** | `{"detail": "This order is closed — its ship agent can no longer be changed."}` | Status is `DELIVERED`, `CANCELLED`, or `REFUNDED` |
| 400 | `{"ship_agent_id": ["This field is required."]}` | Key omitted |
| 400 | `{"ship_agent_id": ["Ship agent not found."]}` | Unknown **or soft-deleted** agent |

> **Two different conditions both return 409** with different `detail` strings. A
> client that needs to distinguish them must match on the message.

> A client tested only with a `super_admin` token will **never see the 409** and will
> be surprised in production. Test with a sub-admin.

**Database Changes** — `Order.ship_agent` UPDATE plus a **re-snapshot** of
`ship_agent_snapshot` (6 keys: `id`, `name`, `mobile`, `country_code`, `email`,
`company`), so the order records who was actually contacted. Clearing sets both to
`None`. **No audit record is written** — see validation finding F-09.

> **Any** non-deleted agent may be attached. There is no check that it is global or
> that it belongs to the order's customer — an admin can attach sailor A's private
> agent to sailor B's order.

---

## What happens next

| Condition | Continue to |
|---|---|
| `vessel_profile_completed = true` | **Flow 5** — Standard & Marine Emergency Order Intent |
| Saved address selected at checkout | **Flow 5**, then **Flow 7** (Billing & Payment) |
| Ship agent bound to an order | **Flow 10** — Delivery Fulfilment & Order Tracking |
| Partner signed in and profile read | **Flow 28** — Partner Lifecycle & Availability |
| WhatsApp verification needed | **Flow 01** — APIs 5 and 6 |

---

## Source reference

| Concern | File |
|---|---|
| Profile, vessel, ship agents, account deletion (sailor) | [`user/views.py`](../../backend/user/views.py) |
| Profile / vessel / ship-agent serializers, `_resolve_vessel_port_anchorage` | [`user/serializers.py`](../../backend/user/serializers.py) |
| `upsert_saved_address` | [`user/user_generics.py`](../../backend/user/user_generics.py) |
| `User`, `Address`, `VesselProfile`, `ShipmentAddress`, `ShipAgent`, `DeleteMyAccountRequest` | [`user/models.py`](../../backend/user/models.py) |
| Django admin registrations + deletion-review actions | [`user/admin.py`](../../backend/user/admin.py) |
| Saved addresses endpoint | [`orders/customer_views.py`](../../backend/orders/customer_views.py) |
| Saved-address serializer | [`orders/customer_serializers.py`](../../backend/orders/customer_serializers.py) |
| Admin ship-agent views | [`admin_panel/views/ship_agent_views.py`](../../backend/admin_panel/views/ship_agent_views.py) |
| Admin ship-agent serializers | [`admin_panel/serializers/ship_agent_serializers.py`](../../backend/admin_panel/serializers/ship_agent_serializers.py) |
| Admin order-ownership gate | [`admin_panel/order_ownership.py`](../../backend/admin_panel/order_ownership.py) |
| Partner profile + deletion | [`partner_app/views/profile_views.py`](../../backend/partner_app/views/profile_views.py) |
| Partner profile serializers | [`partner_app/serializers/profile_serializers.py`](../../backend/partner_app/serializers/profile_serializers.py) |
| Pagination classes | [`Chat/pagination.py`](../../backend/Chat/pagination.py) · [`AnchorMart/paginators.py`](../../backend/AnchorMart/paginators.py) |
