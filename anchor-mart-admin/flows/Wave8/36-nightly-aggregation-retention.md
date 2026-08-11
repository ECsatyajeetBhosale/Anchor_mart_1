# Flow 36 — Nightly Aggregation & Retention (Roll up yesterday → Prune high-churn tables)

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`36-nightly-aggregation-retention-validation.md`](./36-nightly-aggregation-retention-validation.md).
> This document describes **what the background machinery does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every background task, schedule, retention window, and load-bearing dependency order is fully specified.
>
> Index: [`../../BUSINESS_FLOWS.md`](../../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

---

# Executive Summary

High-churn web applications generate large volumes of operational state history (status transitions, delivery availability reports, read notifications, and message ledgers). If left unmanaged, database size scales linearly with time, degrading query performance across critical OLTP tables.

Flow 36 documents the **Nightly Aggregation & Retention** pipeline: an automated, off-peak background process that aggregates raw transactional history into compact daily analytics rollups before pruning old operational rows in safe batches.

The two core principles governing this pipeline:

> ### 1. Scheduling order is load-bearing
>
> The metrics rollup task (`analytics.tasks.rollup_daily_metrics`) **MUST run at 03:00 UTC**, before the status history pruner (`orders.tasks.prune_order_status_history`) runs at **03:30 UTC**.
>
> `rollup_daily_metrics` derives `DailyStatusDurationMetrics` (time-in-status metrics) from `OrderStatusHistory`. The pruner deletes those history rows 180 days after an order reaches a terminal state.
> - **Roll up before prune**: Historical status duration metrics survive permanently in the rollup tables.
> - **Roll up after prune**: Historical status duration metrics are permanently lost with no alternative data source.

> ### 2. The tamper-evident financial audit log is NEVER pruned
>
> High-churn operational tables are pruned past their retention window. However, financial records and `ORDER` category audit logs in `AuditLog` are **retained indefinitely**. Pruning applies strictly to `OPERATIONAL` audit logs (logins, config changes), and authorized truncations mark `AuditChain.pruned_before` so cryptographic verification remains valid.

| | |
|---|---|
| **Actors** | Background Celery Worker (`SYS`) |
| **Endpoints** | **0 Direct HTTP Endpoints** (Executed automatically via Celery Beat off-peak schedule) |
| **Django Apps** | `analytics` (metrics rollup), `orders` (history/audit/notification pruning), `messaging` (outbox/outbound pruning) |
| **Models read** | `Order`, `OrderItem`, `OrderStatusHistory`, `DeliveryAssignment`, `DeliveryRating`, `Product`, `Category`, `AuditLog`, `AvailabilityReport`, `Notification`, `OutboxEvent`, `OutboundMessage` |
| **Models written** | `DailyOrderMetrics`, `DailyProductMetrics`, `DailyPartnerMetrics`, `DailyStatusDurationMetrics`, `RollupRun`, `AuditChain` |
| **Models pruned** | `OrderStatusHistory`, `AvailabilityReport`, `AuditLog` (`OPERATIONAL` only), `Notification` (read only), `OutboundMessage`, `OutboxEvent` (`PUBLISHED` only) |
| **Trigger** | Celery Beat night schedule (`03:00 UTC` to `04:10 UTC`) and 5-minute outbox safety sweeps |
| **Previous Flow** | 35 (Order Lifecycle Timers & Expiry) |
| **Next Flow** | None (Final flow in Master Index) |
| **Documentation Version** | 1.0 — 2026-08-01 |
| **Documentation Status** | ✅ 8 background tasks fully specified from the scheduled task implementations. Focused test execution is recorded in the companion validation report. |

---

# Off-Peak Celery Beat Schedule

All nightly jobs run during low-traffic off-peak hours (03:00 UTC – 04:10 UTC) to minimize database impact on live user transactions.

```
03:00 UTC  ->  rollup-daily-metrics           (Analytics Rollup — LOAD BEARING CRITICAL)
03:30 UTC  ->  prune-order-status-history     (180 Days Retention)
03:40 UTC  ->  prune-availability-reports     (180 Days Retention)
03:45 UTC  ->  prune-audit-logs               (365 Days Retention — OPERATIONAL category only)
03:50 UTC  ->  prune-notifications            (90 Days Retention — READ notifications only)
04:00 UTC  ->  prune-outbound-messages        (90 Days Retention)
04:10 UTC  ->  prune-outbox-events            (30 Days Retention — PUBLISHED events only)

Every 5 min ->  sweep-outbox-every-5-min       (Transactional Outbox Safety Net)
```

---

# Concepts & Mechanics

### 1. Settled-Day Rollup & Today's Live Merge

`rollup_daily_metrics(days_back=7)` processes complete historical days up to yesterday (`timezone.localdate() - timedelta(days=1)`). Its inclusive window is **yesterday plus the preceding seven dates** (at most eight dates total); it re-runs a date only when its `RollupRun` is not `ok`, except that it always recomputes yesterday.

- **Why Today Is Excluded**: A day in progress is actively changing. Writing a partial rollup row would cause dashboard reads to mistake incomplete daily numbers for settled metrics.
- **How Today Is Displayed**: The analytics read layer (`analytics/reads.py`) queries the small rollup table for settled days `< today`, computes today's metrics live from OLTP rows, and merges them dynamically.

### 2. Batched Deletion (`_batched_delete`)

Pruning large tables directly via `DELETE FROM table WHERE ...` can lock thousands of rows, leading to PostgreSQL lock contention and memory exhaustion.

Retention tasks in `orders/tasks.py` execute deletions using primary-key batching:

```python
def _batched_delete(queryset, batch=2000):
    """Delete a queryset in PK batches of 2,000 to prevent long table locks."""
    model = queryset.model
    total = 0
    while True:
        ids = list(queryset.values_list("pk", flat=True)[:batch])
        if not ids:
            break
        model.objects.filter(pk__in=ids).delete()
        total += len(ids)
    return total
```

### 3. Outbox Event Reliability (`sweep_outbox`)

The transactional outbox pattern guarantees at-least-once delivery of domain events:
1. **Fast Path**: `deliver_outbox_event` is enqueued on transaction commit via `transaction.on_commit()`.
2. **Safety Net (`sweep_outbox`)**: Runs every 5 minutes. It scans at most 500 `OutboxEvent` rows in `PENDING`/`FAILED` with fewer than 10 delivery attempts, oldest first, and at most 500 `OutboundMessage` rows stuck in `QUEUED` (`created_at < now - 5 min`). `SENDING` messages are deliberately excluded so a live worker is not duplicated.
3. **Guaranteed Delivery**: If a worker crashes or Redis drops a message, `sweep_outbox` re-drives delivery automatically.

---

# Task Deep Dives

## 1. Metrics Rollup (`analytics.tasks.rollup_daily_metrics`)

- **Schedule**: `03:00 UTC` daily
- **Handler**: `analytics.tasks.rollup_daily_metrics`
- **Logic**:
  - Calculates the inclusive window `floor = yesterday - timedelta(days=7)` through `yesterday` (at most eight settled dates).
  - Identifies dates without a successful `RollupRun` using `analytics.rollup.missing_dates(floor, yesterday)` and unions them with `yesterday`, so yesterday is recomputed even after a prior success.
  - Executes `rollup_day(day)` for each target date. One failing date is recorded and does not abandon later dates.
  - Generates/updates:
    - `DailyOrderMetrics`: placed, paid, refunded, delivered, and cancelled facts on their respective event-time bases.
    - `DailyProductMetrics`: paid and delivered units/revenue per catalog **product**, with product/category snapshots.
    - `DailyPartnerMetrics`: assignment, response, delivery, SLA, and rating facts per delivery partner.
    - `DailyStatusDurationMetrics`: transition counts and completed status-duration facts per status.
  - Records execution state in `RollupRun` (`status = ok` or `failed`).
  - For a gap older than this bounded window, an operator uses `manage.py rollup_metrics` (`--days`, `--from`/`--to`, `--all`, or `--missing-only`); rerunning a date is idempotent.

---

## 2. Status History Pruning (`orders.tasks.prune_order_status_history`)

- **Schedule**: `03:30 UTC` daily
- **Handler**: `orders.tasks.prune_order_status_history`
- **Retention Limit**: 180 Days (`ORDER_HISTORY_RETENTION_DAYS`)
- **Terminal Status Filter**: Applies only to terminal orders (`DELIVERED`, `CANCELLED`, `REFUNDED`, `INTENT_REJECTED`).
- **Logic**: Deletes `OrderStatusHistory` rows associated with terminal orders created prior to `now - 180 days` using `_batched_delete()`.

---

## 3. Availability Report Pruning (`orders.tasks.prune_availability_reports`)

- **Schedule**: `03:40 UTC` daily
- **Handler**: `orders.tasks.prune_availability_reports`
- **Retention Limit**: 180 Days (`AVAILABILITY_REPORT_RETENTION_DAYS`)
- **Logic**: Deletes `AvailabilityReport` rows (and cascaded line items) for terminal orders created prior to `now - 180 days`.

---

## 4. Operational Audit Log Pruning (`orders.tasks.prune_audit_logs`)

- **Schedule**: `03:45 UTC` daily
- **Handler**: `orders.tasks.prune_audit_logs`
- **Retention Limit**: 365 Days (`AUDIT_OPERATIONAL_RETENTION_DAYS`)
- **Category Restriction**: **Prunes `category=OPERATIONAL` only.** `ORDER` category audit logs are never pruned.
- **Logic**:
  1. Identifies `AuditLog` rows where `category = OPERATIONAL` and `created_at < now - 365 days`.
  2. Updates affected `AuditChain` records with `pruned_before = cutoff` timestamp **before** deletion.
  3. Executes `_batched_delete()` on the doomed log rows.
  4. For chains where all entries were deleted, resets `head_hash = ""` and `length = 0` so future appends start fresh.

---

## 5. Notification Pruning (`orders.tasks.prune_notifications`)

- **Schedule**: `03:50 UTC` daily
- **Handler**: `orders.tasks.prune_notifications`
- **Retention Limit**: 90 Days (`NOTIFICATION_RETENTION_DAYS`)
- **Read Filter**: **Prunes read notifications only** (`read_at__isnull=False`). Unread notifications are retained indefinitely until read.
- **Logic**: Deletes read `Notification` rows created prior to `now - 90 days`.

---

## 6. Outbound Message Ledger Pruning (`messaging.tasks.prune_outbound_messages`)

- **Schedule**: `04:00 UTC` daily
- **Handler**: `messaging.tasks.prune_outbound_messages`
- **Retention Limit**: 90 Days (`OUTBOUND_MESSAGE_RETENTION_DAYS`)
- **Logic**: Deletes `OutboundMessage` ledger rows created prior to `now - 90 days`.

---

## 7. Outbox Event Pruning (`messaging.tasks.prune_outbox_events`)

- **Schedule**: `04:10 UTC` daily
- **Handler**: `messaging.tasks.prune_outbox_events`
- **Retention Limit**: 30 Days (`OUTBOX_RETENTION_DAYS`)
- **Status Restriction**: **Prunes `status=PUBLISHED` only.** Undelivered (`PENDING`, `FAILED`) events are never pruned.
- **Logic**: Deletes `OutboxEvent` rows published prior to `now - 30 days`.

---

## 8. Outbox Safety Sweep (`messaging.tasks.sweep_outbox`)

- **Schedule**: Every 5 minutes (`crontab(minute='*/5')`)
- **Handler**: `messaging.tasks.sweep_outbox`
- **Logic**:
  1. Calls `undelivered()` to find up to 500 `OutboxEvent` rows in `PENDING` or `FAILED` status with fewer than 10 attempts, oldest first, and re-drives delivery.
  2. Finds up to 500 stranded `OutboundMessage` rows in `QUEUED` status created `> 5 min` ago and re-enqueues `send_outbound_message.delay()`. It stops the batch after the first broker-enqueue failure.

---

# Configuration & Retention Reference Table

Summary of retention settings defined in `AnchorMart/settings.py`:

| Setting Key | Default Value | Target Data / Table | Scope / Exclusion Rule |
|---|---|---|---|
| `ORDER_HISTORY_RETENTION_DAYS` | `180` days | `OrderStatusHistory` | Terminal orders only (`DELIVERED`, `CANCELLED`, `REFUNDED`, `INTENT_REJECTED`). |
| `AVAILABILITY_REPORT_RETENTION_DAYS` | `180` days | `AvailabilityReport` | Terminal orders only. |
| `AUDIT_OPERATIONAL_RETENTION_DAYS` | `365` days | `AuditLog` | `OPERATIONAL` category entries only. `ORDER` entries **never pruned**. |
| `NOTIFICATION_RETENTION_DAYS` | `90` days | `Notification` | Read notifications only (`read_at__isnull=False`). Unread kept. |
| `OUTBOUND_MESSAGE_RETENTION_DAYS` | `90` days | `OutboundMessage` | Full outbound message ledger. |
| `OUTBOX_RETENTION_DAYS` | `30` days | `OutboxEvent` | `PUBLISHED` events only. Undelivered events **never pruned**. |
