# Flow 26 — Media Upload (Presigned URL)

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`26-media-upload-validation.md`](./26-media-upload-validation.md).
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
| **Flow Name** | Media Upload (Presigned URL) |
| **Business Objective** | Move a file from a client to S3 without proxying it through the API, and make the resulting path safe for a downstream endpoint to trust |
| **Flow Type** | Supporting |
| **Primary Actors** | Admin · Super Admin · Customer (sailor) · Delivery Partner |
| **Platforms** | `ADMIN` (`/api/superadmin/admin/`) · `SAILOR` + `PARTNER` + `ADMIN` (`/api/chat/`) · `S3` |
| **Django Apps** | `admin_panel` (`admin_generics.py`, `PresignedUrlView`) · `Chat` (direct multipart) · every consuming app's serializers |
| **Models** | **None owned by this flow.** It writes a path string onto whatever model the consuming endpoint owns. `Chat.Messenger.media` is the one real `FileField` in scope |
| **Services** | `generate_presigned_post_url` (`admin_panel/admin_generics.py:5-39`) |
| **State Machines** | **None.** |
| **External Integrations** | AWS S3 (presigned POST via `boto3`) · CloudFront (read path) |
| **Total APIs** | **2** (1 admin presigned-URL minter · 1 multi-role chat multipart upload) |
| **Previous Flow** | Any flow with a screen that attaches a file — 6, 10, 13, 23, 24, 29 |
| **Next Flow** | The consuming endpoint that persists the returned path (see *Consumer directory* below) |
| **Documentation Version** | 1.0 — 2026-07-20 |
| **Documentation Status** | ✅ 2 of 2 routes documented, verified against the running application's route table. ⚠️ **The flow as described in `BUSINESS_FLOWS.md` is only partially implemented** — see the validation report before building against it |

---

# Phase 1 — Understand the Flow

## Business purpose

Large files must not travel through the API server. The intended shape is a
three-step handshake:

1. The client asks the API for a **presigned S3 POST** — a short-lived, size-bounded
   permission slip naming exactly one object key.
2. The client `POST`s the file **directly to S3** using that slip. The API server
   never sees the bytes.
3. The client submits the resulting **relative path** (e.g.
   `category_images/9f2c…_Aphoto.jpg`) to the endpoint that owns the record. That
   endpoint validates the **directory prefix** against the model's own
   `settings.<MODEL>_..._DIR_PATH` before persisting it.

Step 3's prefix check is what makes the path safe to trust: the client controls the
string, so the receiving endpoint must confirm the string points into the directory
that model is allowed to write.

**Chat is the one deliberate exception.** `POST /api/chat/upload-media/` takes a real
multipart file through the API server and stores it via Django's storage backend —
no presigned URL, no path submission.

## Entry point

| Portal | Endpoint | Shape |
|---|---|---|
| Admin | `POST /api/superadmin/admin/presigned-url/` | Presigned handshake (step 1) |
| Any authenticated user | `POST /api/chat/upload-media/` | Direct multipart |

## Exit point

| Outcome | Condition |
|---|---|
| **Success** | The object exists in S3 and its validated relative path is persisted on the owning model |
| **Failure** | 400 unknown `file_location` / malformed `file_name` / malformed `file_type` · 401 unauthenticated · 403 non-admin caller · 500 S3 client error |

## Actors

| Actor | Participation |
|---|---|
| **Admin / Super Admin** | The **only** roles that can mint a presigned URL — `PresignedUrlView` is gated `[IsAuthenticated, IsAdminUser]` (`admin_views.py:299`) |
| **Customer (sailor)** | Can upload through chat. Has **no** presigned-URL endpoint available to them |
| **Delivery Partner** | Can upload through chat. Has **no** presigned-URL endpoint available to them |
| **S3 / CloudFront** | Receives the object; serves it back on the read path |

> `BUSINESS_FLOWS.md` lists Customer and Delivery Partner as actors on the presigned
> step. The implementation does not support that today — see the validation report,
> finding **F-01**.

## Platforms

`ADMIN` · `SAILOR` · `PARTNER` · `S3`

## Django apps

| App | Role in this flow |
|---|---|
| `admin_panel` | Owns the presigned minter (`admin_generics.py`), the view (`PresignedUrlView`), and the `file_location` allow-list (`FILE_DIR_CHOICES`) |
| `Chat` | Owns the direct multipart upload and the only `FileField` in the flow |
| *consuming apps* | `catalog`, `user`, `orders`, `partner_app` — each validates the submitted path in its own serializer |

