# Flow 25 — Help & FAQ (Curate types → Publish answers → Sailor reads)


> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`25-help-and-faq-validation.md`](./25-help-and-faq-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint is fully specified.
>
> Index: [`../../BUSINESS_FLOWS.md`](../../BUSINESS_FLOWS.md)


> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**


---


# Executive Summary


Publish an answer once; serve it to every sailor. Two levels, created in order:


**FAQ type → FAQ.** An admin creates a *type* (the category lookup), then authors FAQs against
it. A sailor browses the types, then the FAQs in a type, then one FAQ.


The one thing to understand before reading anything else:


> ### `FAQType` is the source of truth; `HelpAndFAQ.faq_type` is a copy of its **name**
>
> `HelpAndFAQ.faq_type` is a **`CharField` holding the type's name**, not a foreign key. That
> is deliberate — it kept the original sailor endpoints working when the managed type lookup
> was introduced.
>
> The two are kept in step by the application: **renaming a type rewrites the string on every
> FAQ that references it**, atomically. So the table owns the truth and the string follows it.
> Every rule below falls out of that: types are matched case-insensitively, a type cannot be
> deleted while FAQs reference it, and the sailor's type list is read from `FAQType` rather
> than derived from the strings.


| | |
|---|---|
| **Actors** | Admin · Super Admin · Customer (sailor) |
| **Endpoints** | **12** — 4 type CRUD · 5 FAQ CRUD · 3 sailor reads |
| **Django Apps** | `user` (models + sailor reads), `admin_panel` (curation) |
| **Models** | `FAQType`, `HelpAndFAQ` |
| **Trigger** | Admin curates the knowledge base; sailor opens Help |
| **Previous Flow** | 31 (the admin account doing the curating) |
| **Next Flow** | 23 (support chat — the escalation when Help doesn't answer it) |
| **Documentation Version** | 1.0 — 2026-07-30 |
| **Documentation Status** | ✅ 12 routes fully specified. Routes from the running route table; **behaviour verified by EXECUTING every endpoint** against a real database, across two probes. |


---


# Concepts you need before reading the endpoints


### Type names are case-insensitively unique


`General`, `GENERAL` and `general` are **one** name. Creating or renaming a type to a
case-variant of an existing one is a **400**. This matters more than it looks: because
`faq_type` stores the *name*, two types differing only by case would be two distinct filter
values that a human reads as one category.


**A deleted type's name stays reserved.** `FAQType.name` is `unique=True` at the database
across deleted rows too, so soft-deleting `Billing` means `Billing` cannot be created again.
(Same behaviour as coupon codes in Flow 30.)


### An FAQ's type must exist and be live


`faq_type` on create/update is matched **case-insensitively** against the non-deleted
`FAQType` rows, and the type's **canonical name** is what gets stored — so submitting
`"general"` against a type named `General` stores `General`. An unknown or soft-deleted type
is a **400**.


### Deleting a type is blocked while it is in use


`DELETE types/delete/<pk>/` returns **409** while any non-deleted FAQ still references the
type. Reassign or delete those FAQs first.


### Soft delete


Both models are soft-deleted — all four `GenericModel` fields are set (`is_deleted`,
`is_active=False`, `deleted_at`, `deleted_by`). Nothing is ever hard-deleted, and every list
and lookup filters `is_deleted=False`.


### What a sailor can see


Sailor reads are scoped to **live and active** rows (`is_deleted=False, is_active=True`) and
paginated. An FAQ toggled inactive disappears from every sailor surface immediately, without
being deleted.


---


# Endpoints — full specification


## Admin side


**Headers:** `Authorization: Token <token>` — role `admin` or `super_admin`.
`/api/superadmin/` is **exempt** from `server-secret-key` — do **not** send it. Both admin
tiers have identical rights throughout this flow.


**Pagination:** `page`, `page_size` — default **10**, max **50**.


---


## 1 · `GET /api/superadmin/faq/types/` — All types (the authoring dropdown)


| Query param | Type | Meaning |
|---|---|---|
| `search` | string | Case-insensitive **contains** match on `name`. |
| `page` / `page_size` | int | 1–50, default 10. |


Ordered by **`name` ascending**. Soft-deleted types are excluded.


```json
{ "id": 1, "name": "Getting Started",
 "created_at": "July 31, 2026, 09:26 AM",
 "updated_at": "July 31, 2026, 09:26 AM" }
```


---


## 2 · `POST /api/superadmin/faq/types/add/` — Create a type


| Field | Type | Required | Rule |
|---|---|---|---|
| `name` | string | ✅ | Max 50, non-blank after trimming. **Case-insensitively unique** across all types, including soft-deleted ones. |


**Response `201`** — the §1 shape.


**Errors**


| Status | Body | Cause |
|---|---|---|
| `400` | `{"name": ["An FAQ type with this name already exists."]}` | Any case-variant of an existing name |
| `400` | `{"name": ["Name cannot be blank."]}` | Blank or whitespace-only |
| `400` | `{"name": ["This field is required."]}` | Omitted |
| `400` | `{"name": ["Ensure this field has no more than 50 characters."]}` | Too long |


---


## 3 · `PUT` / `PATCH` `/api/superadmin/faq/types/update/<int:pk>/` — Rename


**Both verbs are partial.**


| Field | Type | Required | Rule |
|---|---|---|---|
| `name` | string | ❌ | Same rules as §2; this type is excluded from its own uniqueness check, so re-sending its own name (in any case) is fine. |


> **A rename cascades.** Every FAQ whose `faq_type` matches the old name — **including
> soft-deleted ones** — is rewritten to the new name, in the **same transaction** as the
> rename. The two can never be left disagreeing.
>
> Soft-deleted FAQs are included deliberately: one left holding the old name would resurrect a
> dangling type reference if it were ever restored.


**Response `200`** — the §1 shape. **Errors** — §2's, plus `404` for an unknown or deleted type.


---


## 4 · `DELETE /api/superadmin/faq/types/delete/<int:pk>/` — Soft-delete a type


No body. Sets all four soft-delete fields.


**Response `200`:** `{"message": "FAQ type deleted successfully."}`


**Errors**


| Status | Body | Cause |
|---|---|---|
| `409` | `{"detail": "Cannot delete a type that FAQs still use. Reassign or delete those FAQs first."}` | A non-deleted FAQ still references it |
| `404` | `{"detail": "No FAQType matches the given query."}` | Unknown, or already deleted |


> The name is **not** released — see the concepts section.


---


## 5 · `GET /api/superadmin/faq/list/` — All FAQs, for management


Unlike the sailor list, this **includes inactive** FAQs — it is the authoring view.


| Query param | Type | Allowed values | Default | Meaning |
|---|---|---|---|---|
| `faq_type` | string | a type name | no filter | **Exact** match on the stored name (not `iexact`). |
| `is_active` | string | `true` `1` `yes` `t` / `false` `0` `no` `f` (case-insensitive); **anything else → 400** | no filter | |
| `search` | string | free text | — | Case-insensitive match on **`question` OR `answer`**. |
| `page` / `page_size` | int | 1–50 | 10 | |


Ordered **newest first** (`-created_at`).


```json
{ "id": 1, "faq_type": "Getting Started",
 "question": "How do I order?", "answer": "Tap order.",
 "is_active": true,
 "created_at": "July 31, 2026, 09:26 AM",
 "updated_at": "July 31, 2026, 09:26 AM" }
```


---


## 6 · `POST /api/superadmin/faq/create/` — Publish an FAQ


| Field | Type | Required | Rule |
|---|---|---|---|
| `faq_type` | string | ✅ | Must match a **live** `FAQType` case-insensitively; the type's **canonical name** is stored. |
| `question` | string | ✅ | Max 500, non-blank. |
| `answer` | string | ✅ | Non-blank. |
| `is_active` | bool | ❌ | Default **`true`**. `false` publishes it hidden. |


**Response `201`** — the §5 shape.


**Errors**


| Status | Body | Cause |
|---|---|---|
| `400` | `{"faq_type": ["Unknown FAQ type 'X'. Create the type first, then select it."]}` | No such live type — **including a soft-deleted one** |
| `400` | `{"question": ["This field is required."]}` | Missing |
| `400` | `{"answer": ["This field may not be blank."]}` | Blank |


---


## 7 · `GET /api/superadmin/faq/detail/` — One FAQ


Takes the id as a **query parameter**.


| Query param | Type | Required |
|---|---|---|
| `faq_id` | int | ✅ |


**Response `200`** — the §5 shape.


**Errors** — `400` missing or non-integer `faq_id` · `404` unknown or soft-deleted.


---


## 8 · `PUT` / `PATCH` `/api/superadmin/faq/update/<int:pk>/` — Edit an FAQ


**Both verbs are partial.** Every §6 field is writable, all optional, same rules — including
the live-type check on `faq_type`.


**Response `200`** — the §5 shape. **Errors** — §6's, plus `404` unknown or deleted.


---


## 9 · `DELETE /api/superadmin/faq/delete/<int:pk>/` — Soft-delete an FAQ


No body. Sets all four soft-delete fields.


**Response `200`:** `{"message": "FAQ deleted successfully."}`
**Errors** — `404` unknown or already deleted.


---


## Sailor side


**Headers:** `Authorization: Token <token>` **and `server-secret-key`** — these are `/api/v1/`
routes and are **not** exempt from the middleware. Any authenticated role may read.


**Pagination:** `page`, `page_size` — default **10**, max **100** (note: a different paginator
from the admin side, with a higher ceiling).


---


## 10 · `GET /api/v1/user/help-faq-types/` — The categories a sailor can browse


No params beyond pagination. Ordered by **name ascending**.


```json
{ "count": 2, "next": null, "previous": null,
 "results": [ { "faq_type": "Billing" }, { "faq_type": "Getting Started" } ] }
```


> **Which types appear.** Read from the `FAQType` table (so a soft-deleted type can never
> appear), **filtered to types that have at least one live, active FAQ**.
>
> **A type with no published FAQs is deliberately hidden** (decision 2026-07-30) — a sailor
> should never tap into a category that renders nothing. The admin's own list (§1) shows every
> type, because that is the authoring surface. The two lists answering differently is intended,
> not a drift.


---


## 11 · `GET /api/v1/user/help-faq/` — Published FAQs


| Query param | Type | Meaning |
|---|---|---|
| `type` | string | **Exact** match on the type name. Note the param is `type` here, not `faq_type` as on the admin list. |
| `page` / `page_size` | int | 1–100, default 10. |


Scoped to `is_deleted=False, is_active=True`. Ordered **newest first**.


```json
{ "id": 1, "question": "How do I order?", "answer": "Tap order.",
 "faq_type": "Getting Started",
 "created_at": "July 31, 2026, 09:26 AM",
 "updated_at": "July 31, 2026, 09:26 AM" }
```


`is_active` is **not** exposed here — everything a sailor can see is active by definition.


---


## 12 · `GET /api/v1/user/help-faq-by-id/` — One published FAQ


| Query param | Type | Required |
|---|---|---|
| `faq_id` | int | ✅ |


**Response `200`** — note the wrapper, which differs from every other read in this flow:


```json
{ "message": "FAQ details", "faq": { /* the §11 row */ } }
```


**Errors**


| Status | Body | Cause |
|---|---|---|
| `400` | `{"error": "FAQ ID is required"}` | Omitted |
| `400` | `{"error": "FAQ ID must be an integer. Got 'abc'."}` | Non-numeric |
| `404` | `{"message": "FAQ not found"}` | Unknown, soft-deleted, **or inactive** |


---


# How Flow 25 connects


- **Upstream — Flow 31 (User Account Administration):** the admin doing the curating; both
 admin tiers may curate.
- **Downstream — Flow 23 (Support Chat):** Help exists to answer the question before a sailor
 opens a chat. A gap in the knowledge base surfaces there as support load.
- **No audit trail.** Unlike the other admin consoles documented in Wave 7, FAQ curation writes
 nothing to Flow 34's chain. Deliberate: published help text carries no money, authority or
 personal data, and its history is recoverable from the rows themselves.



