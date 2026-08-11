# Flow 22 — Transactional Messaging & Outbound Delivery (Business event → proven delivery)

**Wave** 5 (Communications backbone) · **Type** Supporting · **Actors** Background System · **Platforms** SYS · SMTP · Twilio · ADMIN
**Apps** `messaging`, `orders` (`event_handlers.py`), `user`, `admin_panel`
**Models** `OutboxEvent`, `OutboundMessage`
**Related flows** 07 (billing/payment) · 10 (delivery) · 21 (notification inbox) · 32 (campaigns) · 34 (audit)
**Existing design notes** [`MESSAGING_SUBSYSTEM.md`](../../MESSAGING_SUBSYSTEM.md) · [`MESSAGING_DELIVERY_API.md`](../../MESSAGING_DELIVERY_API.md)

---

# Executive Summary

This flow is the guarantee that a business fact — *the payment landed*, *the order arrived* — actually reaches the sailor by email or WhatsApp, and that someone can later prove it did.

It exists because the naive version fails silently. Before this subsystem, a payment webhook sent its emails inline: if the mail server was slow the webhook timed out, Stripe retried, the retry hit the payment-idempotency guard and returned early — and the receipt was lost forever, with the payment committed and the sailor told nothing. The fix is a **transactional outbox**: the intent to notify is committed *in the same database transaction as the business change*, so the two facts cannot exist apart, and delivery is handled afterwards by workers that can fail and retry without touching the money path.

Three properties define the flow, and each one is a deliberate trade:

- **Delivery is at-least-once, never at-most-once.** An event is marked published only *after* its subscribers run, so a crash mid-dispatch re-runs them. A sailor may occasionally receive two receipts. For money that is the correct way to fail — a duplicate is a support ticket, silence is a customer who believes their payment vanished.
- **The ledger stores the instruction, not the output.** `OutboundMessage` holds a template path plus a JSON context, never rendered HTML. Rendered email runs ~5 KB; at 1 lakh users that is hundreds of megabytes a day of ledger nobody reads. The worker renders at send time, so a retry re-renders deterministically.
- **Only `messaging` talks to a vendor.** Business modules publish events; they never construct an email. This is enforced by a build-failing test (`messaging/tests/test_retrofit.py`) that fails if `messaging/` imports any business app.

The flow's HTTP surface is deliberately tiny — two admin read endpoints and one provider webhook. Almost all of it is background machinery, which is why the **Phase 2 pipeline** below is the substantive part of this document rather than the endpoint list.

**What this flow does NOT cover.** In-app notifications and push are Flow 21 — they are not recorded in this ledger, because an in-app notification already *is* a database row and push has its own FCM result handling; recording them would double the writes for rows no provider can ever call back about. Admin campaigns are Flow 32. OTP email deliberately bypasses this subsystem entirely (see Phase 1).

---

# Phase 1 — Entry Points: what starts a message

There are exactly **two** ways a message enters this flow, and the difference matters when debugging.

### A. Event-driven (the main path)

A business module calls `publish_event(...)` **inside its own database transaction**. The event is recorded, and subscribers turn it into messages later, in a worker.

| Event type | Published by | Payload | Subscriber |
|---|---|---|---|
| `payment_received` | `orders/webhook_views.py` (Stripe) **and** `orders/payments_service.py` (`settle_free_order`, a 100 %-off order that never touches Stripe) | `{order_id, zero_total}` | `orders.event_handlers.handle_payment_received` |
| `order_delivered` | `partner_app/views/delivery_views.py` | `{order_id, status, delivered_count, total_items, undelivered_count, received_by}` | `orders.event_handlers.handle_order_delivered` |

> **Two payment paths, not one.** A fully-discounted order is confirmed without ever reaching Stripe. Any payment-adjacent work must handle both, which is why `zero_total` rides on the payload — the receipt copy genuinely differs ("no payment due" vs "we received your payment").

Subscribers are registered in `orders/apps.py::ready()`. An unregistered subscriber fails **silently** — the event publishes, no handler runs, and the log says only *"Event published with no subscribers."*

### B. Direct send (no event)