## Models

| Model | File · Class | Role |
|---|---|---|
| `Messenger` | `Chat/models.py:122` · `Messenger` | `media = FileField(upload_to="chat_media/")` (`Chat/models.py:139`). The only model this flow writes a real file to |
| *consuming models* | various | Store the submitted path in an `ImageField`/`FileField` whose `upload_to` is the matching `settings.<MODEL>_DIR_PATH` |

The presigned endpoint itself **persists nothing**. It performs no database write of
any kind — it is a pure signing service.

## Services

| Callable | File · Line | Behaviour |
|---|---|---|
| `generate_presigned_post_url(file_name, file_type, file_location)` | `admin_panel/admin_generics.py:5-39` | Builds a `boto3` S3 client with `signature_version="s3v4"`, calls `generate_presigned_post` for the exact key, and returns `{url, fields, file_future_url}`. Returns `None` on any exception (the exception is `print`ed, not logged) |

**Presigned POST policy** (`admin_generics.py:17-26`):

| Element | Value | Effect |
|---|---|---|
| `Bucket` | `settings.AWS_STORAGE_BUCKET_NAME` | |
| `Key` | the fully-built `file_key` | boto3 adds an **exact-match** key condition, so the client cannot upload to a different key |
| `Fields` | `{"Content-Type": file_type}` | Pre-filled default for the form |
| `Conditions[0]` | `["starts-with", "$Content-Type", ""]` | Matches **every** MIME type — the declared `file_type` is a suggestion, not a constraint |
| `Conditions[1]` | `["content-length-range", 1024, 157286400]` | **1 KB minimum, 150 MB maximum**, enforced by S3 |
| `ExpiresIn` | `int(settings.PRESIGNED_URL_EXPIRY)` | Slip lifetime in seconds |

## Signals

**None.**

## Celery tasks

**None.** Neither upload path enqueues background work — no thumbnailing, no
virus scan, no transcode.

## State machines

**None.**

## Notifications

**None** from the presigned path. The chat path broadcasts a `NewMessageEvent`
over the socket and sends an offline-only push nudge — but that belongs to
Flow 23, not to the upload itself.

## External integrations

| Integration | Invoked by | Notes |
|---|---|---|
| **AWS S3** | `generate_presigned_post_url` | Signed with static IAM credentials from settings (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) |
| **CloudFront** | Read path only | `MediaStorage.custom_domain = AWS_CLOUDFRONT_DOMAIN` (`AnchorMart/storages.py`), so persisted files are *served* from CloudFront |

> The presigned response's `file_future_url` is built from **`AWS_S3_CUSTOM_DOMAIN`**
> (`admin_generics.py:28`), while everything read back later comes from
> **`AWS_CLOUDFRONT_DOMAIN`**. The two are different settings. Do not treat
> `file_future_url` as the canonical display URL — read it back from the owning
> model's `get_image_url()`.

## Local development

In `DEBUG`, media is served by `serve_media_async` at `^media/(?P<path>.*)$`
(`AnchorMart/media_views.py`) — an async re-implementation of
`django.views.static.serve`, needed because the project runs under ASGI where the
stock sync file iterator raises. It is never used in production.

---

# Phase 2 — Discover the Complete Flow

## Sequence diagram

