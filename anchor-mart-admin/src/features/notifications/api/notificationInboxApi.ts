import { NOTIFICATION_INBOX_ENDPOINTS } from "@/lib/apiEndpoints";
import { asString, getProp, unwrapList } from "@/lib/apiResponse";
import { SERVER_SECRET_HEADER, baseApi } from "@/lib/fetchUtils";
import type { AdminNotification, AdminNotificationInbox } from "../types/notification.types";

/** Cache id for the inbox list — the realtime layer invalidates this by name. */
export const NOTIFICATION_INBOX_TAG = "INBOX" as const;

export interface GetNotificationInboxParams {
  page?: number;
  /** Server caps this; the panel asks for a page at a time like every other list. */
  limit?: number;
  /** `true` narrows to unread. Omitted means both. */
  unreadOnly?: boolean;
}

/**
 * One row, read defensively.
 *
 * The shape comes from a flow document rather than a schema this panel owns, so
 * every field is probed under the names the API is most likely to use and falls
 * back rather than throwing. Only `id` matters structurally — it is what
 * `markRead` addresses — and a row without one is dropped by the caller.
 */
export function toNotification(row: unknown): AdminNotification {
  const order = getProp(row, "order");
  const orderId = asString(getProp(row, "order_id")) || asString(getProp(order, "id")) || null;
  const orderNumber =
    asString(getProp(row, "order_number")) || asString(getProp(order, "order_number")) || null;
  const action = getProp(row, "action");

  return {
    id: asString(getProp(row, "id")),
    type: asString(getProp(row, "type")) || asString(getProp(row, "notification_type")),
    category: asString(getProp(row, "category")),
    priority: asString(getProp(row, "priority")),
    title: asString(getProp(row, "title")),
    // `message` and `body` are both in circulation across this API.
    message: asString(getProp(row, "message")) || asString(getProp(row, "body")),
    actionRequired: getProp(row, "action_required") === true,
    // Opaque on purpose: `null` on every row observed, and its shape is
    // undocumented. Stringified only when it is a plain scalar, so a future
    // object payload lands as null here rather than as "[object Object]".
    action: typeof action === "string" && action ? action : null,
    // Read is the exceptional state, so anything but an explicit `true` counts
    // as unread — a row whose flag we failed to parse stays visible rather than
    // silently disappearing from the badge.
    isRead: getProp(row, "is_read") === true || getProp(row, "read") === true,
    createdAt: asString(getProp(row, "created_at")) || asString(getProp(row, "timestamp")),
    orderId,
    orderNumber,
  };
}

/**
 * Normalise the whole payload.
 *
 * `unwrapList` already absorbs every envelope this API uses, so the only work
 * left is the unread total. It is read from the payload when present and
 * counted from the page when not — an undercount on a paged inbox, which is the
 * safe direction: a badge reading low is better than one inventing work.
 */
export function toInbox(res: unknown): AdminNotificationInbox {
  const { count, items } = unwrapList(res, toNotification);
  // A row with no id cannot be marked read, so it would be a dead entry.
  const rows = items.filter((row) => row.id);
  const unreadOnPage = rows.filter((row) => !row.isRead).length;
  // Read if the server ever starts sending it; the observed payload does not.
  const reported = getProp(res, "unread_count") ?? getProp(res, "unread");
  return {
    items: rows,
    count,
    reportedUnread: typeof reported === "number" ? reported : null,
    // Whether every row came back unread — the caller's evidence that the
    // `is_read=false` filter was actually honoured. An empty page counts as
    // filtered: there is nothing contradicting it.
    allUnread: unreadOnPage === rows.length,
  };
}

/**
 * The unread total behind the topbar bell.
 *
 * The inbox payload carries **no `unread_count`**, so this asks for the
 * unread-filtered list and reads its `count`. The guard matters: if the server
 * ignores `is_read`, that `count` is the *whole* inbox, and the bell would be
 * permanently lit — which is exactly the hardcoded always-on dot this replaced.
 * A page containing any read row is therefore treated as unfiltered, and the
 * honest answer becomes what we can actually see on it.
 */
export function selectUnreadCount(inbox: AdminNotificationInbox | undefined): number {
  if (!inbox) return 0;
  // A real total, if the server ever reports one, beats any inference.
  if (inbox.reportedUnread !== null) return inbox.reportedUnread;
  if (inbox.items.length === 0) return 0;
  // Every row unread ⇒ the `is_read=false` filter was honoured ⇒ `count` is the
  // unread total across all pages, not just this one.
  if (inbox.allUnread) return inbox.count;
  // A read row came back, so the filter was ignored and `count` is the whole
  // inbox. Trusting it would light the bell permanently — the hardcoded
  // always-on dot this replaced. Fall back to what is actually visible.
  return inbox.items.filter((row) => !row.isRead).length;
}

/**
 * The admin's own notification inbox.
 *
 * **Why this exists separately from `notificationApi`.** That module composes
 * and fans out messages *to sailors and partners*; this one reads the messages
 * addressed *to the signed-in admin*. They share a tag type but nothing else —
 * different mount, different direction, different permissions.
 *
 * **The recovery path.** Socket frames are never replayed, so an admin whose
 * panel was closed when an order was assigned to them sees nothing on reconnect
 * except the `connect` snapshot. The durable row is waiting here, which is why
 * the realtime layer refetches this on every `signal` and on app foreground.
 */
export const notificationInboxApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotificationInbox: builder.query<
      AdminNotificationInbox,
      GetNotificationInboxParams | undefined
    >({
      query: (params) => ({
        url: NOTIFICATION_INBOX_ENDPOINTS.INBOX,
        method: "GET",
        // Not a `/superadmin/` route, so `ServerSecurityMiddleware` applies.
        headers: { [SERVER_SECRET_HEADER]: "1" },
        params: {
          page: params?.page,
          page_size: params?.limit,
          is_read: params?.unreadOnly ? false : undefined,
        },
      }),
      transformResponse: toInbox,
      providesTags: [{ type: "Notifications", id: NOTIFICATION_INBOX_TAG }],
    }),

    /**
     * Mark one row read.
     *
     * Invalidates the inbox rather than patching the cache: the unread total is
     * the server's to compute, and a client that decrements its own copy drifts
     * the moment the same account reads something in another tab.
     */
    markNotificationRead: builder.mutation<unknown, string>({
      query: (id) => ({
        url: NOTIFICATION_INBOX_ENDPOINTS.MARK_READ(id),
        method: "POST",
        headers: { [SERVER_SECRET_HEADER]: "1" },
      }),
      invalidatesTags: [{ type: "Notifications", id: NOTIFICATION_INBOX_TAG }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetNotificationInboxQuery, useMarkNotificationReadMutation } =
  notificationInboxApi;
