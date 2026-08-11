# Flow 24 — Seller Onboarding & Review (Apply → Adjudicate → Resubmit)

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`24-seller-onboarding-review-validation.md`](./24-seller-onboarding-review-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint is fully specified.
>
> Index: [`../../BUSINESS_FLOWS.md`](../../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

---

# Executive Summary

A sailor applies to sell on AnchorMart; an admin adjudicates. **Both halves are documented
here** — §24 is explicitly a two-actor journey, and splitting the submission from the decision
would force a reader to hold two documents open to understand either.

The journey is three states and one loop:

```
        applies                 approve
  ──────────────► pending ─────────────────► approved   (terminal)
                    │  ▲          reject
                    │  └──────────────────────┐
                    └───────────────────────► rejected
                             resubmit (applicant fixes and reapplies)
```

Two rules shape it:

- **The applicant supplies facts; only an admin supplies the verdict.** `seller_profile_status`
  and `admin_note` are read-only on every applicant-facing path. An application always enters
  the queue at `pending`, whatever the payload says.
- **Rejection is not the end.** The admin must write a note saying what was wrong, and the
  applicant may fix it and resubmit. Their profile is **reused**, not duplicated.

| | |
|---|---|
| **Actors** | Customer (applicant) · Admin · Super Admin |
| **Endpoints** | **6** — 2 applicant · 4 admin |
| **Django Apps** | `user` (models, applicant side), `admin_panel` (review side) |
| **Models** | `SellerProfile`, `SellerProfileFiles`, `User`, `AuditLog` |
| **Trigger** | "Become a seller" submission |
| **Previous Flow** | 26 (media upload — documents arrive as *paths*) · 1 (the account) |
| **Next Flow** | 31 (the account this attaches to) · 33 (the pending count feeds the action-required worklist) |
| **Documentation Version** | 1.0 — 2026-07-30 |
| **Documentation Status** | ✅ 6 routes fully specified. Routes from the running route table; **behaviour verified by EXECUTING every endpoint** against a real database. Includes the **SEC-2** fix and the re-application capability added during this pass. |

---

## ⚠️ Approval currently grants nothing

An `approved` seller profile is **a recorded decision, not a capability**. There is no
seller-facing API surface, approval does **not** change the user's `role`, and nothing in the
platform gates behaviour on `seller_profile_status`. The only readers are this flow's own admin
screens, the Django admin, and Flow 33's action-required count of `pending` applications.

This is deliberate — the seller surface is not built. It is documented here so a future audit
does not read it as a missing side-effect, and so that whoever *does* build that surface knows
they are the first consumer of this field.

---

# Concepts you need before reading the endpoints

### Documents are paths, not uploads

Like every other file in this system, the three document fields take a **relative path string**
produced by the Flow 26 presigned upload — never a file. Each has its own fixed directory,
validated on submission:

| Field | Required path prefix | What it is |
|---|---|---|
| `seller_profile_picture` | `seller_profile_pictures/` | The business's display picture |
| `image` | `seller_profile_images/` | A supporting image |
| `file` | `seller_documents/` | The registration/licence document |

A wrong prefix is a **400**. All three are optional — an application with no documents is
accepted (the admin can then reject it asking for them).

### One profile per user

`SellerProfile.user` is a **OneToOne**. A user has at most one application row, ever; a
resubmission **reuses** it rather than creating a second.

### `status` vs `is_active` — two different things

Every admin read returns both, and they answer different questions:

| Field | Means |
|---|---|
| `status` | The **seller approval** workflow: `pending` / `approved` / `rejected` |
| `is_active` | Whether the underlying **account** is blocked (Flow 31) |

An approved seller can still be a blocked account.

---

# Endpoints — full specification

## Applicant side

**Headers:** `Authorization: Token <token>` **and `server-secret-key`** — these are
`/api/v1/` routes and are **not** exempt from the middleware.

---

## 1 · `POST /api/v1/user/register-seller-profile/` — Apply, or resubmit

| Field | Type | Required | Rule |
|---|---|---|---|
| `company_name` | string | ✅ | Max 255. |
| `contact_person_name` | string | ✅ | Max 255. |
| `contact_person_phone` | string | ✅ | Max 30. |
| `contact_person_email` | email | ✅ | |
| `company_registration_number` | string | ❌ | Max 100. |
| `company_address` | string | ❌ | Free text. |
| `company_information` | string | ❌ | Free text. |
| `seller_profile_picture` | string | ❌ | Path must start with **`seller_profile_pictures/`**. |
| `image` | string | ❌ | Path must start with **`seller_profile_images/`**. |
| `file` | string | ❌ | Path must start with **`seller_documents/`**. |
| `user` | — | — | Taken from the token. Not accepted — you cannot apply on someone's behalf. |
| `seller_profile_status` | — | — | **Read-only.** Sending it is ignored; the application always enters at `pending`. |
| `admin_note` | — | — | **Read-only.** The verdict is the admin's word. |

**What happens depends on whether a profile already exists:**

| Existing state | Result |
|---|---|
| None | New profile created at `pending` |
| **`rejected`** | **Resubmission** — the profile is reused, updated with the new details, and reset to `pending` |
| `pending` | **400** `{"message": "Your seller application is already pending."}` |
| `approved` | **400** `{"message": "Your seller application is already approved."}` |

```json
{
  "company_name": "Probe Marine Supplies",
  "company_registration_number": "SG-99881",
  "company_address": "12 Keppel Rd, Singapore",
  "company_information": "Ship chandlery since 1998",
  "contact_person_name": "Ann Chor",
  "contact_person_phone": "5551234",
  "contact_person_email": "ann@probe.test",
  "seller_profile_picture": "seller_profile_pictures/logo.jpg",
  "image": "seller_profile_images/storefront.jpg",
  "file": "seller_documents/registration.pdf"
}
```

**Response `201`** — note the message differs so the client can tell the two apart:

```json
{
  "message": "Seller profile registered successfully",
  "seller_profile": { "id": 1, "company_name": "…", "seller_profile_status": "pending",
                      "admin_note": "", "files": [ … ], "created_at": "…" }
}
```

A resubmission returns `"Seller application resubmitted successfully"`.

**On resubmission, specifically:**

- The **new documents replace the old ones** — but only if any were supplied. Keeping both
  sets would leave the reviewer unable to tell which they are judging.
- The **previous rejection note is kept** on the profile. A reviewer looking at a resubmission
  wants to see what the applicant was told to fix. It is overwritten by the next decision, so a
  stale reason cannot survive onto an approved profile.
- An `AuditLog` entry (`SELLER_REQUEST_RESUBMITTED`) is written with the **applicant** as actor.

**Errors**

| Status | Body | Cause |
|---|---|---|
| `400` | `{"company_name": ["This field is required."]}` | Missing required field |
| `400` | `{"file": ["Invalid document path. Expected a path starting with 'seller_documents/', got '…'."]}` | Wrong prefix (same shape for the other two) |
| `400` | `{"message": "Your seller application is already pending."}` | Duplicate while under review |
| `401` | — | No token |

---

## 2 · `GET /api/v1/user/seller-request-details/` — Track my application

No params. Returns the caller's own application, or a message when they have none.

**Response `200`:**
```json
{
  "message": "Seller profile details",
  "seller_profile": {
    "id": 1, "user": "ebbe…",
    "company_name": "Probe Marine Supplies",
    "company_registration_number": "SG-99881",
    "company_address": "…", "company_information": "…",
    "contact_person_name": "Ann Chor", "contact_person_phone": "5551234",
    "contact_person_email": "ann@probe.test",
    "seller_profile_status": "rejected",
    "admin_note": "Registration document was unreadable — please re-upload.",
    "created_at": "2026-07-30T11:04:00Z",
    "files": [
      { "id": "3:file", "field": "file", "category": "document", "kind": "pdf",
        "url": "https://…/seller_documents/registration.pdf",
        "filename": "registration.pdf", "created_at": "July 30, 2026, 11:04 AM" }
    ]
  }
}
```

`admin_note` is how the applicant learns **why** they were rejected and what to fix — it is the
input to a resubmission via §1.

Each file is emitted as its **own entry** with a `kind` (`pdf`, `image`, …) so the client can
render them individually, rather than one combined row per upload batch.

---

## Admin side

**Headers:** `Authorization: Token <token>` — role `admin` or `super_admin`.
`/api/superadmin/` is **exempt** from `server-secret-key` — do **not** send it.
Both tiers have identical rights here.

**Pagination:** `page`, `page_size` — default **10**, max **50**.

---

## 3 · `GET /api/superadmin/sellers/stats/` — Queue cards

No params.

```json
{ "pending": 7, "approved": 23, "rejected": 4, "active_sellers": 21 }
```

| Field | Exactly what it counts |
|---|---|
| `pending` / `approved` / `rejected` | Non-deleted profiles in that state. |
| `active_sellers` | `approved` **and** the underlying account is `is_active=True` — approved sellers whose account has since been blocked are excluded. |

---

## 4 · `GET /api/superadmin/sellers/requests/` — The review queue

| Query param | Type | Allowed values | Default | Meaning |
|---|---|---|---|---|
| `status` | string | **`pending`** · **`approved`** · **`rejected`** — anything else → **400** | no filter | |
| `search` | string | free text | — | Case-insensitive on **`company_name`, the user's `email`, `first_name`, `last_name`**. |
| `page` / `page_size` | int | 1–50 | 10 | |

Ordered **newest first**.

**Response `200`:**
```json
{
  "id": 12,
  "user_id": "ebbe…",
  "full_name": "Ann Chor",
  "email": "ann@example.com",
  "whatsapp_number": "5551234",
  "business": "Probe Marine Supplies",
  "status": "pending", "status_display": "Pending",
  "is_active": true,
  "submitted_at": "July 30, 2026, 11:04 AM"
}
```

`id` is an **integer**. `business` is `company_name` under a screen-friendly name.

---

## 5 · `GET /api/superadmin/sellers/request/` — One application, with documents

| Query param | Type | Required |
|---|---|---|
| `user_id` | UUID | ✅ |

Returns the §4 row plus everything the admin needs to judge it:

```json
{
  "id": 12, "user_id": "ebbe…", "full_name": "Ann Chor",
  "email": "ann@example.com", "whatsapp_number": "5551234",
  "company_name": "Probe Marine Supplies",
  "company_registration_number": "SG-99881",
  "company_address": "12 Keppel Rd, Singapore",
  "company_information": "Ship chandlery since 1998",
  "contact_person_name": "Ann Chor",
  "contact_person_phone": "5551234",
  "contact_person_email": "ann@probe.test",
  "status": "pending", "status_display": "Pending",
  "is_active": true,
  "admin_note": "",
  "submitted_at": "July 30, 2026, 11:04 AM",
  "documents": [
    { "id": 3,
      "seller_profile_picture": "https://…/seller_profile_pictures/logo.jpg",
      "image": "https://…/seller_profile_images/storefront.jpg",
      "file": "https://…/seller_documents/registration.pdf" }
  ]
}
```

> `documents` here is one entry **per upload row** with all three URLs. The applicant's own view
> (§2) flattens the same data into one entry **per file** with a `kind`. Two shapes, two
> audiences — the admin reviews a submission, the applicant reviews their files.

**On a resubmission**, `admin_note` still holds the **previous** rejection reason while `status`
is `pending`. That is deliberate: it tells the reviewer what the applicant was asked to fix.

**Errors** — `400` missing or malformed `user_id` · `404` no application for that user.

---

## 6 · `POST /api/superadmin/sellers/set-status/` — Approve or reject

| Field | Type | Required | Rule |
|---|---|---|---|
| `user_id` | UUID | ✅ | The applicant. |
| `status` | choice | ✅ | **`approved`** or **`rejected`** only — `pending` is not settable here. |
| `admin_note` | string | conditional | **Required (non-blank) when rejecting.** Optional on approval, where it **overwrites** any previous note. |

**Only a `pending` application can be decided.** The row is **locked** for the decision and the
state re-checked inside that lock, so two admins clicking opposite buttons cannot both succeed.

**Response `200`** — the §5 detail shape, refreshed.

**Errors**

| Status | Body | Cause |
|---|---|---|
| `400` | `{"admin_note": ["A note is required when rejecting a seller request."]}` | Rejection with no note |
| `400` | `{"status": ["\"banana\" is not a valid choice."]}` | Not `approved`/`rejected` |
| `400` | `{"user_id": ["Must be a valid UUID."]}` | Malformed id |
| `404` | `{"detail": "Seller request not found."}` | No application for that user |
| `409` | `{"detail": "This request is already approved."}` | Already decided — a decision is once-only |

**Audit.** Every decision writes `SELLER_REQUEST_REVIEWED` against the **applicant's account**,
carrying the decision, the status it moved `from`, the company name and the note. A refused
(409) attempt writes nothing.

---

# How Flow 24 connects

- **Upstream — Flow 26 (Media Upload):** the three document fields take **path strings** from
  the presigned upload, each prefix-validated against its own directory.
- **Upstream — Flow 1 (Authentication):** the applicant must be a signed-in user; the profile
  hangs off that account.
- **Sideways — Flow 31 (User Account Administration):** `is_active` on every read here is that
  flow's account-block flag. Deleting the account cascades to the profile (`OneToOne`,
  `on_delete=CASCADE`), and `create-user` there is how a `seller`-role account is provisioned
  directly, bypassing this application journey.
- **Downstream — Flow 33 (Dashboard):** the count of `pending` applications feeds the
  action-required worklist — the one place outside this flow that reads
  `seller_profile_status`.
- **Downstream — Flow 34 (Audit Trail):** writes `SELLER_REQUEST_REVIEWED` (admin decision) and
  `SELLER_REQUEST_RESUBMITTED` (applicant resubmission). Both `operational` category, pruned
  after 365 days.
