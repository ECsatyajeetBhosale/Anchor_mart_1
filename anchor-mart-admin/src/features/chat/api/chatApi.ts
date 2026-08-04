import { CHAT_ENDPOINTS } from "@/lib/apiEndpoints";
import { type ListResult, asNumber, asString, getProp, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import type {
  ChatCategory,
  ChatCounterparty,
  ChatMessage,
  ChatOrderRef,
  ChatOwner,
  ChatThread,
  CreateChatGroupPayload,
  OrderChatCategory,
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
    id: pick(value, "id"),
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
    owner,
    // The object form first, then the flat legacy string.
    lastMessage: pick(lastMessage, "content") || pick(row, "latest_message", "message"),
    lastMessageAt: pick(row, "last_message_at", "updated_at", "created_at"),
    unreadCount: asNumber(getProp(row, "unread_count") ?? getProp(row, "unread")),
    order,
    orderNumber: order?.orderNumber ?? pickOrNull(row, "order_number", "order_no"),
    counterparty: (pickOrNull(row, "counterparty") as ChatCounterparty | null) ?? null,
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

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** §4.1 — customer support inbox. Shared across the whole admin team. */
    getUserChats: builder.query<ListResult<ChatThread>, ChatPageParams | undefined>({
      query: (args) => ({
        url: CHAT_ENDPOINTS.GET_USER_CHATS,
        method: "GET",
        params: { page: args?.page, page_size: args?.limit },
      }),
      transformResponse: (res: unknown) => unwrapList(res, toChatThread),
      providesTags: [{ type: "Chats", id: "SUPPORT-LIST" }],
    }),

    /** §4.2 — delivery-partner support inbox. Also shared. */
    getDeliveryChats: builder.query<ListResult<ChatThread>, ChatPageParams | undefined>({
      query: (args) => ({
        url: CHAT_ENDPOINTS.GET_DELIVERY_CHATS,
        method: "GET",
        params: { page: args?.page, page_size: args?.limit },
      }),
      transformResponse: (res: unknown) => unwrapList(res, toChatThread),
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
      transformResponse: (res: unknown) => unwrapList(res, toChatThread),
      providesTags: [{ type: "Chats", id: "ORDER-LIST" }],
    }),

    /** §4.4 — one order thread. 404 on a support thread; this route is order-only. */
    getOrderChat: builder.query<ChatThread, string>({
      query: (chatId) => ({ url: CHAT_ENDPOINTS.GET_ORDER_CHAT(chatId), method: "GET" }),
      transformResponse: (res: unknown) => toChatThread(getProp(res, "data") ?? res),
      providesTags: (_r, _e, chatId) => [{ type: "Chats", id: `THREAD-${chatId}` }],
    }),

    /**
     * §4.5 — a thread's messages. **Oldest first** on this admin route, the
     * opposite of the customer one, so new messages append at the end.
     */
    getChatMessages: builder.query<ListResult<ChatMessage>, GetChatMessagesParams>({
      query: ({ chatId, page, limit }) => ({
        url: CHAT_ENDPOINTS.GET_CHAT_MESSAGES,
        method: "GET",
        params: { chat_id: chatId, page, page_size: limit },
      }),
      transformResponse: (res: unknown) => unwrapList(res, toChatMessage),
      providesTags: (_r, _e, { chatId }) => [{ type: "Chats", id: `MESSAGES-${chatId}` }],
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
  useCreateChatGroupMutation,
} = chatApi;
