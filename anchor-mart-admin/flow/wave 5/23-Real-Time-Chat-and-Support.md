# Flow 23 — Real-Time Chat & Support — Complete API Reference


**Wave** 5 (Communications backbone) · **Type** Supporting · **Actors** Customer · Delivery Partner · Admin · Super Admin
**Platforms** WS · SAILOR · PARTNER · ADMIN · SYS · **Apps** `Chat`, `admin_panel`, `notifications`
**Models** `Chat`, `Messenger`, `Order`, `Notification`
**Surface** 12 REST endpoints + 1 WebSocket (6 inbound frame types, 8 outbound event types)
**Related flows** 21 (inbox — the offline fallback) · 26 (media) · 27 (admin order ownership)


> **A frontend must be able to build every chat screen from this document alone** — no reading code, no Postman. Every endpoint below lists its inputs, filters, pagination and response shape; the WebSocket is documented one entry per frame in each direction.


---


# 1. The two kinds of chat — read this first


Everything else follows from this distinction.


| | **Global chat** (support) | **Order-wise chat** |
|---|---|---|
| **Question it answers** | "I have a general query" | "I have a query **about this specific order/delivery**" |
| `category` | `user_support` (customer) · `delivery_support` (partner) | `order` (sailor) · `order_delivery` (partner) |
| `order` field | **`NULL`** — this is what makes it global | the order's UUID |
| **How many** | exactly **one per user**, forever | **one per (user, order)** |
| **Admin side** | the **entire admin team** — a shared inbox, any admin can reply | **only** the order's `assigned_admin` **+ every** `super_admin` |
| **Created** | automatically on first access | explicitly, by the user asking about that order |
| **Socket `chat_type`** | `"private"` | `"order"` |
| **REST list** | `GET /api/chat/my-chats/` | `GET /api/chat/order-chats/` |
| **Admin list** | `…/chat/user-chats/` · `…/chat/delivery-chats/` | `…/chat/order-chats/` |
| **Why it exists** | a general channel, and the fallback when the order's admin is offline | so the admin knows *which order and which items* the query is about without asking |


### Four order-thread facts that surprise people


1. **A sailor and a partner get SEPARATE threads on the same order.** Two rows, two categories. The sailor never reads the partner's thread and vice versa (`403` both ways). The order's admin sees both and can tell which side is speaking from `counterparty`.
2. **An order thread is NOT the shared admin inbox.** An unrelated sub-admin cannot see it — not over REST, not over the socket. This is the single most important invariant in the flow.
3. **Access is computed live** from `order.assigned_admin`, never stored. Claim or reassign an order and the new admin inherits the whole conversation with nothing to migrate; the previous admin loses it immediately.
4. **An unclaimed order still opens a thread.** The user is never blocked. Until someone claims the order only super_admins can see it.


### Who may open an order thread


| Caller | Rule | Resulting `category` |
|---|---|---|
| Sailor | `order.user == caller` | `order` |
| Delivery partner | **has ever held an assignment** on that order | `order_delivery` |
| Admin / super_admin | **cannot open one** — there is nothing to say until the other side asks | — |


> **"Has ever held", not "is currently assigned" — deliberately.** A reassignment is often a problem being escalated, and the partner who was pulled off is exactly who knows what happened on the ground. This is intentionally *not* symmetric with the customer side's follow-the-current-owner rule: an admin handoff is routine, a partner handoff usually is not.


**A direct customer ↔ delivery-partner conversation is impossible by design.** Every thread has admins on one side.


---


# 2. WebSocket API


## 2.1 Connecting


```
ws://<host>/ws/chat/?token=<auth-token>
```


**Authentication — token only. No `server-secret-key` header is required or accepted on the socket.** The token is read in this order:


1. **Query string** `?token=<key>` — the only option a browser can set.
2. **`Authorization` header** — for native/mobile clients.


Both tolerate `"<key>"`, `"Token <key>"` and `"Bearer <key>"`. Non-admin tokens expire after `TOKEN_EXPIRY_DAYS` (default 30); `admin` and `super_admin` tokens do not expire, by design.


### Rejected connections


A failed connection is **accepted, sent a structured error, then closed** — so the client can tell *why* rather than seeing a bare drop. Read the frame before reacting to the close code.


```json
{"type": "auth_error", "code": "token_expired", "detail": "Authentication token has expired. Please log in again."}
```


