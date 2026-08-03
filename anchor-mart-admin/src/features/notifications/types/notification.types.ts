/**
 * Admin notification console.
 *
 * Distinct from the per-user inbox at `/api/notifications/` (Flow 21) — these
 * endpoints *compose and fan out* messages rather than read them.
 */

/**
 * The four types the role-based sender accepts. This is a narrower set than
 * `Notification.Type` (which also carries event types like `order_assigned`,
 * `back_in_stock`, `order_chat`, …): those are raised by business flows, never
 * hand-authored, so the console only offers the four an admin may originate.
 */
export const NOTIFICATION_TYPES = ["order_update", "payment", "promo", "system"] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** The recipient roles a notification can be addressed to (`User.Role`). */
export const NOTIFICATION_ROLES = [
  "customer",
  "delivery_partner",
  "seller",
  "admin",
  "super_admin",
] as const;

export type NotificationRole = (typeof NOTIFICATION_ROLES)[number];

/**
 * Per-type delivery facts the admin needs before sending. Both come from the
 * Flow 21 dispatcher rules, not from the API.
 */
export interface NotificationTypeTraits {
  /** `system` is inbox-only — every other type also pushes over FCM. */
  pushes: boolean;
  /**
   * `promo` is **promotional**: it honours the per-channel toggles *and* the
   * `promotions` mute, and §4.4 keeps it out of the curated inbox feed. The
   * other three are transactional and always reach the user.
   */
  promotional: boolean;
}

export const NOTIFICATION_TYPE_TRAITS: Record<NotificationType, NotificationTypeTraits> = {
  order_update: { pushes: true, promotional: false },
  payment: { pushes: true, promotional: false },
  promo: { pushes: true, promotional: true },
  system: { pushes: false, promotional: false },
};

/** One role's reach for a given notification type. */
export interface RecipientBucket {
  role: string;
  count: number;
}

/** Normalised `GET /superadmin/notifications/recipient-summary/`. */
export interface RecipientSummary {
  /** The type the summary was computed for, echoed back when the API supplies it. */
  type: string | null;
  buckets: RecipientBucket[];
  /** Sum across buckets, or the API's own total when it provides one. */
  total: number;
}

/** Body of `POST /superadmin/notifications/send-rolebased-notification/`. */
export interface SendRoleNotificationPayload {
  role: NotificationRole;
  notification_type: NotificationType;
  title: string;
  message: string;
  /** Free-form extras carried into the FCM payload. Sent as `{}` when unused. */
  metadata: Record<string, unknown>;
}

/**
 * Consent category for a broadcast — **the legal line, not a label**.
 *
 * `promotional` honours every per-channel opt-out and carries a one-click
 * unsubscribe. `service` reaches everyone *including people who opted out*, and
 * is reserved for genuine operational notices; because it overrides consent,
 * the send records `created_by` and shows up attributed in History.
 */
export const BROADCAST_CATEGORIES = ["promotional", "service"] as const;

export type BroadcastCategory = (typeof BROADCAST_CATEGORIES)[number];

/**
 * Channels a broadcast can go out on. `whatsapp` is deliberately absent — the
 * API does not offer it yet, and sending it would be a 400.
 */
export const BROADCAST_CHANNELS = ["inapp", "email"] as const;

export type BroadcastChannel = (typeof BROADCAST_CHANNELS)[number];

/** A broadcast may target one role or literally everyone. */
export type BroadcastAudience = NotificationRole | "all";

/**
 * Body of `POST /superadmin/notifications/send-broadcast-notification/`.
 *
 * `category` is **required** — the API 400s without it. `channels` defaults to
 * `["inapp"]` and must not be empty; `audience` defaults to `"customer"`, which
 * is why this console always sends both explicitly rather than relying on a
 * default an admin can't see.
 *
 * `image_path` is a stored path under `notification_images/`. That directory is
 * **not** in the presigned minter's allow-list, so it can only be pasted, not
 * uploaded from here.
 */
export interface SendBroadcastPayload {
  title: string;
  message: string;
  category: BroadcastCategory;
  channels: BroadcastChannel[];
  audience: BroadcastAudience;
  image_path?: string;
}

/**
 * Normalised outcome of either send endpoint.
 *
 * Both return **`202` when the campaign is queued** and **`200` when it is
 * suppressed as a duplicate** — so success/failure of the request says nothing
 * about whether anything was sent. `sent` is the only correct signal, and it is
 * *absent* on the accepted path (read as `true`), present and `false` on the
 * suppressed one.
 */
export interface SendOutcome {
  /** False only when the API explicitly reported a suppressed duplicate. */
  sent: boolean;
  /** The API's own sentence — it distinguishes "you" from "another admin". */
  message: string;
  /** Seconds until the dedupe window clears. Null unless suppressed. */
  retryAfterSeconds: number | null;
  /**
   * How many emails will actually be queued, with the preference gate already
   * applied. Null when `email` was not among the channels (or on a role send).
   */
  estimatedEmailRecipients: number | null;
}

/**
 * Raw history row from `GET /superadmin/notifications/history/`.
 *
 * Both send shapes write exactly one of these. Reading a row: a set
 * `notification_type` with `is_active: false` is a **role-based send** (logged,
 * never shown); a blank `notification_type` is a **broadcast**, and
 * `is_active: true` means it is also on display in-app.
 */
export interface NotificationHistoryApi {
  id: string;
  title?: string | null;
  message?: string | null;
  category?: string | null;
  notification_type?: string | null;
  channels?: string[] | null;
  audience?: string | null;
  created_by_email?: string | null;
  is_active?: boolean | null;
  /**
   * **The field to trust for "did this go out?"** The row is written when the
   * campaign is *accepted*; this flips only once the fan-out actually ran.
   */
  is_dispatched?: boolean | null;
  dispatched_at?: string | null;
  dispatch_error?: string | null;
  created_at?: string | null;
}

/** Flat UI row the history table renders. */
export interface NotificationHistoryRow {
  id: string;
  title: string;
  message: string;
  category: string;
  categoryLabel: string;
  /** Raw notification type; blank for a broadcast. */
  notificationType: string;
  /** "Role send" or "Broadcast", derived from `notification_type`. */
  shapeLabel: string;
  channels: string[];
  channelsLabel: string;
  audience: string;
  audienceLabel: string;
  createdByEmail: string;
  /** True when a broadcast is still displayed in-app. */
  isActive: boolean;
  isDispatched: boolean;
  /** Delivery state label — Sent / Queued / Failed. */
  dispatchLabel: string;
  dispatchedAt: string;
  dispatchError: string;
  createdAt: string;
}

/** Query params for the history list. Every filter is exact-match. */
export interface GetNotificationHistoryParams {
  page?: number;
  limit?: number;
  category?: string;
  audience?: string;
  notificationType?: string;
  /** Admin user id (UUID) — a malformed value is a 400. */
  createdBy?: string;
  /** `YYYY-MM-DD`, inclusive, on the send date. */
  dateFrom?: string;
  /** `YYYY-MM-DD`, inclusive. Must not precede `dateFrom`. */
  dateTo?: string;
}

export interface NotificationHistoryResult {
  count: number;
  rows: NotificationHistoryRow[];
}
