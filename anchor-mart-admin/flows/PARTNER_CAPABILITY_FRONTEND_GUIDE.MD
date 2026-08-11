# Delivery Partner App — Building Screens Around Partner Capability


**Audience:** frontend developers building the delivery-partner app.
**Status:** ✅ **Everything in this document is live.** `can_verify` / `can_deliver` shipped
2026-08-03 on both the login and profile responses — see [§2 Build status](#2-build-status-read-this-first).


**Related:** `MD/todo.md` → GL1–GL4 (the backend work this document is paired with) ·
`MD/flows/Wave2/28-delivery-partner-lifecycle.md` (the full partner lifecycle chapter).


---


## 1. What "partner type" means


A delivery partner is not one role. They carry **two independent boolean capabilities**:


| Capability | The work it unlocks | When it happens |
|---|---|---|
| `can_verify` | **Stock verification** — walk the sailor's item list at the store/warehouse and report what is actually available | **Before** payment (the intent funnel) |
| `can_deliver` | **Delivery** — collect the goods, move them to the vessel, hand them over with proof | **After** payment |


These are **orthogonal, not a two-value enum.** There are exactly three valid shapes:


| Shape | `can_verify` | `can_deliver` | Notes |
|---|---|---|---|
| **Both** | `true` | `true` | **The default.** Every partner created without explicit flags is Both, and every partner that existed before the feature was backfilled to Both. Assume this is the common case. |
| **Verifier only** | `true` | `false` | Never receives delivery work |
| **Deliverer only** | `false` | `true` | Never receives verification work |
| ~~Neither~~ | `false` | `false` | **Impossible** — the backend rejects it at create and update (400). You never need to render this state. |


> **The single most important consequence:** because "Both" is the default, **your screens must
> behave exactly as they do today when both flags are true.** Capability handling is a *narrowing*
> of an existing app, never a rebuild of it.


### Capability vs. availability — do not conflate them


| Field | Meaning | Who changes it |
|---|---|---|
| `can_verify` / `can_deliver` | **What kind of work this partner is qualified for.** Long-lived. | Admin only |
| `is_available` | **Whether they want new work right now.** Toggled daily. | The partner, from the app |


A partner who is `is_available: false` still has all their capabilities — they are simply off-shift.
Do not grey out capability-driven UI because someone toggled availability, and do not hide the
availability toggle for any capability shape.


> ⚠️ `is_available` is currently **one flag covering both capabilities** — a Both-partner cannot say
> "available to verify but not to deliver." There is no per-capability availability field, so do not
> build UI that implies one exists.


---


## 2. Build status — read this first


| What you need | Endpoint | Status |
|---|---|---|
| `can_verify` / `can_deliver` on the login response | `POST /api/partner/verify-otp/` | ✅ **Live** (2026-08-03) |
| `can_verify` / `can_deliver` on the profile response | `GET /api/partner/profile/` | ✅ **Live** (2026-08-03) |
| Everything else in this document | — | ✅ **Live** |


**Still implement the `?? true` fallback in §3.3.** Not for the backend — for your own older builds
and for any cached session issued before 2026-08-03, which carry a `partner` block without the flags.


> ⚠️ **Capability is enforced at the assignment boundary, not on every partner action.** The backend
> refuses to *create* a wrong-type assignment (403), so work never reaches a partner who can't do it.
> But there is deliberately **no per-action capability check** on the delivery/verification endpoints —
> a revocation mid-job does not stop work already in hand (that behaviour is under review, GL3). Two
> consequences for you: an action succeeding is **not** evidence it is appropriate for the shape, and
> you must not rely on hidden UI as a control. Build to §4.3.


---


## 3. The contract


### 3.1 Where capability arrives


Capability is delivered in **two places**, and you should read it from both:


1. **At login** — `POST /api/partner/verify-otp/` returns it inside `partner`, so the app knows the
  shape before the first screen renders. Store it with the session.
2. **On the profile screen** — `GET /api/partner/profile/` returns it, so a mid-session change made by
  an admin is picked up without forcing a re-login.


### 3.2 Refresh rule


Capability changes are **rare but consequential**. Re-read the profile:


- on app foreground / cold start,
- after any `403` whose body indicates a capability problem (§7.2),
- when the partner opens the Profile screen.


Do **not** poll it. It changes at admin-action frequency, not user-action frequency.


### 3.3 Fallback when the fields are absent — required


The backend sends the fields now, but a session token issued before 2026-08-03 carries a cached
`partner` block without them, and older app builds may too. **Absent must mean "Both", not
"neither"** — anything else blanks out the app for every partner on a pre-existing session:


```js
const canVerify  = partner.can_verify  ?? true;   // absent → assume capable
const canDeliver = partner.can_deliver ?? true;
```


> ⛔ **Never write `partner.can_verify === true`** against a backend that may omit the field —
> `undefined === true` is `false`, and every existing partner loses their Delivery tab. Use `??`.


---


## 4. What changes per capability shape


### 4.1 Navigation


| Surface | Verifier only | Deliverer only | Both |
|---|---|---|---|
| **Intents / Verification** tab | ✅ Show | ❌ Hide | ✅ Show |
| **Deliveries** tab (`all / new / in_progress / express / delivered / failed`) | ❌ Hide | ✅ Show | ✅ Show |
| Profile · Availability · Port | ✅ Show | ✅ Show | ✅ Show |


**A single-capability partner should not see a tab bar with one tab.** Promote that surface to the
home screen instead of rendering a degenerate tab bar.


### 4.2 Counts


`GET /api/partner/orders/` returns **all seven count keys regardless of capability** — including
`intent_received` for a deliver-only partner and the delivery counts for a verify-only one. The
backend does not filter them.


**Read only the counts your shape uses:**


| Shape | Counts to render | Counts to ignore |
|---|---|---|
| Verifier only | `intent_received` | `new`, `in_progress`, `express`, `delivered`, `failed`, `all` |
| Deliverer only | `new`, `in_progress`, `express`, `delivered`, `failed`, `all` | `intent_received` |
| Both | all seven | — |


A non-zero count in an ignored key is not a bug and not a badge — do not surface it.


### 4.3 Actions


| Action | Endpoint | Requires |
|---|---|---|
| Submit availability report | `POST /api/partner/orders/verify/` | `can_verify` |
| Advance transit stage | `POST /api/partner/orders/advance/` | `can_deliver` |
| Record handover | `POST /api/partner/orders/deliver/` | `can_deliver` |
| Report delivery failed | `POST /api/partner/orders/report-failed/` | `can_deliver` |
| Reject an assignment | `POST /api/partner/orders/reject/` | **Either** — a partner may decline any assignment |
| Download slip | `GET /api/partner/orders/<order_id>/slip/` | **Either** |
| Profile · availability · port · deletion request | (§6.2) | **Either** |


### 4.4 What must NOT change with capability


- **Auth.** Sign-in is identical for every shape; capability is not known until after the token is issued.
- **Availability toggle.** Every shape can go on and off shift.
- **The order list's own filtering.** Orders reach a partner only through an assignment, and the backend
 already scopes every list to the caller's active assignments. **Do not add a client-side capability
 filter on top of the returned rows** — if a row arrives, it is theirs, and hiding it strands real work.


> ⛔ **Hiding UI is presentation, not authorization.** Capability-driven navigation exists so a partner
> is not shown work they can never receive. It is not a security control, and the backend does not
> depend on it. Never treat "the button is hidden" as a reason to skip a server-side check, and never
> reintroduce a hidden action via a deep link.


---


## 5. Screen-by-screen


### 5.1 Home


**Verifier only** → Intents list (§6.3.2) as the landing screen. Header: partner name, `partner_id`,
`port`, availability toggle.
**Deliverer only** → Deliveries list (§6.3.1), `tab=all`, same header.
**Both** → today's screen, unchanged: tab bar with Deliveries + Intents.


### 5.2 Order detail


Identical for all shapes — one screen, driven by `status_code`, not by capability. A verify-only
partner reaches it from an intent; a deliver-only partner from a delivery. Render the action row
from the order's `status_code` **and** the capability gate in §4.3:


| `status_code` | Primary action | Needs |
|---|---|---|
| `intent_received`, `partner_verifying` | Submit availability report | `can_verify` |
| `partner_assigned` | Mark items collected | `can_deliver` |
| `items_collected` | Mark at port | `can_deliver` |
| `at_port` | Mark at berth | `can_deliver` |
| `at_berth`, `partially_delivered` | Record handover | `can_deliver` |
| `verification_submitted` | *(none — awaiting admin review)* | — |
| `delivered` | *(none — re-download slip only)* | — |


Two flags on the detail response affect what you render, independent of capability:


- **`delivery_on_hold: true`** — an unpaid delivery surcharge blocks the handover. **Disable the
 handover action and explain why**, otherwise the partner discovers it at the berth as a `409`.
- **`has_surprise_gift: true`** — show "a gift parcel travels with this order". It is **only ever a
 boolean**; the system holds no gift identity, so never build UI expecting a name or image.


### 5.3 Profile


Show the capability as read-only information, so a partner understands why their app looks different
from a colleague's. Suggested copy:


| Shape | Label |
|---|---|
| Both | *Verification & Delivery* |
| Verifier only | *Verification only* |
| Deliverer only | *Delivery only* |


**Not editable.** Capability is admin-controlled; do not render a toggle or a "request change" affordance.


---


## 6. API reference


**Base path:** `/api/partner/`
**Required on every request:** header `server-secret-key: <key>`. Missing → the request is rejected by
middleware before reaching the view.
**Auth:** header `Authorization: Token <token>` on everything except `signin/`, `verify-otp/`, `logout/`.


**Pagination (every paginated endpoint):** `?page=` (integer, default `1`), `?page_size=` (integer,
default **10**, maximum **50**; values above the max are clamped, not rejected). Envelope:


```json
{ "count": 42, "next": "…?page=2", "previous": null, "results": { } }
```


`results` holds the endpoint-specific object documented below.


**Timestamps** are pre-formatted strings, not ISO — e.g. `"June 10, 2026, 09:26 AM"`. Render them
directly; do not parse.


---


### 6.1 Authentication


#### `POST /api/partner/signin/` — request an OTP


No auth. **Capability plays no part here.**


| Field | Type | Required | Rules |
|---|---|---|---|
| `email` | string | Conditional | Registered email **or** Partner ID (e.g. `DP-00124`). Case-insensitive. |
| `whatsapp` | string | Conditional | Registered WhatsApp number |


At least one of `email` / `whatsapp` is required (400 otherwise). **If both are sent, WhatsApp wins**
and the OTP goes there.


**No search. No query params. No pagination.**


**200:**
```json
{ "message": "OTP sent via email.", "channel": "email", "destination": "p*****@example.com" }
```
`channel` is `"email"` or `"whatsapp"`. `destination` is masked — safe to display.


| Code | When | Body |
|---|---|---|
| 400 | Neither identifier sent; or WhatsApp requested but none on file | `{"error": "…"}` |
| 403 | Account blocked | `{"error": "Your account has been blocked. Please contact your admin."}` |
| 404 | Not a provisioned partner | `{"error": "Account not found or not yet activated. Please contact your admin."}` |
| 429 | Email OTP re-requested too soon | `{"error": "An OTP was already sent. Please wait N seconds before requesting another."}` |


> The 404 copy is deliberately generic and **does not reveal whether an account exists**. Do not
> reword it to be more specific.


#### `POST /api/partner/verify-otp/` — verify and receive a token


No auth. Never creates an account.


| Field | Type | Required | Rules |
|---|---|---|---|
| `email` | string | Conditional | Same identifier used at signin |
| `whatsapp` | string | Conditional | Same rule — one of the two required; WhatsApp wins if both |
| `otp` | string | **Yes** | The received code |
| `device` | string | No | Device label, stored as `last_login_device` |


**200** — `can_verify` / `can_deliver` are live as of 2026-08-03:
```json
{
 "message": "OTP verified.",
 "token": "9f3c…",
 "partner": {
   "id": "0d4c…",
   "partner_id": "DP-00124",
   "name": "Ravi Kumar",
   "email": "ravi@example.com",
   "port": "Port of Singapore",
   "is_available": true,
   "can_verify": true,
   "can_deliver": false
 }
}
```


| Code | When |
|---|---|
| 400 | OTP incorrect / already used / expired |
| 403 | Account blocked |
| 404 | Not a provisioned partner |


> **Single-session:** issuing a token deletes any previous one. A second device signing in silently
> logs the first out — handle a sudden `401` as "session ended elsewhere", not as a crash.


#### `GET /api/partner/logout/`


**Note the method is `GET`, not `POST`.** Send the token in the `Authorization` header; it is deleted.
No body, no params. Always **200** `{"message": "Partner logged out."}`.


---


### 6.2 Profile & availability


Available to **every capability shape**.


#### `GET /api/partner/profile/`


No params, no pagination.


**200** — `can_verify` / `can_deliver` are live as of 2026-08-03:
```json
{
 "id": "0d4c…",
 "partner_id": "DP-00124",
 "name": "Ravi Kumar",
 "email": "ravi@example.com",
 "whatsapp_number": "9876543210",
 "country_code": "+65",
 "date_of_birth": "1990-04-11",
 "gender": "male",
 "profile_picture": "https://…/media/profile/abc.jpg",
 "port": "Port of Singapore",
 "port_id": "7c1e…",
 "is_available": true,
 "joined": "2026-01-14",
 "can_verify": true,
 "can_deliver": false
}
```
Any field may be `null` if unset. `port` / `port_id` are `null` when no port is assigned.


#### `PATCH /api/partner/profile/`


**Only `PATCH` is implemented — there is no `PUT` on this endpoint.** Partial: send only what changed.


| Field | Type | Required | Rules |
|---|---|---|---|
| `first_name` | string | No | |
| `last_name` | string | No | |
| `date_of_birth` | date `YYYY-MM-DD` | No | |
| `whatsapp_number` | string | No | |
| `country_code` | string | No | |


**Not editable here** (admin-controlled): `email`, `partner_id`, `assigned_port`, `can_verify`,
`can_deliver`. Sending `can_deliver: true` is silently ignored, not an error — a partner cannot grant
themselves work. `gender` and `profile_picture` are returned by the GET but are **not accepted** by this
PATCH — do not build inputs for them on this screen.


**200** → the full profile object above. **400** → `{"field_name": ["…"]}`.


#### `PATCH /api/partner/availability/`


| Field | Type | Required |
|---|---|---|
| `is_available` | boolean | **Yes** |


**200** `{"is_available": false}` · **400** if missing or not a boolean.


#### `GET /api/partner/port/`


No params. **200** — `port` is `null` when unassigned:
```json
{ "port": { "id": "7c1e…", "port_code": "SGSIN", "port_name": "Singapore",
           "country": "SG", "region": "Asia" } }
```


#### `POST /api/partner/request-account-deletion/`


| Field | Type | Required |
|---|---|---|
| `reason` | string | No (defaults to `""`) |


**200** `{"message": "Your account deletion request has been submitted."}` ·
**400** `{"message": "…"}` when a request is already open — **note the key is `message`, not `detail`.**


---


### 6.3 Order lists


#### 6.3.1 `GET /api/partner/orders/` — deliveries


Assigned orders in the **delivery** pipeline. Primary screen for `can_deliver`.


| Param | Type | Default | Allowed values |
|---|---|---|---|
| `tab` | string | `all` | `all`, `new`, `in_progress`, `express`, `delivered`, `failed` — **any other value returns 400**, it is not ignored |
| `search` | string | — | Matches **order number, sailor first name, sailor last name, sailor email** (case-insensitive, partial) |
| `page` | integer | 1 | |
| `page_size` | integer | 10 | max 50 |


Tab → status mapping: `new` = `partner_assigned` · `in_progress` = `items_collected`, `at_port`,
`at_berth` · `express` = `is_express` orders in any delivery status · `delivered` = `delivered` ·
`failed` = `delivery_failed` · `all` = every delivery-pipeline status.
Sorted by **earliest ship arrival first**, then newest.


**400** on a bad tab: `{"tab": ["Must be one of: all, delivered, express, failed, in_progress, new."]}`


**200:**
```json
{
 "count": 12, "next": null, "previous": null,
 "results": {
   "message": "Orders fetched successfully",
   "counts": { "new": 3, "in_progress": 2, "express": 1, "delivered": 5,
               "failed": 0, "intent_received": 4, "all": 10 },
   "data": [
     {
       "id": "b21f…", "order_number": "AM-10241",
       "status": "Partner Assigned", "status_code": "partner_assigned",
       "is_express": false, "is_fastest_delivery": false,
       "sailor_name": "Capt. Mendes", "imo_number": "9876543",
       "anchorage": "Eastern Anchorage", "item_count": 7,
       "items_preview": [ { "product_name": "Mooring Rope 24mm",
                            "image": "https://…/rope.jpg" } ],
       "deliver_by": "June 12, 2026, 03:00 PM",
       "expected_departure": "2026-06-13",
       "created_at": "June 10, 2026, 09:26 AM",
       "has_surprise_gift": false
     }
   ]
 }
}
```
`counts` is the **unfiltered** total set — it does not change with `tab` or `search`, so tab badges stay
stable while filtering. `deliver_by` is `null` for normal orders (only express/emergency/fastest carry a
deadline) — fall back to `expected_departure`. `items_preview` is capped at **3** items; use `item_count`
for the real total.


#### 6.3.2 `GET /api/partner/intents/` — verifications


Orders awaiting stock verification (`intent_received`, `partner_verifying`). Primary screen for
`can_verify`. Newest first.


| Param | Type | Default |
|---|---|---|
| `page` | integer | 1 |
| `page_size` | integer | 10 (max 50) |


**No `tab`. No `search`.** Do not build a search box here — it is silently ignored.


**200** — `results` = `{"message": "Intents fetched successfully", "data": [ …same card shape as
6.3.1… ]}`. **No `counts` key on this endpoint** — take `intent_received` from 6.3.1's `counts` if you
need a badge.


#### 6.3.3 `GET /api/partner/orders/detail/`


| Param | Type | Required |
|---|---|---|
| `order_id` | UUID | **Yes** — 400 if missing or malformed, 404 if not assigned to you |


**200:**
```json
{
 "id": "b21f…", "order_number": "AM-10241",
 "status": "At Berth", "status_code": "at_berth",
 "is_express": false, "is_fastest_delivery": false,
 "sailor": { "name": "Capt. Mendes", "imo_number": "9876543" },
 "port": "Singapore", "anchorage": "Eastern Anchorage",
 "deliver_by": null, "expected_departure": "2026-06-13",
 "note": "Deliver to gangway, ask for the bosun.",
 "delivery_on_hold": false,
 "items": [
   { "order_item_id": "cc31…", "variant_id": "9a02…",
     "product_name": "Mooring Rope 24mm", "sku": "ROP-24",
     "quantity": 2, "unit_price": "50.00",
     "status": "available", "status_display": "Available",
     "image": "https://…/rope.jpg" }
 ],
 "has_surprise_gift": false,
 "subtotal": "100.00", "total_amount": "118.00",
 "created_at": "June 10, 2026, 09:26 AM"
}
```


Per-item `status` values: `pending`, `available`, `unavailable`, `substituted`, `delivered`,
`not_delivered`.


#### 6.3.4 `GET /api/partner/orders/items/`


Full stock-picking detail — specs, attributes, all images.


| Param | Type | Required |
|---|---|---|
| `order_id` | UUID | **Yes** |
| `variant_id` | UUID | No — supply it to drill into one line |


**No pagination, no search.**


**200 (all items):**
```json
{ "order_id": "b21f…", "order_number": "AM-10241", "item_count": 7,
 "items": [ {
   "order_item_id": "cc31…", "variant_id": "9a02…",
   "product_name": "Mooring Rope 24mm", "sku": "ROP-24",
   "quantity": 2, "unit_price": "50.00", "is_sourcable": true,
   "attributes": { "diameter": "24mm", "material": "Nylon" },
   "about_product": "…", "description": "…",
   "category": "Deck Equipment", "catalog_type": "marine",
   "images": [ "https://…/rope-1.jpg", "https://…/rope-2.jpg" ]
 } ] }
```
**200 (with `variant_id`):** `{"order_id": …, "order_number": …, "item": { …one object… }}` —
note the key is **`item`**, singular, and there is no `item_count`.


---


### 6.4 Verification — requires `can_verify`


#### `POST /api/partner/orders/verify/`


Submit the availability report. Allowed while the order is `intent_received`, `sourcing`, or
`partner_verifying`.


| Field | Type | Required | Rules |
|---|---|---|---|
| `order_id` | UUID | **Yes** | Must be assigned to you |
| `lines` | array | **Yes** | **At least one entry.** Every line you report must belong to this order |


Each entry of `lines`:


| Field | Type | Required | Rules |
|---|---|---|---|
| `order_item_id` | UUID | **Yes** | From the detail response |
| `available_qty` | integer | **Yes** | ≥ 0 |
| `is_available` | boolean | **Yes** | |
| `note` | string | Conditional | Max 255. **Required (non-blank) when `is_available` is `false`** |
| `suggested_alternative` | object | No | **Only allowed when `is_available` is `false`** |


`suggested_alternative`:


| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | **Yes** | Max 255, non-blank |
| `price` | decimal | **Yes** | > 0, **and ≤ 3× the original line's `unit_price`** |
| `quantity` | integer | No (default 1) | ≥ 1 |
| `note` | string | No | Max 1000 |
| `photo` | string | **Yes** | Relative path from the presigned upload, **must start with `suggestion_images/`** |


**201:**
```json
{ "id": "44a1…", "order": "b21f…",
 "status": "Submitted", "status_code": "submitted",
 "submitted_at": "June 11, 2026, 10:02 AM",
 "summary": { "total": 7, "available": 5, "unavailable": 2, "short": 1 },
 "lines": [ { "id": 91, "order_item_id": "cc31…", "product_name": "Mooring Rope 24mm",
              "sku": "ROP-24", "requested_qty": 2, "available_qty": 2,
              "is_available": true, "note": "" } ],
 "order_status": "verification_submitted",
 "order_status_display": "Verification Submitted",
 "suggested_alternatives": 1 }
```


| Code | When | Body |
|---|---|---|
| 400 | Order not in a verifiable state | `{"error": "This order cannot be verified in its current state (…)."}` |
| 400 | A line does not belong to the order | `{"error": "Item … does not belong to this order."}` |
| 400 | Substitute price over the 3× cap | `{"suggested_alternative": ["… is more than 3× the original item price (…). Check the price, or ask an admin to raise it."]}` |
| 404 | Order not assigned to you | |


> **Suggestions are staged, not published.** The sailor sees nothing until an admin reviews and
> releases them. Do not tell the partner the sailor has been notified — copy such as *"Sent for admin
> review"* is correct.


#### `GET /api/partner/orders/verification-submitted-report/`


Your orders sitting at `verification_submitted`, each with its **latest** report.


| Param | Type | Default |
|---|---|---|
| `page` / `page_size` | integer | 1 / 10 (max 50) |


**No search, no filters.** `results` = `{"message": "Submitted verifications fetched successfully",
"data": [ …report objects, same shape as the 201 above minus the `order_status*` keys… ]}`.


---


### 6.5 Delivery — requires `can_deliver`


#### `POST /api/partner/orders/advance/`


One transit hop.


| Field | Type | Required | Rules |
|---|---|---|---|
| `order_id` | UUID | **Yes** | |
| `to_status` | string | **Yes** | **Exactly one of `items_collected`, `at_port`, `at_berth`** |


`delivered` and `delivery_failed` are **rejected here** (400) — they have their own endpoints because
they carry required payloads. Stage order is enforced: skipping a hop returns **409**.


**200** `{"message": "Order marked at port.", "order_status": "at_port"}`


| Code | When |
|---|---|
| 400 | `to_status` missing or not one of the three |
| 404 | No active assignment for you on this order |
| 409 | Illegal hop (e.g. `at_berth` while still `partner_assigned`) |


#### `POST /api/partner/orders/deliver/`


Record one delivery trip.


| Field | Type | Required | Rules |
|---|---|---|---|
| `order_id` | UUID | **Yes** | |
| `photo` | string | **Yes** | Presigned path, **must start with `proof_of_delivery_images/`** |
| `received_by_name` | string | **Yes** | Non-blank |
| `handover_note` | string | No | |
| `items` | array | No | Omit → **everything outstanding is delivered** (the common case) |


Each entry of `items`: `order_item_id` (UUID, required), `delivered` (boolean, required),
`note` (string, optional, max 255). **No duplicate `order_item_id`s** (400). If you send `items`, it
must be non-empty.


Outcome across **all billable lines** (lines marked `unavailable` were never billed and are excluded):
all delivered → `delivered` · none → `delivery_failed` · mixed → `partially_delivered`.


> **Partial delivery is resumable.** The order stays deliverable and the assignment stays open — the
> partner can return with the remainder and complete it. Do not present partial as terminal.


**201:**
```json
{ "message": "3 of 5 items on order AM-10241 were delivered. We'll try to bring the remaining 2 before you sail.",
 "order_status": "partially_delivered",
 "delivered_count": 3, "total_items": 5, "undelivered_count": 2,
 "proof": { "received_by_name": "Bosun Silva", "photo": "https://…/handover.jpg",
            "delivered_at": "2026-06-12T15:04:11Z" } }
```


**200 with `"duplicate": true`** — a retry that changes nothing (lost response on a flaky vessel
link). Same body shape plus the flag. **Treat it as success, not as an error**, and do not create a
second trip record.


| Code | When | Body |
|---|---|---|
| 400 | Bad photo prefix, blank receiver, duplicate ids, or no billable items | field errors |
| 404 | Not your order, and no completed delivery to replay | `{"detail": "No DeliveryAssignment matches the given query."}` |
| 409 | Order not at `at_berth` / `partially_delivered` | `{"detail": "This order can't be delivered from '…'."}` |
| 409 | **Unpaid delivery surcharge** | `{"detail": "Delivery is on hold — the sailor has an unpaid delivery surcharge for the new location. It clears once they pay it (or the admin withdraws it)."}` |


> Check `delivery_on_hold` on the order detail (§6.3.3) **before** showing the handover button, so the
> partner learns this in the app rather than at the berth.


#### `POST /api/partner/orders/report-failed/`


| Field | Type | Required | Rules |
|---|---|---|---|
| `order_id` | UUID | **Yes** | |
| `reason` | string | **Yes** | Max 255, non-blank |


**200** `{"message": "Delivery marked as failed.", "order_status": "delivery_failed"}`.
The assignment **stays active** — the admin reassigns or refunds. The order remains in the partner's
`failed` tab.


---


### 6.6 Available to every capability shape


#### `POST /api/partner/orders/reject/`


Decline a fresh assignment — **verification or delivery**, so this is available to all shapes.


| Field | Type | Required | Rules |
|---|---|---|---|
| `order_id` | UUID | **Yes** | |
| `reason` | string | **Yes** | Max 255, non-blank |


Allowed **only** while the order is `partner_verifying` or `partner_assigned` — i.e. before work starts.


**200** `{"message": "Assignment rejected.", "order_id": "b21f…", "order_status": "partner_assigned"}`
— note the order keeps its status; only the assignment closes.


**400** `{"detail": "This assignment can no longer be rejected — work has already started."}`


#### `GET /api/partner/orders/<order_id>/slip/`


Picking slip / invoice PDF. `order_id` is a **path** parameter. Returns a PDF stream, not JSON.
Scoped to **any** assignment you have held — including closed ones, so a delivered order's slip stays
re-downloadable. **404** `{"detail": "Order not found."}` if you never held it.


---


## 7. Errors


### 7.1 Shapes


Three shapes exist across the partner API — handle all three:


```json
{ "field_name": ["Error message here."] }        // field validation
{ "detail": "A single human-readable message." } // business rule
{ "error": "A single human-readable message." }  // auth + verification endpoints
```


`error` is used by `signin/`, `verify-otp/`, and `orders/verify/`; `detail` by the delivery
endpoints; field-keyed objects by serializer validation. Account-deletion uses **`message`** for its
400. Read all four keys before falling back to a generic message.


### 7.2 Status codes


| Code | Meaning | Suggested handling |
|---|---|---|
| 400 | Validation or business-rule failure | Show the message inline on the field |
| 401 | Token missing/expired, **or session ended by a login elsewhere** | Return to sign-in |
| 403 | Account blocked, **or a wrong-capability assignment was refused at the boundary** | Show the message; re-read the profile |
| 404 | Not yours, or does not exist | Refresh the list |
| 409 | Right action, wrong moment (stage skipped, delivery on hold, wrong status) | **Do not retry blindly** — refresh the order and re-render actions from `status_code` |
| 429 | OTP re-requested too soon | Count down using the seconds in the message |


> **409 is the one to get right.** It means the app's idea of the order state is stale, not that the
> request was malformed. Always re-fetch the order detail before letting the partner try again.


---


## 8. Checklist


- [ ] `can_verify` / `can_deliver` read from **both** login and profile
- [ ] `?? true` fallback everywhere — absent means **Both**, never "neither"
- [ ] Tabs hidden per §4.1; single-capability partners get a promoted screen, not a one-tab bar
- [ ] Unused count keys ignored, not badged
- [ ] No client-side capability filter applied to returned order rows
- [ ] Capability re-read on foreground, on the Profile screen, and after a capability-related 403
- [ ] Actions gated per §4.3 — **and** the server still called as the real authority
- [ ] `delivery_on_hold` checked before offering the handover
- [ ] `duplicate: true` treated as success
- [ ] Partial delivery presented as resumable
- [ ] 409 triggers a refresh, never a blind retry
- [ ] All four error keys handled: `detail`, `error`, `message`, and field-keyed objects



