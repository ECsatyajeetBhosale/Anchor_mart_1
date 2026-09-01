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
  /**
   * Optional, defaulting to `["inapp"]` server-side — which is why an
   * integration that predates the multi-select keeps working untouched.
   *
   * Unlike the broadcast endpoint there is no category to gate here: this one
   * derives its category from `notification_type`, so only the two outbound
   * channels need `comms.service_broadcast`.
   */
  channels?: BroadcastChannel[];
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
 * Channels a campaign can go out on — **any non-empty combination** of the
 * three. WhatsApp joined on 2026-09-01; before that it was a 400.
 *
 * Both send endpoints take the same list now: the role-scoped send used to be
 * in-app only and gained the multi-select in the same release.
 *
 * ⚠️ **WhatsApp sends the admin's free text.** Meta requires a pre-approved
 * template for business-initiated messages outside the 24-hour service window,
 * so recipients outside it are rejected by the provider. Those fail *loudly* —
 * they land in the delivery ledger as FAILED with the provider's reason — but
 * they do fail. Templates are not built yet.
 */
export const BROADCAST_CHANNELS = ["inapp", "email", "whatsapp"] as const;

/**
 * The two channels that push into a personal inbox.
 *
 * Both are gated on `comms.service_broadcast` on **either** send endpoint —
 * same opt-out and reputational stakes — while in-app stays open to every
 * admin. Named once here so the two composers cannot drift apart on which
 * boxes they disable.
 */
export const OUTBOUND_CHANNELS = ["email", "whatsapp"] as const;

/** Is this channel one of the two that needs `comms.service_broadcast`? */
export function isOutboundChannel(channel: string): boolean {
  return (OUTBOUND_CHANNELS as readonly string[]).includes(channel);
}

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
  /**
   * The same figure for WhatsApp, computed with its own eligibility gate.
   *
   * **Never add these two together.** The audiences genuinely differ — a sailor
   * may have a number and no address, or have muted one channel and not the
   * other — so a summed "total recipients" double-counts everyone reachable on
   * both. Show them separately.
   */
  estimatedWhatsappRecipients: number | null;
}

/**
 * One channel's fan-out state, from a history row's `dispatches` array.
 *
 * The array exists because `dispatched_at` used to live on the campaign, and a
 * single flag can only express two of the three real states. With several
 * channels selected the first one processed claimed the whole campaign and the
 * rest returned silently — while History showed a full success. The per-channel
 * row is what closed that.
 */
export interface CampaignDispatchApi {
  channel?: string | null;
  /** Server-rendered label ("In-app + push"). Preferred over a local map. */
  channel_display?: string | null;
  is_dispatched?: boolean | null;
  dispatched_at?: string | null;
  /** `""` when there is no error — never `null`. */
  dispatch_error?: string | null;
  /** `null` for `inapp` **by design** — a topic push has no per-recipient count. */
  recipients_enqueued?: number | null;
}

/** Flat per-channel row the UI renders as a chip. */
export interface CampaignDispatch {
  channel: string;
  channelLabel: string;
  isDispatched: boolean;
  dispatchedAt: string;
  dispatchError: string;
  /**
   * `null` means **not measurable**, not zero. In-app is an announcement row
   * plus an FCM topic push, so there is no per-recipient count to report — it
   * must render as a dash, never `0`, which would read as a failure.
   */
  recipientsEnqueued: number | null;
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
   * ⚠️ **Derived since 2026-09-01, and no longer safe on its own.** It is
   * `true` only when *every* requested channel has dispatched, so a campaign
   * that is half out reads `false` — identical to one that never started.
   * Rendering it as a flat Sent/Not-sent badge shows a half-delivered campaign
   * as "not sent". Drive status from {@link NotificationHistoryRow.dispatches}
   * instead; this is kept only because older consumers read it.
   */
  is_dispatched?: boolean | null;
  /** One entry per requested channel. Backfilled, so never missing. */
  dispatches?: CampaignDispatchApi[] | null;
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
  /** One entry per requested channel, sorted by the server (alphabetical). */
  dispatches: CampaignDispatch[];
  /**
   * Status label derived from `dispatches`, not from `isDispatched` — the flat
   * flag cannot distinguish "half sent" from "not sent".
   */
  dispatchLabel: string;
  /** `danger` when any channel errored, `success` when all are out, else `warning`. */
  dispatchTone: "success" | "warning" | "danger";
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

/* ── The admin's own inbox ────────────────────────────────────────────────────
   Everything above composes and *sends* notifications to sailors and partners.
   What follows reads the ones addressed **to the signed-in admin**. */

/**
 * A notification kind — `order_update`, `order_assigned`, and more to come.
 *
 * Left open to `string` deliberately: the backend adds kinds without a frontend
 * release, and an unrecognised one must still render as a row rather than break
 * the list. Displayed by humanising the key, so a new kind reads sensibly on
 * arrival instead of showing raw snake_case.
 */
export type AdminNotificationType = "order_update" | "order_assigned" | (string & {});

/**
 * Consent class, mirroring the outbound side's `category`.
 *
 * `transactional` is operational and always delivered; `promotional` honours
 * opt-outs. Open to `string` for the same reason as the type.
 */
export type AdminNotificationCategory = "transactional" | "promotional" | (string & {});

/** Urgency, as the backend classifies it. */
export type AdminNotificationPriority = "low" | "normal" | "high" | (string & {});

/**
 * One row of the inbox.
 *
 * Field names are taken from a live response. Read defensively all the same:
 * only `id` is structurally required, and every display field falls back rather
 * than throwing, because the shape is documented by a flow note rather than a
 * schema this panel controls.
 */
export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  category: AdminNotificationCategory;
  priority: AdminNotificationPriority;
  title: string;
  /** Body copy. May be empty — not every kind writes one. */
  message: string;
  /**
   * Whether the admin has to *do* something, as opposed to being informed.
   *
   * The one field that changes how a row should be read, which is why it earns
   * a chip in the list rather than living only in the drawer.
   */
  actionRequired: boolean;
  /**
   * What that action is. `null` on every row seen so far, and its shape is not
   * documented — kept as an opaque string so it can be surfaced when the
   * backend starts populating it, without guessing at a structure now.
   */
  action: string | null;
  isRead: boolean;
  /**
   * **Pre-formatted display string** — "August 27, 2026, 12:02 PM", not
   * ISO-8601. Rendered verbatim; parsing it yields Invalid Date.
   */
  createdAt: string;
  /**
   * The order this points at, when the payload names one.
   *
   * ⚠️ **Usually absent.** The observed `order_update` rows carry no order
   * field at all — the order number appears only inside `message` prose. Read
   * here for the kinds that do carry it, and never relied upon: a row without
   * one simply offers no deep link.
   */
  orderId: string | null;
  orderNumber: string | null;
}

/** The inbox list plus its unread total, which the same payload carries. */
export interface AdminNotificationInbox {
  items: AdminNotification[];
  /** Total rows the server reports, for paging. */
  count: number;
  /**
   * The server's own unread total, or `null` when it did not send one.
   *
   * ⚠️ **The observed payload never sends it.** `GET /api/notifications/` is a
   * plain DRF page — `count`, `next`, `previous`, `results` — so this is
   * normally `null` and the bell resolves the figure from the *filtered*
   * `count` instead. Kept so a server that starts reporting it wins
   * immediately. Read through `selectUnreadCount`, never directly.
   */
  reportedUnread: number | null;
  /** True when every row on this page is unread — i.e. the filter was applied. */
  allUnread: boolean;
}