```
PRESIGNED PATH (admin only)
───────────────────────────
ADMIN                          API                              S3
  │                             │                                │
  │ POST /admin/presigned-url/  │                                │
  │  {file_location,            │                                │
  │   file_name, file_type}     │                                │
  ├────────────────────────────▶│                                │
  │                             │ IsAuthenticated + IsAdminUser  │
  │                             │ file_location ∈ FILE_DIR_CHOICES → else 400
  │                             │ file_name has ext              │
  │                             │ file_type has '/'              │
  │                             │ key = {media_root}/{loc}/{uuid}_A{base}.{ext}
  │                             │ generate_presigned_post ───────▶│
  │                             │◀─────────────── {url, fields}  │
  │◀────────────────────────────┤  200 {file_location, file_key,  │
  │   file_location =           │       presigned_url, file_name} │
  │   "{loc}/{uuid}_A{base}.ext"│                                │
  │                             │                                │
  │ POST {url} (multipart, fields + file)  ───────────────────────▶│
  │                             │              1KB ≤ size ≤ 150MB │
  │◀────────────────────────────────────────────── 204 No Content │
  │                             │                                │
  │ POST /<owning endpoint>/  { "image": "{file_location}" }      │
  ├────────────────────────────▶│                                │
  │                             │ validate_<field>: path must start
  │                             │   with settings.<MODEL>_DIR_PATH → else 400
  │                             ▼ persist path on the model
  │◀──────────────────────────── 201


CHAT PATH (any authenticated role — no presigned URL)
────────────────────────────────────────────────────
USER                           API                          storage
  │ POST /api/chat/upload-media/ (multipart)                   │
  │  file, message_type, [order_id | chat_id]                  │
  ├────────────────────────────▶│                              │
  │                             │ IsAuthenticated              │
  │                             │ file present → else 400      │
  │                             │ message_type ∈ {image,file}  │
  │                             │ resolve thread (Flow 23 rules)│
  │                             │ Messenger.objects.create ────▶│ chat_media/
  │                             │ broadcast_to_chat_sync        │
  │◀──────────────────────────── 201 + socket event            │
```

## API sequence table

| Step | Platform | API | Purpose | Next Step |
|---|---|---|---|---|
| 1 | ADMIN | `POST /api/superadmin/admin/presigned-url/` | Mint a short-lived, size-bounded S3 POST slip | 2 |
| 2 | — | `POST <presigned_url.url>` (direct to S3) | Upload the bytes. **Not an AnchorMart endpoint** | 3 |
| 3 | ADMIN | the owning endpoint (Flow 29, etc.) | Submit `file_location` as the field value; prefix is validated there | — |
| 4 | SAILOR · PARTNER · ADMIN | `POST /api/chat/upload-media/` | Direct multipart attachment — independent of steps 1–3 | Flow 23 |

## Consumer directory

There are **17** `*_DIR_PATH` settings (`settings.py:437-455`). For each: which flow
writes there, whether the presigned endpoint can mint a slip for it (`Mintable`), and
whether the receiving endpoint actually checks the prefix on submit (`Prefix checked`).

| Consuming flow | Setting | Default directory | Mintable? | Prefix checked? |
|---|---|---|---|---|
| 29 — Catalog (category) | `CATEGORY_IMAGES_DIR_PATH` | `category_images/` | ✅ | ✅ |
| 29 — Catalog (variant) | `PRODUCT_VARIANT_IMAGES_DIR_PATH` | `variant_images/` | ✅ | ⚠️ *(only on the variant endpoints)* |
| 29 — Catalog (product) | `PRODUCT_IMAGES_DIR_PATH` | `product_images/` | ✅ | ❌ |
| 2 — Profile picture | `PROFILE_PICTURES_DIR_PATH` | *(no default; env-required)* | ✅ | ❌ |
| — *(no model exists)* | `SHOP_IMAGES_DIR_PATH` | `shop_images/` | ✅ | — |
| 10 — Proof of delivery | `PROOF_OF_DELIVERY_IMAGES_DIR_PATH` | `proof_of_delivery/` | ❌ | ✅ |
| 6 — Partner suggestion photo | `SUGGESTION_IMAGES_DIR_PATH` | `suggestion_images/` | ❌ | ✅ |
| 30 — Coupon image | `COUPON_IMAGES_DIR_PATH` | `coupon_images/` | ❌ | ⚠️ *(weak — no `rstrip`)* |
| 13 — Special request | `SPECIAL_REQUEST_IMAGES_DIR_PATH` | `special_request/` | ❌ | ❌ |
| 24 — Seller documents | `SELLER_DOCUMENTS_DIR_PATH` | `seller_documents/` | ❌ | ❌ |
| 24 — Seller profile image | `SELLER_PROFILE_IMAGES_DIR_PATH` | `seller_profile_images/` | ❌ | ❌ |
| 24 — Seller profile picture | `SELLER_PROFILE_PICTURE_DIR_PATH` | `seller_profile_pictures/` | ❌ | ❌ |
| 32 — Notification image | `NOTIFICATION_IMAGES_DIR_PATH` | `notification_images/` | ❌ | ❌ |
| 16 — Review images | `PRODUCT_REVIEW_IMAGES_DIR_PATH` | `review_images/` | ❌ | — *(no write endpoint)* |
| 29 — Advertisement | `ADVERTISEMENT_IMAGES_DIR_PATH` | `advertisement_images/` | ❌ | — *(Django admin only)* |
| — *(model commented out)* | `PORT_IMAGES_DIR_PATH` | `port_images/` | ❌ | — *(dead)* |
| — *(no references at all)* | `EMERGENCY_SPARES_IMAGES_DIR_PATH` | `emergency_spares/` | ❌ | — *(dead)* |