Code calls `messaging.service.send_message(...)` straight away. Used where there is no business event to hang off:

| Caller | Message | Recipient has an account? |
|---|---|---|
| `user/email.py::send_referral_invite_email` | Referral invitation | **No** — `user=None`, recipient is a stranger |
| `user/email.py::send_account_created_email` | "Your account is ready" (+ generated password when an admin set one) | Yes |
| `admin_panel/tasks.py::broadcast_email_task` | Admin broadcast (Flow 32) | Yes |

### Deliberately outside this flow

- **OTP email** (`user/email.py::send_otp_email`) sends on a raw `threading.Thread`, bypassing the ledger entirely. This is not an oversight — the OTP path is frozen, and a guard test (`messaging/tests/test_retrofit.py::OtpFreezeGuardTests`) asserts that `send_otp_email` creates **no** ledger row. A consequence worth knowing: `user/whatsapp.py` therefore stays where it is and the WhatsApp provider delegates to it, rather than owning a Twilio client.
- **In-app notifications and push** — Flow 21.

---

# Phase 2 — The Delivery Pipeline

This is the flow. Read it as one continuous path from business transaction to provider callback.

```
   ┌─ business transaction ────────────────────────────┐
   │  order.save()                                     │
   │  publish_event("payment_received", {...})         │
   │      └─► OutboxEvent row (status=pending)         │  ← committed together
   └───────────────────────────┬───────────────────────┘
                               │ transaction.on_commit
                               ▼
                  deliver_outbox_event (Celery)  ◄──── sweep_outbox (every 5 min, safety net)
                               │
                               ▼
                     dispatch_event(envelope)
                               │  each subscriber isolated in try/except
                               ▼
              orders.event_handlers.handle_payment_received
                               │
                ┌──────────────┼───────────────┬────────────────┐
                ▼              ▼               ▼                ▼
          in-app (F21)   admin in-app     send_message      send_message
                                          (EMAIL)          (WHATSAPP)
                                              │                 │
                                              ▼                 ▼
                                    OutboundMessage row (status=queued)
                                              │
                                              ▼
                                  send_outbound_message (Celery)
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                            SmtpEmailProvider   TwilioWhatsAppProvider
                                    │                   │
                                 status=sent      status=sent + SID
                                 (terminal)             │
                                                        ▼
                                          POST /api/messaging/twilio/status/
                                                        │
                                            monotonic advance: delivered → read
```

## Step 1 — Record the event (`messaging/outbox.py::record`)

`publish_event` builds a versioned envelope and writes an `OutboxEvent` row **inside the caller's transaction**:

```json
{
  "event_id": "b1f0…",           // becomes the OutboxEvent primary key
  "event_type": "payment_received",
  "event_version": 1,
  "occurred_at": "2026-08-02T09:14:22.113847+00:00",
  "payload": {"order_id": "…", "zero_total": false}
}
```

The payload must be JSON-serializable; `build_envelope` raises `TypeError` at the call site otherwise. That guard is what stops a model instance being passed in, which is what keeps `messaging` from needing to import `Order`.

Delivery is then enqueued via `transaction.on_commit`, so **a rolled-back payment can never emit an event**. If the broker is down the enqueue is lost harmlessly — the row is committed and the sweeper will find it.

## Step 2 — Dispatch to subscribers (`messaging/events.py::dispatch_event`)

`deliver()` re-checks the row, increments `attempts`, runs `dispatch_event`, and **only then** marks it `published`.

- Each subscriber runs in its own `try/except`. One failing consumer never stops its siblings — that is the entire reason for publishing an event instead of calling three things in a row.
- An already-published event is a no-op, so the `on_commit` enqueue and the sweeper both firing is harmless.
- A structural failure marks the row `failed`, which leaves it **sweepable** (the sweeper retries `failed` as well as `pending`).

## Step 3 — Turn the event into messages (`orders/event_handlers.py`)

The handler loads the order, builds a JSON context, and calls `send_message` once per external channel. Money values are formatted as **strings** (`"70.45"`) because `context` is a JSONField and `Decimal` is not serializable — and floats have no business carrying money.

