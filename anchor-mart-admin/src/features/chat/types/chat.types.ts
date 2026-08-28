/**
 * Admin chat & support (Flow 23).
 *
 * Two transports, and they split by verb:
 *
 * - **REST** (`/superadmin/chat/…`) reads threads and message history. Exempt
 *   from `ServerSecurityMiddleware`, so no `server-secret-key` header.
 * - **WebSocket** (`ws/chat/?token=`) carries every write — new messages, edits,
 *   deletes, typing and read receipts. There is no admin REST send route.
 *
 * Media upload (§3.6) is deliberately absent: it lives under `/api/chat/`, which
 * *does* require the `server-secret-key` header that this panel has no access
 * to. Admins can read attachments others sent, but cannot post one.
 */

/** Which family of threads a screen is showing. */
export type ChatSource = "support" | "delivery" | "order";

/**
 * Server-side thread categories. `user_support` / `delivery_support` are the
 * shared global inboxes; `order` / `order_delivery` are the per-order threads.
 */
export type ChatCategory = "user_support" | "delivery_support" | "order" | "order_delivery";

/** The two values `?category=` accepts on the order-chat inbox (§4.3). */
export const ORDER_CHAT_CATEGORIES = ["order", "order_delivery"] as const;
export type OrderChatCategory = (typeof ORDER_CHAT_CATEGORIES)[number];

/** The counterparty on an order thread — which side is speaking. */
export type ChatCounterparty = "customer" | "delivery_partner";

/** The thread owner block (§4.1 `owner`). */
export interface ChatOwner {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  profilePicture: string | null;
}

/** The order a thread hangs off (§4.3 `order`). Null on support threads. */
export interface ChatOrderRef {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  /** A count only — the full item list lives on the order-detail screen. */
  itemCount: number;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
}

/** A conversation in the sidebar. */
export interface ChatThread {
  /**
   * Chat ids are **integers** here, not the UUIDs used elsewhere in the admin
   * API — kept as a string for routing/keys, and sent back verbatim as `chat_id`.
   */
  id: string;
  /** Best available display name for the counterparty. */
  name: string;
  email: string | null;
  /** The counterparty's role, when the payload identifies one. */
  role: string | null;
  category: ChatCategory | null;
  owner: ChatOwner | null;
  /**
   * The counterparty's user id, recovered from wherever the row carries it.
   *
   * Separate from `owner.id` because presence depends on it and `owner` is not
   * guaranteed: a row with no resolvable id is never included in a presence
   * request, so it can never show as online — which looks identical to being
   * offline and is why this is surfaced as its own field rather than reached
   * through an optional chain.
   */
  ownerId: string | null;
  /** Preview text for the most recent message. */
  lastMessage: string;
  /** ISO timestamp of the last message. */
  lastMessageAt: string;
  unreadCount: number;
  /** Non-null **exactly on order threads** — that is how a thread is told apart. */
  order: ChatOrderRef | null;
  /** Convenience mirror of `order.orderNumber`, kept for the list rows. */
  orderNumber: string | null;
  /**
   * Which side is speaking, on order threads. Lets an admin label a row without
   * opening it — a sailor and a partner get separate threads on one order.
   */
  counterparty: ChatCounterparty | null;
  /**
   * The owner's presence **at fetch time** — a first-render seed, not a live
   * value (§3.2). It exists so the list paints correctly instead of flashing
   * presence in a moment later; keeping it fresh is the presence poll's job
   * (§4.7), since re-fetching this paginated list would be heavier than the
   * roster call it replaced.
   *
   * Null when the payload omits it. Only the **owner's** presence is ever
   * exposed — an admin's never is.
   */
  ownerIsOnline: boolean | null;
}

/**
 * One message. Mirrors `ChatMessengerDetailSerializer` (§3.5), whose
 * `created_at` is the **raw** `DateTimeField` rather than this project's usual
 * pre-formatted display string.
 */
export interface ChatMessage {
  id: string;
  /** Sender's user id — used to group consecutive messages by author. */
  senderId: string | null;
  senderName: string;
  /** `"text"` | `"image"` | `"file"`. */
  messageType: string;
  content: string;
  /** Absolute media URL for image/file messages, else null. */
  media: string | null;
  isEdited: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  createdAt: string;
  /**
   * True while the socket echo has not yet arrived. Optimistic rows render
   * dimmed so a send that never lands is visible rather than silently lost.
   */
  pending?: boolean;
}