| `code` | Close code | Meaning | Client action |
|---|---|---|---|
| `missing_token` | 4001 | No token supplied | Attach a token |
| `invalid_token` | 4001 | Token not recognised | Re-authenticate |
| `token_expired` | 4003 | Past its TTL | Refresh, reconnect |
| `blocked` | 4403 | **Account is blocked** | Do not retry; show support contact |


## 2.2 Sending — inbound frames


**Every inbound frame is a JSON object with this envelope:**


| Field | Type | Required | Values |
|---|---|---|---|
| `chat_type` | string | **Yes** | `"private"` (global) · `"order"` · `"group"` |
| `receiver_id` | string / int | conditional | see the resolution table below |
| `msg_type` | **string** | **Yes** | `NewMessage` · `UserTyping` · `UserStoppedTyping` · `MessageSeen` · `MessageEdited` · `MessageDeleted` |


> ⚠️ **`msg_type` is a STRING when you send and an INTEGER when you receive.** Inbound `"msg_type": "NewMessage"`; the matching outbound event carries `"msg_type": 5`. Same key, different type, opposite directions — see §2.3.


### How `receiver_id` resolves — the part clients get wrong


| `chat_type` | Caller | `receiver_id` |
|---|---|---|
| `private` (global) | customer / partner | **omit it** — always your own single support thread |
| `private` (global) | admin | **required** — the chat id (int) **or** the owner's user id (UUID) |
| `order` | sailor | **required** — the **order UUID** (creates the thread on first use) or the chat id (int) |
| `order` | delivery partner | **required** — same; creates *their* thread on first use |
| `order` | admin / super_admin | **required** — the order UUID resolves the **sailor's** thread; use the **chat id** to reach the partner's |
| `group` | anyone | **required** — the group chat id (int) |


> An order UUID is ambiguous now that an order carries two threads, so it resolves to the sailor's — the historical meaning. Every order-chat list row carries the `id` you need for the partner's.


### The six frames


**1 · `NewMessage`** — send text. Images/files go over REST (§3.4), which broadcasts them identically.


```json
{"chat_type": "order", "receiver_id": "3f2a…", "msg_type": "NewMessage", "message": "the crate arrived crushed"}
```
`message` — non-blank string, **required**. Broadcasts `chat_message` to the thread.


**2 · `UserTyping`** · **3 · `UserStoppedTyping`** — no extra fields.
```json
{"chat_type": "private", "msg_type": "UserTyping"}
```
Broadcast to the thread but **never echoed to the sender**.


**4 · `MessageSeen`** — marks the whole thread read for you.
```json
{"chat_type": "order", "receiver_id": 42, "msg_type": "MessageSeen"}
```
Optional `message_id` is used only as a fallback label when the thread has no messages.


**5 · `MessageEdited`**
```json
{"chat_type": "private", "msg_type": "MessageEdited", "message_id": 88, "message": "corrected text"}
```


**6 · `MessageDeleted`** — **always a soft delete.**
```json
{"chat_type": "private", "msg_type": "MessageDeleted", "message_id": 88}
```


> **Edit/delete permissions.** The **author** may edit or delete their own message. An **admin** may moderate any message *in a thread they can already access*. A `message_id` outside the resolved thread returns *not found*, never a permission error — so an id cannot be used to probe another thread.


## 2.3 Receiving — outbound events


Every outbound event carries `type` (string), `msg_type` (**integer**) and `sender` (**stringified** user UUID, or `null`).


| `type` | `msg_type` | Fired when |
|---|---|---|
| `chat_message` | **5** | a text message or a REST media upload lands |
| `user_typing` | **3** | someone starts typing (not echoed to them) |
| `user_stopped_typing` | **4** | someone stops |
| `message_seen` | **6** | someone read the thread |
| `message_edited` | **7** | a message was edited |
| `message_deleted` | **8** | a message was soft-deleted |
| `user_went_online` | **1** | a user connected — see the scope note |
| `user_went_offline` | **2** | a user disconnected |


### Exact payloads


**`chat_message`** — `media` is `null` for text and an absolute URL for an upload.
```json
{
 "type": "chat_message", "msg_type": 5,
 "sender": "9c1e…", "sender_name": "R. Mehta",
 "message_id": "88", "chat_id": 42, "chat_type": "private",
 "message_type": "text", "content": "the crate arrived crushed",
 "media": null, "created_at": "2026-08-02T09:14:22.113847+00:00"
}
```