## Step 4 — Queue the message (`messaging/service.py::send_message`)

Four things happen here, in order, and each is enforced *at this seam* so no call site has to remember it:

1. **Validation** — a missing recipient, or neither `template` nor `body`, raises `ValueError`.
2. **The channel gate** — `channel_allowed(user, channel, category)`. Under the **two-layer preference rule**, `category` gates *channels* and `pref_key` gates *types*; **only `PROMOTIONAL` honours** `email_enabled` / `whatsapp_enabled`. A receipt still reaches someone who opted out of marketing, exactly as unsubscribing from marketing does not stop your invoices in law. A suppressed promotional message returns **`None` and writes no ledger row** — a promo blast would otherwise write a lakh rows recording sends that never happened.
3. **Unsubscribe injection** — a promotional *email* gets `unsubscribe_url` put into its context automatically. Enforced here so the next person who adds a promotional sender cannot ship without one. `base_email.html` renders the link only `{% if unsubscribe_url %}`, so transactional mail is unaffected.
4. **Event dedupe** — when an `event_id` is present, one message per `(event_id, channel, recipient)`. This is what makes at-least-once delivery survivable: a re-dispatched event returns the *existing* row instead of emailing the sailor twice. A direct send carries no `event_id`, and two of those are two genuine messages.

The row is then created at `queued` and the send task enqueued **best-effort** — a broker outage must never break the money path that triggered it. The row is durable regardless.

## Step 5 — Send (`messaging/tasks.py::send_outbound_message`)

| Guard | Behaviour |
|---|---|
| Row missing | No-op (superseded or pruned), not an error |
| Row already `sent` / `delivered` / `read` | **No-op** — Celery redelivers tasks, and without this guard a redelivery double-sends |
| `PermanentProviderError` | Straight to `failed`, no retry — a bad recipient or missing template never resolves on retry |
| Any other exception | Marked `failed`, then `self.retry()` — up to **3 retries, 30 s apart** |

On success the row records `provider`, `provider_message_id` and `sent_at`, and clears `error`.

### The two providers

| | Email | WhatsApp |
|---|---|---|
| Class | `SmtpEmailProvider` | `TwilioWhatsAppProvider` |
| `provider` value | `smtp` | `twilio` |
| Renders | `template` + `context`, falls back to `body` | `body` only |
| Returns a message id | **No** (`None`) | Yes — the Twilio SID |
| Delivery callbacks | **None** | Yes |
| Terminal status reached | `sent` | `sent` → `delivered` → `read` |

> **Email delivery is unobservable, by construction.** `EMAIL_BACKEND` is plain SMTP, which reports nothing back. Every email row therefore terminates at **`sent`**, which means *"handed to the mail server"* — not *"the sailor received it"*. Only WhatsApp has real delivery evidence. Adopting an ESP (SES/SendGrid) is the prerequisite for email delivery data.

Swapping a vendor is one line in `messaging/providers/__init__.py`; no call site knows a vendor's name.

## Step 6 — Provider callbacks (`messaging/callbacks.py`)

Twilio POSTs status updates. Twilio **does not guarantee ordering** and retries on any non-2xx, so the same callback can arrive twice or out of sequence.

`OutboundMessage.can_advance_to()` makes progress **monotonic**:

- Ranked forward-only: `queued(0) → sending(1) → sent(2) → delivered(3) → read(4)`. A late `sent` can never downgrade a `delivered` row.
- `failed` is accepted from any non-terminal state — a message can fail after being accepted — but **never** from `delivered`/`read`, where the provider already confirmed arrival.
- A late *success* after a failure verdict is trusted only for real delivery outcomes (`delivered`/`read`).

Twilio's vocabulary is wider than ours; `queued`/`sending` are pre-delivery noise we already know, and anything unmapped is **ignored rather than guessed at**.

## Step 7 — The safety net (`messaging/tasks.py::sweep_outbox`, every 5 minutes)

Re-drives what the fast path missed:

1. `OutboxEvent` rows still `pending`/`failed` with `attempts < 10` — oldest first, 500 per sweep.
2. `OutboundMessage` rows still `queued` **and older than 5 minutes** — 500 per sweep.

