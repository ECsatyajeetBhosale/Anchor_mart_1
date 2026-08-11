# Flow 14 — Order History & Detail *(customer self-service)*

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`14-order-history-detail-validation.md`](./14-order-history-detail-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

---

# Executive Summary

| | |
|---|---|
| **Flow Name** | Order History & Detail (customer "My Orders") |
| **Business Objective** | Let a sailor see everything about their own orders — past, in-flight, and awaiting action — without contacting support |
| **Flow Type** | Core |
| **Primary Actors** | Customer |
| **Platforms** | `SAILOR` |
| **Django Apps** | `orders` (`customer_views.py`, `customer_serializers.py`) |
| **Models** | `Order`, `OrderItem`, `Payment`, `DeltaPayment`, `OrderStatusHistory`, `DeliveryAssignment`, `OrderGift` |
| **Total APIs** | **2 owned** (the two lists) **+ 4 detail reads documented in their home flows** (bill/payment → Flow 7, track → Flow 10) **+ branch actions in flows 7/8/11/12/16/23** |
| **Previous Flow** | Any order the sailor has placed (Flow 5 onward) |
| **Next Flow** | Branches into pay (7), cancel (12), rate (16), report-location (11), chat (23) |
| **Documentation Version** | 1.2 — 2026-07-22 (FG5(l) applied; list `items` slimmed to a preview — see below) |
| **Documentation Status** | ✅ Owned routes documented in full; detail reads cross-referenced to their home flows |

> **`items` on the two lists is a PREVIEW** (`id`, `product_name`, `sku`, `quantity`,
> `unit_price`, a simple `line_total = unit_price × quantity`, `status`, `status_display`,
> `thumbnail`). The **full** item detail — the reconciled/substitute-aware `line_total`, the
> accepted `substitute`, and the full variant — is on the **per-order detail read**
> (`GET /orders/<id>/payment-summary/`, Flow 7). The list card shows the *requested* amount; the
> detail shows the *billed* amount. *(Changed 2026-07-22 for scale — see validation F-03.)*

> **This is the navigational home of "My Orders."** It *owns* the two list endpoints; the
> per-order **detail reads** (bill, payment summary, payment status, live track) and the
> **branch actions** (pay, cancel, rate, report a location change, chat) are documented in the
> flows that own their business logic — this chapter maps them so a frontend can wire the whole
> screen. Endpoints are cross-referenced, never re-specified in two places (drift risk).

---

# Phase 1 — Understand the Flow

## Two lists, split by **status bucket** (not by "paid vs unpaid")

| List | Endpoint | Shows |
|---|---|---|
| **Intents** | `GET /api/orders/intents/` | The sailor's **pre-confirmation** orders — the sourcing funnel, **plus rejected intents** |
| **History** | `GET /api/orders/history/` | Everything **from payment onward** and its outcomes |

The split is **status-based, not payment-based** — a subtlety worth stating for the frontend:

- Because `payment_pending` is an **intent-funnel** status, a freshly-billed **express** order
  (created directly at `payment_pending`, Flow 9) appears under **intents/**.
- Because a **cancelled-while-unpaid** order is a terminal outcome, it appears under **history/**.

So don't label the tabs "unpaid" vs "paid" — they are **status buckets**.

## Where each status lands (the explicit contract)

| Bucket | Statuses |
|---|---|
| **Intents** (`INTENT_LIST_STATUSES`) | `intent_received` · `pending_intent` · `sourcing` · `partner_verifying` · `verification_submitted` · `pending_customer_response` · `payment_pending` · **`intent_rejected`** |
| **History** (`HISTORY_STATUSES`) | `payment_received` · `order_confirmed` · `partner_assigned` · `items_collected` · `at_port` · `at_berth` · `delivered` · `partially_delivered` · `delivery_failed` · `cancelled` · `refunded` |

> **`intent_rejected` lives in the INTENTS list, not history** (product decision, 2026-07-20).
> A rejected intent never reached payment, so it isn't an order "outcome" — it's the end of an
> intent, and it belongs beside the other intents. History is defined as an **explicit positive
> list**, so a *future* `Order.Status` value can't silently drift into history — someone has to
> place it deliberately. *(This corrected the earlier negative `.exclude(...)` filter — see
> validation F-01.)*

## History sort order

History is a two-group sort:

1. **Delivering** orders first (`order_confirmed … partially_delivered`), by **closest ship
   arrival** (`ship_arrival_date` ascending).
2. **Settled** orders after, by **latest** (`delivered_at`, falling back to `created_at`,
   descending).

Intents sort simply by newest (`-created_at`).

## What the list rows carry for the UI

Both rows are built so the app can render the card **and** gate the next action without a second
call — e.g. `is_express` / `is_emergency` (can this be amended?), `location_change` (a
"berth changed" summary), `parent_order_number` ("Addition to AM…", #9). History rows add
`is_paid`, `is_confirmed`, `delivery_on_hold` (an unpaid delta is blocking handover, #10) and
`has_surprise_gift` (a **boolean only** — the gift is never named, #28).

## The rest of "My Orders" (mapped, documented elsewhere)

| Tap | Endpoint | Documented in |
|---|---|---|
| Open bill breakdown | `GET /orders/<id>/bill/` | **Flow 7** (API 4) |
| Payment summary (items + fees + delivery) | `GET /orders/<id>/payment-summary/` | **Flow 7** (API 5) |
| Live payment status (poll after Stripe) | `GET /orders/<id>/payment-status/` | **Flow 7** (API 7) |
| Live delivery tracking (milestone ladder) | `GET /orders/<id>/track/` | **Flow 10** (API 9) |
| Pay / cancel the payment link | `POST /orders/<id>/pay/` · `cancel-payment/` | **Flow 7** |
| Apply/remove coupon or points | `POST /orders/<id>/apply-coupon/` … | **Flow 8** |
| Respond to substitutions | `…/suggestions/…` · `confirm-substitutions/` | **Flow 6** |
| Report a location change / pay a delta | `…/report-location/` · `…/deltas/…` | **Flow 11** |
| Cancel the order | `POST /orders/<id>/cancel/` | **Flow 12** |
| Rate the delivery | `POST /orders/<id>/rate-delivery/` | **Flow 16** |
| Add items | `POST /orders/<id>/add-items/` | **Flow 15** |
| Open order chat | `ws/chat/` | **Flow 23** |

---

# Phase 2 — Discover the Complete Flow

```
SAILOR opens "My Orders"
  ├─ GET /api/orders/intents/     ?status ?type ?date_from ?date_to ?search · paginated
  │      → pre-confirmation orders + rejected intents, newest first
  └─ GET /api/orders/history/     (same filters) · paginated
         → paid-onward + outcomes; delivering (closest arrival) then settled (latest)

  taps an order ▼  (all detail reads/actions live in their home flow)
     bill · payment-summary · payment-status   → Flow 7
     track (milestone ladder)                  → Flow 10
     pay · cancel · rate · report-location · chat · add-items · coupon/points → 7·12·16·11·23·15·8
```

## API sequence table

| Step | Platform | API | Owner |
|---|---|---|---|
| 1 | SAILOR | `GET /api/orders/intents/` | **Flow 14** |
| 2 | SAILOR | `GET /api/orders/history/` | **Flow 14** |
| 3 | SAILOR | `GET /api/orders/<id>/bill/` · `payment-summary/` · `payment-status/` | Flow 7 |
| 4 | SAILOR | `GET /api/orders/<id>/track/` | Flow 10 |

---

# Phase 3 — API Documentation

## Flow-wide conventions

| Header | Notes |
|---|---|
| `Authorization: Token <key>` | Both lists |
| `server-secret-key` | Required (`/api/orders/…`) |

Both lists are `[IsAuthenticated]`, **scoped to `request.user`** (a sailor only ever sees their
own orders), exclude soft-deleted, and are paginated by `CustomPagination`.

### Shared query parameters (both lists)

Validated by `CustomerOrderFilterSerializer` — **every param is optional, and an invalid value
is rejected with 400** (not silently ignored).

| Param | Type | Allowed values | Notes |
|---|---|---|---|
| `status` | string | any `Order.Status` value (`intent_received`, `sourcing`, `payment_pending`, `delivered`, `cancelled`, `refunded`, …) | Filters within the list's bucket; a status outside the bucket returns an empty page |
| `type` | string | `express` · `emergency` · `special` · `fastest` | `special` = orders backed by a Special Request (Flow 13); `emergency`/`fastest`/`express` map to the order flags |
| `date_from` | date | `YYYY-MM-DD` | Inclusive, on `created_at` |
| `date_to` | date | `YYYY-MM-DD` | Inclusive; **`date_from` must be ≤ `date_to`** else 400 |
| `search` | string | ≤ 100 chars | Matches **order number only** (`order_number` contains) — *not* item names or product text |
| `page` / `page_size` | int | `page_size` ≤ 100 | Standard pagination |

### Error responses (both lists)

| Status | When | Body |
|---|---|---|
| **400** | Any invalid query param — an unknown `status` or `type`, a malformed date, `date_from` > `date_to`, `search` over 100 chars, a non-integer `page_size`. **Rejected, never silently ignored** | DRF field map, e.g. `{"date_to": ["date_from must be on or before date_to."]}` |
| **401** | Missing or expired token | `{"detail": "Authentication credentials were not provided."}` |
| **403** | Missing `server-secret-key` — `/api/orders/…` is not middleware-exempt | `{"detail": "…"}` |
| **404** | `?page=` beyond the last page (DRF pagination) | `{"detail": "Invalid page."}` |

**There is no 403 for "someone else's order"** — the querysets are scoped to `request.user`, so
another sailor's order is simply absent from the page rather than refused. Nothing here can leak
across accounts, and nothing confirms that an order number exists.

An empty result is a **200 with `count: 0`**, not a 404 — including when a `status` filter names
a value that belongs to the *other* list's bucket.

---

## API 1 · List my intents

| Field | Value |
|---|---|
| **Endpoint** | `/api/orders/intents/` · `GET` |
| **View** | `ListMyIntentsView` · row serializer `CustomerIntentSerializer` |
| **Scope** | `request.user`, `status ∈ INTENT_LIST_STATUSES`, newest first |

Pre-confirmation orders **and rejected intents**. Query params: the shared set above.

**Success — 200** — paginated; each row:
```json
{
  "id": "…", "order_number": "AM202607210007",
  "status": "pending_customer_response", "status_display": "Pending Customer Response",
  "has_suggestions": true,
  "item_count": 3,
  "items": [
    { "id": "…", "product_name": "Marine Rope 22mm", "sku": "MR-22",
      "quantity": 2, "unit_price": "50.00", "line_total": "100.00",
      "status": "available", "status_display": "Available",
      "thumbnail": "https://cdn…/rope.jpg" }
  ],
  "location_change": { … "berth changed" summary, or null … },
  "parent_order_number": null,
  "ship_arrival_date": "2026-07-25T08:00:00Z",
  "expected_departure": "2026-07-26T18:00:00Z",
  "is_fastest_delivery": false, "is_express": false, "is_emergency": false,
  "total_amount": "0.00",
  "intent_received_at": "2026-07-21T09:12:00Z"
}
```

| Field | Meaning |
|---|---|
| `has_suggestions` | Admin released a substitution suggestion (needs the sailor's response — Flow 6) |
| `location_change` | Summary of any open/settled location change (Flow 11), else `null` |
| `parent_order_number` | Set when this is an **addition** to an already-paid order (#9) → "Addition to AM…" |
| `is_express` / `is_emergency` | Let the client gate "add items" exactly as the server does (express is never amendable; catalog type must match) |
| `intent_received_at` | `placed_at`, falling back to `created_at` |

---

## API 2 · Order history

| Field | Value |
|---|---|
| **Endpoint** | `/api/orders/history/` · `GET` |
| **View** | `OrderHistoryView` · row serializer `CustomerOrderHistorySerializer` |
| **Scope** | `request.user`, `status ∈ HISTORY_STATUSES`; delivering-first then settled |

Paid-onward orders and their outcomes. Query params: the shared set above.

**Success — 200** — paginated; each row:
```json
{
  "id": "…", "order_number": "AM202607180003",
  "status": "at_berth", "status_display": "At Berth", "total_amount": "1155.00",
  "is_paid": true, "is_confirmed": true,
  "item_count": 5,
  "created_at": "July 18, 2026, 02:30 PM",
  "items": [
    { "id": "…", "product_name": "Marine Rope 22mm", "sku": "MR-22",
      "quantity": 2, "unit_price": "50.00", "line_total": "100.00",
      "status": "delivered", "status_display": "Delivered",
      "thumbnail": "https://cdn…/rope.jpg" }
  ],
  "location_change": null,
  "parent_order_number": null,
  "delivery_on_hold": false,
  "has_surprise_gift": true,
  "ship_arrival_date": "2026-07-21T15:00:00Z",
  "expected_departure": "2026-07-22T10:00:00Z",
  "is_fastest_delivery": false, "is_express": false, "is_emergency": false
}
```

| Field | Meaning |
|---|---|
| `is_paid` | `payment_status == completed` |
| `is_confirmed` | Order is `order_confirmed` or beyond (`_CONFIRMED_OR_BEYOND`) |
| `delivery_on_hold` | An **unpaid delivery surcharge** is blocking handover (#10) → show "pay the surcharge to continue" |
| `has_surprise_gift` | **Boolean only** — a gift is coming; it is **never named** (#28). A revoked gift reads as `false` |
| `created_at` | Human display string (`created_at_display`), not ISO |

---

## What happens next

| Outcome | Next |
|---|---|
| Tap an order | Detail reads (bill/payment/track) — flows 7 & 10 |
| Act on it | pay (7) · cancel (12) · rate (16) · report location (11) · chat (23) · add items (15) |

---

## Source reference

| Concern | Location |
|---|---|
| List views | `orders/customer_views.py` (`ListMyIntentsView`, `OrderHistoryView`) |
| Status buckets | `orders/customer_views.py` (`INTENT_LIST_STATUSES`, `HISTORY_STATUSES`, `DELIVERING_STATUSES`) |
| Filter validation | `orders/customer_serializers.py` (`CustomerOrderFilterSerializer`) |
| Row serializers | `orders/customer_serializers.py` (`CustomerIntentSerializer`, `CustomerOrderHistorySerializer`) |
| Filter application | `orders/customer_views.py` (`_apply_order_filters`) |
| Detail reads | Flow 7 (`bill` / `payment-summary` / `payment-status`), Flow 10 (`track`) |
