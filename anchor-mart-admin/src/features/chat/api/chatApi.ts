import { CHAT_ENDPOINTS } from "@/lib/apiEndpoints";
import { type ListResult, asNumber, asString, getProp, unwrapList } from "@/lib/apiResponse";
import { SERVER_SECRET_HEADER, baseApi } from "@/lib/fetchUtils";
import type {
  ChatCategory,
  ChatCounterparty,
  ChatMessage,
  ChatOrderRef,
  ChatOwner,
  ChatPresence,
  ChatThread,
  ChatUnreadSummary,
  CreateChatGroupPayload,
  CreateOrderChatPayload,
  CreateSupportChatPayload,
  CreatedChat,
  OrderChatCategory,
  OrderContext,
  OrderContextAudience,
  OrderContextSummary,
  UploadChatMediaArgs,
} from "../types/chat.types";

/** First non-empty string among the given keys, else `""`. */
function pick(row: unknown, ...keys: string[]): string {
  for (const key of keys) {
    const value = asString(getProp(row, key));
    if (value) return value;
  }
  return "";
}

/** Same as {@link pick} but preserving "absent" as null rather than "". */
function pickOrNull(row: unknown, ...keys: string[]): string | null {
  const value = pick(row, ...keys);
  return value || null;
}

/** Maps the `owner` block (§4.1). Returns null when the payload omits it. */
function toOwner(value: unknown): ChatOwner | null {
  if (!value || typeof value !== "object") return null;
  return {
    id: pick(value, "id", "user_id", "user"),
    name: pick(value, "name", "first_name", "email") || "Unknown",
    email: pickOrNull(value, "email"),
    role: pickOrNull(value, "role"),
    profilePicture: pickOrNull(value, "profile_picture"),
  };
}

/** Maps the `order` block (§4.3). Null on support threads — that is the tell. */
function toOrderRef(value: unknown): ChatOrderRef | null {
  if (!value || typeof value !== "object") return null;
  const admin = getProp(value, "assigned_admin");
  return {
    id: pick(value, "id"),
    orderNumber: pick(value, "order_number"),
    status: pick(value, "status"),
    orderType: pick(value, "order_type"),
    itemCount: asNumber(getProp(value, "item_count")),
    assignedAdminId: pickOrNull(admin, "id"),
    assignedAdminName: pickOrNull(admin, "name"),
  };
}

/**
 * Normalises a thread row.
 *
 * `last_message` is an **object** (`{id, content, …}`), not a string — reading
 * it as a string is why every row previously previewed as "No messages yet".
 * Legacy flat keys are still tried as a fallback so a differently-shaped
 * response degrades to a name and an id rather than blanking the sidebar.
 */
function toChatThread(row: unknown): ChatThread {
  const owner = toOwner(getProp(row, "owner"));
  const legacyUser = getProp(row, "user") ?? getProp(row, "customer") ?? getProp(row, "partner");
  /**
   * The counterparty's **user id**, which presence is keyed by.
   *
   * Read from the `owner` block first, then from the flat keys a row may carry
   * instead. This fallback is load-bearing rather than defensive: presence asks
   * about a roster built from these ids, so a row that yields none is not
   * "someone shown as offline" — it is a user the presence endpoint is never
   * asked about, and who therefore can never appear online at all.
   */
  const ownerId =
    owner?.id ||
    pick(row, "user_id", "owner_id", "customer_id", "partner_id") ||
    pick(legacyUser, "id", "user_id");
  const lastMessage = getProp(row, "last_message");
  const order = toOrderRef(getProp(row, "order"));

  return {
    id: pick(row, "id", "chat_id", "chat"),
    name:
      owner?.name ||
      pick(row, "name", "user_name", "customer_name", "partner_name", "sailor_name") ||
      pick(legacyUser, "name", "first_name", "email") ||
      pick(row, "email", "user_email") ||
      "Unknown",
    email: owner?.email ?? pickOrNull(row, "email", "user_email", "customer_email"),
    role: owner?.role ?? pickOrNull(row, "role", "user_role"),
    category: (pickOrNull(row, "category") as ChatCategory | null) ?? null,
    // Rebuilt with the recovered id so presence has something to ask about even
    // when the payload omitted the block but carried the id flat.
    owner: owner ? { ...owner, id: ownerId } : null,
    ownerId: ownerId || null,
    // The object form first, then the flat legacy string.
    lastMessage: pick(lastMessage, "content") || pick(row, "latest_message", "message"),
    lastMessageAt: pick(row, "last_message_at", "updated_at", "created_at"),
    unreadCount: asNumber(getProp(row, "unread_count") ?? getProp(row, "unread")),
    order,
    orderNumber: order?.orderNumber ?? pickOrNull(row, "order_number", "order_no"),
    counterparty: (pickOrNull(row, "counterparty") as ChatCounterparty | null) ?? null,
    // Only a real boolean seeds the dot. A missing key means "this payload does
    // not say", which must not render as "offline" — the poll answers instead.
    ownerIsOnline:
      typeof getProp(row, "owner_is_online") === "boolean"
        ? (getProp(row, "owner_is_online") as boolean)
        : null,
  };
}

