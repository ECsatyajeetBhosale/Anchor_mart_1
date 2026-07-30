# Flow 20 — Surprise Gift Program


> ## ✅ BUILT 2026-07-28 — v2.0 replaces v1.0
>
> This document describes **running code**. It **supersedes** v1.0 (catalog-bound gifts, hourly
> qualification queue, `VesselGiftWindow` approve/reject), which is preserved in git history.
> v1.0 had **never been enabled** and held **0 rows**, so this was a clean rewrite with no
> backfill.
>
> **Migration `promotion/0008_surprise_gift_v2` DROPS columns** — restart **web AND Celery** after
> applying, or running processes will 500 on any gift query.
>
> Validation findings against the **superseded v1.0** live in a separate report:
> [`20-surprise-gift-program-validation.md`](./20-surprise-gift-program-validation.md).
> Companion flow: [`20a-ship-crew-intent-nudge.md`](./20a-ship-crew-intent-nudge.md).
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)


> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.** (This feature is `#28`.)


---


# Executive Summary


**Platform advertising, not a loyalty mechanic.** When several sailors on the same vessel order
through AnchorMart during one call, an admin may — entirely at their discretion — send one of them a
wrapped, named gift. Word travels on the ship, more of the crew order next time. That is the whole
business case: reach, not reward.


Everything about the design follows from one decision: **the system never knows what the gift is.**
The gift is a physical item prepared off-system, wrapped by the delivery partner with the customer's
name on it. There is no catalog variant, no stock movement, no price, no line item. All the backend
records is *"this order has been gifted, by whom, when"* — a flag and an audit trail.


Four invariants carry the design:


1. **The system tracks *whether*, never *what*.** No `ProductVariant`, no SKU, no quantity, no
  inventory decrement, no money-path entry — at any layer, for any audience.
2. **One gift per sailor per open ship group — enforced by the database.** A sailor who splits one
  call into four orders gets **one** gift, not four. This is a `UniqueConstraint`, never an
  application-level `.exists()` check (see [[rc4-exists-guard-pattern]]).
3. **Nothing is automatic.** No sweep grants anything, no threshold decides anything. The admin
  browses, judges, and clicks. Thresholds only govern whether a *button* is enabled.
4. **Over-grouping is unrecoverable, so ambiguous cases fail closed.** A blank or malformed IMO is
  **excluded**, never grouped — matching two unrelated ships would send goods to a crew who never
  earned them. `Order.imo_number` is the **normalised** 7-digit form.


| | |
|---|---|
| **Actors** | Admin (browse, grant, revoke, dismiss) · Delivery Partner (wraps + hands over) · Customer (told, never shown) · Background System (admin nudge only) |
| **Endpoints** | **9 admin** (`/api/superadmin/gifts/…`) + an hourly nudge sweep + partner/customer read flags |
| **Django Apps** | `promotion` (models, service, sweep), `admin_panel` (admin API), `orders` (IMO, gift-on-delivery), `partner_app` (handover flag) |
| **Models** | `GiftConfig` (singleton) · `ShipGiftGroup` (the open-window anchor) · `OrderGift` (the flag on one order) |
| **Trigger** | An admin opening the ship-browse screen. The hourly sweep only *notifies*. |
| **Previous Flow** | 7 (Payment — an order becomes giftable at `payment_received`) |
| **Next Flow** | 10 (the partner hands the gift over on full delivery) · 20a (the intent-time crew nudge) |
| **Version** | 2.0 — 2026-07-28 |
| **Status** | ✅ Built + hardened. 9 routes + the sweep + read-flags. **100 tests** (85 gift + 15 nudge) plus the FY1 query-count guard in `partner_app`; full suite **1651** (1 unrelated pre-existing failure in `test_ratings_admin`). |


> **The load-bearing rule:** an order can be gifted only while **money is in and goods are not yet
> picked** — `payment_received` / `order_confirmed` / `partner_assigned`. An **allowlist**, so any new
> status defaults to *not* giftable. Below it the payment isn't settled; at `items_collected` and
> beyond the parcel has left and there is nothing to add. **The same allowlist gates revoke** — one
> definition, two call sites, so the two can never drift apart.