Two facts a frontend engineer must plan around:

1. `FILE_DIR_CHOICES` (`admin_panel/serializers/admin_serializers.py:31-37`) contains
   **5 of the 17** directories. A request naming any other is rejected 400 — even
   though the consuming endpoint would accept a path there. See validation
   finding **F-02**.
2. Only **5 of 17** directories are prefix-checked on submit (4 strictly, 1 weakly).
   See validation findings **F-03** and **F-04**.

Chat media is the 18th destination and belongs to neither list — `Messenger.media`
uses a **hardcoded** `upload_to="chat_media/"` (`Chat/models.py:139`), not a setting.

> **The architecture bypasses `upload_to` by design — so serializer validation *is*
> the security boundary.** `upload_to` only runs when Django itself performs the save
> of an uploaded file object. Here the client uploads directly to S3 and later submits
> an object **key**; Django never performs that save, so `upload_to` never executes.
> This is not a bug in `upload_to` — it is the intended consequence of not proxying
> bytes through the API. The corollary is what matters: the serializer
> `validate_<field>` prefix check is the **only** thing standing between a
> client-chosen string and the field, which is why the ❌ rows above are security
> findings rather than tidiness ones.

---

# Phase 3 — API Documentation

## Flow-wide conventions

| Header | Applies to | Notes |
|---|---|---|
| `Content-Type: application/json` | API 1 | |
| `Content-Type: multipart/form-data` | API 2 | |
| `server-secret-key: <SERVER_SECRET_KEY>` | API 2 (`/api/chat/…`) | Enforced by `ServerSecurityMiddleware`. **API 1 is exempt** — `/api/superadmin/` is a middleware-exempt prefix |
| `Authorization: Token <key>` | Both | Both require an authenticated caller |

- Neither endpoint takes a path parameter or a query parameter.
- Error bodies are **not uniform**: API 1 returns `{"message": …}` for both
  validation errors and S3 failures; API 2 returns `{"error": …}` and, on the order
  thread path, `{"detail": …}`. **Branch on the HTTP status, never on the key.**

---

## API 1 · Mint a presigned S3 upload URL

| Field | Value |
|---|---|
| **Purpose** | Issue a short-lived, size-bounded permission slip for one S3 object key |
| **Business Reason** | Keeps large files off the API server. The server signs; S3 receives |
| **Endpoint** | `/api/superadmin/admin/presigned-url/` |
| **Method** | `POST` |
| **Authentication** | Token |
| **Permissions** | `IsAuthenticated`, `IsAdminUser` — **`admin` / `super_admin` only** |
| **Headers** | `Content-Type`, `Authorization` |
| **Path / Query Parameters** | None |

**Request Body**
```json
{
  "file_location": "category_images/",
  "file_name": "winter-supplies.jpg",
  "file_type": "image/jpeg"
}
```

| Field | Required | Rules |
|---|---|---|
| `file_location` | ✅ | Must be **exactly** one of the 5 values in `FILE_DIR_CHOICES`, trailing slash included — the comparison is `value not in FILE_DIR_CHOICES` (`admin_serializers.py:45`). `"category_images"` without the slash is rejected |
| `file_name` | ✅ | Must contain a `.` and must not start with one. The extension is **not** checked against an allow-list |
| `file_type` | ✅ | Must contain a `/`. Not checked against a MIME allow-list, and **not enforced at upload time** |

