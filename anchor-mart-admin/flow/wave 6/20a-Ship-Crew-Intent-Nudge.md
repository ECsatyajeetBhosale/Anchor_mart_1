# Flow 20a — Ship-Crew Intent Nudge


> ## ✅ BUILT 2026-07-28
>
> Split out of Flow 20 by decision (2026-07-28): this feature shares the IMO grouping key with the
> Surprise Gift Program and **nothing else** — no config beyond the shared master switch, no gift
> models, no admin action, and a different trigger point in the order lifecycle.
>
> Code: `promotion/crew_nudge.py` (the fan-out) · `promotion/tasks.py::nudge_ship_crew` (the task)
> · `promotion/signals.py::nudge_crew_on_intent` (the trigger) · `CrewNudgeLog` (the throttle).
> Tests: `promotion/tests/test_crew_nudge.py` (21).
>
> Sibling flow: [`20-surprise-gift-program.md`](./20-surprise-gift-program.md).
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)


---


# Executive Summary


A **marketing nudge**, not part of any gift decision. When a sailor starts an order, everyone on that
vessel who is already mid-order hears that their crew is active — and the new sailor hears that crews
who order together sometimes get a surprise. The goal is the same as Flow 20's: get more of a ship's
crew ordering through AnchorMart in the same call.


It fires at **intent creation** — before payment, before any order is giftable, before any admin has
looked at anything. **No admin action, no `OrderGift`, no `ShipGiftGroup`, no `GiftConfig` threshold
is involved.** A crew that receives this nudge may well never be gifted; gifting is entirely
discretionary.


| | |
|---|---|
| **Actors** | Customer (both the intending sailor and their crewmates) · Background System |
| **Endpoints** | **None.** Event-driven fan-out only. |
| **Trigger** | An order reaching `intent_received`. |
| **Channel** | **PROMO** — honours the promotional mute and per-channel toggles. |
| **Django Apps** | `orders` (trigger), `notifications` (dispatch), `promotion` (throttle record) |
| **Version** | 1.0 — 2026-07-28 |
| **Status** | ✅ Built + hardened. Event-driven, no routes. **21 tests**. ⚠️ **FZ1 (Med) still open — awaiting a product decision** (the nudge is push-only; see the validation report). FZ2–FZ5 fixed. |


---


# The four decisions that shape it


### 1 · It groups on `Order.imo_number`, never `VesselProfile.imo_number`


This is a **correctness rule, not a preference.**
[`VesselProfile.imo_number`](../../backend/user/models.py) is `max_length=50`, optional, free text,
and its own help text calls it *"Vessel IMO / call sign"* — it is never normalised or validated.
[`Order.imo_number`](../../backend/orders/models.py) is the strict, normalised **7-digit** key that
Flow 20 already groups on, derived in `save()` via `imo_from_address`.


Keying the nudge off the profile field would give the two features **two different definitions of
"same ship"**, and would lose the fail-closed guarantee: a typo'd profile could fan out to an
unrelated vessel. Blank `imo_number` → **no nudge at all**, same fail-closed rule as Flow 20.


### 2 · The copy is anonymous, and never names anyone or anything


The nudge tells a sailor their **vessel** is active. It never names the other sailor, what they
ordered, or how much they spent.


- To the **intending sailor**: *"Crews who order together sometimes get a surprise from AnchorMart."*
- To **crewmates already mid-order**: *"More of your crew are ordering this call."*


Accepted trade-off (2026-07-28): an anonymous "your vessel is active" signal discloses no more than a
sailor would observe on deck watching deliveries arrive. The real privacy risk — *"your crewmate Ann
ordered a Deck Cap"* — is removed by anonymising, not by dropping the feature.


### 3 · It is **PROMOTIONAL**, on its own type — `CREW_NUDGE`, not plain `PROMO`


Flow 20's grant notification is transactional (`ORDER_UPDATE`) because it is news about the sailor's
**own order** — a marketing mute must not hide it.


This nudge is the opposite: speculative, discretionary, about somebody else's activity. Putting it on
the transactional channel would **silently bypass the promotional opt-out** that the notification
preferences layer exists to honour — a sailor who muted marketing would still be pinged about a
"chance of a gift". So it is **PROMOTIONAL**, shares the `promotions` mute, and respects both
preference layers. See [[notification-inbox-rules]].


**It has its own type, `CREW_NUDGE`, rather than the generic `PROMO` (FZ1, fixed 2026-07-29).**


On plain `PROMO` the nudge was **push-only**: §4.4 keeps `PROMO` out of the curated inbox, and
`send_notification` has no email path despite `PROMO` declaring an `EMAIL` channel. A sailor with
push disabled was therefore **silently excluded** — not opted out, just unreachable — while the
row it wrote sat in the database where nobody could ever read it. For a feature whose entire
purpose is reach, that was the wrong failure mode.


The fix is scoped to this one type. Feed inclusion is **per-type** (`in_feed()` → `INBOX in
channels`), not per-category, so `CREW_NUDGE` carries `INBOX` while `PROMO`'s entry is untouched.