---


# Core concepts


**Ship.** One row per **IMO number**. Port and anchorage never split it — a vessel is one vessel
regardless of where its crew took delivery. There is no user-facing "visit" concept: the admin sees a
ship, its live orders, and its gift history, and judges timing from each order's
`ship_arrival_date` / `expected_departure` themselves.


**Ship group (invisible plumbing).** Internally, a `ShipGiftGroup` row **opens** when an IMO first
has a live giftable order and **closes** when it has none left. The admin never sees, names, or
manages it. It exists to do exactly two jobs:


- **Scope the one-gift-per-sailor constraint.** While the group is open, a sailor can hold one gift
 across *all* their orders on that ship. Once it closes, a later call opens a fresh group and the
 same sailor is giftable again — admin's discretion.
- **Dedupe the admin nudge.** Without it the hourly sweep would either ping every hour forever, or
 ping once per vessel for all time and never again when the ship returns.


> **Why the boundary exists at all.** "No visit boundary" + "one gift per sailor, DB-enforced" +
> "admin may re-gift a repeat sailor later" cannot all hold: a `unique(sailor, imo)` with no reset
> makes re-gifting permanently impossible. The group is the smallest thing that satisfies all three,
> and it stays entirely out of the product surface.


**Giftable order** (all must hold):


- status in `payment_received` / `order_confirmed` / `partner_assigned`
- `is_deleted = False`, `imo_number != ""`, `ship_arrival_date` set
- **no linked `SpecialRequest`** — special-request orders are excluded from this flow entirely, bulk
 and per-order alike ([`SpecialRequest.order`](../../../backend/catalog/models.py) reverse FK)
- **not an addition** (`parent_order` is null) — **the gift flow is for NEW orders only**
 (decision 2026-07-29)


> **Why additions are excluded.** When a sailor adds an item to an order they have *already paid
> for*, `add_items_service` cannot edit the paid order — it creates a **child order** linked by
> `parent_order`. Same sailor, same ship, same call, just a second row.
>
> Counting it broke the premise the scheme rests on: one sailor adding toothpaste took a ship from
> `order_count` 1 → 2 and **unlocked the whole-ship gift button on a vessel where exactly one
> person had ever ordered**. It also let a gift ride the addition rather than the real order, and
> (Flow 20a) told that sailor *"crews who order together sometimes get a surprise"* while re-pinging
> the entire crew for a non-event.
>
> `giftable_orders_qs()` is the **one authoritative definition**; the per-order grant path now
> asserts membership in it as a final guard, so a future exclusion added there cannot be bypassed
> by granting directly on an order id.


**The ship minimum is absolute (decision 2026-07-28).** A vessel with fewer than
**`GiftConfig.min_orders`** (default **2**) live giftable orders is **not part of the scheme at
all** — it does not appear on the ship list, its detail returns **404**, and **both** grant paths
refuse it. The scheme is defined as *several sailors on one ship*; below the minimum there is no
scheme to apply.


> **This reverses the earlier "show it greyed out" behaviour**, and with it the two escape hatches
> that depended on a per-order grant with no minimum:
>
> - a one-off goodwill gift on a quiet ship — no longer possible;
> - a manual grant for a crew whose **IMO is malformed** — an order with no usable IMO belongs to
>   no ship, so it can never reach the minimum and can never be gifted. This was the deliberate
>   override that made the strict fail-closed grouping rule safe to keep strict.
>
> Per-order granting keeps its **other** purpose: on a qualifying ship, choosing exactly which of a
> sailor's orders carries the gift instead of the auto-picked earliest.


**Grant paths.** (a) **Whole-ship** — one gift per not-yet-gifted sailor on the ship, each riding
that sailor's **earliest-arriving** giftable order; (b) **per-order** — the admin picks the exact
order. Both write the same `OrderGift` row and both are audit-logged; the row records which path it
came from.


**Who sees what.** Customer → a `has_surprise_gift` boolean. Partner → the same boolean (there is no
item identity to reveal). Admin → the flag, who granted it, when, and the ship's gift history.


