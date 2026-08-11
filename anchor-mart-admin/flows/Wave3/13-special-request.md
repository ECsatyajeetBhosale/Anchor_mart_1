# Flow 13 — Special Request (Non-Catalog Sourcing & Quotation)

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`13-special-request-validation.md`](./13-special-request-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md) ·
> Companion frontend recipes: [`../API_SPECIAL_REQUEST.md`](../API_SPECIAL_REQUEST.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

---

# Executive Summary

| | |
|---|---|
| **Flow Name** | Special Request — Non-Catalog Sourcing & Quotation |
| **Business Objective** | Source an item AnchorMart doesn't stock, quote it privately, and convert it to an order |
| **Flow Type** | Core |
| **Primary Actors** | Customer · Admin |
| **Platforms** | `SAILOR` · `ADMIN` · `SYS` (Stripe webhook) |
| **Django Apps** | `catalog` (`SpecialRequest` model + customer views) · `admin_panel` (admin views) · `orders` (order/payment on accept) |
| **Models** | `SpecialRequest`, `SpecialRequestImage`, `Order`, `OrderItem`, `Payment` |
| **State machine** | `SpecialRequest.Status` (`pending → sourcing_confirmed ⇄ quote_sent → accepted / rejected`), enforced through the single `transition_special_request()` gate |
| **Total APIs** | **6 customer · 6 admin** (submit/list/detail/pay/request-changes/reject · stats/list/detail/generate-bill/reject/allow-changes) |
| **Previous Flow** | — (a sailor starts a request from scratch) |
| **Next Flow** | On **accept** → Flow 7 (Stripe webhook confirms) → Flow 10 (delivery) |
| **Documentation Version** | 1.2 — 2026-08-07 (`category_id` optional + seeded "Special Request" fallback category, shipped 2026-08-05; API 1 request body fully specified). 1.1 — 2026-07-23 (FP1: transitions routed through the state-machine gate; FP2: `variant` field flagged unused) |
| **Documentation Status** | ✅ 12 routes documented, verified against the running route table |

> **No catalog product is ever created.** The quote lives entirely on the `SpecialRequest`
> (product name/description, per-unit price, fast-delivery charge). On accept, the order line is
> built **variant-less** — self-describing from the request's fields, with `sku = the SR
> reference` so the line traces back. Nothing leaks into public browse.

---

# Phase 1 — Understand the Flow

## The journey

```
SAILOR                                   ADMIN
 1. add-special-request  ───────────────▶  (pending)
                                          2. generate-bill  → quote_sent, notify sailor
    (quote_sent) ◀────────────────────────
 3a. pay             → Order + Stripe link → accepted (terminal), webhook confirms → delivery
 3b. request-changes → new delivery details → sourcing_confirmed → admin re-quotes ⤴ (rebill loop)
 3c. reject          → note                 → rejected (terminal)

 Admin may also: reject BEFORE quoting (→ rejected), or allow-changes (raise the rebill cap).
```

## The state machine

| Status | Meaning | Next allowed |
|---|---|---|
| `pending` | Submitted, awaiting admin | `sourcing_confirmed` · `quote_sent` · `rejected` |
| `sourcing_confirmed` | Admin working / rebill in progress | `quote_sent` · `rejected` |
| `quote_sent` | Quote ready for the sailor | `sourcing_confirmed` (rebill) · `accepted` · `rejected` |
| `accepted` | Sailor paid → Order created | **terminal** |
| `rejected` | Withdrawn / declined | **terminal** |

- **`accepted` and `rejected` are terminal.**
- **The rebill loop** is `quote_sent → sourcing_confirmed` (sailor `request-changes`) →
  `sourcing_confirmed → quote_sent` (admin `generate-bill`), capped per request by `rebill_cap`
  (default **2**); an admin raises it with `allow-changes`.
- **Who may reject when:** the admin may reject **only before quoting** (`pending` /
  `sourcing_confirmed`). Once `quote_sent`, rejection is the **sailor's** decision.

> The transitions are declared on the model (`VALID_TRANSITIONS` / `can_transition`), but the
> views currently enforce them with their own manual status checks — see validation **F-02**.

## The reference

Each request gets a human reference on first save — **`SR{YYYYMMDD}{NNNN}`** (daily sequence),
e.g. `SR202606150001`. It's the SKU on the eventual order line, so the order traces back.

## Accept → pay (the conversion)

`pay/` is the sailor's single **commit-and-pay** action, under a **request-row lock** so two
concurrent taps can't each build an order:

- **`quote_sent`** → validate the quote exists and delivery details are complete (address, port,
  arrival, and arrival not in the past) → build a `payment_pending` `Order` + a **variant-less**
  `OrderItem` (`unit_price = quoted_price`, `shipping_fee = fast_delivery_charge` if fastest) →
  mark the request **`accepted`** → return a Stripe link.
- **`accepted` but unpaid** → **idempotent retry**: reuse/refresh the same Stripe session (so
  closing Stripe and returning hits the same endpoint). Already paid → 400.
- The **Stripe call is outside the lock**; a Stripe error → 502 with the `order_id` (recoverable
  via Flow 7 pay-order). On first pay, the address is saved and admins are notified.

After payment, the **same webhook as Flow 7** confirms the order (`payment_received →
order_confirmed`) and it joins the standard delivery lifecycle (Flow 10).

## The admin console

Stats cards (count per status), a searchable/filterable list, per-request detail, and the three
write actions (generate-bill, reject, allow-changes). The list's `?status=` filter is **validated**
(400 on a bad value).

---

# Phase 2 — Discover the Complete Flow

```
CUSTOMER — base /api/catalog/
  ├─ POST add-special-request/                 { product_name, ship_arrival_date, expected_departure,
  │                                              shipping_address, platform, port_id|anchorage_id, … }
  │                                              category_id OPTIONAL → "Special Request" fallback
  ├─ GET  get-special-request/                 my requests (list)
  ├─ GET  get-special-request-product/         one request's detail
  ├─ POST special-request/<id>/pay/            accept the quote → Order + Stripe link  (idempotent)
  ├─ POST special-request/<id>/request-changes/  new delivery details → sourcing_confirmed (rebill, capped)
  └─ POST special-request/<id>/reject/         withdraw/decline (pending|sourcing_confirmed|quote_sent) + note

ADMIN — base /api/superadmin/special-requests/
  ├─ GET  special-request-stats/               count per status
  ├─ GET  get-all-special-requests/            list (?status validated · ?search) · paginated
  ├─ GET  get-special-requests/                one request's detail
  ├─ POST <id>/generate-bill/                  quote (pending|sourcing_confirmed) → quote_sent
  ├─ POST <id>/reject/                         reject BEFORE quoting → rejected + reason
  └─ POST <id>/allow-changes/                  raise the rebill cap (+N)

SYS → Stripe webhook (Flow 7) confirms the accepted order → Flow 10 delivery
```

## API sequence table

| Step | Platform | API |
|---|---|---|
| 1 | SAILOR | `POST /api/catalog/add-special-request/` |
| 2 | ADMIN | `GET /api/superadmin/special-requests/get-all-special-requests/` |
| 3 | ADMIN | `POST /api/superadmin/special-requests/<id>/generate-bill/` |
| 4 | SAILOR | `GET /api/catalog/get-special-request/` · `get-special-request-product/` |
| 5 | SAILOR | `POST /api/catalog/special-request/<id>/pay/` **or** `request-changes/` **or** `reject/` |
| 6 | ADMIN | `POST /api/superadmin/special-requests/<id>/reject/` · `allow-changes/` |
| — | ADMIN | `GET …/special-request-stats/` · `get-special-requests/` |

---

# Phase 3 — API Documentation

## Error responses — flow-wide

Every endpoint answers from this set; per-API sections note only what is specific to them.

| Status | When | Body |
|---|---|---|
| **400** | Field validation, a missing/malformed `special_request_id`, an illegal state transition, or the rebill cap | `{"detail": "…"}` for business rules, DRF field map for field errors |
| **401** | Missing or expired token | `{"detail": "Authentication credentials were not provided."}` |
| **403** | Missing `server-secret-key` (customer routes), or a non-admin on APIs 7–12 | `{"detail": "…"}` |
| **404** | The request is not the caller's — **never 403**, so a reference cannot be probed for existence | `{"detail": "Not found."}` |
| **409** | A concurrent transition already moved the request | `{"detail": "…"}` |

State-machine refusals are **400 here, not 409** — the customer-facing verbs (accept, reject,
request-changes) treat "wrong status" as a bad request against the resource's current state
rather than a concurrency conflict. Flow 10's transit ladder makes the opposite choice; the
difference is deliberate and worth knowing when writing shared client error handling.

## Flow-wide conventions

| Header | Notes |
|---|---|
| `Authorization: Token <key>` | All 12 |
| `server-secret-key` | Required on **customer** `/api/catalog/…`; **`/api/superadmin/…` exempt** |

- Customer endpoints act on the **caller's own** request only (404 otherwise).
- Errors: `{"field": ["msg"]}` for field validation, `{"detail": "msg"}` for business rules.
- Exhaustive request/response bodies are in the companion
  [`API_SPECIAL_REQUEST.md`](../API_SPECIAL_REQUEST.md); the contracts below are complete for
  building against.

---

## API 1 · Submit a special request

| Field | Value |
|---|---|
| **Endpoint** | `/api/catalog/add-special-request/` · `POST` · `AddSpecialRequestView` |

| Field | Required | Type / rules |
|---|---|---|
| `product_name` | ✅ | ≤ 200 chars |
| `ship_arrival_date` | ✅ | Datetime (ISO-8601 / `YYYY-MM-DD`). **May be in the past** here — the accept step re-checks it |
| `expected_departure` | ✅ | Datetime. Must be **strictly after** `ship_arrival_date`, else 400 `{"expected_departure": ["Expected departure must be after the ship's arrival."]}` |
| `shipping_address` | ✅ | Object — free-form snapshot, stored as sent, not validated |
| `platform` | ✅ | `web` / `app` |
| `port_id` **or** `anchorage_id` | ✅ | UUID — **at least one is required.** `anchorage_id` wins when both are sent, and implies its own port. Neither → 400 `{"port_id": ["Provide port_id or anchorage_id."]}` |
| `category_id` | ✖ | UUID. **Optional since 2026-08-05** — see below |
| `brand` | ✖ | ≤ 120 chars |
| `description` | ✖ | ≤ 1000 chars |
| `notes` | ✖ | ≤ 1000 chars — appended to `description` as `"\n\nNotes: …"` on save; not stored separately |
| `quantity` | ✖ | int, 1–10000 (default 1) |
| `max_budget` | ✖ | decimal ≥ 0.01, nullable |
| `currency` | ✖ | ≤ 10 chars (default `"USD"`) |
| `is_fastest_delivery` | ✖ | bool (default false) |
| `images` | ✖ | list of paths under `special_request_images/` (Flow 26 upload), **max 10** — more → 400 `{"images": ["At most 10 images are allowed (got N)."]}` |

> ### `category_id` is optional — do not build a mandatory category picker
>
> **Changed 2026-08-05** (product decision). The sailor is describing something that is *not*
> in the catalogue, so making them classify it first is friction.
>
> | Client sends | Result |
> |---|---|
> | key omitted, `null`, or `""` | Falls back to the seeded **"Special Request"** general-scope category (`Category.SPECIAL_REQUEST_NAME`) |
> | a valid active category id | That category is used — **any scope** is accepted, not just general |
> | an id that resolves to nothing active | **400** `{"category_id": ["No active category with this id."]}` — deliberately *not* swapped for the fallback, since that would hide a client bug and mis-file the request |
>
> The empty string is handled in `to_internal_value` (`catalog/serializers.py:218-228`): a bare
> `UUIDField` has no `allow_blank`, so `""` would otherwise 400 with "Must be a valid UUID".
>
> The fallback category is an **ordinary Category row**, seeded by migration
> `catalog/0062_seed_special_request_category` and resolved with `get_or_create`, so an admin
> renaming or soft-deleting it from the category screen self-heals instead of 500-ing the
> submit endpoint (`catalog/special_request_service.py:default_special_request_category`).
> It is **hidden from the customer category list** — `GET /api/catalog/get-category-list/`
> excludes `(name="Special Request", scope=general)` (`catalog/views.py:92-99`), so a sailor can
> never pick it explicitly; it stays visible on the **admin** category screen, where
> generate-bill can override a request onto it. A request is never category-less, because admin
> generate-bill 400s on one that is.

**Success — 201** — the created request (`pending`) with its `reference`. Admins are notified.

---

## APIs 2–3 · Read my requests

| API | Endpoint | Returns |
|---|---|---|
| 2 | `GET /api/catalog/get-special-request/` | The caller's requests (list) |
| 3 | `GET /api/catalog/get-special-request-product/?special_request_id=` | One request's detail (quote, delivery, images, status) |

Both are **ownership-scoped** — the queryset filters `user=request.user`, so another sailor's
reference is simply not found. A special request carries a bespoke price quoted for one vessel;
it is not catalog data.

### API 2 — Success `200`

Query: `?status=` (validated against the state machine, 400 on a bad value) · `?search=` ·
sort · `page` / `page_size`.

```json
{
  "count": 3, "next": null, "previous": null,
  "results": {
    "message": "Special interests fetched successfully",
    "data": [
      { "id": "…", "reference": "SR-2026-0042", "product_name": "Custom Winch",
        "brand": "…", "quantity": 2, "status": "quote_sent",
        "total_amount": "9000.00", "rebill_count": 1,
        "created_at": "August 02, 2026, 10:15 AM" }
    ]
  }
}
```

### API 3 — Success `200`

```json
{ "message": "Special interest fetched successfully", "data": { "…full detail…" } }
```

Adds the quote breakdown, delivery details, images and the linked order once accepted.

**Errors** — 400 `{"special_request_id": "This query parameter is required."}` or
`{"special_request_id": "'<v>' is not a valid UUID."}` · 401 · 404 (not the caller's)

---

## API 4 · Accept & pay

| Field | Value |
|---|---|
| **Endpoint** | `/api/catalog/special-request/<special_request_id>/pay/` · `POST` · `PaySpecialRequestView` |

No body. Row-locked. Behaviour by status:

| From status | Result |
|---|---|
| `quote_sent` | Build `payment_pending` Order + variant-less line → `accepted`, return Stripe link (**201**) |
| `accepted`, unpaid | Reuse/refresh the Stripe link (**200**, idempotent retry) |

**Errors** — 400: not yet quoted · delivery details incomplete · ship arrival in the past ·
already paid · not payable in this status. 502: Stripe error (order exists at `payment_pending`;
pay via Flow 7). 404: not the caller's request.

**Success — 201 / 200**
```json
{ "message": "Complete payment to confirm your order.",
  "order_id": "…", "total_amount": "230.00",
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_…",
  "expires_at": "2026-07-23T09:41:00+00:00" }
```

---

## API 5 · Request delivery changes (re-quote)

| Field | Value |
|---|---|
| **Endpoint** | `/api/catalog/special-request/<id>/request-changes/` · `POST` · `RequestChangesSpecialRequestView` |

The sailor updates delivery details on a **quoted** request before paying. Stores the new
details, flags a rebill, steps the request back to `sourcing_confirmed`, and notifies admins.
**No order is created.**

**Body** (`RequestChangesSerializer`) — the new delivery snapshot (`shipping_address`,
`ship_arrival_date`, `expected_departure`, `is_fastest_delivery`, `port_id`, `anchorage_id` — as
being changed).

**Rebill cap** — allowed at most `rebill_cap` times (default **2**). Over the cap → **400**
(*"You've reached the maximum of N delivery-change requests…"*) — the sailor must pay or reject,
unless an admin raises the cap (API 11). `rebill_count` increments on each.

---


**Success — 200**
```json
{ "message": "Delivery details updated. Awaiting a revised quote from admin.",
  "rebill_requested": true, "status": "sourcing_confirmed" }
```

The request moves **back** to `sourcing_confirmed` through the state machine (never by direct
assignment — FP1), because a delivery change invalidates the quote that was priced against the
old location.

**Errors** — 400 (`Provide at least one delivery detail to change.` · `anchorage_id`/`port_id`
not found · `Delivery changes can only be requested on a quote (got '<status>')` · the rebill
cap: `You've reached the maximum of N delivery-change requests…`) · 401 · 404

---

## API 6 · Reject / cancel / withdraw (customer)

`POST /api/catalog/special-request/<id>/reject/` · `RejectSpecialRequestView`. Requires a
**`note`**. Allowed from `pending` / `sourcing_confirmed` / `quote_sent` → `rejected` (terminal);
already `accepted`/`rejected` → 400. The note is kept as the customer's reason.

**Success — 200** — `{ "message": "Quote rejected.", "status": "rejected" }`

The message differentiates: rejecting a **quote** reads "Quote rejected.", withdrawing before
one exists reads "Request cancelled." — same endpoint, same terminal status, honest copy.

**Errors** — 400 (`{"note": "This field is required."}` · `This request can no longer be
cancelled in '<status>' status.`) · 401 · 404

---

## APIs 7–9 · Admin reads

| API | Endpoint | Returns |
|---|---|---|
| 7 | `GET …/special-request-stats/` | `{ total_requests, pending, sourcing_confirmed, quote_sent, accepted, rejected }` |
| 8 | `GET …/get-all-special-requests/` | List — `?status=` (**validated**, 400 on bad value) · `?search=` (sailor / whatsapp / product / brand / reference) · paginated, lean rows |
| 9 | `GET …/get-special-requests/?special_request_id=` | One request's full detail |

---

## API 10 · Generate the bill (quote)

| Field | Value |
|---|---|
| **Endpoint** | `/api/superadmin/special-requests/<id>/generate-bill/` · `POST` · `GenerateBillView` |

Only a **not-yet-quoted** request (`pending` / `sourcing_confirmed`) can be billed (else 400).

| Field | Required | Rules |
|---|---|---|
| `product_name` | ✅ | The quoted product's name (on the request, not a catalog product) |
| `description` | ✅ | |
| `quoted_price` | ✅ | Decimal, **≥ 0.01** (per unit) |
| `fast_delivery_charge` | ✅ | Decimal ≥ 0 → becomes the order's `shipping_fee` if fastest |
| `admin_response` | ✅ | The quote message to the sailor |
| `category_id` | ✖ | Override the request's category — must be **general-scope** |

Records the quote on the `SpecialRequest`, folds in any pending rebill delivery details, moves it
to **`quote_sent`**, and notifies the sailor (an actionable "Review quote" inbox row). **No
catalog Product/Variant is created.**

**Success — 200** — the updated request detail.

---

## API 11 · Admin reject (before quoting)

`POST /api/superadmin/special-requests/<id>/reject/` · `AdminRejectSpecialRequestView`. Requires
`admin_response` (the reason). Allowed only from `pending` / `sourcing_confirmed` → `rejected`
(else 400 — *"once quoted, rejection is the customer's decision"*). Notifies the sailor.

---

## API 12 · Allow more delivery changes

`POST /api/superadmin/special-requests/<id>/allow-changes/` · `AdminAllowSpecialRequestChangesView`.
Body `{ "additional": 1 }` (int **1–10**). Raises `rebill_cap += additional`. Not allowed on a
terminal (`accepted`/`rejected`) request.

---

## What happens next

| Outcome | Next |
|---|---|
| Accepted & paid | **Flow 7** webhook → `order_confirmed` → **Flow 10** delivery |
| Rejected | Terminal — no order |
| Rebill requested | Admin re-quotes (API 10), loop continues within the cap |

---

## Source reference

| Concern | Location |
|---|---|
| Model + state machine | `catalog/models.py:425` (`SpecialRequest`, `VALID_TRANSITIONS`, `can_transition`) |
| Reference generator | `catalog/models.py` (`generate_special_request_ref`) — `SR{YYYYMMDD}{NNNN}` |
| Customer views | `catalog/views.py` (`Add/Get/Pay/RequestChanges/Reject SpecialRequest…`) |
| Admin views | `admin_panel/views/special_request_views.py` |
| Order build on accept | `PaySpecialRequestView._build_order` (variant-less line, `sku = reference`) |
| Stripe session | `orders/payments_service.py` (`create_or_reuse_session`) — shared with Flow 7 |
| Companion frontend doc | [`../API_SPECIAL_REQUEST.md`](../API_SPECIAL_REQUEST.md) |
