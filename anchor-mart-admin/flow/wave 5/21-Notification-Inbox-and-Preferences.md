# Flow 21 — Notification Inbox & Preferences


> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`21-notification-inbox-preferences-validation.md`](./21-notification-inbox-preferences-validation.md).
> This document describes **what the flow does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint below is fully specified. The older
> [`../NOTIFICATION_INBOX.md`](../NOTIFICATION_INBOX.md) is the **design/architecture** doc (taxonomy,
> the target contract, dedupe/retention decisions) — read it for *why*; build screens from **here**.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)


> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**


---


# Executive Summary


Give every role (customer / admin / partner) **one actionable inbox** plus **honest opt-out control**.
The subsystem is a small bounded context (`notifications/` app) with two sides:


- **Write path (the dispatcher).** A business event calls `send_notification(...)`. It validates the
 type, applies **two preference layers** — a **per-type mute** (e.g. "payment alerts off") and a
 **per-channel toggle** (`inapp` / `email` / `whatsapp`) that **only promotional** messages honour —
 then writes the `Notification` row **with its generic-FK target in the same INSERT**, and
 **best-effort** enqueues an FCM push (a Celery/broker outage never loses the in-app row).
- **Read path (the inbox).** The user lists their feed (`all` or `action_required`), marks one or all
 read, edits preferences, and can one-click **unsubscribe / resubscribe** from promo email via a
 single-use token link. Crucially, **`action_required` is derived live** from each notification's
 target's *current* state (batch-resolved to avoid N+1) — the row itself stores no "actionable" flag,
 so a "Pay Now" disappears the moment the order is paid, with no extra write.


| | |
|---|---|
| **Actors** | Customer · Admin · Delivery Partner · Background System · FCM |
| **Endpoints** | **8** — 7 under `/api/notifications/` (+ FCM token register under `/api/user/`) — fully specified below |
| **Django Apps** | `notifications` (models, dispatcher-glue, views) · `admin_panel` (`global_notifications` — the real writer) |
| **Models** | `Notification`, `NotificationPreference`, `GeneralNotification`, `UnsubscribeToken`, `FcmToken` |
| **Previous Flow** | Any business flow that raises a notification (6, 7, 10, 11, 13, …) |
| **Next Flow** | 22 (transactional messaging — email/WhatsApp fan-out) · 32 (notification campaigns) |
| **Documentation Version** | 1.1 — 2026-07-23 (FT1: `is_exact_count` on the feed envelope; FT2 `notify()` wrapper; FT3 actionable-target warn-log; FT4 FCM-register hardening) |
| **Documentation Status** | ✅ 8 routes fully specified here, verified against the running route table + serializers |


> **The load-bearing rule:** `action_required` is **live-derived from the target**, so **every
> actionable notification must be created with `target=<object>`** — a row created without a target is
> **permanently inert** (it can never show its action, silently). Delta rows target the **DeltaPayment**,
> not the order.


---


# The type taxonomy & the two preference layers


**Notification types** (`Notification.Type`): `order_update`, `payment`, `promo`, `system`,
`intent_received`, `order_assigned`, `out_of_stock`, `substitution`, `out_for_delivery`, `delivered`,
`special_request`, `back_in_stock`, `order_chat`. Each maps (via the registry) to a **category**
(`transactional` / `promotional` / `security`), a **priority**, and the **channels** it may use.


**Layer 1 — per-type mute** (`NotificationPreference` booleans, all default `true`):
`order_updates`, `payment_alerts`, `promotions`, `system_alerts`. A muted type is dropped before the
row is written.


**Layer 2 — per-channel toggle** (`inapp_enabled`, `email_enabled`, `whatsapp_enabled`, all default
`true`): **only `promotional` messages honour these.** Transactional and security messages **always**
reach you regardless of the channel toggles (so unsubscribing from promo email never silences an
order/payment update). The in-app write path therefore only gates on `inapp_enabled` for promotional
rows; `email_enabled` / `whatsapp_enabled` are consulted by the **messaging** subsystem (Flow 22), which
is why **one-click email unsubscribe only stops promotional email**.