Idempotent by construction, since both `deliver()` and `send_outbound_message` no-op on already-completed work. Rows at `sending` are deliberately **excluded** — a worker may be mid-send right now, and re-driving would duplicate the message.

## Step 8 — Retention

| Task | Beat | Deletes |
|---|---|---|
| `messaging.tasks.prune_outbound_messages` | daily 04:00 | ledger rows older than `OUTBOUND_MESSAGE_RETENTION_DAYS` (**90**) |
| `messaging.tasks.prune_outbox_events` | daily 04:10 | **`published` only**, older than `OUTBOX_RETENTION_DAYS` (**30**) |

The outbox is a delivery mechanism, not an audit log — an undelivered event is never silently discarded. The durable record of what was sent is `OutboundMessage`; the business record is the order itself.

---

# Phase 3 — API Specification

Three endpoints. Two admin reads, one provider webhook.

---

## 3.1 `GET /api/superadmin/messages/` — List outbound messages

Every outbound email and WhatsApp message, newest first. Answers the real support question: *"did the sailor actually get the payment link?"*

- **View** `admin_panel/views/messages_views.py::ListOutboundMessagesView`
- **Auth** `IsAuthenticated` + `IsAdminUser` (role-based: `admin` or `super_admin`)
- **Server secret** Not required — `/api/superadmin/` is exempt from `ServerSecurityMiddleware`

### Query parameters

Validated by `MessageLogFilterSerializer`. **An unknown value is a 400, never silently ignored.**

| Param | Type | Required | Allowed values | Behaviour |
|---|---|---|---|---|
| `channel` | string | No | `email`, `whatsapp` | Exact match |
| `status` | string | No | `queued`, `sending`, `sent`, `delivered`, `read`, `failed` | Exact match |
| `recipient` | string (≤255) | No | any | **Case-insensitive partial match** (`icontains`) — this is the search field |
| `event_type` | string (≤100) | No | e.g. `payment_received`, `order_delivered`, `broadcast` | Exact match |
| `user_id` | UUID | No | any | Exact match on the linked account |
| `ordering` | string | No | `created_at`, `-created_at` | Default `-created_at` |
| `page` | integer | No | ≥1 | Standard DRF pagination |
| `page_size` | integer | No | 1–50 | Default **10**, max **50** |

**Search:** there is no general `?search=`. `recipient` is the only partial-match field; everything else is exact.

### Response `200`

```json
{
  "count": 2,
  "next": "http://…/api/superadmin/messages/?page=2",
  "previous": null,
  "results": [
    {
      "id": "3f2a…",
      "channel": "whatsapp",
      "channel_display": "WhatsApp",
      "status": "delivered",
      "status_display": "Delivered",
      "user": "9c1e…",
      "user_email": "sailor@example.com",
      "recipient": "+919876543210",
      "subject": "",
      "template": "",
      "event_id": "b1f0…",
      "event_type": "payment_received",
      "provider": "twilio",
      "provider_message_id": "SM1a2b3c…",
      "error": "",
      "attempts": 1,
      "sent_at": "02 Aug 2026, 09:14 AM",
      "delivered_at": "02 Aug 2026, 09:14 AM",
      "read_at": null,
      "failed_at": null,
      "created_at": "02 Aug 2026, 09:14 AM",
      "updated_at": "02 Aug 2026, 09:14 AM"
    }
  ]
}
```

> **`context` and `body` are deliberately absent.** They carry the rendered message content — names, amounts, links, and for an account-created email a generated password. This is a delivery log, not a message reader.

### Errors

| Status | When |
|---|---|
| `400` | Any query param fails validation (e.g. `status=banana`) |
| `401` | No token |
| `403` | Authenticated but not an admin-tier role |

---

## 3.2 `GET /api/superadmin/messages/<message_id>/` — One message's delivery record

- **View** `admin_panel/views/messages_views.py::GetOutboundMessageView`
- **Auth** as above
- **Path param** `message_id` — UUID. A non-UUID does not match the route and returns a plain `404`.
- **Query params / body** none
- **Response `200`** — a single object, identical shape to one `results` entry above
- **`404`** — `{"detail": "Message not found."}`