---


# Admin endpoints


**Headers:** `Authorization: Token <token>` (admin/super_admin). `/api/superadmin/` is exempt from
the `server-secret-key` middleware — do **not** send it. All `IsAuthenticated + IsAdminUser`.


**Authorization: NO ownership gate anywhere in this flow (decision 2026-07-28).**


Any admin or super_admin may **grant, revoke and dismiss** — whole-ship *and* per-order alike. There
is no `manage_gate` and **no "Manage Order" claim required**.


This extends the reasoning that already made whole-ship actions owner-agnostic (F-03) to the
per-order ones: a gift carries **no money**, never enters the order's financial path, and is a
discretionary marketing gesture rather than a change to the order itself — so it is not tied to one
admin's book. In practice the old gate blocked the common case outright: a ship's orders are
routinely unassigned, so **every** per-order grant returned
`409 {"detail": "Claim this order (Manage Order) before making changes."}`.


> **`can_manage` on the ship-detail order rows is DEPRECATED and now always `true`.** It existed
> only to mirror the gate that no longer exists. It is retained so an already-integrated frontend
> doesn't disable every button; **stop reading it**, and it will be removed.


**Master switch.** With `GiftConfig.is_enabled = false` the read endpoints (§1, §2a, §2b) keep
working — the screen stays visible — while every write **that moves goods** (§3 grant, §6 grant,
§7 revoke) returns **409**
`{"detail": "The surprise gift program is currently switched off."}`.
**Dismiss/undismiss (§4/§5) are exempt**: they change only what one admin sees, so blocking them
protects nothing.


> **⚠️ Field renamed 2026-07-28: `status` → `handover_status`** on every gift payload (§6, §7, and
> the `gift` object inside §2b). It tracks exactly one thing — whether the delivery partner has
> physically handed the parcel over — and plain `status` read as approval/payment state while
> sitting next to `Order.status`, which means something else. Values are unchanged:
> **`pending`** = granted, not yet handed over · **`delivered`** = handed over on a full delivery ·
> **`revoked`** = cancelled before pickup.


**No `variant_id` anywhere.** v1.0's shared giftable-variant validator is deleted along with the
catalog binding. No gift endpoint accepts an item of any kind.


---


## 1 · `GET /api/superadmin/gifts/config/` — Read the program config


No params. **Response `200`:**
```json
{
 "is_enabled": false,
 "min_orders": 2
}
```


| Field | Type | Meaning |
|---|---|---|
| `is_enabled` | bool | Master switch (default **false**). Off = every write 409s and the sweep no-ops. |
| `min_orders` | int | Live giftable orders needed to unlock the **whole-ship** button (default **2**). |


**Two fields, because two fields is all that does anything.**


> `default_gift_variant` and `window_days` are **removed** — there is no item to default and no
> day-gap window to configure.
>
> `min_total_value` and `threshold_mode` **still exist as columns but are deliberately NOT on the
> API** (decision 2026-07-28). They are RESERVED for a possible future value-based unlock; nothing
> reads them for a decision today. Exposing an inert *writable* field is worse than omitting it —
> it reads as a working control, and an admin sets `500` and waits for behaviour that never
> arrives. Their intended future is documented in the model's `help_text`, and the Django admin
> still shows them for inspection. **If either is wired up, it goes back on these serializers in
> the same change.**


---


## 2 · `PUT` / `PATCH` `/api/superadmin/gifts/config/update/` — Update config (always partial)


Both PUT and PATCH are partial (§4a) — send any subset.


| Field | Type | Required | Rule |
|---|---|---|---|
| `is_enabled` | bool | ❌ | — |
| `min_orders` | int | ❌ | **≥ 2** — the feature is about several sailors on one vessel. |


**Response `200`** — the full config (§1 shape). **Errors** — `400` any rule above · `401`/`403` auth.


> Sending `min_total_value` or `threshold_mode` is **silently ignored** (DRF drops unknown keys),
> so an admin panel still posting them won't break — but the values will not be stored. Locked by
> `test_the_reserved_fields_cannot_be_set_through_the_api`.


---


