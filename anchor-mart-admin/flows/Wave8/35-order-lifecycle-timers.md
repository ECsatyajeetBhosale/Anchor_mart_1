# Flow 35 — Order Lifecycle Timers & Expiry (Automate the clock → Close stale state)

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`35-order-lifecycle-timers-validation.md`](./35-order-lifecycle-timers-validation.md).
> This document describes **what the background machinery does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every background task, schedule, transition rule, and notification dispatch is fully specified.
>
> Index: [`../../BUSINESS_FLOWS.md`](../../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

---

# Executive Summary

Order lifecycle management requires automated background timers to handle uncompleted payments, abandoned substitution choices, and expired delivery surcharges. Without automated expiration, stale orders sit indefinitely in intermediate states, stranding inventory, locking customer points, and cluttering administration queues.

Flow 35 documents the **Background Machinery** governing order timeouts, reminders, and auto-cancellations.

The core principle behind these background timers:

> ### Fail-closed state transitions with multichannel notification
>
> 1. **No Ghosted Orders**: Every timed state (`PAYMENT_PENDING`, `PENDING_CUSTOMER_RESPONSE`, open `DeltaPayment`) has an explicit expiration threshold. When the clock lapses, the system transitions the order to a terminal state (`CANCELLED` or `EXPIRED`).
> 2. **Multi-Channel Delivery Isolation**: Reminders and expiration notices dispatch across In-App, Email, and WhatsApp. Each transport is isolated in its own exception handler so a failure in one transport (e.g. SMTP timeout or Twilio error) never blocks the remaining channels.
> 3. **Admin Escalation**: When an automated expiration occurs, both the sailor and the active administrative team receive immediate notifications so operations staff remain aware of auto-cancelled transactions.

| | |
|---|---|
| **Actors** | Background Celery Worker (`SYS`) · Customer (Sailor) · Admin (`admin`) |
| **Endpoints** | **0 Direct HTTP Endpoints** (Invoked automatically via Celery Beat schedules and event dispatchers) |
| **Django Apps** | `orders` (tasks, lifecycle, payments), `notifications` (dispatcher), `promotion` (gift sweeps), `user` (email/whatsapp) |
| **Models read** | `Order`, `Payment`, `DeltaPayment`, `User`, `Notification` |
| **Models written** | `Order` (status updated to `CANCELLED`), `Payment` (session status updated), `DeltaPayment` (status updated to `EXPIRED`), `Notification` |
| **Trigger** | Celery Beat crontab schedules (hourly sweeps) or asynchronous task dispatches |
| **Previous Flow** | 34 (Audit Trail & Tamper-Evidence) |
| **Next Flow** | 36 (Nightly Aggregation & Retention) |
| **Documentation Version** | 1.0 — 2026-08-01 |
| **Documentation Status** | ✅ 6 background tasks & 3 notification pipelines fully specified. Verified by **EXECUTING test suite**. |

---

# Celery Beat Schedule & Task Matrix

The Celery Beat scheduler (`django_celery_beat`) executes hourly background sweeps at staggered minute offsets to prevent database lock contention.

```
Minute Offset :00  ->  send-payment-reminders-hourly
Minute Offset :05  ->  expire-customer-responses-hourly
Minute Offset :10  ->  expire-payment-pending-hourly
Minute Offset :15  ->  send-delta-reminders-hourly
Minute Offset :20  ->  expire-deltas-hourly
Minute Offset :25  ->  sweep-gift-groups-hourly
```

### Scheduled Task Overview

| Schedule Key | Cron Timing | Task Handler | Target Criteria | Primary Action |
|---|---|---|---|---|
| `send-payment-reminders-hourly` | Every hour at `:00` | `orders.tasks.send_payment_reminders` | Initial `Payment` records in `OPEN` session status, created `> 2h` ago (`PAYMENT_REMINDER_AFTER_HOURS`), un-reminded. | Dispatches `notify_payment_reminder` task; sets `reminder_sent_at`. |
| `expire-customer-responses-hourly` | Every hour at `:05` | `orders.tasks.expire_customer_responses` | Orders in `PENDING_CUSTOMER_RESPONSE` where `customer_response_due_at <= now` and unconfirmed. | Transitions order to `CANCELLED`. Notifies sailor & admins. |
| `expire-payment-pending-hourly` | Every hour at `:10` | `orders.tasks.expire_payment_pending` | Orders in `PAYMENT_PENDING` where `payment_due_at <= now` and payment uncompleted. | Transitions order to `CANCELLED`; expires Stripe sessions; notifies sailor & admins. |
| `send-delta-reminders-hourly` | Every hour at `:15` | `orders.tasks.send_delta_reminders` | `DeltaPayment` in open statuses (`PENDING`, `INITIATED`), `due_at` within 50% window, un-reminded. | Sends nudge notification; sets `reminder_sent_at`. |
| `expire-deltas-hourly` | Every hour at `:20` | `orders.tasks.expire_deltas` | `DeltaPayment` in open statuses where `due_at <= now`. | Sets status `EXPIRED`; expires Stripe checkout session; notifies sailor & admins. |
| `sweep-gift-groups-hourly` | Every hour at `:25` | `promotion.tasks.sweep_gift_groups` | Orders grouped by vessel (`imo_number`). | Consolidates active vessel orders and alerts admin for surprise gift qualification. |

---

# Task Specifications & Business Logic

## 1. Multichannel Delivery Pipeline (`_deliver_payment_link`)

Helper function utilized by `notify_payment_link` and `notify_payment_reminder` to dispatch payment URLs across three independent delivery transports.

### Transport Isolation Pattern

```python
# In-App Channel (Primary)
try:
    send_notification(user, Notification.Type.PAYMENT, title, inapp_msg, metadata=..., target=order)
except Exception:
    logger.exception("payment link in-app notification failed for order %s", order.id)

# Email Channel (Secondary)
if user.email:
    try:
        send_email_with_template(subject, html_body, [user.email])
    except Exception:
        logger.exception("payment link email failed for order %s", order.id)

# WhatsApp Channel (Optional)
if getattr(user, "whatsapp_number", None):
    try:
        send_whatsapp_message(user.whatsapp_number, wa_text)
    except Exception:
        logger.exception("payment link WhatsApp failed for order %s", order.id)
```

Each delivery attempt is wrapped in a dedicated `try...except` block. A transport failure (e.g. an SMTP server outage or invalid Twilio token) logs an exception and allows execution to proceed to the remaining channels.

---

## 2. Customer Substitution Response Expiration (`expire_customer_responses`)

When an admin releases item substitution choices to a sailor (Flow 6 / Flow 35), the order transitions to `PENDING_CUSTOMER_RESPONSE` and sets `customer_response_due_at = now + 24h` (`CUSTOMER_RESPONSE_WINDOW_HOURS`).

### Expiration Logic
1. **Query Filter**:
   - `status = Order.Status.PENDING_CUSTOMER_RESPONSE`
   - `substitutions_confirmed_at__isnull = True` (Excludes orders where the sailor already responded; a slow admin billing step must never cause an order to be auto-cancelled).
   - `customer_response_due_at <= timezone.now()`
   - `is_deleted = False`
2. **State Transition**:
   Calls `transition_order()` to change status to `CANCELLED` with:
   - `note = "Auto-cancelled — sailor did not respond to substitutions in time"`
   - `extra_updates = {"cancelled_at": now, "cancellation_reason": "Response window expired"}`
3. **Race Condition Handling**:
   If `transition_order()` raises `InvalidOrderTransition` (because the sailor confirmed or cancelled concurrent with the cron execution), the task catches the exception and skips that order.
4. **Notifications**:
   - Sailor: Receives `ORDER_UPDATE` notification explaining the response window expired.
   - Admins: Bulk-creates `ORDER_UPDATE` notifications for all active admins (`role = ADMIN`, `is_active = True`).

---

## 3. Unpaid Payment Expiration (`expire_payment_pending`)

Orders awaiting initial payment sit in `PAYMENT_PENDING` with a running clock (`payment_due_at`, tied to the Stripe Checkout session expiry).

### Expiration Logic
1. **Query Filter**:
   - `status = Order.Status.PAYMENT_PENDING`
   - `payment_due_at <= timezone.now()`
   - `is_deleted = False`
   - Excludes `payment_status = Order.PaymentStatus.COMPLETED`
2. **State Transition & Cleanup**:
   - Transitions order to `CANCELLED` (`cancellation_reason = "Payment window expired"`).
   - Calls `payments_service.cancel_open_sessions(order)` to close any pending Stripe sessions.
   - Reserved loyalty points (if any) are automatically released back to the user account.
3. **Notifications**:
   - Sailor: In-App notification confirming cancellation and points release.
   - Admins: Bulk-notification to all active admins.

---

## 4. Payment Reminders (`send_payment_reminders` & `notify_payment_reminder`)

Nudges customers who have an uncompleted payment session.

### Execution Logic
1. Runs hourly at `:00`.
2. Queries `Payment` records where:
   - `kind = Payment.Kind.INITIAL`
   - `session_status = Payment.SessionStatus.OPEN`
   - `session_expires_at > now` (session still active)
   - `reminder_sent_at__isnull = True` (not yet reminded)
   - `created_at <= now - PAYMENT_REMINDER_AFTER_HOURS` (default 2 hours)
   - `order.status = Order.Status.PAYMENT_PENDING`
3. Enqueues `notify_payment_reminder.delay(order_id, checkout_url)` for each candidate.
4. Updates `reminder_sent_at = now` to ensure exactly **one reminder** is sent per payment session.

---

## 5. Delivery Surcharge Reminders & Expiration (`send_delta_reminders` & `expire_deltas`)

When an admin or system raises an additional delivery charge (`DeltaPayment`), the surcharge carries a payment window (`due_at`).

### Delta Reminders (`send_delta_reminders`)
- Runs hourly at `:15`.
- Filters `DeltaPayment` records in `OPEN_STATUSES` (`PENDING` or `INITIATED`) where:
  - `due_at` is active (`due_at > now`)
  - `due_at <= now + (PAYMENT_LINK_EXPIRY_HOURS / 2)` (past the 50% halfway point of the window)
  - `reminder_sent_at__isnull = True`
- Sends `ORDER_UPDATE` notification to the sailor and sets `reminder_sent_at = now`.

### Delta Expiration (`expire_deltas`)
- Runs hourly at `:20`.
- Filters `DeltaPayment` records where `status in OPEN_STATUSES` and `due_at <= now`.
- Updates `delta.status = DeltaPayment.Status.EXPIRED`.
- Calls `stripe_service.expire_session()` to invalidate any open Stripe checkout session linked to the delta.
- Sends notification to sailor and alerts admins so operations staff can decide whether to re-raise the surcharge or absorb the cost.
- **Delivery Hold Impact**: Expiring the delta removes open surcharge blocks, allowing fulfillment to proceed if the admin chooses to absorb the charge.

---

# Configuration & SLA Parameters

All lifecycle timers are governed by project configuration settings defined in `AnchorMart/settings.py` (overridable via environment variables):

| Setting Key | Default Value | Description |
|---|---|---|
| `PAYMENT_LINK_EXPIRY_HOURS` | `24` (int) | Stripe checkout session lifetime for initial & delta payments. |
| `PAYMENT_REMINDER_AFTER_HOURS` | `2` (int) | Delay after payment link generation before sending a reminder nudge. |
| `CUSTOMER_RESPONSE_WINDOW_HOURS` | `24` (int) | Window given to a sailor to accept/reject suggested substitutions. |
| `CUSTOMER_CANCEL_LEAD_HOURS` | `36` (int) | Hours before vessel arrival (`eta`) during which self-service cancellation is permitted. |
| `DELIVERY_SLA_HOURS["express"]` | `12` (int) | SLA target hours for express delivery orders. |
| `DELIVERY_SLA_HOURS["emergency"]` | `24` (int) | SLA target hours for marine emergency orders. |
| `DELIVERY_SLA_HOURS["fastest"]` | `24` (int) | SLA target hours for fastest-tier standard orders. |

---

# Error Handling & Resilience Rules

1. **Stale Status Protection (`InvalidOrderTransition`)**:
   Background tasks perform atomic transitions via `transition_order()`. If an order's status changes between the query scan and the transition execution (e.g. sailor pays via webhook right as the cron fires), `transition_order()` raises `InvalidOrderTransition`. The task catches this exception, logs a debug line, and skips processing.

2. **Webhook & Beat Synergy**:
   Stripe webhooks (`checkout.session.expired`) and Celery Beat timers (`expire_payment_pending`) operate as complementary safety nets:
   - If the Stripe webhook fires first, points are refunded and `payment_due_at` is cleared.
   - If the webhook is delayed or dropped, `expire_payment_pending` catches the expired order at the next `:10` minute sweep.

3. **Soft-Delete Guard**:
   All task queries enforce `is_deleted = False` to ensure soft-deleted orders or items are excluded from processing and notification sweeps.
