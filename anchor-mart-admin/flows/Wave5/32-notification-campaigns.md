# Flow 32 — Notification Campaigns (Compose → preview the audience → reach a role or everyone)

**Wave** 5 (Communications backbone) · **Type** Administrative · **Actors** Admin · Background System
**Platforms** ADMIN · SYS · FCM · SMTP
**Apps** `admin_panel`, `notifications`, `messaging`
**Models** `Notification`, `GeneralNotification`, `NotificationPreference`, `FcmToken`
**Related flows** 21 (notification inbox & preferences — the delivery surface) · 22 (transactional messaging — the email transport)

---

# Executive Summary

This flow is the admin's megaphone: compose an announcement, choose who hears it, and send. It has two shapes that look similar and behave differently.

- A **role-based send** fans out per-user in-app `Notification` rows (plus FCM push) to every active user of one role. It is the same object a sailor sees in their inbox — Flow 21 renders it.
- A **broadcast** creates one durable `GeneralNotification` announcement and optionally fans out **email** through the Flow 22 ledger. Its `category` decides whether the marketing opt-out applies.

The design idea that makes it trustworthy is the **audience preview**: before sending, an admin can ask "how many people will actually get this?" and the answer is computed with *the same eligibility rule the real send uses* — both preference layers, in SQL, so the preview cannot quietly disagree with the fan-out. This audit measured the preview against the actual send and found them **exactly equal** for the in-app path, including the awkward case of a user who has no preference row at all.

Two properties are worth understanding before using it:

- **`PROMOTIONAL` vs `SERVICE` is the legal line, not a label.** Promotional honours each user's per-channel opt-out and carries a one-click unsubscribe. Service reaches everyone *including people who opted out*, and is reserved for genuine operational notices. Because Service overrides consent, every send records `created_by` — attribution is the control.
- **Everything is enqueued, nothing is sent in the request.** Both send endpoints return **202 Accepted** immediately. The counts in the response are estimates made at request time, not delivery receipts.

**What this flow does NOT cover.** The sailor-facing inbox, preferences, unsubscribe/resubscribe and FCM token registration are Flow 21. The email transport, ledger, retries and Twilio callbacks are Flow 22. Back-in-stock announcements (`announce-availability`) are Flow 17.

---

# Phase 1 — The two send shapes

| | Role-based send | Broadcast |
|---|---|---|
| Endpoint | `POST …/send-rolebased-notification/` | `POST …/send-broadcast-notification/` |
| Reaches | one role | one role, or `all` |
| Channels | in-app + push (fixed) | admin picks: `inapp`, `email` |
| Per-user rows | ✅ one `Notification` each | ❌ in-app is one announcement row |
| History row | `GeneralNotification`, `is_active=False` (history only) | `GeneralNotification`, `is_active=True` when in-app |
| Consent model | driven by the **type's** registry category | driven by the admin's **chosen** category |
| Worker | `bulk_role_notification_task` | `broadcast_email_task` (email only) |

Both create exactly one `GeneralNotification` row, which is what the History endpoint reads. That row is the audit record; for a role send it is deliberately `is_active=False` so it is a log entry, not an announcement shown to users.

---

# Phase 2 — The eligibility rule (the part that must not drift)

Every audience question in this flow resolves through **one rule, expressed twice** — once in Python for the send, once in SQL for the preview.

**The two layers** (from `notifications/registry.py`; both apply, and a message is suppressed if *either* says so):

| Layer | Driven by | Gates |
|---|---|---|
| `pref_key` | the notification **type** | per-type mute — `order_updates`, `payment_alerts`, `promotions`, `system_alerts` |
| `category` | the type's registry entry | per-**channel** toggles (`inapp_enabled` / `email_enabled` / `whatsapp_enabled`) — **only `PROMOTIONAL` honours these** |

- **The send** applies it per user in `_create_notifications_for_users`: the `pref_key` check, then `channel_allowed(user, Channel.INBOX, category, preference=pref)`.
- **The preview** applies it in SQL via `inbox_eligibility_q(notification_type)`, built from the *same* registry functions.

**A user with no preference row counts as eligible in both.** The preview uses negated conditions (`~Q(field=False)`) so a missing row is not excluded; the send back-fills a default `NotificationPreference` for anyone missing one before gating. Verified equal by execution — see the validation report.

### Scale

`_create_notifications_for_users` walks the audience in **keyset-paginated chunks of 1000** (`id__gt`, never `OFFSET`), bulk-creates the notification rows, and pushes via **one FCM multicast per ≤500 tokens** rather than one task per user. `broadcast_email_task` uses the same keyset chunking and hands each message to Flow 22, which sends asynchronously per message.

---

# Phase 3 — API Specification