**Success Response — 200**
```json
{
  "file_location": "category_images/3f9c1a2e-7b64-4d18-9a05-2c8e1f6b0d47_Awinter-supplies.jpg",
  "file_key": "media/category_images/3f9c1a2e-7b64-4d18-9a05-2c8e1f6b0d47_Awinter-supplies.jpg",
  "presigned_url": {
    "url": "https://anchormart-bucket.s3.ap-south-1.amazonaws.com/",
    "fields": {
      "Content-Type": "image/jpeg",
      "key": "media/category_images/3f9c1a2e-..._Awinter-supplies.jpg",
      "x-amz-algorithm": "AWS4-HMAC-SHA256",
      "x-amz-credential": "…",
      "x-amz-date": "20260720T101500Z",
      "policy": "eyJleHBpcmF0aW9uIjoi…",
      "x-amz-signature": "…"
    },
    "file_future_url": "https://anchormart-bucket.s3.ap-south-1.amazonaws.com/media/category_images/3f9c1a2e-..._Awinter-supplies.jpg"
  },
  "file_name": "3f9c1a2e-7b64-4d18-9a05-2c8e1f6b0d47_Awinter-supplies.jpg"
}
```

**Which field do I submit downstream?** — **`file_location`.** It is the path
*relative to the media root*, so it starts with the directory the consuming
serializer validates (`category_images/…`). `file_key` includes the
`AWS_MEDIA_ROOT_DIR_NAME` prefix and will **fail** the downstream prefix check.

**Filename rewriting** — the stored name is
`{uuid4}_A{base_name}.{ext}` (`admin_views.py:308-311`). The `_A` separator is
deliberate: the comment at `admin_views.py:310` reads *"Using '_' instead of '&' to
prevent URL encoding issues."* The original base name is preserved after the
separator, so uploads stay recognisable in the bucket. Collisions are impossible.

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"message": {"file_location": ["Invalid file_location: <value>"]}}` | Not in `FILE_DIR_CHOICES` |
| 400 | `{"message": {"file_name": ["file_name must include a valid extension and base name."]}}` | No `.`, or starts with `.` |
| 400 | `{"message": {"file_type": ["file_type must be a valid MIME type (e.g., 'image/jpeg')."]}}` | No `/` |
| 400 | `{"message": {"<field>": ["This field is required."]}}` | Any field missing |
| 401 | DRF default | No/invalid token |
| 403 | DRF default | Authenticated but not `admin`/`super_admin` |
| 500 | `{"message": "Failed to generate presigned URL"}` | `generate_presigned_post_url` returned `None` (any `boto3`/credential error) |

> The 400 body nests the DRF field-error dict under `message`
> (`admin_views.py:334`), so the shape is `{"message": {"field": ["…"]}}` — one level
> deeper than the project's standard field-error shape.

**Validation Rules** (`admin_panel/views/admin_views.py` · `PresignedUrlView.post` · 298-334)
— serializer field checks only (table above). No ownership check, no quota, no rate limit.

**Database Changes** — **None.**
**Notifications / Background Tasks / State Changes** — None.
**Next API** — the direct S3 `POST`, then the owning endpoint.
**Related APIs** — every create/update endpoint that accepts an image path.

**S3 upload step (not an AnchorMart endpoint)**

`POST` to `presigned_url.url` as `multipart/form-data`, sending **every** key in
`presigned_url.fields` as a form field first, then the file itself last under the
field name `file`. S3 replies `204 No Content` on success, or `403` with an XML
`<Error>` body when the policy is violated (file smaller than 1 KB, larger than
150 MB, or the slip has expired).

---

## API 2 · Upload a chat attachment

| Field | Value |
|---|---|
| **Purpose** | Attach an image or file to a chat thread |
| **Business Reason** | The photo *is* the message — e.g. a damaged-product picture. Documented in the view's own docstring (`Chat/views.py:152-156`) |
| **Endpoint** | `/api/chat/upload-media/` |
| **Method** | `POST` |
| **Authentication** | Token |
| **Permissions** | `IsAuthenticated` — **any** role |
| **Headers** | `Content-Type: multipart/form-data`, `Authorization`, `server-secret-key` |
| **Path / Query Parameters** | None |

**Request Body** (multipart)

| Field | Required | Notes |
|---|---|---|
| `file` | ✅ | The actual bytes. **No size cap, no MIME allow-list, no extension check** |
| `message_type` | ✖ | `"image"` or `"file"`. Defaults to `"image"` |
| `message` | ✖ | Caption, stored as `Messenger.content`. Defaults to `""` |
| `order_id` *(or `order_chat_id`)* | ✖ | Targets an order thread; resolved by `get_order_chat_for_user` under Flow 23's access rules |
| `chat_id` | ✖ | **Admins only**, and only when `order_id` is absent — selects a global support thread |

Thread resolution (`Chat/views.py:174-197`):
1. `order_id` present → `get_order_chat_for_user(user, order_ref)`; an `OrderChatError`
   is returned verbatim as `{"detail": …}` with its own status.
2. Else, caller is an admin → `chat_id` **required**, resolved via `get_support_chat`.
   This helper cannot return an order thread, so an admin reaching an order thread
   must go through `order_id` and its ownership check.
3. Else → `get_or_create_support_chat(user.id)` — the caller's own support thread.

**Success Response — 201** — the created message, serialized by
`ChatMessengerDetailSerializer` (`Chat/serializers.py:68-89`):

```json
{
  "id": 4821,
  "chat": "7c2e9b41-05da-4f6e-8d13-6a9f2b7c4e08",
  "sender": "0d3f2c1a-9b8e-4d7c-a6f5-1e2b3c4d5e6f",
  "sender_name": "Ravi Kumar",
  "message_type": "image",
  "content": "Carton arrived crushed",
  "media": "https://cdn.example.com/media/chat_media/crushed-carton.jpg",
  "is_edited": false,
  "edited_at": null,
  "is_deleted": false,
  "seen_by": [],
  "created_at": "2026-07-20T10:15:00Z"
}
```

`media` is a plain DRF `FileField` — absolute when the serializer has the request in
context (it does here). `created_at` is the **raw** `DateTimeField`, not the project's
`created_at_display` convention.

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"error": "A 'file' is required."}` | No `file` part |
| 400 | `{"error": "message_type must be one of ['file', 'image']."}` | Unknown `message_type` |
| 400 | `{"error": "chat_id is required."}` | Admin caller, no `order_id` and no `chat_id` |
| 403 | `{"error": "You cannot start a support chat."}` | `get_or_create_support_chat` returned `None` |
| 404 | `{"error": "Support thread not found."}` | `chat_id` does not resolve to a global thread |
| *varies* | `{"detail": "<OrderChatError.detail>"}` | Order-thread access denied — status comes from the exception |