/**
 * Response of `GET …/chat/presence/` (§4.7).
 *
 * `presence` carries an entry for **every** id asked about, so a missing key
 * means the request did not cover that user — not that they are offline.
 * `online` is the convenience subset.
 *
 * ## What "online" actually means here
 *
 * A Redis marker with a **300-second TTL**, refreshed on every socket frame. A
 * clean disconnect clears it immediately; a crashed app, a dropped tunnel or a
 * phone losing signal does not — that marker simply expires on its own. The
 * asymmetry matters:
 *
 * - **`false` is trustworthy** — they are genuinely not connected.
 * - **`true` is up to five minutes stale** — it means "was here recently",
 *   never "is reading this now".
 *
 * So this may inform how a message is written (a quick question to wait on, or
 * one self-contained message). It must never gate a control, support a "they
 * will see this immediately" promise, or imply read state. A typing indicator
 * or a delivered/read tick is a **different mechanism**, not a bolder reading
 * of this one.
 *
 * ## Where it may appear — and where it may not
 *
 * Exactly two places: a thread row, and the open thread's header. In particular
 * it must **never** appear in a person picker or gate the ability to start a
 * conversation. Whether someone happens to have the app open has no bearing on
 * whether they can be messaged — leaving a message for someone who is away is
 * the normal case, not a degraded one, and showing availability at the moment of
 * choosing a recipient invites exactly the wrong inference.
 *
 * This endpoint also cannot populate a picker even if that were wanted: it takes
 * a list of UUIDs you must already hold, and neither lists nor searches users.
 * Recipients come from the sailor and partner list endpoints.
 *
 * Its most valuable use is not in this UI at all — server-side, presence decides
 * whether a push is worth firing: no live socket means send the push, a live one
 * means they already have the message.
 *
 * Only the **owner's** presence is ever exposed — the sailor or partner. Never
 * an admin's, and never another admin's, so the counterparty signal is the only
 * one this panel can show.
 */
export interface ChatPresence {
  /** Ids currently holding a live chat socket. */
  online: string[];
  /** Per-id map, one entry per requested id. */
  presence: Record<string, boolean>;
  /**
   * How long a marker survives without activity. Shown as "as of…" rather than
   * presented as live truth — a dot can be up to this stale.
   */
  ttlSeconds: number;
}

/** Body of `POST …/create-chat-group/` (§4.6). */
export interface CreateChatGroupPayload {
  group_name: string;
  /** User UUIDs. Every id must exist, else 400 listing the unknown ones. */
  participants: string[];
}

/* ────────────────────────────  WebSocket protocol  ──────────────────────────── */

/**
 * Thread addressing on the socket.
 *
 * ⚠️ `"private"` here means the **global support thread**, not a DM — the same
 * word the REST `chat_type` field uses for it.
 */
export type SocketChatType = "private" | "order" | "group";

/**
 * Outbound `msg_type` values — **strings when you send**.
 *
 * The matching inbound events carry an **integer** under the same key. Same
 * name, opposite direction, different type; see {@link InboundMsgType}.
 */
export type OutboundMsgType =
  | "NewMessage"
  | "UserTyping"
  | "UserStoppedTyping"
  | "MessageSeen"
  | "MessageEdited"
  | "MessageDeleted";

/** A frame the client sends. */
export interface OutboundFrame {
  chat_type: SocketChatType;
  msg_type: OutboundMsgType;
  /**
   * Required for `order` and `group`, and for an **admin** on `private` (the
   * chat id or the owner's user id). Only a customer/partner may omit it, since
   * they have exactly one support thread.
   */
  receiver_id?: string | number;
  message?: string;
  message_id?: string | number;
}

/**
 * Inbound `msg_type` values — **integers when you receive**.
 *
 * Switching on the integer rather than the `type` string is what the flow doc
 * prescribes; both are present, and they agree.
 */
export const InboundMsgType = {
  UserWentOnline: 1,
  UserWentOffline: 2,
  UserTyping: 3,
  UserStoppedTyping: 4,
  ChatMessage: 5,
  MessageSeen: 6,
  MessageEdited: 7,
  MessageDeleted: 8,
} as const;

export type InboundMsgTypeValue = (typeof InboundMsgType)[keyof typeof InboundMsgType];

/** A frame the server sends. Fields vary by `type`; all are read defensively. */
export interface InboundFrame {
  type?: string;
  msg_type?: number;
  /** Stringified user UUID, or null for system-originated frames. */
  sender?: string | null;
  sender_name?: string;
  message_id?: string | number;
  chat_id?: string | number;
  chat_type?: string;
  message_type?: string;
  content?: string;
  media?: string | null;
  created_at?: string;
  edited_at?: string;
  /** Present on `auth_error` frames only. */
  code?: string;
  detail?: string;
  /** Present on in-band error frames, which never close the connection. */
  error?: string;
}

/**
 * Why a socket refused or dropped the connection.
 *
 * The server **accepts, sends a frame, then closes**, so the frame carries the
 * real reason and the close code alone does not. `blocked` must never be
 * retried — the account is disabled and reconnecting would spin forever.
 */
export type SocketAuthErrorCode = "missing_token" | "invalid_token" | "token_expired" | "blocked";

/** Connection state surfaced to the UI. */
export type SocketStatus = "idle" | "connecting" | "open" | "closed" | "error";

/* ─────────────────────────────  Unread badge (§9)  ───────────────────────── */

/**
 * `GET …/chat/unread-summary/`.
 *
 * ⚠️ **The admin unread rule is different, and must not be "fixed".** For a
 * sailor or partner, unread means "not sent by me and not yet seen by me". For
 * an admin it means "sent by the thread's **owner** and not yet seen by me" — a
 * colleague's reply is never unread for another admin. The support inbox is
 * shared, so the client rule would light every admin's badge every time any
 * admin answered anyone.
 *
 * `total` and the per-thread `unread_count` use the same rule server-side, so
 * they always agree. If they ever disagree that is a backend bug worth
 * reporting, not something to paper over here.
 */
