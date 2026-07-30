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
 * Body of `POST /superadmin/notifications/send-broadcast-notification/`.
 *
 * `image_path` is a stored path under `notification_images/`. That directory is
 * **not** in the presigned minter's allow-list, so it can only be pasted, not
 * uploaded from here.
 */
export interface SendBroadcastPayload {
  title: string;
  message: string;
  image_path: string;
}