**Push (FCM):** every type pushes **except `system`** (`system` is inbox-only). Push is best-effort.


---


# `action_required` — derived live from the target


The feed's `action_required` (and its `action` CTA) is computed at read time from the target's current
state — never stored. Registered targets:


| Target | Actionable while… | Action CTA (`label` → `screen`) |
|---|---|---|
| `Order` (payment types) | `status == payment_pending` | "Pay Now" → `payment_summary` |
| `Order` (substitution type) | `pending_customer_response` & not yet confirmed & has pending suggestions | "Review substitutions" → (order) |
| `DeltaPayment` | `status ∈ {pending, initiated}` | "Pay surcharge" → `delta_payment` |
| `SpecialRequest` | `status == quote_sent` | "Review quote" → `special_request_detail` |


Everything else resolves **inert** (`action_required = false`, `action = null`). The list view
**batch-resolves** targets (one query per content-type) so the feed is O(1) queries, not N+1.


---


# Endpoints — full specification


**Headers:** `Authorization: Token <token>` + `server-secret-key: <SERVER_SECRET_KEY>` on **all**
`/api/notifications/*` calls **except** `unsubscribe` / `resubscribe` (both are auth- **and**
secret-exempt — the single-use token in the link is the only credential). Timestamps are formatted
strings (`"July 20, 2026, 03:14 PM"`).


---


## 1 · `GET /api/notifications/` — The inbox feed


Auth: customer/admin/partner token. Returns the caller's own notifications (scoped by the row's `user`
FK), newest first, **inbox-eligible types only** (promo push-only rows never appear here).


**Query params**


| Param | Type | Default | Notes |
|---|---|---|---|
| `filter` | enum | `all` | `all` or `action_required`. Any other value → **400**. |
| `page` | int | 1 | Standard pagination. |
| `page_size` | int | 10 | Max **50**. |


**Response `200`** — standard paginated envelope; each row:
```json
{
 "count": 42, "next": "https://…/api/notifications/?page=2", "previous": null,
 "results": [
   { "id": "2b1f-…", "type": "payment", "category": "transactional", "priority": "high",
     "title": "Payment pending", "message": "Please pay $1200",
     "action_required": true,
     "action": { "label": "Pay Now", "screen": "payment_summary",
                 "object_type": "order", "object_id": "9c…" },
     "is_read": false, "created_at": "July 20, 2026, 03:14 PM" }
 ]
}
```
- `action_required` — **live-derived** from the target's current state.
- `action` — the CTA (`label`, `screen`, `object_type`, `object_id`) or **`null`** for informational rows.
- `is_read` — derived from whether the row has been read.


> **⚠️ `filter=action_required` is resolved at the PAGE level (deliberate — no materialized flag).** The
> `count` / `next` in the envelope reflect the **unfiltered** total, and a page may return **fewer than
> `page_size`** rows (even 0) while `next` still advances. The envelope therefore carries
> **`is_exact_count`**: `true` for `filter=all`, **`false` for `action_required`** — when it's `false`,
> **do not** render `count` as a badge or treat `next` as "more actionable rows"; page until `results`
> is empty. (See the validation report, FT1.) Use `filter=all` when you need exact pagination.


**Errors** — `400` bad `filter` · `401` no token · `403` missing/invalid `server-secret-key`.


---


## 2 · `POST /api/notifications/<uuid:notification_id>/read/` — Mark one read


