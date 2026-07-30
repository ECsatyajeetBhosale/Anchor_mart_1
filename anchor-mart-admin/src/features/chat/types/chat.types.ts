/**
 * Admin chat monitor — read-only visibility into the two thread families.
 *
 * There is **no admin send endpoint**: messages are written over the chat
 * websocket (`ws/chat/`) and attachments through `POST /api/chat/upload-media/`.
 * The admin REST surface is three GETs, so this feature reads and never writes.
 *
 * Neither list endpoint has a published schema, so both row types treat every
 * field beyond `id` as optional and are parsed defensively.
 */

/** Which family of threads a screen is showing. */
export type ChatSource = "support" | "delivery";

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
  /** Preview text for the most recent message. */
  lastMessage: string;
  /** Pre-formatted or ISO timestamp of the last message, whichever the API sent. */
  lastMessageAt: string;
  unreadCount: number;
  /** Present on order/delivery threads; absent on support threads. */
  orderNumber: string | null;
}

/**
 * One message. Mirrors `ChatMessengerDetailSerializer` (Flow 26 API 2), whose
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
  isDeleted: boolean;
  createdAt: string;
}