## 2a · `GET /api/superadmin/gifts/ships/` — The ship-browse screen


The landing screen. One row per IMO with live giftable orders. Paginated (`page` / `page_size`,
default 10 / max 50).


**Query params**


| Param | Type | Rule |
|---|---|---|
| `search` | string | Matches vessel name (icontains) or IMO (exact). |
| `port_id` | UUID | Ships with at least one live giftable order at this port. |
| `gift_status` | enum | `none` \| `partial` \| `all` — by gifted-sailor ratio. Anything else → 400. |
| `arrival_from` / `arrival_to` | ISO date | Bounds on `ship_arrival_date`. |
| `include_dismissed` | bool | Default `false`. |
| `ordering` | enum | `arrival` (default, soonest first) \| `-arrival` \| `-order_count`. |


**Response `200`:**
```json
{
 "count": 12, "next": "…?page=2", "previous": null,
 "results": {
   "message": "Ships fetched successfully",
   "data": [
     {
       "imo_number": "9100007",
       "vessel_name": "MV Orion",
       "ports": [{ "id": "6ae695a3-…", "port_name": "Singapore (Seed)" }],
       "order_count": 4,
       "sailor_count": 3,
       "gifted_sailor_count": 1,
       "total_value": "459.00",
       "earliest_arrival": "2026-07-25T06:00:00Z",
       "latest_departure": "2026-07-29T18:00:00Z",
       "program_enabled": true,
       "has_gift_history": true,
       "is_dismissed": false
     },
        {
       "imo_number": "9100008",
       "vessel_name": "MV Orion",
       "ports": [{ "id": "6ae695a3-…", "port_name": "Singapore (Seed)" }],
       "order_count": 4,
       "sailor_count": 4,
       "gifted_sailor_count": 0,
       "total_value": "459.00",
       "earliest_arrival": "2026-07-25T06:00:00Z",
       "latest_departure": "2026-07-29T18:00:00Z",
       "program_enabled": true,
       "has_gift_history": true,
       "is_dismissed": false
     }
   ]
 }
}
```


- `sailor_count` is **distinct sailors**; `order_count` is orders. Both are shown because they differ
 often — one sailor placing four orders is not a crew, and the admin needs to see that before
 clicking. `min_orders` gates on **orders**, since the per-sailor rule already prevents the harm.
- `total_value` is the display badge (§1) — informational, gates nothing.
- `program_enabled` is the **master switch, not a per-ship verdict** — every ship in a response
 carries the same value, and the only way to get `false` is `GiftConfig.is_enabled = false`
 (reads keep working; every write 409s). It rides this payload so the frontend can disable the
 button without a second call to `/gifts/config/`.


 > **Renamed from `is_bulk_eligible` on 2026-07-29.** That name read as *"all this ship's orders
 > can be gifted"*, which is wrong twice over: sub-minimum ships never appear at all (so the
 > count half of the old check was always true), and the bulk action grants **one gift per
 > sailor, not per order** — a ship with 4 orders from 1 sailor yields exactly 1 gift. The
 > model helper `GiftConfig.bulk_unlocked()` was deleted for the same reason.
- `has_gift_history` = this crew was gifted on a **previous call** — a gift that stuck (not
 revoked/void) in an already-closed group. It is the list counterpart of detail's
 `previously_gifted_count` and means exactly the same thing.


 > **Deliberately excludes the current call**, which `gifted_sailor_count` already reports —
 > counting both made the two fields overlap and turned a gift granted minutes ago into
 > "history". And **a revoked or voided gift is not history**: it never reached anyone, so it is
 > a correction, not a record. Before this was fixed, granting and immediately revoking left a
 > ship flagged as previously-gifted forever.


**Errors** — `400` bad `gift_status` / `ordering` / malformed date.


---


## 2b · `GET /api/superadmin/gifts/ships/<imo_number>/` — Ship detail, grouped by sailor


The screen the whole redesign exists for: **sailors first, orders nested underneath.** An admin must
never be shown four order rows for one person and be able to gift each of them.


