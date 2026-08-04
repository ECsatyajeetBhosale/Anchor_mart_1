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