**Database Changes** — `Messenger` INSERT (`media` stored under `chat_media/`);
`Chat` UPDATE of `last_message`, `last_message_at`, `updated_at`.
**Notifications Triggered** — offline-only push nudge on order threads (Flow 23).
**Background Tasks Triggered** — None.
**State Changes** — None.
**Next API** — Flow 23 (chat).
**Related APIs** — API 1 (the presigned alternative this endpoint deliberately bypasses).

---

## What happens next

| Condition | Continue to |
|---|---|
| Path submitted to a catalog endpoint | **Flow 29** — Catalog & Merchandising Administration |
| Path submitted with a seller registration | **Flow 24** — Seller Onboarding & Review |
| Path submitted as proof of delivery | **Flow 10** — Delivery Fulfilment & Order Tracking |
| Path submitted with a special request | **Flow 13** — Special Request — Non-Catalog Sourcing |
| Path submitted as a substitution photo | **Flow 6** — Stock Verification & Substitution |
| Chat attachment uploaded | **Flow 23** — Real-Time Chat & Support |

---

## Source reference

| Concern | File |
|---|---|
| Presigned view, key construction | [`admin_panel/views/admin_views.py`](../../backend/admin_panel/views/admin_views.py) (`PresignedUrlView`, 298-334) |
| `boto3` signing service | [`admin_panel/admin_generics.py`](../../backend/admin_panel/admin_generics.py) |
| `file_location` allow-list, payload validation | [`admin_panel/serializers/admin_serializers.py`](../../backend/admin_panel/serializers/admin_serializers.py) (`FILE_DIR_CHOICES`, `PathToUploadFileViewSerializer`) |
| Admin role permission | [`admin_panel/admin_auth_utils.py`](../../backend/admin_panel/admin_auth_utils.py) |
| Chat multipart upload | [`Chat/views.py`](../../backend/Chat/views.py) (`ChatMediaUploadView`, 151-226) |
| `Messenger.media` | [`Chat/models.py`](../../backend/Chat/models.py) (139) |
| S3 storage backends | [`AnchorMart/storages.py`](../../backend/AnchorMart/storages.py) |
| Local media serving (DEBUG) | [`AnchorMart/media_views.py`](../../backend/AnchorMart/media_views.py) |
| Directory-path settings, S3 config | [`AnchorMart/settings.py`](../../backend/AnchorMart/settings.py) (437-475) |