All five endpoints: `IsAuthenticated` + `IsAdminUser` (role-based — `admin` or `super_admin`). `/api/superadmin/` is exempt from `ServerSecurityMiddleware`, so no `server-secret-key` header is needed.

---

## 3.1 `GET /api/superadmin/notifications/recipient-count/` — Preview one role

How many users of one role would actually receive a given notification type.

### Query parameters

| Param | Type | Required | Allowed values |
|---|---|---|---|
| `role` | string | **Yes** | any `User.Role` value — `customer`, `seller`, `delivery_partner`, `admin`, `super_admin` |
| `type` | string | **Yes** | any `Notification.Type` value (see the list in §3.2) |

> **Both send endpoints are durable and de-duplicated (GJ3/GJ5).** A campaign is recorded and dispatched through the same transactional outbox Flow 22 uses, so a broker outage can no longer lose it silently; and an identical campaign re-submitted within `CAMPAIGN_DEDUPE_WINDOW_SECONDS` (default 120) is **not** re-sent. See §3.3/§3.4.

No pagination, no search.

### Response `200`

```json
{
  "role": "customer",
  "notification_type": "promo",
  "total_active_users_in_role": 5,
  "eligible_recipients_count": 3,
  "skipped_due_to_preferences": 2
}
```

`total` counts **active** users in the role. `eligible` applies both preference layers. `skipped` is the difference — people who muted this type or this channel.

### Errors

| Status | Body | When |
|---|---|---|
| `400` | `{"message": "Query parameters 'role' and 'type' are required."}` | either missing |
| `400` | `{"message": "Invalid role. Valid roles are: [...]"}` | unknown role |
| `400` | `{"message": "Invalid notification type. Valid types are: [...]"}` | unknown type |
| `401` / `403` | — | not authenticated / not admin-tier |

> Note the key is `message`, not `detail`, on this and every other endpoint in this flow — see the validation report.

---

## 3.2 `GET /api/superadmin/notifications/recipient-summary/` — Preview every role at once

Same question as §3.1, answered for **all roles** in one grouped query.

### Query parameters

| Param | Type | Required | Allowed values |
|---|---|---|---|
| `type` | string | **Yes** | a `Notification.Type` value |

**Valid `Notification.Type` values:** `order_update`, `payment`, `promo`, `system`, `intent_received`, `order_assigned`, `out_of_stock`, `substitution`, `out_for_delivery`, `delivered`, `special_request`, `back_in_stock`, `order_chat`, `crew_nudge`.

### Response `200`

```json
{
  "notification_type": "promo",
  "summary": [
    {"role": "customer",         "total_users": 5, "eligible_recipients": 3},
    {"role": "delivery_partner", "total_users": 2, "eligible_recipients": 2}
  ]
}
```

Roles with no active users are simply absent from `summary` (it is a grouped aggregate, not a fixed-length list) — a frontend must not assume every role appears.

### Errors
`400` when `type` is missing or unknown (`{"message": ...}`); `401`/`403` as above.

---

## 3.3 `POST /api/superadmin/notifications/send-rolebased-notification/` — Send to a role

Fans out one in-app `Notification` per eligible user, plus FCM push. Returns immediately.

### Request body

| Field | Type | Required | Rules |
|---|---|---|---|
| `role` | string | **Yes** | a `User.Role` value |
| `notification_type` | string | **Yes** | a `Notification.Type` value |
| `title` | string | **Yes** | max 255 |
| `message` | string | **Yes** | no max |
| `metadata` | object | No | free-form JSON, default `{}`; rides along on the row and in the FCM payload |

```json
{
  "role": "customer",
  "notification_type": "promo",
  "title": "Monsoon restock",
  "message": "Fresh provisions are in at Mumbai anchorage.",
  "metadata": {"campaign": "monsoon-2026"}
}
```

### Response `202 Accepted`

```json
{"message": "Notification enqueued for role: customer", "history_id": "9c1e…"}
```

`history_id` is the `GeneralNotification` row — use it to find the send in History (§3.5).

### Response `200` — duplicate suppressed (GJ5)

An identical campaign (**same role + type + title**) submitted again within the dedupe window is **not** re-sent, and no second history row is created:

```json
{
  "message": "You sent this campaign moments ago — not sent again.",
  "sent": false,
  "retry_after_seconds": 120
}
```

`200` rather than a `4xx` deliberately — nothing is wrong, the request was simply a no-op. **A frontend must branch on `sent`, not on the status code.** The message distinguishes *"You"* from *"Another admin"*, because the guard is keyed on the **campaign**, not the admin — two admins racing the same announcement is as real a case as one admin double-clicking, and the harm (a duplicate blast) is identical.

### Errors
`400` — DRF field errors (`{"role": ["\"x\" is not a valid choice."]}`). `500` — `{"message": "Could not send the notification. Please try again."}` (internal error text is never echoed).

