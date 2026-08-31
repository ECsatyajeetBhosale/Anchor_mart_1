import type {
  ChatCounterparty,
  ChatSource,
  ChatThread,
  OrderChatCategory,
} from "../types/chat.types";

/**
 * Which inbox category holds one side's thread on an order.
 *
 * The two sides are separate conversations that cannot see each other, so this
 * is what keeps "message the sailor" off the partner's thread. Getting it wrong
 * would not error — it would open the wrong person's conversation, which is the
 * worst possible failure for a messaging feature.
 */
export function orderThreadCategory(side: ChatCounterparty): OrderChatCategory {
  return side === "customer" ? "order" : "order_delivery";
}

/** Which support inbox holds one side's global thread. */
export function supportInboxFor(side: ChatCounterparty): ChatSource {
  return side === "customer" ? "support" : "delivery";
}

/**
 * Does this inbox row belong to the given order and, optionally, that partner?
 *
 * `thread.order.id` is the order **UUID**, never the human order number — the
 * two are easy to confuse because the row carries both, and matching on
 * `orderNumber` would work in a demo and fail against the API.
 *
 * `ownerId` narrows the partner side, where one order can hold several
 * `order_delivery` threads — one per partner who has ever held it. Omitted, the
 * first thread on the order wins, which is the current partner's in the
 * overwhelming majority of cases and is what "message the partner" means.
 */
export function matchesOrderThread(thread: ChatThread, orderId: string, ownerId?: string): boolean {
  if (!orderId) return false;
  if (thread.order?.id !== orderId) return false;
  return !ownerId || thread.ownerId === ownerId;
}

/**
 * Is this the support thread belonging to that user?
 *
 * Keyed on `ownerId` — the non-admin side of the thread — because that is the
 * person being asked for. The admin is on every row in the inbox, so matching
 * on anything else would match everything.
 */
export function matchesSupportThread(thread: ChatThread, userId: string): boolean {
  return Boolean(userId) && thread.ownerId === userId;
}
