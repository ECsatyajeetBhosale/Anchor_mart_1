import type { ListResult } from "@/lib/apiResponse";
import type { ChatMessage, InboundFrame } from "../types/chat.types";

/** Builds a `ChatMessage` from an inbound `chat_message` frame (§2.3). */
export function frameToMessage(frame: InboundFrame): ChatMessage {
  return {
    id: String(frame.message_id ?? ""),
    senderId: frame.sender ?? null,
    senderName: frame.sender_name || "Unknown",
    messageType: frame.message_type || "text",
    content: frame.content ?? "",
    media: frame.media ?? null,
    isEdited: false,
    editedAt: null,
    isDeleted: false,
    createdAt: frame.created_at ?? new Date().toISOString(),
  };
}

/**
 * Appends an incoming message to a thread's cache, oldest-last (the order the
 * admin history route returns).
 *
 * Two things it must not do: show the same message twice, and strand the
 * optimistic row the sender already sees. The server echoes a send back to its
 * author, so an unresolved optimistic row with identical text is that echo
 * arriving — it is replaced in place rather than appended beside itself.
 */
export function mergeIncomingMessage(draft: ListResult<ChatMessage>, incoming: ChatMessage): void {
  // Already delivered — a duplicate frame (reconnect replay) must be a no-op.
  if (incoming.id && draft.items.some((m) => m.id === incoming.id)) return;

  const optimistic = draft.items.findIndex((m) => m.pending && m.content === incoming.content);
  if (optimistic !== -1) {
    draft.items[optimistic] = incoming;
    return;
  }

  draft.items.push(incoming);
  draft.count += 1;
}

/** Applies a `message_edited` frame to a cached message. Unknown ids are ignored. */
export function applyEdit(draft: ListResult<ChatMessage>, frame: InboundFrame): void {
  const id = String(frame.message_id ?? "");
  const target = draft.items.find((m) => m.id === id);
  if (!target) return;
  target.content = frame.content ?? target.content;
  target.isEdited = true;
  target.editedAt = frame.edited_at ?? new Date().toISOString();
}

/**
 * Applies a `message_deleted` frame. Deletion is **always soft** server-side, so
 * the row is flagged rather than dropped — removing it would renumber the thread
 * under a reader mid-scroll and hide that a message ever existed.
 */
export function applyDelete(draft: ListResult<ChatMessage>, frame: InboundFrame): void {
  const id = String(frame.message_id ?? "");
  const target = draft.items.find((m) => m.id === id);
  if (!target) return;
  target.isDeleted = true;
}

/** A local, not-yet-acknowledged message. Ids are negative so they can't collide. */
export function optimisticMessage(content: string, senderName: string): ChatMessage {
  return {
    id: `pending-${Date.now()}`,
    senderId: null,
    senderName,
    messageType: "text",
    content,
    media: null,
    isEdited: false,
    editedAt: null,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    pending: true,
  };
}
