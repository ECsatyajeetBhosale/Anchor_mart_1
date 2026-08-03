import type { BadgeProps } from "@/components/ui/badge";

/**
 * Flow 22 §3.1–3.2 — the outbound message ledger.
 *
 * Read-only. This answers *"did the sailor actually get the payment link?"*, and
 * nothing more: the API deliberately withholds `context` and `body` (they carry
 * rendered names, amounts, links and — for an account-created email — a
 * generated password), so there is no message reader here by design.
 */

export type OutboundMessageBadgeVariant = NonNullable<BadgeProps["variant"]>;

/** The two transports currently in service. WhatsApp goes out via Twilio. */
export const MESSAGE_CHANNELS = ["email", "whatsapp"] as const;

export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

/**
 * Delivery states, in lifecycle order. `read` is WhatsApp-only; email stops at
 * `delivered`. `failed` is terminal and carries an `error`.
 */
export const MESSAGE_STATUSES = [
  "queued",
  "sending",
  "sent",
  "delivered",
  "read",
  "failed",
] as const;

export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

/** Raw ledger row from `GET /superadmin/messages/`. */
export interface OutboundMessageApi {
  id: string;
  channel?: string | null;
  channel_display?: string | null;
  status?: string | null;
  status_display?: string | null;
  /** The linked account's UUID. */
  user?: string | null;
  user_email?: string | null;
  /** Email address or E.164 phone number, depending on the channel. */
  recipient?: string | null;
  /** Subject line (email only — blank for WhatsApp). */
  subject?: string | null;
  template?: string | null;
  /** The outbox event that produced this message. */
  event_id?: string | null;
  event_type?: string | null;
  provider?: string | null;
  provider_message_id?: string | null;
  /** Populated on a failure; blank otherwise. */
  error?: string | null;
  attempts?: number | null;
  /** Pre-formatted display strings ("02 Aug 2026, 09:14 AM"), not ISO. */
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  failed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Flat UI row the ledger table renders. */
export interface OutboundMessage {
  id: string;
  channel: string;
  channelLabel: string;
  channelVariant: OutboundMessageBadgeVariant;
  status: string;
  statusLabel: string;
  statusVariant: OutboundMessageBadgeVariant;
  userId: string;
  userEmail: string;
  recipient: string;
  subject: string;
  template: string;
  eventId: string;
  eventType: string;
  provider: string;
  providerMessageId: string;
  error: string;
  attempts: number;
  sentAt: string;
  deliveredAt: string;
  readAt: string;
  failedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Query params for the ledger.
 *
 * There is **no general `?search=`** — `recipient` is the only partial-match
 * field (case-insensitive `icontains`); every other filter is exact, and an
 * unknown value is a 400 rather than a silently empty page.
 */
export interface GetOutboundMessagesParams {
  page?: number;
  limit?: number;
  channel?: string;
  status?: string;
  /** Partial match on the address/number — the closest thing to a search. */
  recipient?: string;
  /** Exact match (e.g. `payment_received`, `order_delivered`, `broadcast`). */
  eventType?: string;
  userId?: string;
  /** `created_at` or `-created_at`. Defaults to `-created_at` server-side. */
  ordering?: string;
}

export interface OutboundMessageListResult {
  count: number;
  messages: OutboundMessage[];
}