export interface ChatUnreadSummary {
  /** Unread messages across every thread this admin can reach. */
  total: number;
  /** The dot. Authoritative at launch — nothing else decides it then. */
  hasUnread: boolean;
  /** How many distinct threads carry at least one unread message. */
  threadsWithUnread: number;
  /**
   * Per-category breakdown, used because this panel has **separate** nav icons
   * for support, delivery and order threads. A single-icon app would ignore this
   * and read `total`.
   *
   * Every key is present and zeroed by the mapper, so a category the payload
   * omits reads as "none" rather than `undefined` in arithmetic.
   */
  byCategory: Record<ChatCategory | "group", number>;
}

/* ────────────────────────────  Order context (§5)  ───────────────────────── */

/** Which projection of `order` the caller received. Always `admin` here. */
export type OrderContextAudience = "customer" | "delivery_partner" | "admin";

/**
 * The collapsed header line — **identical for all three apps** (§5.1).
 *
 * `units_*` and `lines_*` are different quantities and the difference matters: a
 * line is a product, a unit is a piece. "31 of 40 delivered" is units. Use the
 * `isFullyDelivered` / `isPartiallyDelivered` booleans rather than comparing the
 * two numbers, which is where this reliably goes wrong.
 */
export interface OrderContextSummary {
  orderId: string;
  orderNumber: string;
  orderType: string;
  /** Raw enum. Never render this — render {@link statusDisplay}. */
  status: string;
  statusDisplay: string;
  /** Distinct products on the order. */
  itemsTotal: number;
  unitsOrdered: number;
  unitsDelivered: number;
  linesDelivered: number;
  linesNotDelivered: number;
  linesPending: number;
  linesAvailable: number;
  linesUnavailable: number;
  linesSubstituted: number;
  isFullyDelivered: boolean;
  isPartiallyDelivered: boolean;
  paymentStatus: string;
  paymentStatusDisplay: string;
  isPaid: boolean;
  /** The exception an admin most needs to lead with — a blocked handover. */
  deliveryOnHold: boolean;
}

/**
 * `GET …/order-chats/<chat_id>/order-context/`.
 *
 * `order` is left as `unknown`: the endpoint returns a different shape per
 * audience, and this panel renders from {@link summary} plus the order screen it
 * links to. Typing a payload we do not read would be inventing a contract.
 */
export interface OrderContext {
  chatId: string;
  audience: OrderContextAudience;
  /** Which side the thread's user is on — sailor or partner. */
  counterparty: ChatCounterparty | null;
  summary: OrderContextSummary;
  order: unknown;
}

/* ──────────────────────  Admin-initiated threads (§8.3)  ─────────────────── */

/** Body of `POST …/support-chats/create/`. */
export interface CreateSupportChatPayload {
  user_id: string;
  /** Optional — an admin may open a thread now and write later. */
  message?: string;
}

/** Body of `POST …/order-chats/create/`. */
export interface CreateOrderChatPayload {
  order_id: string;
  /** Required, and never guessed — the two sides are separate conversations. */
  side: ChatCounterparty;
  /**
   * Only to reach a **previous** delivery partner on a reassigned order; omit it
   * and the current partner is used. Sending it with `side: "customer"` is a 400.
   */
  user_id?: string;
  message?: string;
}

/** What both create endpoints return: the thread to open. */
export interface CreatedChat {
  chatId: string;
  /** True on 201. Not shown to the admin — both outcomes just open the thread. */
  created: boolean;
}

/* ─────────────────────────────  Attachments (§4.4)  ──────────────────────── */

/** Hard server limit. Over this is a **413**, not a validation message. */
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/**
 * What each `message_type` accepts.
 *
 * The server checks the **real bytes**, not the extension or the browser's
 * content type — a renamed file is a 400. These lists drive the file picker's
 * filter and a friendlier pre-flight check; they are a convenience, never the
 * authority.
 */
export const UPLOAD_IMAGE_TYPES = ["png", "jpg", "jpeg", "gif", "webp"] as const;
export const UPLOAD_FILE_TYPES = [...UPLOAD_IMAGE_TYPES, "pdf"] as const;

/** `image` renders inline in the thread; `file` renders as a download row. */
export type UploadMessageType = "image" | "file";

/**
 * Arguments for `POST /api/chat/upload-media/`.
 *
 * Exactly one target: `chatId` for a support thread, `orderId` for an order
 * thread. Sending both would leave the server to pick, and which thread an
 * attachment landed in is not something to leave to chance.
 */
export interface UploadChatMediaArgs {
  file: File;
  messageType: UploadMessageType;
  /** Optional caption sent alongside the file. */
  message?: string;
  /** Support thread — admins only. */
  chatId?: string;
  /** Order thread, addressed by the order rather than the chat. */
  orderId?: string;
}
