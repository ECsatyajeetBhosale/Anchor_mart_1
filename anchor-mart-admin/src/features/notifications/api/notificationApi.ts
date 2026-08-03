import { ADMIN_NOTIFICATION_ENDPOINTS } from "@/lib/apiEndpoints";
import { asNumber, asString, getProp, unwrapData, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import { MESSAGES } from "@/lib/messages";
import type {
  GetNotificationHistoryParams,
  NotificationHistoryApi,
  NotificationHistoryResult,
  NotificationHistoryRow,
  RecipientBucket,
  RecipientSummary,
  SendBroadcastPayload,
  SendOutcome,
  SendRoleNotificationPayload,
} from "../types/notification.types";

const M = MESSAGES.NOTIFICATIONS;

const FALLBACK = "-";

function dash(value: unknown): string {
  const s = asString(value).trim();
  return s === "" ? FALLBACK : s;
}

/**
 * Normalises either send endpoint's reply into a {@link SendOutcome}.
 *
 * Both answer `202` when the campaign is queued and `200` when it is suppressed
 * as a duplicate — a `4xx` is never used for suppression, because nothing is
 * wrong: the request was simply a no-op. So neither status code nor RTK Query's
 * success path can tell the two apart, and `sent` is read explicitly. It is
 * absent on the accepted path, so **only an explicit `false` counts as
 * suppressed**.
 */
function toSendOutcome(res: unknown): SendOutcome {
  const payload = unwrapData<unknown>(res);
  const sent = getProp(payload, "sent");
  const retry = getProp(payload, "retry_after_seconds");
  const estimate = getProp(payload, "estimated_email_recipients");
  return {
    sent: sent !== false,
    message: asString(getProp(payload, "message")),
    retryAfterSeconds: typeof retry === "number" ? retry : null,
    estimatedEmailRecipients: typeof estimate === "number" ? estimate : null,
  };
}

/** Maps a raw history row into the flat UI row the table renders. */
function toHistoryRow(row: NotificationHistoryApi): NotificationHistoryRow {
  const category = asString(row.category).trim();
  const notificationType = asString(row.notification_type).trim();
  const audience = asString(row.audience).trim();
  const channels = Array.isArray(row.channels) ? row.channels.map(asString).filter(Boolean) : [];
  const isDispatched = row.is_dispatched === true;
  const dispatchError = asString(row.dispatch_error).trim();

  return {
    id: asString(row.id),
    title: dash(row.title),
    message: dash(row.message),
    category,
    categoryLabel: M.HISTORY.CATEGORY_LABELS[category] ?? (category || FALLBACK),
    notificationType,
    // A set `notification_type` marks a role send (logged only); a blank one is
    // a broadcast. The distinction isn't a field, so it's derived here once.
    shapeLabel: notificationType ? M.HISTORY.SHAPE_ROLE : M.HISTORY.SHAPE_BROADCAST,
    channels,
    channelsLabel: channels.length
      ? channels.map((c) => M.HISTORY.CHANNEL_LABELS[c] ?? c).join(", ")
      : FALLBACK,
    audience,
    audienceLabel:
      audience === "all"
        ? M.HISTORY.AUDIENCE_ALL
        : (M.ROLE_LABELS[audience] ?? (audience || FALLBACK)),
    createdByEmail: dash(row.created_by_email),
    isActive: row.is_active === true,
    isDispatched,
    // An accepted-but-undispatched row with an error is a failed fan-out; one
    // without is still queued (the outbox sweeper runs every 5 minutes).
    dispatchLabel: isDispatched
      ? M.HISTORY.DISPATCH_SENT
      : dispatchError
        ? M.HISTORY.DISPATCH_FAILED
        : M.HISTORY.DISPATCH_QUEUED,
    dispatchedAt: dash(row.dispatched_at),
    dispatchError,
    createdAt: dash(row.created_at),
  };
}

/** Keys that carry a total rather than a per-role bucket. */
const TOTAL_KEYS = new Set(["total", "total_recipients", "count", "recipients"]);
/** Keys that echo the request back rather than describing an audience. */
const ECHO_KEYS = new Set(["type", "notification_type", "role", "message", "detail"]);

/**
 * Reads the recipient summary without a published schema.
 *
 * Two plausible shapes are handled — a `{ role: count }` map (possibly nested
 * under `roles`/`data`), and a list of `{ role, count }` objects. Anything a
 * later backend adds that isn't numeric is skipped rather than rendered as
 * "NaN recipients".
 */
function toRecipientSummary(res: unknown): RecipientSummary {
  const payload = unwrapData<unknown>(res);
  const type = asString(getProp(payload, "type") ?? getProp(payload, "notification_type")) || null;

  const source = getProp(payload, "roles") ?? getProp(payload, "buckets") ?? payload;
  const buckets: RecipientBucket[] = [];
  let explicitTotal: number | null = null;

  if (Array.isArray(source)) {
    for (const row of source) {
      const role = asString(getProp(row, "role"));
      if (role) buckets.push({ role, count: asNumber(getProp(row, "count")) });
    }
  } else if (source && typeof source === "object") {
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      if (ECHO_KEYS.has(key)) continue;
      if (typeof value !== "number") continue;
      if (TOTAL_KEYS.has(key)) {
        explicitTotal = value;
        continue;
      }
      buckets.push({ role: key, count: value });
    }
  }

  return {
    type,
    buckets,
    total: explicitTotal ?? buckets.reduce((sum, b) => sum + b.count, 0),
  };
}

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Reach per role for one notification type — the pre-send audience preview. */
    getRecipientSummary: builder.query<RecipientSummary, { type: string }>({
      query: ({ type }) => ({
        url: ADMIN_NOTIFICATION_ENDPOINTS.RECIPIENT_SUMMARY,
        method: "GET",
        params: { type },
      }),
      transformResponse: toRecipientSummary,
      providesTags: (_r, _e, { type }) => [{ type: "Notifications", id: `SUMMARY-${type}` }],
    }),

    /** Reach for a single role + type pair. */
    getRecipientCount: builder.query<number, { role: string; type: string }>({
      query: ({ role, type }) => ({
        url: ADMIN_NOTIFICATION_ENDPOINTS.RECIPIENT_COUNT,
        method: "GET",
        params: { role, type },
      }),
      transformResponse: (res: unknown): number => {
        const payload = unwrapData<unknown>(res);
        // A bare number, or whichever count key the view happens to use.
        if (typeof payload === "number") return payload;
        return asNumber(
          getProp(payload, "count") ??
            getProp(payload, "total") ??
            getProp(payload, "recipients") ??
            getProp(payload, "recipient_count"),
        );
      },
      providesTags: (_r, _e, { role, type }) => [
        { type: "Notifications", id: `COUNT-${role}-${type}` },
      ],
    }),

    /**
     * Send to everyone holding one role.
     *
     * Both preference layers still apply server-side: a per-type mute drops the
     * row before it is written, and a `promo` message additionally honours the
     * per-channel toggles. So the reach preview is an upper bound, not a
     * delivery guarantee.
     */
    sendRoleNotification: builder.mutation<SendOutcome, SendRoleNotificationPayload>({
      query: (body) => ({
        url: ADMIN_NOTIFICATION_ENDPOINTS.SEND_ROLE_BASED,
        method: "POST",
        body,
      }),
      transformResponse: toSendOutcome,
      // Reach counts can move as a send lands, so drop every cached preview —
      // and the history list, which gains a row per accepted campaign.
      invalidatesTags: [
        { type: "Notifications", id: "PARTIAL-LIST" },
        { type: "Notifications", id: "HISTORY" },
      ],
    }),

    /**
     * Broadcast — one role or everyone, in-app and/or email.
     *
     * `category` decides whether the marketing opt-out applies, so it is always
     * sent explicitly rather than left to a server default the admin can't see.
     */
    sendBroadcast: builder.mutation<SendOutcome, SendBroadcastPayload>({
      query: (body) => ({
        url: ADMIN_NOTIFICATION_ENDPOINTS.SEND_BROADCAST,
        method: "POST",
        body,
      }),
      transformResponse: toSendOutcome,
      invalidatesTags: [
        { type: "Notifications", id: "PARTIAL-LIST" },
        { type: "Notifications", id: "HISTORY" },
      ],
    }),

    /**
     * §3.5 — what was sent, newest first, attributed to the admin who sent it.
     *
     * Every filter is exact-match and validated, so blanks are omitted rather
     * than sent empty.
     */
    getNotificationHistory: builder.query<NotificationHistoryResult, GetNotificationHistoryParams>({
      query: (params) => ({
        url: ADMIN_NOTIFICATION_ENDPOINTS.HISTORY,
        method: "GET",
        params: {
          page: params.page,
          page_size: params.limit,
          category: params.category || undefined,
          audience: params.audience || undefined,
          notification_type: params.notificationType || undefined,
          created_by: params.createdBy || undefined,
          date_from: params.dateFrom || undefined,
          date_to: params.dateTo || undefined,
        },
      }),
      transformResponse: (res: unknown): NotificationHistoryResult => {
        const { count, items } = unwrapList<NotificationHistoryRow>(res, (row) =>
          toHistoryRow(row as NotificationHistoryApi),
        );
        return { count, rows: items };
      },
      providesTags: [{ type: "Notifications", id: "HISTORY" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetRecipientSummaryQuery,
  useGetRecipientCountQuery,
  useSendRoleNotificationMutation,
  useSendBroadcastMutation,
  useGetNotificationHistoryQuery,
} = notificationApi;
