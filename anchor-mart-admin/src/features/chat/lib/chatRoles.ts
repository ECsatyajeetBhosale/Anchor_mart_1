import type { BadgeProps } from "@/components/ui/badge";
import type { ChatMessage, ChatThread } from "../types/chat.types";

/**
 * Presentation per counterparty role, matching the AnchorMart-1 chat monitor:
 * partners read teal with a motorbike, sailors purple with an anchor.
 *
 * Kept as data rather than branches in the components so the sidebar row, the
 * thread header and any future surface cannot drift apart on colour.
 */
export type ChatRoleKey = "partner" | "sailor";

export interface ChatRolePresentation {
  key: ChatRoleKey;
  label: string;
  /** `.av-*` modifier for the avatar circle. */
  avatarClass: string;
  badgeVariant: NonNullable<BadgeProps["variant"]>;
}

export const CHAT_ROLES: Record<ChatRoleKey, ChatRolePresentation> = {
  partner: {
    key: "partner",
    label: "Delivery Partner",
    avatarClass: "av-teal",
    badgeVariant: "teal",
  },
  sailor: {
    key: "sailor",
    label: "Sailor",
    avatarClass: "av-purple",
    badgeVariant: "purple",
  },
};

/**
 * Works out whose thread this is.
 *
 * Three fields can answer it depending on which endpoint produced the row —
 * `counterparty` on the order inbox, `role` on the support inboxes, and
 * `category` as the fallback when a payload carries neither. Sailors are the
 * default because the customer support inbox is the busiest surface and a
 * mislabelled partner is more obvious than a mislabelled sailor.
 */
export function resolveChatRole(thread: ChatThread): ChatRolePresentation {
  const signal = (
    thread.counterparty ??
    thread.role ??
    thread.owner?.role ??
    thread.category ??
    ""
  ).toLowerCase();

  if (signal.includes("delivery") || signal.includes("partner")) return CHAT_ROLES.partner;
  return CHAT_ROLES.sailor;
}

/**
 * Whether a message came from the admin side, which is what puts it on the
 * right in navy rather than the left in grey.
 *
 * Decided by elimination against the thread **owner** — the sailor or partner
 * the thread belongs to — because the admin's own user id is not in the auth
 * payload (it carries only email and role). Anyone who is not the owner is
 * support. An optimistic row is by definition ours.
 */
export function isFromAdmin(message: ChatMessage, ownerId: string | null | undefined): boolean {
  if (message.pending) return true;
  // Without both ids the question is unanswerable; rendering it as received is
  // the safe default, since it never puts words in the admin's mouth.
  if (!ownerId || !message.senderId) return false;
  return message.senderId !== ownerId;
}

/**
 * How long after sending a message it stays editable.
 *
 * A transcript is a record of what was said, and silently rewriting an hour-old
 * line changes what the other person is remembered as having replied to. Twenty
 * minutes covers the reason edits exist — a typo or a wrong figure spotted just
 * after sending — without turning history into a draft.
 *
 * ⚠️ Presentational only. The server decides what it will accept; these rules
 * hide controls that would otherwise invite a rejected request.
 */
export const EDIT_WINDOW_MS = 20 * 60 * 1_000;

/**
 * Whether *this* admin wrote the message.
 *
 * Narrower than "the admin side wrote it", and deliberately so: the support and
 * order inboxes are worked by several people, so the right-hand column is "the
 * desk", not "me". An optimistic row is ours by construction; anything else has
 * to match the id the auth payload gave us, and without one the answer is no.
 */
export function isOwnMessage(message: ChatMessage, selfUserId: string | null): boolean {
  if (message.pending) return true;
  if (!selfUserId || !message.senderId) return false;
  return message.senderId === selfUserId;
}

/**
 * Whether the moderation controls belong on this message at all.
 *
 * A deleted message has nothing left to act on, and a pending one has no
 * server-side id yet to act with.
 */
export function canModerateMessage(message: ChatMessage, selfUserId: string | null): boolean {
  return isOwnMessage(message, selfUserId) && !message.isDeleted && !message.pending;
}

/**
 * Whether the message is still inside its edit window.
 *
 * An unparseable `created_at` yields `NaN`, and every comparison against it is
 * false — so a message we cannot date reads as too old to edit, which is the
 * safe direction to fail in.
 */
export function canEditMessage(
  message: ChatMessage,
  selfUserId: string | null,
  now: number,
): boolean {
  if (!canModerateMessage(message, selfUserId)) return false;
  return now < new Date(message.createdAt).getTime() + EDIT_WINDOW_MS;
}