> **§4.4's blanket PROMO exclusion stays intact deliberately.** It exists to stop every marketing
> blast filling the curated inbox, and that reasoning is not stale — so the fix grants inbox
> visibility to this nudge alone rather than to the whole category. Two tests hold the line:
> `test_it_reaches_the_curated_inbox_feed` asserts `in_feed(CREW_NUDGE)` **and**
> `not in_feed(PROMO)`, and `test_only_marketing_types_are_promotional` fails if any further type
> is quietly added to the promotional category.
>
> ⚠️ **The type string ships in the FCM payload** (`fcm_data['type']`), so an installed app that
> switches on `type` will see a value it does not know. There is precedent — `back_in_stock` (#23)
> and `order_chat` (#29) were both added the same way — but the mobile side should be told.


### 4 · The copy never promises a gift


Gifting is 100% admin discretion with no rule behind it, so most crews who order together will get
nothing. Copy says *"sometimes"* and *"a chance"* — never *"you will receive"* or *"win"*. Overselling
a discretionary gesture manufactures a complaint the system has no way to answer.


---


# Behaviour


**Trigger.** An order reaches `intent_received` with a non-blank normalised `imo_number`.


**Recipients.**


| Audience | Who | Message |
|---|---|---|
| The intending sailor | The order's own user | "Crews who order together sometimes get a surprise." |
| Their crewmates | Distinct users with a non-deleted, pre-pickup order (`intent_received` … `partner_assigned`) on the **same** `imo_number`, **excluding** the triggering sailor | "More of your crew are ordering this call." |


Note the crewmate set is *pre-pickup*, deliberately wider than Flow 20's giftable allowlist — the
point is reach, and a sailor still at `payment_pending` is exactly who a nudge might convert.


**Throttle — at most one nudge per sailor per ship per 24 hours.**


Without it this is O(n²) per call: 10 sailors × 10 intents ≈ 90 pushes for one port visit. Notification
fatigue does not just cost this feature — it erodes engagement with **every** future message on the
same channel.


Implemented with a small dedicated record (`user`, `imo_number`, `sent_at`, `sent_on`) checked
before dispatch. Deliberately **not** a JSON-metadata query against the `Notification` table — that
field is unindexed and this check runs on every fan-out.


**Two layers, same split as the gift rule (FZ3, fixed 2026-07-29):**


- the **rolling 24h read check** owns the *semantic* — and is the stricter of the two, still
 blocking a 23:00 → 01:00 pair;
- **`UniqueConstraint(user, imo_number, sent_on)`** owns *correctness* — two intents committing at
 the same instant both passed the read check and both sent. A rolling window cannot be a
 constraint, so the calendar date is denormalised to make one possible.


The log row is written **before** the notification: a push cannot be unsent, so the dedupe token
has to be claimed first. Losing the race is then a silent skip rather than a duplicate ping.


**Retention (FZ4).** Rows are pruned beyond **48h** by the hourly gift sweep — nothing reads past
24h, and the extra day is slack for clock skew and a missed run. The window must stay longer than
`THROTTLE`, or pruning would silently re-enable double-nudging; a test asserts that relationship.


**Fan-out cap (FZ5).** At most `MAX_FANOUT` (200) recipients per nudge. A crew is tens of people so
this should never bind — it exists so a pathological case (an IMO collision, a long stay
accumulating orders) is a **logged trim** rather than a silent mass-send.


**Off-switch — gated on `GiftConfig.is_enabled` (confirmed 2026-07-28).** One switch governs both
halves of the feature. Two independent toggles would drift, and the drifted state is the bad one:
gifting off while the nudge still fires means customers are told about a programme nobody is running,
producing *"where's my gift?"* support tickets for something that isn't happening. Advertising a
switched-off programme is describing behaviour the system doesn't have — the same category of error
as documentation that overstates the code, just pointed at the customer instead of a developer.


---


# Scale


**The fan-out never runs in the request cycle.** Intent creation is a customer-facing write; a
crewmate query plus N notification dispatches belongs in a Celery task fired on
`transaction.on_commit`. A slow or failing notification must never slow down or roll back an order
intent.


The crewmate query is covered by the same partial index Flow 20 adds on `Order(imo_number, status)`,
widened to the pre-pickup statuses this flow uses.


---


# Known gaps (deliberate, v1)


- **Intents that never become orders still nudge the crew.** Acceptable for a marketing touch.
- **No admin controls** — no per-port or per-vessel suppression beyond the global master switch.
- **No conversion tracking** — nothing measures whether nudged crewmates actually order.


 > ⚠️ **This is a constraint on future work, not just a missing feature.** The gap is not "we forgot
 > to measure it" — it is *"the copy and the 24h throttle cannot be tuned until it exists."*
 >
 > **Do not adjust the nudge's wording or its throttle window until conversion tracking is built.**
 > Both were chosen on reasoning (don't overpromise a discretionary gesture; ~90 pushes per call is
 > fatigue), not on data — so a later "12h feels better" change would be replacing one guess with
 > another while looking like a tuning decision. Build the metric first, then tune against it.


---


# How Flow 20a connects


- **Shares only the key** — `Order.imo_number`, normalised, fail-closed. No shared models or config
 beyond the `is_enabled` switch.
- **Upstream — Flow 4/5 (Order intent):** the trigger point.
- **Sibling — Flow 20:** the actual gift grant, an entirely separate admin-driven decision. See
 [`20-surprise-gift-program.md`](./20-surprise-gift-program.md).
- **Flow 21 (Notifications):** dispatch, PROMO channel, and both preference layers.