**`user_typing` / `user_stopped_typing`**
```json
{"type": "user_typing", "msg_type": 3, "sender": "9c1e…", "chat_id": 42}
```


**`message_seen`**
```json
{"type": "message_seen", "msg_type": 6, "sender": "9c1e…", "chat_id": 42, "message_id": "88"}
```


**`message_edited`**
```json
{"type": "message_edited", "msg_type": 7, "sender": "9c1e…", "chat_id": 42,
"message_id": "88", "content": "corrected text", "edited_at": "2026-08-02T09:20:01+00:00"}
```


**`message_deleted`**
```json
{"type": "message_deleted", "msg_type": 8, "sender": "9c1e…", "chat_id": 42, "message_id": "88"}
```


**`user_went_online` / `user_went_offline`**
```json
{"type": "user_went_online", "msg_type": 1, "sender": "9c1e…"}
```


> **Presence scope.** *Every* connecting user is announced to the whole **admin team**; an **admin** connecting is additionally announced to **delivery partners** (so they know support is available). **Customers are never told about anyone's presence.** Presence frames carry no `chat_id` — they are about the user, not a thread.


## 2.4 Error frames


Errors arrive on **your own socket only**, never broadcast, and never close the connection:


```json
{"error": "Message text is required."}
```


`Expected a text JSON message.` · `Invalid JSON payload.` · `Payload must be a JSON object.` · `Chat type must be 'private', 'group' or 'order'.` · `Message text is required.` · `Order id or chat id is required.` · `Receiver ID is required.` · `Chat id is required.` · `Group not found.` · `Support thread not found.` · `You cannot start a support chat.` · `Order not found.` · `You do not have access to this order chat.` · `This is not an order chat.` · `Message not found or not editable.` · `Message not found or not deletable.` · `Unknown msg_type: <value>`


## 2.5 Which sockets receive what


| Thread | Delivered to |
|---|---|
| Global support | the owner **+ every connected admin** |
| **Order thread** | the owner **+ the order's `assigned_admin` + every `super_admin`** — **never** the whole admin team |
| Group | every participant |


**If the recipient has no live socket**, the message falls back to an in-app notification (Flow 21, `Notification.Type.ORDER_CHAT`, targeted at the **Order**). Presence has a 300 s TTL refreshed on activity, and **fails open** — if the presence store is unreachable we notify rather than risk silence.


---


# 3. REST API — Customer & Delivery Partner


Base `/api/chat/` · `IsAuthenticated` · **all require the `server-secret-key` header.**
All lists paginate with `page` / `page_size` (default **10**, max **100**).


## 3.1 `GET /api/chat/my-chats/` — my whole inbox


The caller's global support thread (**created on first access**, so a new user always has a room) plus any group chats. Newest activity first.


**Query params:** `page`, `page_size`. No filters, no search.


**Response `200`**
```json
{
 "count": 2, "next": null, "previous": null,
 "results": [{
   "id": 42, "chat_type": "private", "category": "user_support",
   "name": "Support", "group_name": null, "order": null,
   "last_message": {"id": 88, "content": "…", "message_type": "text", "media": null,
                    "sender": "9c1e…", "is_deleted": false, "created_at": "…"},
   "last_message_at": "2026-08-02T09:14:22Z", "unread_count": 3,
   "created_at": "2026-08-01T10:00:00Z"
 }]
}
```
`name` is `"Support"` for the global thread, `"Order <number>"` for an order thread, the group name for a group. `order` is non-null **exactly on order threads** — that is how the app tells them apart. `unread_count` = messages not sent by you and not yet seen by you.


**`403`** for an admin caller — `{"error": "Admins should use the support-inbox endpoints."}`


## 3.2 `GET /api/chat/order-chats/` — order-wise chat list *(every role)*


Only order threads. Distinct from §3.1, which mixes in the support thread and groups.


| Caller | Sees |
|---|---|
| Sailor | their own order threads |
| Delivery partner | threads for deliveries they hold **or have held** |
| Admin | order threads on orders they own |
| Super admin | **all** order threads, including on unclaimed orders |


**Query params**


| Param | Type | Allowed | Notes |
|---|---|---|---|
| `category` | string | `order` · `order_delivery` | anything else → **`400`** |
| `page` / `page_size` | int | — | default 10, max 100 |


No search.


