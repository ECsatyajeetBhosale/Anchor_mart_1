
# Flow 06 — Stock Verification & Substitution


> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`06-stock-verification-substitution-validation.md`](./06-stock-verification-substitution-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)


> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**


---


# Executive Summary


| | |
|---|---|
| **Flow Name** | Stock Verification & Substitution |
| **Business Objective** | Establish what can actually be sourced dockside, and get the sailor's decision on replacements, before billing |
| **Flow Type** | Core |
| **Primary Actors** | Delivery Partner · Admin · Customer |
| **Platforms** | `PARTNER` · `ADMIN` · `SAILOR` · `SYS` |
| **Django Apps** | `partner_app` · `admin_panel` · `orders` (`substitutions.py`, `item_lifecycle.py`) · `catalog` |
| **Models** | `AvailabilityReport`, `AvailabilityReportLine`, `SuggestedProductByAdmin`, `OrderItem`, `OrderItemStatusHistory`, `DeliveryAssignment` |
| **Services** | `substitutions.py` (the whole stage→release→decide→confirm workflow), `transition_order_item`, `release_suggestions`, `compute_subtotal` |
| **State Machines** | **Two** — `Order.Status` (Flow 5) and **`OrderItem.Status`**, guarded by `can_transition_item` / `transition_order_item` |
| **Total APIs** | **16** (3 partner · 10 admin · 3 customer) |
| **Previous Flow** | Flow 5 — order reaches `partner_verifying` |
| **Next Flow** | Flow 7 — Billing, once `substitutions_confirmed_at` is stamped |
| **Documentation Version** | 1.1 — 2026-07-20 (partner-substitute-promotion built; #26 reversed) |
| **Documentation Status** | ✅ 16 of 16 routes documented, verified against the running route table |


> ⚠️ **Behavior changed 2026-07-20 — the partner suggestion path was reworked** (spec +
> build: [`../designs/partner-substitute-promotion.md`](../designs/partner-substitute-promotion.md)).
> This reverses **#26**. Two things are now different from the original #26 design:
> 1. **Partner suggestions no longer release directly to the sailor.** They are **staged**
>    and wait for an admin to review and **release** them (same gate as admin suggestions).
> 2. **On release, each partner suggestion is promoted to a real, non-public catalog
>    variant** under an internal holding product — reusable by admins, invisible in public
>    browse, and shown to the sailor on their order.
>
> The sections below are updated to the new behavior. Where a line is marked *(was #26)*
> it describes what changed.


---


# Phase 1 — Understand the Flow


## Business purpose


Nothing is billed until someone has physically checked what is available at the dock. A
partner walks the item list and reports per line; where an item is unavailable, either
the partner photographs an alternative or an admin proposes one from the catalog; the
sailor accepts or rejects each; the subtotal is recomputed from **what the sailor will
actually receive**.


The service module states the money rule plainly (`orders/substitutions.py:1-14`):


> *"Subtotals reflect what the customer actually pays for: available quantity of each
> item plus accepted substitutions; unavailable / rejected portions are dropped, never
> billed."*


## Entry / Exit


| | |
|---|---|
| **Entry** | An admin assigns an intent-stage order to a partner → `partner_verifying` (Flow 5's exit) |
| **Success** | `substitutions_confirmed_at` stamped with a positive subtotal → **Flow 7** |
| **Blocked** | Subtotal would be zero — confirm is refused with `can_cancel: true`; the sailor cancels or accepts a replacement |


## The two paths to a suggestion


This is the flow's central asymmetry, and it is deliberate.


| | **Admin path** | **Partner path** |
|---|---|---|
| Who | Admin, from the catalog | Partner, at the dock |
| What | An existing variant, or a brand-new product | Free text + photo + price |
| **API** | Dedicated endpoints — **APIs 11–13** | **No dedicated endpoint** — nested in the verify report (**API 2**) |
| `variant` | Set | **`NULL`** — partners have no catalog access |
| Released by | A **separate endpoint** an admin must call (API 13) | **The same admin endpoint (API 13)** — *(was #26: released immediately)* |
| On release | (already a catalog variant) | **Promoted to a non-public catalog variant** — *(was #26: no promotion)* |
| Unreleased window | Yes — sits staged until a human releases it | **Yes — staged until the admin releases** — *(was #26: none)* |


> **There is no standalone "partner suggests a replacement" endpoint, and this is
> deliberate.** A partner proposes an alternative by attaching a `suggested_alternative`
> block to the unavailable line inside their verification report (**API 2**). A dedicated
> `POST /api/partner/orders/suggest/` (`PartnerSuggestReplacement`) **existed and was
> removed in #26** (`partner_app/views/verify_views.py:249-252`): it required a catalog
> `variant_id`, which a delivery partner has no way to obtain. If you are looking for that
> route, it is gone — and the seed script still advertises it (validation finding **F-24**).


`is_partner_freeform` is `variant_id is None` (true until an admin releases and promotes
it). Release runs through the **single** `release_suggestions` service on the admin path,
so the semantics cannot drift.


**Releasing does five things**, not one — the docstring warns that flipping the flag
alone is a trap that leaves the sailor a suggestion they structurally cannot answer:


0. **Promote** each variant-less partner suggestion to a catalog variant *(new #26 reversal)*.
1. Set `is_released_to_user=True` and `released_at`.
2. Transition `verification_submitted → pending_customer_response` (first release only).
3. Set `customer_response_due_at = now + CUSTOMER_RESPONSE_WINDOW_HOURS` (default 24h),
  **refreshed on every release**.
4. The caller sends the notification, **after commit**.


## The re-verify loop


`partner_verifying ⇄ verification_submitted` is a real loop. Each round creates a **new
`AvailabilityReport`** — nothing is overwritten or versioned, and there is no unique
constraint on `(order, …)`. Reports are **append-only history**; "the latest report" is
resolved at read time as the newest `submitted_at` per order.


> Side effects are **not** append-only: round 2 flips `OrderItem` statuses in place and
> *adds* more suggestions without retracting round 1's.


A partner cannot submit twice back-to-back — after the first submit the order sits at
`verification_submitted`, which is not a verifiable status. The loop reopens only when
an admin moves it back.


## `OrderItem.Status` — the second state machine


Guarded by `transition_order_item` (`orders/item_lifecycle.py:49-72`), which mirrors the
order-level guard: row lock, edge validation, and an `OrderItemStatusHistory` row written
**even for a same-status no-op**.


```
pending  → available | unavailable | substituted | delivered | not_delivered
available → unavailable | substituted | delivered | not_delivered
unavailable → available | substituted
substituted → available | unavailable | delivered | not_delivered
delivered → (terminal)
not_delivered → delivered
```


> **The mapping from a report line to a line status is binary on `is_available` alone.**
> A line reported available with `available_qty=1` against `quantity=5` becomes
> `AVAILABLE`, not "short". The shortfall is visible only in the report summary's
> `short` count.


## The money rule


`compute_subtotal` (`substitutions.py:70-86`) sums, per line:


- `min(available_qty from the latest report, item.quantity) × item.unit_price`
- plus, if a suggestion on that line is `ACCEPTED`, `accepted.quantity × accepted.unit_price`


Unavailable-and-rejected portions contribute **zero** and are never billed. No
`OrderItem` rows are deleted or cancelled — they simply stop counting.


With **no report at all**, `_available_qty_map` returns `{}` and every line is treated as
fully available.


---


# Phase 2 — Discover the Complete Flow


```
ADMIN assigns partner (Flow 5 exit)  ──▶ order = partner_verifying
 │
PARTNER
 ├─ GET /partner/intents/                    ← queue: intent_received + partner_verifying
 │
 └─ POST /partner/orders/verify/             { order_id, lines[] }
      ├─ 404 unless an ACTIVE assignment to this partner
      ├─ 400 unless status ∈ {intent_received, sourcing, partner_verifying}
      ├─ 400 if a line's item is not on this order
      ├─ per line: note MANDATORY when unavailable
      │            alternative FORBIDDEN when available
      │            alternative price ≤ 3× the original unit price
      ├── transaction.atomic ──────────────────────────────────┐
      │    ├─ create AvailabilityReport (+ lines)              │
      │    ├─ stamp assignment first_action_at (write-once)    │
      │    ├─ transition each line → available | unavailable   │
      │    ├─ transition order → verification_submitted        │
      │    └─ if partner suggested: create + STAGE (unreleased) │
      │         — waits for admin review  (was #26: released)   │
      └── commit ──────────────────────────────────────────────┘
           └─ notify admin (sailor NOT notified until release)
 │
 └─ GET /partner/orders/verification-submitted-report/   ← awaiting admin review
       the order stays at verification_submitted until the admin releases,
       so the partner's own submission DOES appear here (was #26: it vanished)


ADMIN CONSOLE
 ├─ GET /superadmin/partner/verification-stats/     3 counters, no filters
 ├─ GET /superadmin/partner/verification-reports/   queue — latest report per order
 ├─ GET /superadmin/partner/verification-detail/    drill-in: latest + all rounds + partner
 ├─ GET /superadmin/partner/reports/                per-order raw report dump
 └─ POST /superadmin/partner/review-report/         mark reviewed  ← bookkeeping only


ADMIN SUBSTITUTION                                    (all writes gated by manage_gate)
 ├─ GET  /superadmin/orders/fetch-suggested-items/   staged + released
 ├─ GET  /superadmin/dashboard/products/suggestion/  variant picker, by port
 ├─ POST /superadmin/orders/suggest/                 stage an existing variant
 ├─ POST /superadmin/orders/suggest-new-product/     create a bespoke product + suggest
 └─ POST /superadmin/orders/release-suggestion/      PROMOTE partner ones to catalog
                                                        variants, then release ALL staged
                                                        │
SAILOR                                                   ▼
 ├─ GET  /orders/<id>/suggestions/                   released only, + estimated_subtotal
 ├─ POST /orders/<id>/suggestions/<sid>/accept/      {accept: true|false}
 │     accept → line SUBSTITUTED (order line shows the substitute + reconciling price)
 │     reject → line stays UNAVAILABLE; a promoted variant is retired (is_active=False)
 └─ POST /orders/<id>/confirm-substitutions/
       ├─ 400 if any released suggestion still pending
       ├─ 400 + can_cancel if subtotal ≤ 0  ← nothing left to fulfil
       └─ sync subtotal + stamp substitutions_confirmed_at ──▶ Flow 7
```


## API sequence table


| Step | Platform | API |
|---|---|---|
| 1 | PARTNER | `GET /api/partner/intents/` |
| 2 | PARTNER | `POST /api/partner/orders/verify/` |
| 3 | PARTNER | `GET /api/partner/orders/verification-submitted-report/` |
| 4 | ADMIN | `GET /api/superadmin/partner/verification-stats/` |
| 5 | ADMIN | `GET /api/superadmin/partner/verification-reports/` |
| 6 | ADMIN | `GET /api/superadmin/partner/verification-detail/` |
| 7 | ADMIN | `GET /api/superadmin/partner/reports/` |
| 8 | ADMIN | `POST /api/superadmin/partner/review-report/` |
| 9 | ADMIN | `GET /api/superadmin/orders/fetch-suggested-items/` |
| 10 | ADMIN | `GET /api/superadmin/dashboard/products/suggestion/` |
| 11 | ADMIN | `POST /api/superadmin/orders/suggest/` |
| 12 | ADMIN | `POST /api/superadmin/orders/suggest-new-product/` |
| 13 | ADMIN | `POST /api/superadmin/orders/release-suggestion/` |
| 14 | SAILOR | `GET /api/orders/<order_id>/suggestions/` |
| 15 | SAILOR | `POST /api/orders/<order_id>/suggestions/<suggestion_id>/accept/` |
| 16 | SAILOR | `POST /api/orders/<order_id>/confirm-substitutions/` |


---


# Phase 3 — API Documentation


## Flow-wide conventions


| Header | Notes |
|---|---|
| `Authorization: Token <key>` | All 16 |
| `server-secret-key` | `/api/partner/…` and `/api/orders/…`; **`/api/superadmin/…` is exempt** |


`SubstitutionNotAllowed` is mapped globally by the project exception handler to its own
`status_code` and body key, so no substitution view needs a try/except.


---


## API 1 · The partner's verification queue


| Field | Value |
|---|---|
| **Endpoint** | `/api/partner/intents/` · `GET` |
| **Permissions** | `IsAuthenticated`, `IsDeliveryPartner` |
| **Query Parameters** | `page`, `page_size` (max 50) — no search, no filter |


Returns orders with an **active** assignment to the caller, at status
`intent_received` or `partner_verifying`, newest first.


> `sourcing` is a **verifiable** status but is **not** in this queue — an order there can
> be submitted against yet never appears. And once submitted, the order moves to
> `verification_submitted` and drops off this list onto API 3.


**Success — 200** — paginated, with `results` as an **object**:
```json
{ "count": 3, "next": null, "previous": null,
 "results": { "message": "Intents fetched successfully", "data": [ … ] } }
```
Each card: `id`, `order_number`, `status` (display label), `status_code`, `is_express`,
`is_fastest_delivery`, `sailor_name`, `imo_number`, `anchorage`, `item_count`,
`items_preview` (first 3), `deliver_by`, `expected_departure`, `created_at`,
`has_surprise_gift`.


---


## API 2 · Submit the availability report


> **This is also the partner's "suggest a replacement" endpoint.** There is no separate
> partner-suggest route — an alternative is proposed via the `suggested_alternative` block
> on an unavailable line below (the standalone endpoint was removed in #26; see Phase 1).


| Field | Value |
|---|---|
| **Endpoint** | `/api/partner/orders/verify/` · `POST` |
| **Permissions** | `IsAuthenticated`, `IsDeliveryPartner` |


**Request Body**
```json
{
 "order_id": "3c9a…",
 "lines": [
   { "order_item_id": "7b1e…", "available_qty": 2, "is_available": true },
   { "order_item_id": "9d4f…", "available_qty": 0, "is_available": false,
     "note": "Supplier out of stock until Friday",
     "suggested_alternative": {
       "name": "Marine Rope 22mm", "price": "115.00", "quantity": 1,
       "note": "Same spec, different brand",
       "photo": "suggestion_images/abc123.jpg"
     } }
 ]
}
```


| Field | Required | Rules |
|---|---|---|
| `order_id` | ✅ | UUID |
| `lines` | ✅ | Non-empty list |
| `lines[].order_item_id` | ✅ | UUID; must belong to this order |
| `lines[].available_qty` | ✅ | Integer ≥ 0 — **no upper bound against the ordered quantity** |
| `lines[].is_available` | ✅ | Boolean |
| `lines[].note` | conditional | ≤255 chars. **Mandatory and non-blank when `is_available` is false** |
| `lines[].suggested_alternative` | ✖ | **Forbidden when `is_available` is true** |
| `…alternative.name` | ✅ | ≤255, non-blank after strip |
| `…alternative.price` | ✅ | Decimal > 0, **and ≤ 3× the original unit price** |
| `…alternative.quantity` | ✖ | Integer ≥ 1, default 1 |
| `…alternative.photo` | ✅ | Must start `suggestion_images/` |


**The 3× cap.** Compared against `OrderItem.unit_price` — the **per-unit** snapshot taken
at order time, not the line total and not the live catalog price. The alternative's
`quantity` is not part of the comparison. **At exactly 3× it passes** (the operator is
`>`); `300.01` against an original of `100` is rejected.


**Success — 201** — the report, plus three injected keys:
```json
{
 "id": "…", "order": "…", "status": "Submitted", "status_code": "submitted",
 "submitted_at": "July 20, 2026, 03:45 PM",
 "summary": { "total": 3, "available": 2, "unavailable": 1, "short": 0 },
 "lines": [ { "id", "order_item_id", "product_name", "sku",
              "requested_qty", "available_qty", "is_available", "note" } ],
 "order_status": "verification_submitted",
 "order_status_display": "Verification Submitted",
 "suggested_alternatives": 1
}
```
`order_status` reads **`verification_submitted`** even when the partner suggested an
alternative — the suggestion is **staged**, and the order only moves to
`pending_customer_response` when an admin releases it (API 13). *(Was #26:
`pending_customer_response` here, because the suggestion self-released.)*


**Error Responses**


| Status | Body | Condition |
|---|---|---|
| 404 | `{"detail": "No Order matches the given query."}` | Not assigned, assignment inactive, or unknown order |
| 400 | `{"error": "This order cannot be verified in its current state (X)."}` | Status not verifiable |
| 400 | `{"error": "Item <uuid> does not belong to this order."}` | Foreign line |
| 400 | `{"note": ["A note is required when an item is marked unavailable."]}` | Missing note |
| 400 | `{"suggested_alternative": ["An alternative can only be suggested for an item marked unavailable."]}` | Suggestion on an available line |
| 400 | `{"suggested_alternative": ["<price> is more than 3× the original item price (<orig>). Check the price, or ask an admin to raise it."]}` | Cap breach — **no line index in the message** |


**Database Changes**, all inside one transaction: `AvailabilityReport` + lines,
assignment `first_action_at` (write-once), one `transition_order_item` per submitted
line, `transition_order` → `verification_submitted`, and — on the partner path only —
`SuggestedProductByAdmin` rows created **and staged** (`is_released_to_user=False`).
Promotion to a catalog variant and release both happen later, at admin release (API 13).
*(Was #26: created and released here.)*


---


## API 3 · Submitted reports awaiting review (partner)


| Field | Value |
|---|---|
| **Endpoint** | `/api/partner/orders/verification-submitted-report/` · `GET` |
| **Permissions** | `IsAuthenticated`, `IsDeliveryPartner` |


Latest report per order, for orders assigned to the caller **whose current status is
exactly `verification_submitted`**.


> Scoping is by **assignment, not authorship** — a report submitted by a previous partner
> surfaces to the current one.
>
> *(Was #26: a partner who suggested an alternative never saw their own submission here,
> because it self-released and the order jumped to `pending_customer_response`. Now the
> suggestion is **staged**, so the order stays at `verification_submitted` until the admin
> releases — the partner's submission **does** appear here in the meantime. This resolves
> validation finding **F-18**.)*


Ordered by order UUID, not recency (a consequence of the `DISTINCT ON`).


---


## APIs 4–8 · The admin verification console


### API 4 · Stats — `GET /api/superadmin/partner/verification-stats/`


No parameters at all. Returns three integers:


```json
{ "in_verification": 12, "verified_today": 5, "unavailable_items": 9 }
```


| Card | Counts |
|---|---|
| `in_verification` | **Orders** at `verification_submitted` |
| `verified_today` | **All reports** whose `reviewed_at` is today — no status, soft-delete or latest-per-order scoping |
| `unavailable_items` | `is_available=False` lines on the **latest report** of queued orders |


> Only the third is computed off "the latest report per order". `unavailable_items`
> counts **only unavailable lines — not short ones**, so an order where everything is
> available-but-short reports `0`.


### API 5 · The queue — `GET /api/superadmin/partner/verification-reports/`


Latest report per order, paginated. Params: `search` (order number, partner name/email),
`order_status` (defaults to `verification_submitted`), `page`, `page_size`.


Each row: `id`, `order_id`, `order_number`, `partner`, `total_items`, `available_items`,
`unavailable_items`, `status`, `status_display`, `submitted_at`, `reviewed_at`.


### API 6 · Drill-in — `GET /api/superadmin/partner/verification-detail/`


Requires `order_id`. Returns four blocks: `order` (customer, amount, ship date),
`partner` (from the latest report's author, falling back to the active assignment),
`latest_report` (with full item lines, `shortfall`, `suggestion_count`,
`needs_suggestion`), and `rounds` — **every** re-verify round, summary-only, uncapped.


> The latest report appears **twice** — in full under `latest_report`, and again as
> `rounds[0]`.


### API 7 · Raw report dump — `GET /api/superadmin/partner/reports/`


Requires `order_id`. Returns **all** reports for that order with full lines, unpaginated.


> This endpoint uses the **partner app's** serializer, so its field semantics differ from
> APIs 5 and 6: **`status` here is the human label** (`"Submitted"`) while `status_code`
> carries the raw value — the reverse of everywhere else — and `submitted_at` is a
> display string rather than ISO-8601.


### API 8 · Mark reviewed — `POST /api/superadmin/partner/review-report/`


Body: `{ "report_id": "…" }`. Sets `status=reviewed` and `reviewed_at=now()`.


**Success — 200** — `{"message": "Report marked as reviewed."}`


> **This is a bookkeeping flag and nothing more.** It transitions no order, unblocks no
> billing, notifies nobody, and writes no audit entry. `AvailabilityReport.Status.REVIEWED`
> is read as a predicate by **zero** production code paths — the money path takes the
> latest report by timestamp and never inspects its status. Its only downstream effect is
> the `verified_today` counter, which keys on `reviewed_at`.


---


## APIs 9–13 · Admin substitution


**All three write endpoints apply `manage_gate`** (409 unclaimed / 403 wrong owner). The
read does not, which matches the project rule that ownership gates writes only.


### API 9 · Staged + released suggestions — `GET /api/superadmin/orders/fetch-suggested-items/`


Requires `order_id`. Returns **both** internal (unreleased) and released suggestions,
newest first. Unpaginated; an unknown order returns `200` with an empty list.


### API 10 · Variant picker — `GET /api/superadmin/dashboard/products/suggestion/`


Requires `port_id`; optional `search`. Returns products carried at that port with their
variants, paginated.


> Missing `port_id` returns `400 {"message": "Port ID is required"}` — note the key is
> `message`, not `detail`. The picker does **not** exclude previously-created bespoke
> quote products.


### API 11 · Stage an existing variant — `POST /api/superadmin/orders/suggest/`


Body: `order_item_id`, `variant_id`, `quantity` (≥1), `note`. Creates a `PENDING`,
**unreleased** suggestion with price, name and SKU snapshotted from the variant.


**Success — 201.** Errors: 404 unknown item or variant; 409/403 from `manage_gate`;
400 wrong stage; 409 already confirmed; **400 `{"error": "This replacement has already
been suggested for the item."}`** on a duplicate.


### API 12 · Create and suggest a new product — `POST /api/superadmin/orders/suggest-new-product/`


For when nothing in the catalog fits. Atomically creates a `Product`, its images, a
`ProductVariant`, its images, and the suggestion.


| Field | Required | Notes |
|---|---|---|
| `order_item_id`, `quantity`, `category`, `name`, `base_price`, `sku` | ✅ | Duplicate `(name, category)` or `sku` → 400 |
| `description`, `note`, `attributes`, `images` | ✖ | |
| `catalog_type` | ✖ | Defaults to `regular` |
| `admin_sourceable` | ✖ | **Defaults to `true`** |


> The bespoke product is created looking like an ordinary public product on every axis.
> The **only** thing keeping it out of the public catalog is the suggestion row itself.


### API 13 · Release — `POST /api/superadmin/orders/release-suggestion/`


Body: `order_id` only. Despite the singular name it releases **all** staged suggestions
for the order in one shot. Runs the full release, then notifies the sailor after commit.


> **This is now also where partner suggestions are promoted (reverses #26).** For each
> staged **variant-less** partner suggestion, release first creates a real
> `ProductVariant` under a per-category internal holding product (auto SKU, the partner's
> price + photo, category/catalog_type inherited from the original item), sets
> `suggestion.variant`, and links the holding product to the order's port so it surfaces
> in the admin picker (API 10) for reuse. The holding product stays out of public browse
> via the quote-guard. Spec:
> [`../designs/partner-substitute-promotion.md`](../designs/partner-substitute-promotion.md).


**Success — 200** — `{"message": "Released N suggestion(s) to the customer.", "order_id",
"status", "released_count", "suggestions": [ … ]}`
**Errors** — 409 already confirmed · 400 `{"detail": "No unreleased suggestions to
release for this order."}` · 409/403 from `manage_gate`.


---


## APIs 14–16 · The sailor's decision


All three scope through one helper requiring `user=request.user`, so a foreign order
**404s** rather than 403 — existence is not leaked.


### API 14 · See the suggestions — `GET /api/orders/<order_id>/suggestions/`


Returns **released only**, plus a live `estimated_subtotal`:
```json
{
 "order_id": "…", "order_number": "…", "status": "pending_customer_response",
 "estimated_subtotal": "370.00",
 "suggestions": [ { "suggestion_id", "order_item_id", "status",
                    "original_product_name", "original_sku", "ordered_quantity",
                    "original_unit_price", "original_image",
                    "suggested_variant_id", "suggested_product_name", "suggested_sku",
                    "suggested_quantity", "suggested_unit_price", "suggested_image",
                    "price_difference", "suggested_by_partner", "partner_note" } ],
 "all_resolved": false,
 "awaiting_admin_review": false
}
```


### API 15 · Accept or reject — `POST /api/orders/<order_id>/suggestions/<suggestion_id>/accept/`


**Request Body** — `{ "accept": true }` or `{ "accept": false }`.


> ⚠️ **`accept` defaults to `true` when the field is omitted.** A request with no body
> accepts the replacement. Only an explicit `false` rejects. A non-boolean value (including
> the string `"true"`) returns 400.


**Accept** → suggestion `ACCEPTED`, and the `OrderItem` transitions to `SUBSTITUTED`.
**Reject** → suggestion `REJECTED`; the line is left as it was, and its unavailable
portion simply drops out of the subtotal.


The suggestion lookup requires the id, membership in the caller's own order, **and**
released-ness simultaneously — so a crafted id or an internal unreleased row both 404.


> A decision can be changed as often as the sailor likes while the order is awaiting
> response. Accepting after confirming is refused with 400.


**Success — 200** — a message plus the same summary block as API 14.


### API 16 · Confirm — `POST /api/orders/<order_id>/confirm-substitutions/`


No body. Recomputes and persists the subtotal, then stamps `substitutions_confirmed_at`
— both inside one transaction, so they cannot diverge.


**Success — 200** — `{"message": "Confirmed. The admin will generate your payment bill
shortly.", …summary}`. Idempotent: a second call returns 200 with *"You've already
confirmed…"*.


**Error Responses**


| Status | Body | Condition |
|---|---|---|
| 400 | `{"detail": "Nothing to confirm for this order."}` | Not at `pending_customer_response` |
| 400 | `{"detail": "Please accept or reject every suggested replacement first."}` | A released suggestion is still pending |
| **400** | `{"detail": "We're sorry — the items on this order are currently unavailable and the suggested replacements were declined, so there's nothing left to fulfil. You can cancel this order, or go back and accept a suggested replacement to continue.", "can_cancel": true}` | Subtotal ≤ 0 |


> **A zero subtotal blocks, it does not cancel.** The order stays at
> `pending_customer_response` with `substitutions_confirmed_at` still null. The sailor
> cancels, or goes back and accepts a replacement. Admins are separately notified the
> moment a rejection empties the order.


---


## What happens next


| Condition | Continue to |
|---|---|
| `substitutions_confirmed_at` stamped, subtotal > 0 | **Flow 7** — Order Billing & Payment |
| Admin asks for re-verification | Back to API 2 — the re-verify loop |
| Nothing sourceable at all | **Flow 5** — reject intent (terminal) |
| Sailor cancels an emptied order | **Flow 12** — Cancellation & Refund |
| Response window lapses | Order auto-cancelled by the expiry task (**Flow 35**) |


---


## Source reference


| Concern | File |
|---|---|
| **The substitution workflow service** | [`orders/substitutions.py`](../../backend/orders/substitutions.py) |
| Item state machine | [`orders/item_lifecycle.py`](../../backend/orders/item_lifecycle.py) |
| Partner submit + queues | [`partner_app/views/verify_views.py`](../../backend/partner_app/views/verify_views.py) · [`order_views.py`](../../backend/partner_app/views/order_views.py) |
| Partner serializers, the 3× cap constant | [`partner_app/serializers/verify_serializers.py`](../../backend/partner_app/serializers/verify_serializers.py) |
| Admin console | [`admin_panel/views/partner_views.py`](../../backend/admin_panel/views/partner_views.py) (583-786) |
| Admin substitution endpoints | [`admin_panel/views/orders_views.py`](../../backend/admin_panel/views/orders_views.py) (444-565) |
| Customer decision endpoints | [`orders/customer_views.py`](../../backend/orders/customer_views.py) (292-387) |
| `AvailabilityReport`, `AvailabilityReportLine`, `SuggestedProductByAdmin` | [`orders/models.py`](../../backend/orders/models.py) (377-448, 818-861) |
| Ownership gate | [`admin_panel/order_ownership.py`](../../backend/admin_panel/order_ownership.py) |



