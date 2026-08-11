# Flow 33 — Admin Dashboard & Business Analytics (Operate today → Measure the period)

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`33-admin-dashboard-analytics-validation.md`](./33-admin-dashboard-analytics-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint is fully specified.
>
> Index: [`../../BUSINESS_FLOWS.md`](../../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

---

# Executive Summary

Two screens sit on the same order table and answer two different questions.

**The Dashboard answers "what needs me right now."** Live pipeline counts, the orders board,
the work queue. Its numbers move the moment an order does.

**Analytics answers "how did the business do."** Trends, per-product performance, growth
against the previous period. Its numbers come from a pre-aggregated nightly rollup.

The one thing to understand before reading anything else:

> ### The two screens recognise money at different moments, on purpose
>
> **Dashboard = the *paid* basis.** Revenue is recognised at `payment_completed_at`, net of
> refunds (`refunded_at`). Money in the door.
>
> **Analytics = the *delivered* basis.** "Sales" means successfully delivered orders, measured
> off `delivered_at`. Value actually fulfilled.
>
> So `dashboard/revenue/` and `analytics/sales-trend/` **will legitimately disagree** for the
> same window, and neither is wrong — an order paid on Monday and delivered on Thursday lands
> in different buckets on the two screens. The one deliberate crossover is
> `analytics/summary/`'s `monthly_revenue` card, which is a *paid* figure sitting on the
> Analytics screen because it answers a cash question, not a fulfilment one.
>
> This is stated at the top of `admin_panel/views/analytics_views.py` and is a design
> decision, not drift. It was re-confirmed by execution during this pass — see the
> validation report's *Verified correct* section.

| | |
|---|---|
| **Actors** | Admin · Super Admin |
| **Endpoints** | **16** — 12 dashboard · 4 analytics |
| **Django Apps** | `admin_panel` (views + serializers), `analytics` (rollup + read layer), `orders`, `catalog`, `user` |
| **Models read** | `Order`, `OrderItem`, `OrderStatusHistory`, `DeliveryAssignment`, `DeltaPayment`, `LocationReport`, `SellerProfile`, `SpecialRequest`, `PortAddress`, `Product`, `ProductRating`, `DailyOrderMetrics`, `DailyProductMetrics` |
| **Writes** | **None.** Every endpoint in this flow is read-only. |
| **Trigger** | Admin opens the dashboard or the analytics screen |
| **Previous Flow** | 31 (the admin account doing the looking) |
| **Next Flow** | 34 (audit trail — the record of what admins did) |
| **Documentation Version** | 1.0 — 2026-07-31 |
| **Documentation Status** | ✅ 16 routes fully specified. Routes taken from the running route table; **behaviour verified by EXECUTING every endpoint** against a real database. |

---

# Concepts you need before reading the endpoints

### 1. The read layer — never touch the rollup tables directly

`analytics/reads.py` is the only sanctioned way to read the rollup. The rule it exists to
enforce:

> A rollup covers **complete days only**. Any window that includes today must compute today
> live and merge it in.

Reading `DailyOrderMetrics` raw would silently drop today's orders — the most damaging
failure mode for an operations dashboard, because the numbers still look plausible. So every
read-layer function answers a window as:

```
settled days (< today)  →  one indexed read of the small rollup table
today (if in window)    →  the same live aggregate the endpoint used before
```

Cost is bounded by **one day** of OLTP rows regardless of window length. A year-to-date chart
that used to scan a year of orders now scans one day.

`active_sailors` is the exception that proves the rule: distinct sailors don't sum across days
(the same person on two days is one sailor, not two), so it is always computed live.

**Which endpoints use it:** all four analytics endpoints, plus `dashboard/revenue/` and
`dashboard/top-products/`. The rest of the dashboard is *deliberately* live — an operations
board showing "orders in progress right now" must not be reading last night's snapshot.

### 2. Snapshot counts vs period counts

`dashboard/stats/` returns both kinds and they behave differently:

| Kind | Examples | Period filter |
|---|---|---|
| **Snapshot** | `in_progress`, `intent_received`, `delivery_failed`, `delta_open`, `total_sailors` | **Ignored.** Always "right now". |
| **Period** | `orders_placed`, `cancelled`, `refunded` | **Applied**, off dedicated event timestamps. |

Period counts are measured off `placed_at` / `cancelled_at` / `refunded_at` — **never**
`created_at` or `updated_at`. An order row is created before it is placed, and updated long
after; using either would move an order between periods for reasons unrelated to the business
event being counted.

### 3. Two period vocabularies

The two screens offer different named windows, because they answer different questions:

| Screen | Param | Values | Custom range |
|---|---|---|---|
| Dashboard | `?period=` | `today` · `week` (rolling 7d) · `month` (rolling 30d) | `?from_date=&to_date=` |
| Analytics | `?period=` | `7d` · `30d` (rolling) · `quarter` · `year` (**calendar**, current) | `?from_date=&to_date=` |

Sending an unknown value is a **400** listing the allowed set. The custom range is
**both-or-neither**: sending only one of `from_date`/`to_date` is a 400.

> **Custom ranges are capped at 731 days (~2 years).** The chart endpoints materialise one
> entry *per day in Python* before bucketing, and `dashboard/revenue/` has no adaptive
> granularity — it emits one bar per day. The cap lives in one place
> (`admin_panel/dashboard_utils.MAX_CUSTOM_RANGE_DAYS`) and every endpoint that parses a
> custom range inherits it. Every named period is far inside it.

### 4. Adaptive bucketing (analytics only)

Analytics charts pick their own bucket size so the chart stays readable:

| Window | Granularity |
|---|---|
| ≤ 31 days | `daily` (each bucket carries a `weekday`) |
| ≤ 120 days | `weekly` (7-day chunks) |
| > 120 days | `monthly` (calendar months) |

The chosen value is returned as `granularity` in the response. `dashboard/revenue/` does
**not** do this — it takes `?granularity=daily|weekly` from the caller.

### 5. Two generations of view live in this flow

`dashboard_views.py` contains both the current dashboard sections (`DashboardStatsView`,
`DashboardLiveOrdersView`, `DashboardRevenueView`, …) and four older endpoints that predate
them (`OrderListView`, `GetOrdersDetailView`, `GetAllPortsView`,
`GetProductVariantForSuggestionView`). The older ones use different conventions — query-param
IDs instead of path IDs, `created_at` instead of `placed_at`, their own `{"message": ...}`
error shape. They remain routed and are documented here as they behave.

`DashboardView` (`dashboard/dashboard/`) is explicitly superseded by `DashboardStatsView`,
which returns everything it returns and more. It is kept routed until the frontend migrates
off it.

---

# Authentication

Every endpoint: `IsAuthenticated` + `IsAdminUser` (role-based — `admin` or `super_admin`).

| Caller | Result |
|---|---|
| No token | **401** |
| Customer / seller / delivery-partner token | **403** |
| `admin` or `super_admin` token | **200** |

There is **no super-admin-only endpoint in this flow** — both admin tiers see the same
numbers, and no endpoint is scoped to the admin's own assigned orders. `/api/superadmin/` is
exempt from the `server-secret-key` middleware, so no such header is needed.

---

# Endpoint Reference — Dashboard

## 1. Dashboard summary (legacy)

```http
GET /api/superadmin/dashboard/dashboard/
```

Superseded by §2, which returns these figures and more. No parameters.

**200**
```json
{
  "pending_intent_count": 4,
  "special_intrest_product_count": 2,
  "silent_alerts_count": 1,
  "active_orders_today": 7
}
```

| Field | Meaning |
|---|---|
| `pending_intent_count` | Orders at `intent_received` |
| `special_intrest_product_count` | `SpecialRequest` rows at `pending` |
| `silent_alerts_count` | Customer location reports awaiting review — the same figure §2 exposes as `location_reports_pending` |
| `active_orders_today` | Orders whose **`created_at`** falls today |

> `silent_alerts_count` once returned the hardcoded *string* `" Live Order Tracking status
> count"` — a placeholder shipped to the frontend as though it were a number (#35a). It now
> returns the real count it was describing, and matches §2.

> `active_orders_today` is measured off `created_at`, unlike every period count in §2. It is
> the one figure in this flow that still does so; see the validation report.

---

## 2. Dashboard stats

```http
GET /api/superadmin/dashboard/dashboard/stats/?period=today
```

The main dashboard card set. Snapshot counts plus period volume.

| Param | Required | Notes |
|---|---|---|
| `period` | no | `today` (default) · `week` · `month`. 400 otherwise. |
| `from_date`, `to_date` | no | `YYYY-MM-DD`, both-or-neither, ordered, ≤731 days. Overrides `period`. |

**200**
```json
{
  "period": {"from": "2026-07-31T00:00:00+00:00", "to": "2026-07-31T09:14:02+00:00", "label": "today"},
  "total_sailors": 1204,
  "active_partners": 38,
  "in_progress": 61,
  "intent_received": 4,
  "pending_intents": 2,
  "delivery_failed": 3,
  "oldest_failed_at": "2026-07-29T11:02:41+00:00",
  "delta_open": 5,
  "delta_expired": 1,
  "location_reports_pending": 1,
  "orders_placed": 22,
  "cancelled": 3,
  "refunded": 1
}
```

| Field | Kind | Definition |
|---|---|---|
| `total_sailors` | snapshot | Customers with `is_active=True, is_deleted=False` |
| `active_partners` | snapshot | Delivery partners with `is_active=True, is_deleted=False` — account state, not on-duty state |
| `in_progress` | snapshot | Orders in any actively-worked status (sourcing → at berth). Excludes intent review and terminal states. |
| `intent_received` | snapshot | Awaiting admin intent review |
| `pending_intents` | snapshot | At `pending_intent` |
| `delivery_failed` | snapshot | Exception state needing intervention. Held **out** of `in_progress` so the signal isn't buried in routine work. |
| `oldest_failed_at` | snapshot | Per still-failing order, when it last entered `delivery_failed`; the earliest of those. `null` when none. A staleness signal for the oldest unattended failure. |
| `delta_open` | snapshot | Delivery surcharges awaiting customer payment |
| `delta_expired` | snapshot | Surcharges lapsed unpaid — needs an admin decision (re-raise or absorb) |
| `location_reports_pending` | snapshot | Customer location reports awaiting price-or-dismiss |
| `orders_placed` | period | `placed_at` in window |
| `cancelled` | period | `cancelled_at` in window |
| `refunded` | period | `refunded_at` in window |

**Drilldown:** `delivery_failed` links to `live-orders/?order_status=delivery_failed`.

---

## 3. Live orders board

```http
GET /api/superadmin/dashboard/live-orders/?order_status=sourcing&search=OD-1042
```

The Live Orders table. Paginated.

| Param | Notes |
|---|---|
| `order_status` | One `Order.Status` value. **400** listing valid values otherwise. Omitted → defaults to all **non-terminal** orders (excludes `delivered`, `cancelled`, `refunded`, `intent_rejected`). |
| `period` / `from_date` / `to_date` | **Only applied when sent.** Filters `placed_at`. |
| `search` | Order number, sailor email/first/last name, or vessel name (`icontains`). |
| `page`, `page_size` | Default 10, max 50. |

Ordered by `-placed_at, -created_at`.

**200** — standard paginated envelope; each row:
```json
{
  "id": "6b1e…", "order_number": "OD-1042",
  "sailor": {"id": "…", "name": "A. Sailor", "email": "a@ship.com"},
  "ship": "MV Northern Star",
  "port": {"code": "SGSIN", "name": "Singapore"},
  "partner": {"id": "…", "name": "R. Partner", "assignment_status": "accepted"},
  "status": "sourcing", "status_display": "Sourcing",
  "total_amount": "412.00",
  "placed_at": "July 30, 2026, 04:12 PM"
}
```

`partner` is `null` when there is no active assignment. `port` falls back to the shipping
address snapshot when the order has no `port` FK.

---

## 4. Live order detail

```http
GET /api/superadmin/dashboard/live-orders/<uuid:order_id>/
```

Backs the row's **View** button. A non-UUID path segment does not match the route → **404**.
An unknown UUID → **404**.

**200** — `{id, order_number, status, status_display, timeline, information, items, totals}`.

**`timeline`** is a six-step milestone list, each `{key, label, at, is_done, detail}`:
`intent_submitted` → `intent_confirmed` → `payment_confirmed` → `assigned` →
`out_for_delivery` → `delivered`. Steps append `cancelled` / `refunded` when those timestamps
are set.

A milestone is `is_done` when the order's **current** status is at or past it — independent of
whether a history row was logged, so a missing history row can't make a delivered order look
unpaid. `at` comes from the first history row for that status (or the dedicated timestamp
field where one exists).

**`information`** — sailor, ship (`vessel_name`/`imo`), terminal (anchorage name, else port
name), delivery partner, payment method/status, applied coupon code.

---

## 5. Revenue chart

```http
GET /api/superadmin/dashboard/revenue/?granularity=weekly&from_date=2026-07-01&to_date=2026-07-31
```

**Paid basis, net of refunds.** Reads the rollup for settled days + live today.

| Param | Notes |
|---|---|
| `granularity` | `daily` (default) · `weekly`. 400 otherwise. **Not adaptive** — the caller chooses. |
| `from_date`, `to_date` | Both-or-neither, ordered, ≤731 days. Default window: **last 14 days inclusive**. |

**200**
```json
{
  "window": {"from": "2026-07-01", "to": "2026-07-31", "granularity": "weekly"},
  "totals": {"gross": "18400.00", "refunded": "620.00", "net": "17780.00"},
  "bars": [{"label": "2026-07-01..2026-07-07", "from": "2026-07-01", "to": "2026-07-07",
            "gross": "4100.00", "refunded": "0.00", "net": "4100.00"}]
}
```

`gross` = orders whose payment completed in the bucket. `refunded` = orders whose
`refunded_at` falls in the bucket — recognised by `refunded_at` alone, with no payment-status
filter, because a refunded order's `payment_status` has already moved on. `net` = gross −
refunded, and may be negative in a bucket where refunds land for earlier payments.

Weekly buckets are 7-day chunks from the window start, not calendar weeks — the final chunk
may be short.

---

## 6. Top products

```http
GET /api/superadmin/dashboard/top-products/?rank_by=revenue&period=month
```

Demand from **paid** orders in the period. Paginated.

| Param | Notes |
|---|---|
| `rank_by` | `units` (default) · `revenue`. 400 otherwise. |
| `period` | Default **`month`** here (not `today`). |
| `from_date`, `to_date` | As elsewhere. |

Ranking happens in Python over the merged rollup+today set — that set is one row per product
sold in the window, not a table scan, and ranking in one place keeps a single ordering rule
across both halves of the merge. Ties break on `revenue` descending.

**200** — paginated envelope wrapping
`{message, rank_by, period, data: [{product_id, product_name, category, units, revenue}]}`.

---

## 7. Active partners

```http
GET /api/superadmin/dashboard/active-partners/
```

Delivery partners with `is_active=True, is_deleted=False`, each with a derived work status and
their current order. Paginated, ordered by first name then email.

> The same population `dashboard/stats/` counts as `active_partners`. "Active" here is
> **account state**, not on-duty state — see the partner flow for `on_duty` / `available`.

---

## 8. Action required

```http
GET /api/superadmin/dashboard/action-required/
```

The admin worklist. Live counts, **period-independent**. No parameters.

**200**
```json
{
  "actions": [
    {"key": "new_intents", "label": "New intent requests", "count": 4,
     "link": "/api/superadmin/dashboard/live-orders/?order_status=intent_received"},
    {"key": "verifications_to_review", "label": "Verifications to review", "count": 2,
     "link": "/api/superadmin/dashboard/live-orders/?order_status=verification_submitted"},
    {"key": "orders_awaiting_payment", "label": "Orders awaiting payment", "count": 6,
     "link": "/api/superadmin/dashboard/live-orders/?order_status=payment_pending"},
    {"key": "pending_seller_applications", "label": "Pending seller applications", "count": 1,
     "link": "/api/superadmin/sellers/requests/?status=pending"}
  ],
  "total": 13
}
```

Each tile ships the queue it links to. **Every tile's count equals the count its link
returns** — the seller tile scopes to `is_deleted=False` to match the seller-requests list,
and this agreement is pinned by test.

---

## 9. Order list (legacy)

```http
GET /api/superadmin/dashboard/orders/?order_status=delivered&search=alice
```

The older admin order list. Paginated, ordered `-created_at, -id`.

| Param | Notes |
|---|---|
| `order_status` | Case-insensitive; `{"message": "Invalid order status"}` **400** otherwise. |
| `search` | Sailor email/name, order id, shipping-address port name, vessel name. |
| `filter_by_port` | Exact match on the shipping address's `port_name` string. |
| `from_date`, `to_date` | `YYYY-MM-DD`, filters **`created_at`**. Each bound is **independently optional** here (unlike the shared both-or-neither rule elsewhere), so an open-ended range is valid. When both are sent they must be ordered and ≤731 days apart. |

Rows carry `item_count`, counting non-deleted items only.

> Two differences from §3 worth knowing: this filters `created_at` where the live board
> filters `placed_at`, and it does not exclude terminal orders.

---

## 10. Order detail (legacy)

```http
GET /api/superadmin/dashboard/orders/detail/?order_id=<uuid>
```

Full order detail including items, exchanges, return requests and admin suggestions.

| Outcome | Status |
|---|---|
| `order_id` omitted | **400** `{"message": "Order ID is required"}` |
| `order_id` not a UUID | **400** `{"order_id": [...]}` |
| No such order | **404** `{"message": "Order not found"}` |
| Found | **200** |

> Takes its id from a **query param**, unlike §4 which uses a path segment.

---

## 11. Ports list

```http
GET /api/superadmin/dashboard/ports/?search=singa
```

Ports for admin pickers. Paginated. `search` matches `port_name` (`icontains`).
**Soft-deleted ports are excluded** — from both the searched and unsearched paths.

---

## 12. Products for suggestion

```http
GET /api/superadmin/dashboard/products/suggestion/?search=filter
```

Catalogue browse used when an admin suggests a substitute product. Paginated, newest first.
Scoped to `is_deleted=False, is_active=True`; `search` matches name or description.

**200** — paginated envelope wrapping `{status: true, data: [...]}`; each product carries
`id, name, description, base_price, category, avg_rating, images, variants`.

`avg_rating` is the mean of the product's ratings, rounded to one decimal, `0` when unrated.
It is computed by a correlated subquery, not a join — joining ratings would multiply the
product rows before pagination.

> **There is no port filter.** Products are not scoped by port. What stood here was a no-op
> `products.filter().distinct()` under a comment claiming it filtered by port; it was removed
> along with the `Product.ports` M2M on 2026-07-30. Port-wise filtering is **Build B**,
> pending client approval.

> For a single variant's detail, use the catalog endpoint
> `/api/superadmin/catalog/product-variant/?product_variant_id=<uuid>` instead.

---

# Endpoint Reference — Analytics

All four share the global filter (`?period=7d|30d|quarter|year` or `?from_date=&to_date=`) and
all read through `analytics.reads`.

## 13. Summary KPIs

```http
GET /api/superadmin/analytics/summary/?period=30d
```

**200**
```json
{"period": "30d", "monthly_revenue": "18400.00", "total_orders": 214, "active_sailors": 96}
```

| Field | Basis | Window |
|---|---|---|
| `monthly_revenue` | **paid**, net refunds | **Current calendar month to date** — deliberately *not* the selected period. It answers a cash question and has its own helper. |
| `total_orders` | orders **placed** | The selected period |
| `active_sailors` | distinct sailors who placed | The selected period. Always computed live — a distinct count cannot be summed across daily rollup rows. |

> `total_orders` is the same measure `dashboard/stats/` reports as `orders_placed`. For the
> same window the two agree — one computes it live, the other via the rollup, and that
> agreement is pinned by test.

---

## 14. Sales trend

```http
GET /api/superadmin/analytics/sales-trend/?period=quarter
```

**Delivered basis.** Adaptive buckets (§4).

**200**
```json
{"period": "quarter", "granularity": "weekly",
 "bars": [{"label": "2026-07-01..2026-07-07", "from": "2026-07-01", "to": "2026-07-07",
           "deliveries": 12, "units": 48, "revenue": "3100.00"}]}
```

Daily buckets additionally carry `weekday`. Buckets with no activity appear with zeros rather
than being omitted.

---

## 15. Orders by category

```http
GET /api/superadmin/analytics/orders-by-category/?period=30d
```

Units sold per product category from **delivered** orders. Groups on the rollup's snapshotted
category name, so settled days need no `OrderItem → variant → product → category` join.

**200** — `{period, data: [...]}`.

> Lines with no `variant` (special-request items) carry no catalog product and are excluded
> here. They still count toward order-level revenue.

---

## 16. Product sales

```http
GET /api/superadmin/analytics/product-sales/?product_id=<uuid>&period=30d
```

Per-product performance on the **delivered** basis, with growth against the previous
equal-length period and a bucketed series.

| Param | Notes |
|---|---|
| `product_id` | Optional UUID. **400** if malformed, **404** if unknown. Omitted → defaults to the **top product by units delivered** in the period. |

**200**
```json
{"period": "30d", "granularity": "daily",
 "product": {"id": "…", "name": "Marine Filter", "category": "Spares"},
 "revenue": "4100.00", "units_sold": 63,
 "growth": {"units": 12.5, "revenue": -3.2},
 "series": [{"label": "2026-07-30", "weekday": "Thu", "from": "2026-07-30",
             "to": "2026-07-30", "units": 3, "revenue": "180.00"}]}
```

When the period has no delivered products at all, the response is the empty shape:
`{period, product: null, revenue: 0, units_sold: 0, growth: {units: null, revenue: null}, series: []}`.

**Growth** compares against the immediately preceding window of equal length, computed live
(the comparison window is derived from the request and need not align to the rollup's
whole-day grain). It is `null` when there is no baseline and the current value is also zero;
`100.0` when there is no baseline but there is current activity.

---

# Error Reference

| Situation | Status | Body |
|---|---|---|
| Not authenticated | 401 | `{"detail": "..."}` |
| Non-admin role | 403 | `{"detail": "..."}` |
| Unknown `period` | 400 | `{"period": "Must be one of [...] or use from_date/to_date."}` |
| Only one of `from_date`/`to_date` | 400 | `{"detail": "Both from_date and to_date are required for a custom range."}` |
| Malformed date | 400 | `{"from_date": "Must be YYYY-MM-DD, got '13/13/2020'."}` |
| `from_date` after `to_date` | 400 | `{"detail": "from_date cannot be after to_date."}` |
| Custom range wider than 731 days | 400 | `{"detail": "Date range too wide: N days. Maximum is 731 days — narrow the window."}` |
| Unknown `order_status` | 400 | `{"order_status": "Invalid status. Must be one of [...]."}` (legacy §9: `{"message": "Invalid order status"}`) |
| Bad `granularity` / `rank_by` | 400 | `{"granularity": "Must be 'daily' or 'weekly'."}` |
| Malformed UUID in a query param | 400 | `{"order_id": [...]}` / `{"product_id": [...]}` |
| Unknown object | 404 | `{"detail": "Not found."}` / `{"message": "Order not found"}` |

---

# Scale Notes

- **The rollup is the headline optimisation.** Analytics windows cost one indexed read of a
  small table plus one live day, regardless of window length.
- **The 731-day cap** bounds both response size and the Python day-loop in the chart builders.
- **All list endpoints are paginated** (default 10, max 50).
- **`avg_rating` and per-product aggregates use correlated subqueries**, not joins, so rows
  aren't multiplied before pagination.
- **The nightly rollup self-heals.** `rollup_daily_metrics` backfills `missing_dates` up to a
  bounded floor, so one failed night is recovered on the next run rather than leaving a
  permanent hole. It is idempotent — re-running after a bug fix is always safe.
- **Beat ordering is load-bearing:** the rollup runs at 03:00 and the order-status-history
  prune at 03:30. The rollup must stay ahead of the prune or it would aggregate rows that had
  already been deleted.
- **Known cost:** `dashboard/stats/`'s period counts are filtered aggregates over the whole
  `Order` table rather than read-layer calls. See the validation report.