`<imo_number>` is the normalised 7-digit IMO. **Response `200`:**
```json
{
 "imo_number": "9100007",
 "vessel_name": "MV Orion",
 "order_count": 4,
 "sailor_count": 3,
 "gifted_sailor_count": 1,
 "program_enabled": true,
 "is_dismissed": false,
 "sailors": [
   {
     "user_id": "8f1c…",
     "sailor_name": "Ann Lee",
     "order_count": 4,
     "total_value": "459.00",
     "gift": {
       "id": "…", "handover_status": "pending",
       "carrier_order_id": "cfd0…", "carrier_order_number": "AM202607250012",
       "source": "bulk",
       "granted_by_name": "admin@x.io", "granted_at": "July 27, 2026, 03:14 PM"
     },
     "previously_gifted_count": 2,
     "orders": [
       {
         "id": "cfd0…", "order_number": "AM202607250012",
         "total_amount": "160.00", "status": "order_confirmed",
         "ship_arrival_date": "2026-07-25T06:00:00Z",
         "expected_departure": "2026-07-29T18:00:00Z",
         "port_name": "Singapore (Seed)", "anchorage_name": "East Anchorage",
         "can_manage": true,
         "is_gift_carrier": true
       }
     ]
   }
 ]
}
```


| Field | Meaning |
|---|---|
| `gift` | The sailor's gift in the **current open group**, looked up by **recipient** — not by carrier order, so it still shows after the carrier order leaves the live set. Never more than one. A `revoked` or `void` gift reads as `null` (they're giftable again). |
| `previously_gifted_count` | Gifts this sailor received on this IMO in **earlier, closed** groups. Pure admin judgment aid for repeat crews — it blocks nothing. |
| `can_manage` | **DEPRECATED — always `true`.** There is no ownership gate in this flow; kept only so an integrated FE doesn't disable every button. |
| `is_gift_carrier` | Whether *this* order is the one carrying the sailor's gift. A sailor can show a `gift` whose carrier is **not** in the list (it was delivered) — the gift belongs to the sailor, not the order. |
| `is_gift_carrier` | Whether this specific order carries the sailor's gift. |


**Errors** — `400` malformed IMO · `404` no live giftable orders for this IMO, **or fewer than
`min_orders`** (404 not 403 — a sub-minimum vessel isn't forbidden, it's out of scope).


---


## 3 · `POST /api/superadmin/gifts/ships/<imo_number>/grant/` — Gift the whole ship


**No request body.** There is no item to choose.


Grants one gift per **not-yet-gifted sailor** on the ship, each riding that sailor's
**earliest-arriving** giftable order (tie-broken on `created_at`, so the pick is deterministic).
Sailors who already hold a gift in the open group are **skipped, never overwritten**. Audit-logged
per grant (`GIFT_GRANTED`). Sailors are notified after commit, without the item being named.


**Re-runnable by design.** Unlike v1.0's one-shot approve, this may be called again as the crew keeps
ordering — it fills in the sailors who have joined since. That is why there is no window state
machine and no 409-on-second-call.


**Response `200`:**
```json
{
 "message": "2 sailor(s) will receive a surprise gift.",
 "sailors_gifted": 2,
 "sailors_skipped": 1,
 "data": { "…": "the full ship detail as in §2b" }
}
```


`sailors_gifted` may be **0** when everyone already holds one — the message says so rather than
reporting a silent success.


**Errors** — `409` fewer than `min_orders` live giftable orders
(`{"detail": "This ship needs at least 2 live orders before the whole-ship gift can be used."}`) ·
`409` program switched off · `404` unknown IMO.


---


## 4 · `POST /api/superadmin/gifts/ships/<imo_number>/dismiss/` — Hide from the default list


No body, no reason required — this is a list preference, not a decision, so nothing needs
justifying. Any admin may dismiss.


**Response `200`:**
```json
{ "message": "Ship dismissed.",
 "data": { "imo_number": "9200011", "vessel_name": "MV Crew Runner", "is_dismissed": true } }
```
Enough for the frontend to update the row without a refetch.


**Errors** — `404` unknown IMO, **or a vessel below `min_orders`** (scoped exactly like ship
detail) · `409` already dismissed.