**Response `200`**
```json
{
 "count": 2, "next": null, "previous": null,
 "results": [{
   "id": 42, "chat_type": "private", "category": "order_delivery",
   "counterparty": "delivery_partner",
   "owner": {"id": "9c1e…", "name": "R. Mehta", "role": "delivery_partner"},
   "order": {
     "id": "3f2a…", "order_number": "AM-100234", "status": "partner_assigned",
     "item_count": 7,
     "assigned_admin": {"id": "0b7d…", "name": "Ops Desk"}
   },
   "last_message": {"id": 88, "content": "crate looks crushed", "message_type": "text",
                    "media": null, "sender": "9c1e…", "is_deleted": false, "created_at": "…"},
   "last_message_at": "2026-08-02T09:14:22Z", "unread_count": 3,
   "created_at": "2026-08-02T08:55:10Z"
 }]
}
```
`counterparty` (`customer` | `delivery_partner`) tells an admin **which side is speaking** without opening the thread. `order.item_count` is a **count only** — the full item list is on the order-detail screen.


## 3.3 `GET /api/chat/order-chats/<chat_id>/` — one order thread *(every role)*


The **thread** — who, which order, unread count. Its **messages** come from §3.5.


**Path param:** `chat_id` (integer). **No query params, no body.**
**Response `200`:** one object, identical shape to a §3.2 row.


| Status | When |
|---|---|
| `404` | unknown id, **or a global support thread** — this endpoint is order threads only |
| `403` | a real order thread you may not see |


Also mounted at `GET /api/superadmin/chat/order-chats/<chat_id>/` (§4.4) — same view, same rule.


## 3.4 `POST /api/chat/order-chat/create/` — open an order thread


**Idempotent: `201` first time, `200` thereafter.** Call it whenever the user taps "Ask about this order" / "Ask about this delivery" without tracking whether a thread exists.


**Body:** `order_id` (**required**, UUID).
**Response:** one row in the §3.1 shape.


| Status | When |
|---|---|
| `201` / `200` | created / already existed |
| `400` | `order_id` missing |
| `404` | unknown, soft-deleted, or an order you have no claim on — **404 not 403, so another user's order id is never confirmed** |
| `403` | your role may not own a support thread |


## 3.5 `GET /api/chat/chat-messenger-detail/` — a thread's messages


**Query params:** `chat_id` (**required**, integer), `page`, `page_size`. Newest first.


**Access:** an **order thread** applies the order rule (owner · assigned admin · super_admin); a **global thread** allows the owner, any participant, or **any admin**.


**Response `200`** — paginated:
```json
{"id": 88, "chat": 42, "sender": "9c1e…", "sender_name": "R. Mehta",
"message_type": "text", "content": "…", "media": null,
"is_edited": false, "edited_at": null, "is_deleted": false,
"seen_by": ["0b7d…"], "created_at": "2026-08-02T09:14:22Z"}
```


**Errors:** `400` missing or non-integer `chat_id` · `404` unknown chat · `403` no access.


## 3.6 `POST /api/chat/upload-media/` — attach an image or file


`multipart/form-data`. Stores the file, creates the message, and **broadcasts it on the socket** as a `chat_message` event exactly like text.


| Field | Required | Notes |
|---|---|---|
| `file` | **Yes** | validated — see below |
| `message_type` | No | `image` (default) or `file` |
| `message` | No | caption |
| `order_id` / `order_chat_id` | No | target an order thread; **without it you get your global thread** |
| `chat_id` | admin only | the global thread to reply to |


**Response `201`** — the message in the §3.5 shape, with an absolute `media` URL.


### File validation


> This is the **only endpoint in the codebase that accepts a real file upload** — everywhere else the client uploads via presigned URL and submits a path string. The bytes are validated here.


| Rule | Behaviour |
|---|---|
| **Size** | max **10 MB** → **`413`** |
| **Extension** | `image`: `.png .jpg .jpeg .gif .webp` · `file`: those **+ `.pdf`** → `400` |
| **Contents** | magic bytes must match the extension → `400`. **The declared `Content-Type` is never trusted alone** — it is client-supplied |
| **Empty file** | `400` |
| **Stored filename** | **regenerated** as UUID + validated extension; the client's filename is never stored |


Renaming a payload does not get it through — HTML called `x.png` fails the content check.


---


# 4. REST API — Admin


Base `/api/superadmin/chat/` · `IsAuthenticated` + `IsAdminUser` (role `admin` or `super_admin`).
**Exempt from `ServerSecurityMiddleware` — no `server-secret-key` header needed.**
All lists paginate with `page` / `page_size` (default **10**, max **100**).


