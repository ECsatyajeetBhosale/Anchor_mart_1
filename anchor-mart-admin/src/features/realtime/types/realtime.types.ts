/**
 * Wire types for the realtime badge socket (`ws/events/`).
 *
 * **The socket sends counters. It never sends data.** Every frame carries the
 * complete set of counts plus the name of the queue that moved; the rows
 * themselves come from the REST endpoints the screens already call. Access rules
 * — who may see which order, `assigned_admin` scoping, sub-admin vs super-admin —
 * live in the REST serializers and are never restated here.
 */

/** Connection state surfaced to the UI. Mirrors the chat socket's. */
export type SocketStatus = "idle" | "connecting" | "open" | "closed" | "error";

/**
 * The seven counters, always sent together and always absolute.
 *
 * Definitions are the dashboard's own — the backend imports them from the card
 * queries rather than re-deriving them, so a badge cannot disagree with the
 * screen it links to. `orders + express_orders` is the dashboard's single
 * `in_progress` card; the badge splits them because the panel has two screens.
 */
export interface BadgeCounts {
  /** Open intent funnel, non-express, not soft-deleted. Excludes rejected. */
  intents: number;
  /** Paid, non-express, in-progress (partner assigned → at berth). */
  orders: number;
  /** The same in-progress statuses, express only. */
  express_orders: number;
  /** Special requests in `pending`. */
  special_requests: number;
  /** Seller profiles in `pending`, not soft-deleted. */
  seller_requests: number;
  /** Orders in `verification_submitted`, awaiting admin review. */
  verifications: number;
  /** Orders in `delivery_failed` — exception state needing intervention. */
  delivery_failed: number;
}

/** A queue with a badge and a screen behind it. */
export type BadgeQueue = keyof BadgeCounts;

/**
 * The five queues that can be scoped to the signed-in admin.
 *
 * Only `Order` carries an `assigned_admin` field. `SpecialRequest` and
 * `SellerProfile` have no owner concept at all, so "mine" is not merely absent
 * for them — it is unanswerable. A sidebar-wide "show only mine" toggle would
 * therefore be lying about two of its seven entries, which is why this is a
 * separate, narrower type rather than `Partial<BadgeCounts>`: the two that
 * cannot be scoped are excluded by the type, not by a runtime check someone
 * could forget.
 */
export type OwnedBadgeQueue = Extract<
  BadgeQueue,
  "intents" | "orders" | "express_orders" | "verifications" | "delivery_failed"
>;

/**
 * Counts scoped to the signed-in admin, sent **alongside** `counts`, never
 * instead of it. Absent on older servers, so always treat it as optional.
 */
export type MineCounts = Record<OwnedBadgeQueue, number>;

/**
 * `changed` names the queue that moved — or marks the frame as a snapshot.
 *
 * `connect` and `sync` are **not** queues: they are the full-state pushes the
 * server sends on connection and on request, and they mean "set the numbers,
 * refetch nothing".
 */
export type BadgeChanged = BadgeQueue | "connect" | "sync";

/**
 * Terminal auth failures. The connection is closing when one of these arrives,
 * and reconnecting with the same token can never succeed.
 *
 * Wider than the chat socket's set: `token_expired` closes with 4003 rather than
 * 4001, and `no_badge_scope` means the account type has no badges at all
 * (customer/seller) — retrying either is an infinite loop against a dead token.
 */
export type EventsAuthErrorCode =
  | "missing_token"
  | "invalid_token"
  | "token_expired"
  | "blocked"
  | "no_badge_scope";

/** In-band, non-fatal refusals of our last message. The connection stays up. */
export type EventsErrorCode = "rate_limited" | "unknown_type";

/** The only frame that matters. */
export interface BadgeFrame {
  type: "badge";
  scope: string;
  changed: BadgeChanged;
  /**
   * The object that caused the frame, or null.
   *
   * **Advisory only.** Useful for deep-linking; never assume we may read it. A
   * detail call that 403s or 404s on this id is correct behaviour, not a bug —
   * the list refetch is the source of truth.
   */
  id: string | null;
  /** Always all seven keys, always absolute. Never a delta. */
  counts: BadgeCounts;
  /**
   * The same numbers narrowed to this admin's own work.
   *
   * The contract guarantees this on **every admin frame** — an admin who owns
   * nothing gets five zeroes, never a missing object — and ships it alongside
   * `counts` rather than instead of it, so a "mine" toggle needs no refetch.
   * Optional here only as insurance against a server predating the field; an
   * absent object must never be read as "nothing is mine".
   *
   * Five keys, not seven, and {@link MineCounts} enforces that: `special_requests`
   * and `seller_requests` have no owner column, so they are **unanswerable**
   * rather than zero. Anything building a "mine" view must fall those two back
   * to the shared count or hide them — showing a synthesised `0` would state
   * that you own none of them, when the truth is that nobody can.
   */
  mine?: MineCounts;
  /** ISO-8601 server timestamp. */
  at: string;
}

/** Sent just before the connection closes. `forbidden` behaves identically. */
export interface EventsAuthErrorFrame {
  type: "auth_error" | "forbidden";
  code?: EventsAuthErrorCode | string;
  detail?: string;
}

/** Our last message was refused; the connection is unaffected. */
export interface EventsErrorFrame {
  type: "error";
  code?: EventsErrorCode | string;
  detail?: string;
}

export type EventsInboundFrame = BadgeFrame | EventsAuthErrorFrame | EventsErrorFrame;

/** The only message the server accepts. Rate-limited to one per 5 seconds. */
export interface EventsSyncFrame {
  type: "sync";
}

/** Zeroed counts, for the pre-connection state. */
export const EMPTY_BADGE_COUNTS: BadgeCounts = {
  intents: 0,
  orders: 0,
  express_orders: 0,
  special_requests: 0,
  seller_requests: 0,
  verifications: 0,
  delivery_failed: 0,
};

/** Do two count sets carry the same seven numbers? */
export function sameCounts(a: BadgeCounts | null, b: BadgeCounts | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  for (const key of Object.keys(EMPTY_BADGE_COUNTS) as BadgeQueue[]) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/** Is this `changed` value a real queue rather than a snapshot marker? */
export function isBadgeQueue(changed: string): changed is BadgeQueue {
  return changed !== "connect" && changed !== "sync" && changed in EMPTY_BADGE_COUNTS;
}