> **Exempt from the master switch**, unlike §3/§6/§7. Dismissing has no business effect, so
> tidying the list while the programme is paused is harmless; only the writes that move goods are
> gated.
>
> A qualifying ship is always dismissible even if it has **no `ShipGiftGroup` yet** — groups are
> opened by the hourly sweep or by a grant, so a ship that just qualified has none, and this
> endpoint opens one on demand.


## 5 · `POST /api/superadmin/gifts/ships/<imo_number>/undismiss/` — Restore it


Any admin may undo any admin's dismissal. Same shapes and same scoping as §4; `data.is_dismissed`
comes back `false`. **Errors** — `404` unknown or below-minimum IMO · `409` not dismissed.


---


## 6 · `POST /api/superadmin/gifts/orders/<order_id>/grant/` — Gift one specific order


The precise path: on a **qualifying** ship, the admin picks exactly which of a sailor's orders
carries the gift instead of the auto-picked earliest. It is **not** a way around the ship minimum —
that gate applies here too. **No ownership gate, no claim required**; audit-logged
(`GIFT_GRANTED`).


| Field | Type | Required | Rule |
|---|---|---|---|
| `note` | string | ❌ | ≤ 1000 chars — audit context only. Default `""`. |


**Response `201`:**
```json
{
 "message": "Surprise gift granted.",
 "data": {
   "id": "…", "order": "…-uuid", "recipient": "…-uuid",
   "handover_status": "pending", "source": "manual",
   "granted_by": "…-uuid", "granted_by_name": "admin@x.io",
   "granted_at": "July 27, 2026, 03:14 PM",
   "delivered_at": null, "revoked_reason": ""
 }
}
```


**Errors**
- `409` order not in a giftable state · order has a linked `SpecialRequest` · order already has a
 live gift, or one that was already **handed over** (a `revoked`/`void` gift is re-granted in
 place, not refused) ·
 **this sailor already holds a gift on this ship** (`{"detail": "This sailor has already been gifted
 on this vessel. Revoke the existing gift first."}`) · **the ship has fewer than `min_orders` live
 orders** · **the order has no usable IMO** · program switched off
- `404` unknown order


---


## 7 · `POST /api/superadmin/gifts/orders/<order_id>/revoke/` — Revoke before pickup


**No ownership gate, no claim required**; audit-logged (`GIFT_REVOKED`). Any admin may revoke —
not only the admin who granted it, and not only the order's owner.


| Field | Type | Required | Rule |
|---|---|---|---|
| `reason` | string | ✅ | Non-blank, ≤ 1000 chars. |


**The cutoff is `items_collected`** — the same boundary as the giftable allowlist, reusing
`giftable_statuses()` rather than a second constant. Once the partner has the parcel, the gift is
physically gone and the system must not pretend otherwise.


Revoking **frees the sailor** — they become giftable again in the same open group, so a mis-targeted
gift can be moved to the right order.


**The sailor is deliberately NOT notified.** They were told a gift was coming without ever learning
what it was, so a retraction would turn a surprise into a visible loss. The audit trail carries the
reason.


**Response `200`** — the gift as in §6, `handover_status: "revoked"`. **Errors** — `409` gift already
`delivered`/`revoked`, or the order has reached `items_collected` or beyond · `404` order or gift
not found · `400` missing/blank `reason`.


---


# Background jobs


- **Hourly nudge sweep** — `promotion.tasks.sweep_gift_groups` (Celery beat, `is_enabled`-gated).
 Opens a `ShipGiftGroup` for any IMO that has just reached `min_orders` live giftable orders,
 notifies admins **once** per group with a deep link into §2b, and **closes** groups whose IMO has
 no live giftable orders left. It **grants nothing and decides nothing** — the admin still has to
 look and click.
- **Gift-on-delivery** — the partner's deliver step calls `mark_gift_delivered(order, actor=partner)`
 **only** when the order reaches `delivered` (full delivery). A partial trip leaves the gift
 `pending` for the return leg, which the existing partial-delivery/refund flow already handles;
 there is no gift-specific failure lifecycle, because the gift was never a tracked object.


---