---

## 3.4 `POST /api/superadmin/notifications/send-broadcast-notification/` — Broadcast

### Request body

| Field | Type | Required | Rules |
|---|---|---|---|
| `title` | string | **Yes** | max 255 |
| `message` | string | **Yes** | — |
| `category` | string | **Yes** | `promotional` \| `service` — **promotional** honours the opt-out and adds unsubscribe; **service** reaches everyone |
| `channels` | array | No | subset of `["inapp", "email"]`, default `["inapp"]`, de-duplicated, must not be empty. `whatsapp` is **not** offered yet |
| `audience` | string | No | a `User.Role` value or `"all"`, default `"customer"` |
| `image_path` | string | No | relative path for a banner; blank/whitespace becomes `null` |

```json
{
  "title": "Scheduled maintenance",
  "message": "AnchorMart will be read-only on 5 Aug, 02:00–04:00 UTC.",
  "category": "service",
  "channels": ["inapp", "email"],
  "audience": "all"
}
```

### Response `202 Accepted`

```json
{
  "message": "Broadcast triggered.",
  "broadcast_id": "b1f0…",
  "channels": ["inapp", "email"],
  "category": "service",
  "audience": "all",
  "estimated_email_recipients": 5
}
```

`estimated_email_recipients` is `null` when `email` is not among the channels. Otherwise it is **the number of emails that will actually be queued** — it applies the same preference gate the fan-out does, so a `promotional` broadcast excludes opted-out sailors and a `service` broadcast does not (GJ1). A regression test pins `estimate == messages actually queued` for both categories.

### Response `200` — duplicate suppressed
Same shape as §3.3. Identity here is **audience + category + channels + title**; `channels` is part of it deliberately, so sending the same copy in-app now and by email later is treated as a follow-up, not a double-click.

### Errors
`400` — DRF field errors. `500` — `{"message": "Could not trigger the broadcast. Please try again."}`.

---

## 3.5 `GET /api/superadmin/notifications/history/` — What was sent

Every broadcast and role-based send, newest first, attributed to the admin who sent it.

### Query parameters — all optional

**Every parameter is validated (GJ2/GJ4) — an unrecognised value is a `400`, never a silently empty page.**

| Param | Type | Allowed values | Behaviour |
|---|---|---|---|
| `category` | string | `promotional` \| `service` | exact match |
| `audience` | string | a `User.Role` value or `all` | exact match |
| `notification_type` | string | a `Notification.Type` value | exact match |
| `created_by` | UUID | — | admin user id; a malformed value is a `400` |
| `date_from` | date | `YYYY-MM-DD` | inclusive, on the send date |
| `date_to` | date | `YYYY-MM-DD` | inclusive; must not precede `date_from` |
| `page` | int | DRF | `404` `{"detail": "Invalid page."}` when out of range or non-numeric |
| `page_size` | int | DRF | default **10**, max **50**; a larger value is silently clamped |

**Search:** none. Every filter is exact match.

### Response `200`

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "9c1e…",
      "title": "Monsoon restock",
      "message": "Fresh provisions are in at Mumbai anchorage.",
      "category": "promotional",
      "notification_type": "promo",
      "channels": ["inapp"],
      "audience": "customer",
      "created_by_email": "ops@anchormart.io",
      "is_active": false,
      "is_dispatched": true,
      "dispatched_at": "2026-08-02T09:14:23.006114Z",
      "dispatch_error": "",
      "created_at": "2026-08-02T09:14:22.113847Z"
    }
  ]
}
```

Reading a row: `notification_type` set + `is_active: false` ⇒ a **role-based send** (history only). `notification_type` blank ⇒ a **broadcast**; `is_active: true` means it is also showing in-app.

**`is_dispatched` is the one to trust for "did this actually go out?" (GJ3).** The row is created when the campaign is *accepted*; `dispatched_at` is stamped only when the fan-out actually ran. `is_dispatched: false` on a recent row means it is still queued (the outbox sweeper runs every 5 minutes); `false` on an old row, with `dispatch_error` populated, means the fan-out failed. Before GJ3 there was no such distinction and History reported every accepted campaign as sent, including ones a broker outage had silently discarded.

---

# Consent semantics — the table to read before sending

| | In-app | Email |
|---|---|---|
| **Promotional** | honours the type mute **and** `inapp_enabled` | honours `email_enabled`; unsubscribe link injected |
| **Service** | honours the type mute; **ignores** `inapp_enabled` | **ignores** `email_enabled`; reaches opted-out users |

Inactive users (`is_active=False`) are excluded from every path — preview, in-app fan-out and email fan-out alike. Users with no email address are excluded from the email fan-out.