No body. Scoped to the caller (a notification belonging to another user → 404). Idempotent (stamps the
read time only if unread). **Response `200`:** `{ "id": "<uuid>", "is_read": true, "read_at": "<iso>" }`.
**Errors** — `404` `{"detail": "Notification not found."}` (unknown **or** not the caller's).


## 3 · `POST /api/notifications/read-all/` — Mark all read


No body. One bulk update over the caller's unread rows. **Response `200`:** `{ "marked_read": <int> }`.


---


## 4 · `GET /api/notifications/preferences/` — Get preferences


No params. The preference row is created lazily (never 404s). **Response `200`:**
```json
{ "id": "…",
 "order_updates": true, "payment_alerts": true, "promotions": false, "system_alerts": true,
 "email_enabled": false, "whatsapp_enabled": true, "inapp_enabled": true,
 "created_at": "July 01, 2026, 10:00 AM", "updated_at": "July 20, 2026, 09:00 AM" }
```
First four = per-type mutes; next three = per-channel toggles.


## 5 · `PUT | PATCH /api/notifications/preferences/update/` — Update preferences


**PUT or PATCH** (both partial — omitted fields untouched). **`POST` is not allowed → 405.** Body = any
**subset** of the 7 boolean fields (`order_updates`, `payment_alerts`, `promotions`, `system_alerts`,
`email_enabled`, `whatsapp_enabled`, `inapp_enabled`). **Response `200`:** the full preferences payload
(as §4). **Errors** — `400` empty body (`"Provide at least one preference to update. Allowed fields:
…"`) · `400` non-boolean value · `405` on POST.


> **Note:** `email_enabled=false` only stops **promotional** email — you still receive transactional
> order/payment email (by design). The UI copy should say so.


---


## 6 · `GET /api/notifications/unsubscribe/?token=&email=` — One-click email unsubscribe


**GET** (it's a link in an email), **auth- and secret-exempt**, **renders HTML** (not JSON). The
single-use `token` (scoped to the `email`'s user) is the only credential; on success it sets
`email_enabled=false` and shows a page with a fresh **resubscribe** link.


**Query params** — `token` (required), `email` (required).
**Responses (HTML pages):** `200` success (or "Already Unsubscribed" if the token was used) · `400`
missing token/email or "Invalid Token" · `404` "User not found".


## 7 · `GET /api/notifications/resubscribe/?token=&email=` — One-click resubscribe


Mirror of §6 — same GET / exempt / HTML / query-param shape; sets `email_enabled=true`. Token-gated (a
bare `?email=` must not let anyone resubscribe someone else). Used-token → "Link Already Used".


---


## 8 · `POST /api/user/add-fcm-token/` — Register a device for push


Auth: any logged-in user. **Body** — `{ "fcm_token": "<device-token>" }` (required; missing → **400**
`{"error": "FCM token is required"}`). Upserts on the unique token; a token previously registered to
another user is reassigned to the caller. **Response `200`:** `{ "message": "FCM token is added
successfully" }`. *(Tokens are removed on logout.)*


---


# Data model touchpoints


| Model | Role |
|---|---|
| `Notification` | The inbox row. `type` + generic-FK `target` (`content_type`/`object_id`, same INSERT). `read_at` is the **only** stored read fact (`is_read` derived). No stored "actionable" flag — `action_required` is the live `resolve_state(target)`. |
| `NotificationPreference` | One per user (lazy). 4 per-type mutes + 3 per-channel toggles, all default `true`. |
| `GeneralNotification` | Broadcast content rows (admin). Not part of the per-user feed. |
| `UnsubscribeToken` | Single-use token backing the email unsubscribe/resubscribe links; scoped to a user. |
| `FcmToken` | A device push token (unique); reassigned to the latest user, deleted on logout. |


---


# How Flow 21 connects


- **Upstream:** every business flow that calls `send_notification(...)` (payment, delivery,
 substitution, delta, special request, chat, …). The **actionable** ones pass `target=` so the CTA
 derives; the delta targets the **DeltaPayment** (Flow 11), not the order.
- **Channel fan-out (Flow 22):** the per-channel `email_enabled` / `whatsapp_enabled` toggles are
 consumed by the **messaging** subsystem, not the in-app write path — which is why email unsubscribe
 only affects promotional email.
- **Campaigns (Flow 32):** admin-authored broadcasts reuse this taxonomy + preference gating.
- **Push:** best-effort FCM via the device tokens registered at §8; a broker outage never loses the
 in-app row.