# Read surfaces on the order payloads (no dedicated endpoint)


**Customer** (own order list + detail) — a boolean, never more:
```json
{ "…other order fields…": "…", "has_surprise_gift": true }
```
A `revoked` gift reads as `false`. The sailor knows something is coming, never what — and there is no
post-delivery reveal in the API (deferred; revisit only if asked).


**Partner** — **also just a boolean**, on both the queue card and the order detail:
```json
{ "…other order fields…": "…", "has_surprise_gift": true }
```


> **Changed from v1.0.** The old design's headline was *"the partner is the only audience that sees
> the gift's identity."* With no catalog binding there **is** no identity — the partner receives a
> pre-wrapped, name-tagged parcel prepared off-system and simply needs to know one exists.
> `PartnerOrderDetailSerializer.surprise_gift` collapses from an object to a flag.


**Scale note.** Both partner surfaces read `order.gift` (reverse OneToOne), so the partner queue
queryset must `select_related("gift")` — that is finding **FY1**, which survives this redesign and
must be built in from the start rather than fixed later.


---


# A dead carrier order voids the gift


The gift rides **one** order. If that order is cancelled or refunded while the sailor still has
other live orders on the ship, the gift can never be handed over — and left alone it strands the
sailor: the row keeps occupying `uniq_gift_per_sailor_per_group`, so the ship screen shows them
un-gifted, the bulk re-run skips them, per-order grant answers *"revoke the existing gift first"*,
and revoke itself refuses because a cancelled order is outside the giftable allowlist. No path out.


So a signal sets `handover_status = void` when the carrier order reaches **`cancelled` or
`refunded`**, and `void` is excluded from the uniqueness constraint. The sailor is freed, and
re-running the whole-ship grant re-grants them on a surviving order — genuinely self-healing.


> **`delivery_failed` is deliberately NOT voided.** It is resumable (`delivery_failed →
> partner_assigned`, see `orders/lifecycle.py`), so the partner may still retry and hand the gift
> over. Voiding there would destroy a live gift.
>
> `void` is a separate status from `revoked` on purpose: the audit trail must distinguish *"an
> admin took it back"* from *"the order it was riding disappeared"*.


**One definition of "not live".** `OrderGift.INACTIVE_STATUSES = ("revoked", "void")` is used by
the customer flag, both partner flags, the admin counts and the DB constraint. Every surface has
to agree, or the same gift reads as present in one place and absent in another — which is exactly
the bug class this section exists to close.


---


# Data model


| Model | Role |
|---|---|
| `GiftConfig` | Singleton (`load()`). Only `is_enabled` + `min_orders` (default 2) do anything, and only those two are on the API. `min_total_value` / `threshold_mode` remain as **RESERVED, inert columns** — off the serializers so no one can set a threshold that does nothing; intent recorded in their `help_text`. `default_gift_variant` and `window_days` **dropped**. |
| `ShipGiftGroup` | The invisible boundary. `imo_number`, `vessel_name` (latest seen), `is_open`, `opened_at`, `closed_at`, `notified_at`, `is_dismissed` / `dismissed_by` / `dismissed_at`. |
| `OrderGift` | The flag on one order. `order` (**OneToOne**), `recipient` (FK, denormalised from `order.user`), `group` (FK, nullable), **`handover_status`** (`pending` = granted but not yet handed over / `delivered` = handed over / `revoked` = taken back by an admin / **`void`** = the carrier order was cancelled or refunded, set by signal), `source` (`bulk`/`manual`), `granted_by`, `granted_at`, `delivered_at`, `revoked_by`, `revoked_reason`. **No `variant` / `product_name` / `sku`.** |


**Constraints — both must be at the database, not in Python:**


```python
# ShipGiftGroup — one open group per vessel at a time.
UniqueConstraint(fields=["imo_number"], condition=Q(is_open=True),
                name="uniq_open_gift_group_per_ship")


# OrderGift — one gift per sailor per open group. A revoked gift frees them again.
UniqueConstraint(fields=["group", "recipient"],
                condition=~Q(handover_status__in=["revoked", "void"]),
                name="uniq_gift_per_sailor_per_group")
```


