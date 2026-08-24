# Backend request — realtime badges: we're switching from counts to an "activity dot"

## What's changing on the frontend

We are **not** adding separate sidebar screens for Verifications and Failed Deliveries. Both
are already visible as cards on their parent screens (`IN VERIFICATION` on Intents, the
delivery-failed KPI on Orders), so a separate nav row duplicates a filter that already
exists.

Instead the sidebar will fold them in and show an **activity marker (`*`)** rather than a
number:

| Sidebar entry | Lights up when a frame arrives for |
|---|---|
| Intents | `intents` **or** `verifications` |
| Orders | `orders` **or** `delivery_failed` |
| Express Orders | `express_orders` |
| Special Requests | `special_requests` |
| Seller Requests | `seller_requests` |

The marker means **"something arrived here since you last looked"** — not "how many". It is
set when a `changed` frame names that queue while the admin is on another screen, and cleared
when they open the screen.

**No payload changes are needed.** Keep sending all seven `counts` and all five `mine` keys
exactly as they are — the per-screen cards still use them, and we use the previous vs. new
counts to tell an arrival from a completion. `changed` is what drives the marker.

---

## Ask 1 — Please close the soft-delete publish gap (this is now the important one)

The guide says:

> One known gap: **soft-deleting an order publishes no frame.** The number corrects itself on
> the next snapshot (reconnect or `sync`); only the instant push is missing.

That reasoning held while we rendered numbers. **It does not hold for the marker**, and the
gap gets meaningfully worse:

- A snapshot arrives as `changed: "connect"` or `changed: "sync"` — it carries **no queue
  name**. So a snapshot can correct a *number*, but it can never retroactively raise a
  *marker*, because it doesn't say which queue moved.
- Result: a missed publish is now a **permanently missed notification**, not a temporarily
  wrong number. The admin is never told, and nothing later tells them.

So wherever a count can move without a publish, please publish. Soft-delete is the one you've
already identified; if there are others in the same category, they have the same consequence
now.

---

## Ask 2 — Does `changed` fire on removals as well as additions?

We need to know this precisely, and it isn't in the guide.

When an order **leaves** a bucket — delivered, cancelled, refunded, verification approved —
does a `badge` frame fire with that queue in `changed`?

**Why it matters:** if yes, an admin who completes an order gets an activity marker for their
own action, on the screen they're already working. That's exactly the noise that trains people
to ignore the indicator.

We can mitigate it (we compare the previous counts to the new ones and only light up when a
count went **up**), but we need to know which of these we're dealing with:

- **(a) `changed` fires only when a count increases** → we can trust it directly, no
  comparison needed.
- **(b) `changed` fires on any membership change, up or down** → we'll rely on our own
  count comparison. Workable, with one known blind spot: if one item arrives and another
  leaves inside the same coalescing window, the net count is unchanged and we'd miss the
  arrival.

Please confirm which it is. If it's (b) and it's cheap to add, a direction hint on the frame
(e.g. `"delta": "up" | "down"`) would remove the blind spot entirely — but it's a
nice-to-have, not a blocker.

---

## Explicitly NOT asking for: broader publishes

To be clear, because it's the obvious thing to reach for and it would be wrong:

**Please do not start publishing on in-bucket transitions** (`at_port → at_berth`). §8 of the
guide is right that this would be a firehose, and it stays right under the new design. A
milestone moving is not *new work arriving* — the marker means "something came for this
queue", and an order already in the queue moving along is not that.

The existing rule — publish only when bucket membership changes — is exactly the right
trigger for a marker. Nothing about that needs to change.

---

## Known limitation we're accepting (no action needed)

Marker state ("has this admin seen this queue yet") will live in the browser, so it won't
follow an admin across devices or survive clearing site data. We're accepting that for v1
rather than asking for per-admin server-side seen-state — it's a lot of machinery for a dot.
If it turns out to matter in practice we'll come back with a specific proposal.

---

## Summary

| # | Ask | Priority |
|---|---|---|
| 1 | Publish a frame on soft-delete (and any other silent count change) | **High** — a missed publish is now a permanently missed notification |
| 2 | Confirm whether `changed` fires on removals; optionally add a direction hint | **Medium** — we have a workaround, but with a blind spot |
| 3 | Do **not** broaden publishes to in-bucket transitions | — confirmation only |

Payload shape, `counts`, `mine`, auth, reconnect and rate-limit behaviour all stay as they
are. Nothing else in the integration guide changes.