/** Normalises a message row (`ChatMessengerDetailSerializer`, §3.5). */
function toChatMessage(row: unknown): ChatMessage {
  return {
    id: pick(row, "id"),
    senderId: pickOrNull(row, "sender"),
    senderName: pick(row, "sender_name") || "Unknown",
    messageType: pick(row, "message_type") || "text",
    content: asString(getProp(row, "content")),
    media: pickOrNull(row, "media"),
    isEdited: getProp(row, "is_edited") === true,
    editedAt: pickOrNull(row, "edited_at"),
    isDeleted: getProp(row, "is_deleted") === true,
    createdAt: pick(row, "created_at"),
  };
}

/** Shared paging params. Both lists default to 10, max 100. */
export interface ChatPageParams {
  page?: number;
  limit?: number;
}

export interface GetOrderChatsParams extends ChatPageParams {
  /** `order` | `order_delivery`. Anything else is a 400, so blanks are dropped. */
  category?: OrderChatCategory | "";
}

export interface GetChatMessagesParams extends ChatPageParams {
  chatId: string;
}

/** Cache key for one thread's messages, shared by the socket merge helpers. */
export function messagesCacheKey(chatId: string): GetChatMessagesParams {
  return { chatId, page: 1, limit: MESSAGE_PAGE_SIZE };
}

/** Kept generous: the pane is a reader, and re-paging mid-conversation is jarring. */
export const MESSAGE_PAGE_SIZE = 50;

/**
 * Hard cap the presence endpoint enforces (§4.7). More than this is a **400**,
 * not a silent truncation, so the caller must chunk rather than hope.
 */
export const PRESENCE_MAX_IDS = 100;

/** Suggested poll interval (§4.7: "once per 20–30 s while a chat screen is open"). */
export const PRESENCE_POLL_MS = 25_000;

/** Maps the presence payload, defaulting every id asked about to offline. */
function toPresence(res: unknown): ChatPresence {
  const rawPresence = getProp(res, "presence");
  const presence: Record<string, boolean> = {};
  if (rawPresence && typeof rawPresence === "object") {
    for (const [id, value] of Object.entries(rawPresence as Record<string, unknown>)) {
      presence[id] = value === true;
    }
  }
  const online = Array.isArray(getProp(res, "online"))
    ? (getProp(res, "online") as unknown[]).map(asString).filter(Boolean)
    : Object.keys(presence).filter((id) => presence[id]);
  // `online` is documented as a subset of `presence`, but a payload carrying
  // only one of the two still has to produce a usable set.
  for (const id of online) presence[id] = true;
  return { online, presence, ttlSeconds: asNumber(getProp(res, "ttl_seconds")) };
}

/** Every category the badge breaks down by, so a missing key reads as 0. */
const UNREAD_CATEGORIES = [
  "user_support",
  "delivery_support",
  "order",
  "order_delivery",
  "group",
] as const;

/** Maps the unread summary (§4.5), zeroing every category the payload omits. */
function toUnreadSummary(res: unknown): ChatUnreadSummary {
  const body = getProp(res, "data") ?? res;
  const raw = getProp(body, "by_category");
  const byCategory = {} as ChatUnreadSummary["byCategory"];
  for (const key of UNREAD_CATEGORIES) {
    byCategory[key] = asNumber(getProp(raw, key));
  }
  const total = asNumber(getProp(body, "total"));
  return {
    total,
    // Trust the server's own boolean when it sent one; fall back to the count so
    // a payload carrying only `total` still lights the dot correctly.
    hasUnread: getProp(body, "has_unread") === true || total > 0,
    threadsWithUnread: asNumber(getProp(body, "threads_with_unread")),
    byCategory,
  };
}