## 4.1 `GET …/user-chats/` — customer support inbox *(shared)*
## 4.2 `GET …/delivery-chats/` — delivery-partner support inbox *(shared)*


Both are **shared inboxes**: every admin sees every thread in that category. Newest activity first.


**Query params:** `page`, `page_size` only. No filters, no search.


**Response `200`**
```json
{"count": 12, "next": "…", "previous": null,
"results": [{
  "id": 42, "category": "user_support",
  "owner": {"id": "9c1e…", "name": "A. Sailor", "email": "a@x.io",
            "role": "customer", "profile_picture": "https://…/media/…jpg"},
  "last_message": {"id": 88, "content": "…", "message_type": "text", "media": null,
                   "sender": "9c1e…", "is_deleted": false, "created_at": "…"},
  "last_message_at": "2026-08-02T09:14:22Z",
  "unread_count": 2,
  "created_at": "2026-08-01T10:00:00Z"
}]}
```
Here `unread_count` = messages **from the owner** this admin has not seen.


## 4.3 `GET …/order-chats/` — order-chat inbox *(NOT shared)*


**A sub_admin sees only threads on orders they own; a super_admin sees all**, including on still-unclaimed orders nobody else can see yet. Covers **both** sides — the sailor's threads and the partners'.


**Query params:** `category` (`order` | `order_delivery`; anything else → **`400`**), `page`, `page_size`.


**Response `200`** — the §4.1 row **plus** `order` and `counterparty`:
```json
{"id": 42, "category": "order_delivery", "counterparty": "delivery_partner",
"owner": {"id": "9c1e…", "name": "R. Mehta", "email": "r@x.io",
          "role": "delivery_partner", "profile_picture": null},
"order": {"id": "3f2a…", "order_number": "AM-100234", "status": "partner_assigned",
          "item_count": 7, "assigned_admin": {"id": "0b7d…", "name": "Ops Desk"}},
"last_message": {...}, "last_message_at": "…", "unread_count": 2, "created_at": "…"}
```


## 4.4 `GET …/order-chats/<chat_id>/` — one order thread


The **same view and access rule** as §3.3, mounted here so the admin panel can call it without the `server-secret-key` header. Path param `chat_id` (integer); no query params or body. `200` / `403` / `404` as §3.3.


## 4.5 `GET …/chat-messenger-detail/` — a thread's messages *(admin)*


**Query params:** `chat_id` (**required**, integer), `page`, `page_size`. **Oldest first** — note this is the opposite order to §3.5.


Any admin may read a **support** thread; an **order** thread is readable only by the order's admin and super_admins. Response shape as §3.5. Errors `400` / `403` / `404` as §3.5.


## 4.6 `POST …/create-chat-group/` — create a group chat


**Body**


| Field | Type | Required | Rules |
|---|---|---|---|
| `group_name` | string | **Yes** | — |
| `participants` | array of UUID | **Yes** | every id must exist, else `400` listing the unknown ones |


The creating admin becomes `group_admin` and is added as a participant automatically.


**`201`** `{"message": "Group chat created successfully."}` · **`400`** `{"message": {<field errors>}}`


---


# 5. Configuration


| Setting | Default | Effect |
|---|---|---|
| `TOKEN_EXPIRY_DAYS` | `30` | Socket + REST token TTL. `admin`/`super_admin` tokens never expire |
| `ONLINE_TTL_SECONDS` (`Chat/presence.py`) | `300` | Presence marker lifetime without a frame |
| Channel layer | Redis | **Must be shared across workers**, or presence and routing break |


---


# 6. Frontend checklist


- [ ] Connect with `?token=`; read the `auth_error` **frame** before reacting to the close code.
- [ ] Send `msg_type` as a **string**; switch on the **integer** `msg_type` when receiving (§2.2/§2.3).
- [ ] Omit `receiver_id` for a customer/partner global message; **always** send it for order and group.
- [ ] Treat `order != null` (§3.1) or the `order-chats` endpoints as "this is an order thread".
- [ ] Use `counterparty` to label who is speaking in an admin order inbox.
- [ ] Upload images over REST (§3.6), not the socket — the server broadcasts them for you.
- [ ] Handle `413` on upload, not just `400`.
- [ ] Expect `chat-messenger-detail` newest-first on the customer route and **oldest-first** on the admin route.