The second is the whole per-sailor rule. It must **not** be an application-level `.exists()` check
before granting — two admins clicking at once (or a whole-ship click racing a per-order click) would
double-grant. This is the tracked **RC-4** anti-pattern; see [[rc4-exists-guard-pattern]].


`recipient` is denormalised onto `OrderGift` because a `UniqueConstraint` cannot reach across the FK
to `order.user`. `group` is nullable for manual grants on orders whose IMO is blank — Postgres NULLs
don't collide, which is correct: there is no group to be unique within.


**Index for the browse screen** — a partial index on `Order` covering the group-by:


```python
Index(fields=["imo_number", "status"], name="idx_order_giftable_by_ship",
     condition=Q(status__in=["payment_received", "order_confirmed", "partner_assigned"]))
```


Small and self-maintaining — rows leave the index as orders progress.


**Audit actions** — `GIFT_GRANTED`, `GIFT_REVOKED`, and a **new `GIFT_DELIVERED`** written by
`mark_gift_delivered`, so the permanent chain records not just who authorised goods to leave but
whether they actually reached the sailor. All three default to `Category.ORDER` (never pruned).
`mark_gift_delivered` gains an `actor` argument (the partner) to support it.


**Django admin:** all three models registered under `promotion/admin.py`.


---


# Scale


The ship-browse screen is a SQL `GROUP BY imo_number` over live giftable orders, paginated —
**no materialised summary table**. The working set is bounded by the status allowlist, so it grows
with *concurrent in-flight orders*, not with order history, and stays small by construction even at
1 lakh+ users. The partial index above covers it exactly.


**Revisit trigger (decided 2026-07-28, not a guess):** add a rollup if concurrent live giftable
orders pass **~50k** or the ship-list p95 passes **300ms**. Today the live count is **1 ship group**.


---


# What v1.0 deleted


For reviewers comparing against git history:


| Removed | Why |
|---|---|
| `VesselGiftWindow` (qualification queue, approve/reject state machine) | Replaced by `ShipGiftGroup` — an anchor, not a queue. Nothing auto-qualifies any more. |
| `GET/POST /gifts/windows/…` (4 endpoints) | Superseded by the ship-browse endpoints. |
| `variant_id` on every request body; `_resolve_giftable_variant` | No catalog binding. |
| `OrderGift.variant` / `product_name` / `sku`; `GiftConfig.default_gift_variant` | Same. |
| `GiftConfig.window_days`, `iter_docking_windows` day-gap logic | The status allowlist already bounds a call. |
| Partner-visible gift identity | There is no identity. |
| `min_total_value` / `threshold_mode` as **gates** | Demoted to RESERVED inert columns, and removed from the config API entirely (2026-07-28). |


Two open validation findings resolve as a side effect: **FY2** (mutable `window_start` key) is
**dissolved** — the key is gone; **FY3** (owner-agnostic window approval) stays **closed as
intentional**, now applying to whole-ship actions. **FY1** (partner queue N+1) **survives** and must
be built in.


---


# How Flow 20 connects


- **Upstream — Flow 7 (Payment):** an order becomes giftable at `payment_received`.
- **The IMO key** — `orders.imo.normalize_imo` / `imo_from_address` guarantee a clean 7-digit IMO or
 nothing (fail-closed). See [[surprise-gift-engine]].
- **Excluded — Flow 18 (Special Requests):** any order with a linked `SpecialRequest` never appears.
- **Downstream — Flow 10 (Delivery):** the partner hands the gift over on a **full** delivery;
 `mark_gift_delivered` closes it.
- **Sibling — Flow 20a:** the intent-time crew nudge shares the IMO grouping and nothing else — no
 config, no models, no admin action. See [`20a-ship-crew-intent-nudge.md`](./20a-ship-crew-intent-nudge.md).
- **Notifications** — the sailor is told on the **transactional** `ORDER_UPDATE` channel (news about
 their own order, so a marketing mute must not hide it). Flow 20a's nudge is the opposite: genuinely
 promotional, so it rides **PROMO**. See [[notification-inbox-rules]].


	