/** Maps `summary` (§5.1) — the one block that is identical across all apps. */
function toOrderContextSummary(value: unknown): OrderContextSummary {
  return {
    orderId: pick(value, "order_id"),
    orderNumber: pick(value, "order_number"),
    status: pick(value, "status"),
    orderType: pick(value, "order_type"),
    // Falls back to the raw enum only so the strip is never blank; §6.2's "never
    // print a raw status" is about the client apps, and an admin can read one.
    statusDisplay: pick(value, "status_display") || pick(value, "status"),
    itemsTotal: asNumber(getProp(value, "items_total")),
    unitsOrdered: asNumber(getProp(value, "units_ordered")),
    unitsDelivered: asNumber(getProp(value, "units_delivered")),
    linesDelivered: asNumber(getProp(value, "lines_delivered")),
    linesNotDelivered: asNumber(getProp(value, "lines_not_delivered")),
    linesPending: asNumber(getProp(value, "lines_pending")),
    linesAvailable: asNumber(getProp(value, "lines_available")),
    linesUnavailable: asNumber(getProp(value, "lines_unavailable")),
    linesSubstituted: asNumber(getProp(value, "lines_substituted")),
    isFullyDelivered: getProp(value, "is_fully_delivered") === true,
    isPartiallyDelivered: getProp(value, "is_partially_delivered") === true,
    paymentStatus: pick(value, "payment_status"),
    paymentStatusDisplay: pick(value, "payment_status_display") || pick(value, "payment_status"),
    isPaid: getProp(value, "is_paid") === true,
    deliveryOnHold: getProp(value, "delivery_on_hold") === true,
  };
}

/** Maps the order-context envelope (§5). */
function toOrderContext(res: unknown): OrderContext {
  const body = getProp(res, "data") ?? res;
  return {
    chatId: pick(body, "chat_id"),
    audience: (pickOrNull(body, "audience") as OrderContextAudience | null) ?? "admin",
    counterparty: (pickOrNull(body, "counterparty") as ChatCounterparty | null) ?? null,
    summary: toOrderContextSummary(getProp(body, "summary")),
    order: getProp(body, "order") ?? null,
  };
}

/**
 * Maps either create response.
 *
 * Both endpoints return the **full chat object at the top level** — no `data`
 * envelope, no `chat_id` key. The id is `id`, and it is an **integer** (`Chat`
 * uses a normal auto PK, which is why the detail routes are `<int:chat_id>`);
 * `pick` stringifies it for routing and keys.
 *
 * **201 and 200 mean the same thing to the UI** — a thread to open. Both
 * endpoints are idempotent: 201 created it, 200 returned the one that already
 * existed, and the body is identical. "A chat already exists" must never be
 * shown, so `created` is recorded and deliberately not surfaced.
 */
function toCreatedChat(
  res: unknown,
  meta: { response?: { status: number } } | undefined,
): CreatedChat {
  return {
    chatId: pick(res, "id"),
    created: meta?.response?.status === 201,
  };
}

/**
 * Newest thread first, by `last_message_at`.
 *
 * An inbox is a queue: the thread someone just wrote in is the one that needs
 * answering, and it was arriving wherever the server happened to place it.
 *
 * Applied client-side **on top of** whatever order the server sends, not
 * instead of it. If the server already orders by `-last_message_at` this is a
 * no-op; if it does not, the visible page is at least internally correct. What
 * it cannot fix is pagination — sorting page 1 cannot pull a newer thread back
 * from page 2. Server-side ordering is the real fix and is an open ask.
 *
 * A thread with no timestamp at all sorts last rather than first. `lastMessageAt`
 * already falls back to `updated_at` then `created_at`, so an empty thread the
 * admin just opened still carries its creation time; a row reaching this with
 * nothing is a row we know nothing about, and guessing "newest" for it would put
 * it above real traffic.
 *
 * `slice()` first — RTK Query hands over the mapped array, and sorting it in
 * place would mutate the object the cache is about to store.
 */
export function sortByLastMessage(items: ChatThread[]): ChatThread[] {
  return items.slice().sort((a, b) => {
    const at = a.lastMessageAt ? Date.parse(a.lastMessageAt) : Number.NaN;
    const bt = b.lastMessageAt ? Date.parse(b.lastMessageAt) : Number.NaN;
    // Unparseable is treated the same as absent: both mean "no position".
    const aMissing = Number.isNaN(at);
    const bMissing = Number.isNaN(bt);
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    return bt - at;
  });
}