---

## 3.3 `POST /api/messaging/twilio/status/` — Twilio delivery-status webhook

- **View** `messaging/webhook_views.py::TwilioStatusWebhookView`
- **Auth** `AllowAny` + **exempt** from `ServerSecurityMiddleware` — Twilio cannot send our secret header. Authenticity comes **solely** from the Twilio signature, exactly as the Stripe webhook trusts only its signature.
- **Not for frontend use.** Documented so the contract is not broken by accident.

### Request

`application/x-www-form-urlencoded`, as Twilio sends it.

| Field | Required | Notes |
|---|---|---|
| `MessageSid` *(or `SmsSid`)* | Yes | Matched against `OutboundMessage.provider_message_id` |
| `MessageStatus` *(or `SmsStatus`)* | Yes | Case-insensitive |
| `ErrorCode` | No | Recorded on a failure |
| `ErrorMessage` | No | Recorded on a failure |

**Header:** `X-Twilio-Signature` — required.

### Status mapping

| Twilio value | Stored as |
|---|---|
| `sent` | `sent` |
| `delivered` | `delivered` |
| `read` | `read` |
| `failed`, `undelivered` | `failed` |
| anything else (`queued`, `sending`, …) | **ignored**, still `200` |

### Responses

| Status | When |
|---|---|
| `200` `{"received": true}` | Verified and understood — **including** an unknown SID or an out-of-order update. Neither is an error, and a non-2xx would make Twilio retry forever. |
| `400` | `MessageSid` or `MessageStatus` missing |
| `403` | `{"detail": "Invalid signature."}` — bad signature, missing header, **or `TWILIO_AUTH_TOKEN` unset**. An unverifiable request is refused, never waved through: an open endpoint that writes delivery status would let anyone mark any message delivered. |
| `500` | Internal error — deliberate, so Twilio retries with backoff. Safe because `apply_twilio_status` is idempotent. |

### The callback URL must match

Twilio signs **the URL it was given**. The provider builds that from `PUBLIC_BASE_URL` (`status_callback_url()`), and `validate_signature` rebuilds it from the same setting rather than `request.build_absolute_uri()` — behind ngrok or a proxy the reconstructed host is the *internal* one, and every real callback would 403. A per-message `status_callback` also overrides anything configured in the Twilio console, so this is the only thing deciding where callbacks go. If `PUBLIC_BASE_URL` is unset the message is sent **without tracking**.

---

# Configuration

| Setting | Default | Effect |
|---|---|---|
| `PUBLIC_BASE_URL` | falls back to `SERVER_URL` | Twilio callback URL + unsubscribe links. Must be internet-reachable; free ngrok URLs rotate on restart. |
| `TWILIO_AUTH_TOKEN` | `""` | Unset ⇒ **every** Twilio callback is rejected `403` |
| `OUTBOUND_MESSAGE_RETENTION_DAYS` | `90` | Ledger retention |
| `OUTBOX_RETENTION_DAYS` | `30` | Published-event retention |
| `EMAIL_HOST_USER` | — | The `From` address (deliberately not `DEFAULT_FROM_EMAIL`, which is undefined here and would silently resolve to Django's `webmaster@localhost`) |

### Beat schedule

| Entry | Schedule | Task |
|---|---|---|
| `sweep-outbox-every-5-min` | `*/5 * * * *` | `messaging.tasks.sweep_outbox` |
| `prune-outbound-messages-daily` | `04:00` | `messaging.tasks.prune_outbound_messages` |
| `prune-outbox-events-daily` | `04:10` | `messaging.tasks.prune_outbox_events` |

---

# Django Admin

Both models are registered and **fully read-only** (`has_add_permission` and `has_change_permission` return `False`). Rows are written by the service and advanced by the worker and provider callbacks; hand-editing one would desync it from what a vendor actually did, and adding one by hand creates a message with no queued task behind it.

The signal worth watching is an `OutboxEvent` sitting at `pending`/`failed` with rising `attempts` — it means the sweeper keeps trying and a subscriber keeps breaking.
