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