/** {@link unwrapList}, then {@link sortByLastMessage} over the page. */
function unwrapThreadList(res: unknown): ListResult<ChatThread> {
  const list = unwrapList(res, toChatThread);
  return { ...list, items: sortByLastMessage(list.items) };
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** §4.1 — customer support inbox. Shared across the whole admin team. */
    getUserChats: builder.query<ListResult<ChatThread>, ChatPageParams | undefined>({
      query: (args) => ({
        url: CHAT_ENDPOINTS.GET_USER_CHATS,
        method: "GET",
        params: { page: args?.page, page_size: args?.limit },
      }),
      transformResponse: unwrapThreadList,
      providesTags: [{ type: "Chats", id: "SUPPORT-LIST" }],
    }),

    /** §4.2 — delivery-partner support inbox. Also shared. */
    getDeliveryChats: builder.query<ListResult<ChatThread>, ChatPageParams | undefined>({
      query: (args) => ({
        url: CHAT_ENDPOINTS.GET_DELIVERY_CHATS,
        method: "GET",
        params: { page: args?.page, page_size: args?.limit },
      }),
      transformResponse: unwrapThreadList,
      providesTags: [{ type: "Chats", id: "DELIVERY-LIST" }],
    }),

    /**
     * §4.3 — order-chat inbox. **Not a shared inbox**: a sub-admin sees only
     * threads on orders they own, a super-admin sees all. This is the single
     * most important invariant in the flow, and it is enforced server-side —
     * the screen must not try to widen it.
     */
    getOrderChats: builder.query<ListResult<ChatThread>, GetOrderChatsParams | undefined>({
      query: (args) => ({
        url: CHAT_ENDPOINTS.GET_ORDER_CHATS,
        method: "GET",
        // A blank `category` is a 400, never an unfiltered list, so it is dropped.
        params: {
          category: args?.category || undefined,
          page: args?.page,
          page_size: args?.limit,
        },
      }),
      transformResponse: unwrapThreadList,
      providesTags: [{ type: "Chats", id: "ORDER-LIST" }],
    }),

    /** §4.4 — one order thread. 404 on a support thread; this route is order-only. */
    getOrderChat: builder.query<ChatThread, string>({
      query: (chatId) => ({ url: CHAT_ENDPOINTS.GET_ORDER_CHAT(chatId), method: "GET" }),
      transformResponse: (res: unknown) => toChatThread(getProp(res, "data") ?? res),
      providesTags: (_r, _e, chatId) => [{ type: "Chats", id: `THREAD-${chatId}` }],
    }),

    /**
     * §4.5 — a thread's messages.
     *
     * ⚠️ The wire order is **newest first** (changed 2026-08-03; this route used
     * to return oldest-first while the customer route returned newest-first —
     * same thread, same serializer, inverted results). Page 1 is the *latest*
     * messages and you page **backwards** through history.
     *
     * The page is reversed here so `items` is always chronological, which is the
     * order a transcript is read in and the order the socket appends to. Doing
     * it once, at the boundary, keeps the pane and every cache helper free of
     * the question — reversing at render time instead would leave
     * `mergeIncomingMessage` pushing new messages onto the wrong end.
     */
    getChatMessages: builder.query<ListResult<ChatMessage>, GetChatMessagesParams>({
      query: ({ chatId, page, limit }) => ({
        url: CHAT_ENDPOINTS.GET_CHAT_MESSAGES,
        method: "GET",
        params: { chat_id: chatId, page, page_size: limit },
      }),
      transformResponse: (res: unknown) => {
        const list = unwrapList(res, toChatMessage);
        return { ...list, items: [...list.items].reverse() };
      },
      providesTags: (_r, _e, { chatId }) => [{ type: "Chats", id: `MESSAGES-${chatId}` }],
    }),

    /**
     * §4.7 — presence for a specific set of users. **Polled, never pushed**:
     * admins receive no presence frames on the socket.
     *
     * Not cached by tag — presence is time-sensitive rather than invalidated by
     * a write, so freshness comes from the caller's `pollingInterval`.
     */
    getChatPresence: builder.query<ChatPresence, string[]>({
      query: (userIds) => ({
        url: CHAT_ENDPOINTS.PRESENCE,
        method: "GET",
        // Over 100 ids is a 400. The caller chunks; this is the last guard so a
        // slipped-through roster degrades to a partial answer, not an error.
        params: { user_ids: userIds.slice(0, PRESENCE_MAX_IDS).join(",") },
      }),
      transformResponse: toPresence,
    }),

    /**
     * §4.5 / §9.1 — the unread badge.
     *
     * **Not polled.** The caller refetches at launch, after login and after each
     * reconnect; between those the socket keeps the number live. Frames sent
     * while the socket was down are never replayed, which is the entire reason
     * the reconnect refetch exists.
     */
    getChatUnreadSummary: builder.query<ChatUnreadSummary, void>({
      query: () => ({ url: CHAT_ENDPOINTS.UNREAD_SUMMARY, method: "GET" }),
      transformResponse: toUnreadSummary,
      providesTags: [{ type: "Chats", id: "UNREAD" }],
    }),

    /**
     * §5 — the order a thread is about.
     *
     * **The conversation must never wait on this.** The caller renders the
     * collapsed line from the inbox row it already has and lets this fill in;
     * a 404 means the order is gone and the thread is fine, so the strip simply
     * does not render. Nothing here is allowed to gate the message pane.
     */
    getOrderContext: builder.query<OrderContext, string>({
      query: (chatId) => ({ url: CHAT_ENDPOINTS.ORDER_CONTEXT(chatId), method: "GET" }),
      transformResponse: toOrderContext,
      providesTags: (_r, _e, chatId) => [{ type: "Chats", id: `CONTEXT-${chatId}` }],
    }),

    /** §8.3 — open a support thread with a user, from the user detail screen. */
    createSupportChat: builder.mutation<CreatedChat, CreateSupportChatPayload>({
      query: (body) => ({ url: CHAT_ENDPOINTS.CREATE_SUPPORT_CHAT, method: "POST", body }),
      transformResponse: toCreatedChat,
      invalidatesTags: [
        { type: "Chats", id: "SUPPORT-LIST" },
        { type: "Chats", id: "DELIVERY-LIST" },
      ],
    }),

    /**
     * §8.3 — open an order thread with one side of an order.
     *
     * 403 (another admin owns it) and 409 (unassigned) come from the same
     * ownership gate as every other admin action on an order, so the caller
     * reuses the panel's existing copy for those and offers **no retry** — a
     * retry affordance implies the failure is transient, and neither is.
     */
    createOrderChat: builder.mutation<CreatedChat, CreateOrderChatPayload>({
      query: (body) => ({ url: CHAT_ENDPOINTS.CREATE_ORDER_CHAT, method: "POST", body }),
      transformResponse: toCreatedChat,
      invalidatesTags: [{ type: "Chats", id: "ORDER-LIST" }],
    }),

    /**
     * §4.4 — upload an image or file into a thread.
     *
     * The **only** call this panel makes outside `/api/superadmin/`, and so the
     * only one carrying the `server-secret-key` header. It was unavailable here
     * until that key was provisioned; admins could read attachments others sent
     * but not post one.
     *
     * **Deliberately does not invalidate the message cache.** The server
     * broadcasts the created message to every participant as an ordinary
     * `chat_message` frame, so the socket appends it exactly once. Appending the
     * response as well is how the sender ends up looking at their own attachment
     * twice — §4.4 says pick one path, and the socket is the one that already
     * works for every other message type.
     */
    uploadChatMedia: builder.mutation<unknown, UploadChatMediaArgs>({
      query: ({ file, messageType, message, chatId, orderId }) => {
        const body = new FormData();
        body.append("file", file);
        body.append("message_type", messageType);
        if (message?.trim()) body.append("message", message.trim());
        // Exactly one target — never both. `order_id` addresses the order
        // thread; `chat_id` is the admin-only route to a support thread.
        if (orderId) body.append("order_id", orderId);
        else if (chatId) body.append("chat_id", chatId);

        return {
          url: CHAT_ENDPOINTS.UPLOAD_MEDIA,
          method: "POST",
          body,
          headers: {
            [SERVER_SECRET_HEADER]: "1",
            // Marker only: the base query strips this so the browser can write
            // the real header with the multipart boundary it generated.
            "Content-Type": "multipart/form-data",
          },
        };
      },
      // The thread lists still need refreshing — the row's preview and timestamp
      // move even though the message itself arrives over the socket.
      invalidatesTags: [
        { type: "Chats", id: "SUPPORT-LIST" },
        { type: "Chats", id: "DELIVERY-LIST" },
        { type: "Chats", id: "ORDER-LIST" },
      ],
    }),

    /** §4.6 — create a group chat. The caller becomes `group_admin`. */
    createChatGroup: builder.mutation<unknown, CreateChatGroupPayload>({
      query: (body) => ({ url: CHAT_ENDPOINTS.CREATE_GROUP, method: "POST", body }),
      invalidatesTags: [{ type: "Chats", id: "SUPPORT-LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetUserChatsQuery,
  useGetDeliveryChatsQuery,
  useGetOrderChatsQuery,
  useGetOrderChatQuery,
  useGetChatMessagesQuery,
  useGetChatPresenceQuery,
  useGetChatUnreadSummaryQuery,
  useLazyGetChatUnreadSummaryQuery,
  useGetOrderContextQuery,
  useCreateSupportChatMutation,
  useCreateOrderChatMutation,
  useUploadChatMediaMutation,
  useCreateChatGroupMutation,
} = chatApi;
