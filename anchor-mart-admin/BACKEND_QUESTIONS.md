# Backend Questions — Admin Panel

Open items from the frontend side. Ordered by how badly a wrong answer hurts.
Items 1–3 block or silently break behaviour; 4–6 are confirmations.

---

## 1. Chat create — response shape (BLOCKING, fails silently)

`POST /superadmin/chat/support-chats/create/`
`POST /superadmin/chat/order-chats/create/`

We need the **exact** 201 body. Right now the client reads `chat_id`, falls back
to `id`, and unwraps a `data` envelope if present — i.e. it is guessing.

If the nesting is different, the thread **is created on the server** but the UI
fails to preselect it and shows nothing. No error, no console message. The admin
clicks "New Conversation", something happens, and the screen looks broken.

Please paste one real 201 body for each endpoint, verbatim.

- Is the id field `chat_id` or `id`?
- Is it at the top level or inside `data`?
- Is the id a UUID string or an integer?
- Does the body carry the full chat object (participants, `created_at`), or only the id?

---

## 2. Partner assignment — the user UUID field name (BLOCKING)

`GET /partner/order-assignments/?order_id=<id>`

We need the **user UUID** of the assigned partner, to open a chat with them.

Currently guessing, in order: `partner_user_id`, `user_id`, `partner.user_id`.

Important: it must be the **user** UUID, not the partner-profile id. If we send
the profile id to the chat endpoint we either 404, or worse, open a thread
against the wrong identity.

- What is the field called?
- Is it the user UUID or the partner-profile id? If the response only carries
  the profile id, we need a second field or a nested `user` object.
- What comes back when an order has **no** partner assigned — empty list, `null`,
  or 404? We need to distinguish "unassigned" from "request failed".

---

## 3. `/api/chat/upload-media/` — secret key is exposed in the browser

The endpoint is authenticated with `server-secret-key`. That key currently lives
in the frontend `.env` as a `VITE_*` variable.

**Vite inlines every `VITE_*` variable into the client bundle at build time.**
Confirmed: the literal key string appears in the shipped
`dist/assets/index-*.js`. Anyone who loads the admin panel and opens devtools
can read it. It is not a secret in any meaningful sense — it only stops
completely unauthenticated traffic.

This needs a decision from your side, not ours:

- **(a)** Accept it. The key is a coarse bot filter, nothing more, and the
  endpoint is safe to call with it. If so, say that explicitly and we will stop
  treating it as a secret.
- **(b)** Move the endpoint under `/api/superadmin/` so it uses the normal
  admin session/JWT like every other call, and drop the shared key entirely.
  This is what we'd prefer.

We are not going to rotate the key — rotating changes nothing while it is still
compiled into the bundle.

---

## 4. `platform.order_config` — confirm the feature name

We added `platform.order_config` to the admin feature list to gate the new Order
Configuration form on Settings.

- Does that exact string exist in `registry.py`?
- Is it in the governance group, next to `platform.port_config`?
- Does a super admin actually receive it in their feature list today?

If the name differs, every admin sees the form read-only with no Save button and
assumes they lack permission.

---

## 5. Order Config — 400 field keys

`PATCH /superadmin/order-config/update/`

On validation failure we map field errors to the inputs so the operator sees the
problem on the box they typed in.

Our mapping matches these six keys exactly:

```
cancel_lead_hours
sla_express_hours
sla_fastest_hours
sla_emergency_hours
default_anchorage_hours
eta_range_buffer_hours
```

- Do 400 responses key errors by those names?
- Any key we don't recognise falls through to a page-level banner — degraded but
  not broken. Confirm the shape so we can keep it inline.
- Confirm per-field bounds. We currently allow `0` for `cancel_lead_hours`,
  `default_anchorage_hours` and `eta_range_buffer_hours`, and require `>= 1` for
  the three SLA fields. If the server applies a blanket `>= 1`, three legitimate
  settings will be rejected client-side-valid but server-side-invalid.

---

## 6. Platform analytics — smoke test once real traffic exists

`GET /superadmin/analytics/orders-by-platform/`
`GET /superadmin/analytics/platform-trend/`

Both are wired and rendering. Two invariants we cannot verify without live data:

- For each platform `p`: `sum(bars[].platforms[p])` over the trend response must
  equal that platform's `orders_placed` in the breakdown response, for the same
  filter window. If they diverge, the two endpoints are bucketing differently
  and the chart contradicts the table sitting under it.
- Today's numbers must be non-zero when orders exist. A zero row with real
  orders behind it means the platform tag isn't being written on order create.

Also: is `unknown` expected to be non-empty in production, or does it only cover
historical rows written before platform tagging shipped? We show it as a real
bucket with a footnote either way, but the footnote wording depends on the answer.

---

## 7. Presence — confirmation only, no change requested

We understand `presence/` firing when the admin clicks "New Conversation" is
expected: opening the composer joins the presence channel before a thread
exists. Just confirming that's intentional and not a stray call.
