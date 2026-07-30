import { ADMIN_NOTIFICATION_ENDPOINTS } from "@/lib/apiEndpoints";
import { asNumber, asString, getProp, unwrapData } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import type {
  RecipientBucket,
  RecipientSummary,
  SendBroadcastPayload,
  SendRoleNotificationPayload,
} from "../types/notification.types";

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
    sendRoleNotification: builder.mutation<unknown, SendRoleNotificationPayload>({
      query: (body) => ({
        url: ADMIN_NOTIFICATION_ENDPOINTS.SEND_ROLE_BASED,
        method: "POST",
        body,
      }),
      // Reach counts can move as a send lands, so drop every cached preview.
      invalidatesTags: [{ type: "Notifications", id: "PARTIAL-LIST" }],
    }),

    /** Send to every user, regardless of role. */
    sendBroadcast: builder.mutation<unknown, SendBroadcastPayload>({
      query: (body) => ({
        url: ADMIN_NOTIFICATION_ENDPOINTS.SEND_BROADCAST,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Notifications", id: "PARTIAL-LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetRecipientSummaryQuery,
  useGetRecipientCountQuery,
  useSendRoleNotificationMutation,
  useSendBroadcastMutation,
} = notificationApi;
