import { CHAT_ENDPOINTS } from "@/lib/apiEndpoints";
import { type ListResult, asNumber, asString, getProp, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import type { ChatMessage, ChatThread } from "../types/chat.types";

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

/**
 * Normalises a thread row. Neither list endpoint publishes a schema and the two
 * are built by different serializers, so each field is read through a list of
 * plausible keys rather than one guessed name — a thread that only resolves an
 * id still renders, with a placeholder name, instead of blanking the sidebar.
 */
function toChatThread(row: unknown): ChatThread {
  const user = getProp(row, "user") ?? getProp(row, "customer") ?? getProp(row, "partner");
  return {
    id: pick(row, "id", "chat_id", "chat"),
    name:
      pick(row, "name", "user_name", "customer_name", "partner_name", "sailor_name") ||
      pick(user, "name", "first_name", "email") ||
      pick(row, "email", "user_email") ||
      "Unknown",
    email: pickOrNull(row, "email", "user_email", "customer_email") ?? pickOrNull(user, "email"),
    role: pickOrNull(row, "role", "user_role"),
    lastMessage: pick(row, "last_message", "latest_message", "message"),
    lastMessageAt: pick(row, "last_message_at", "updated_at", "created_at"),
    unreadCount: asNumber(getProp(row, "unread_count") ?? getProp(row, "unread")),
    orderNumber: pickOrNull(row, "order_number", "order_no"),
  };
}

/** Normalises a message row (`ChatMessengerDetailSerializer`, Flow 26 API 2). */
function toChatMessage(row: unknown): ChatMessage {
  return {
    id: pick(row, "id"),
    senderId: pickOrNull(row, "sender"),
    senderName: pick(row, "sender_name") || "Unknown",
    messageType: pick(row, "message_type") || "text",
    content: asString(getProp(row, "content")),
    media: pickOrNull(row, "media"),
    isDeleted: getProp(row, "is_deleted") === true,
    createdAt: pick(row, "created_at"),
  };
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Support threads — sailors and partners talking to the admin desk. */
    getUserChats: builder.query<ListResult<ChatThread>, { search?: string } | undefined>({
      query: (args) => ({
        url: CHAT_ENDPOINTS.GET_USER_CHATS,
        method: "GET",
        params: args?.search ? { search: args.search } : undefined,
      }),
      transformResponse: (res: unknown) => unwrapList(res, toChatThread),
      providesTags: [{ type: "Chats", id: "SUPPORT-LIST" }],
    }),

    /** Order/delivery threads — the conversation attached to a specific order. */
    getDeliveryChats: builder.query<ListResult<ChatThread>, { search?: string } | undefined>({
      query: (args) => ({
        url: CHAT_ENDPOINTS.GET_DELIVERY_CHATS,
        method: "GET",
        params: args?.search ? { search: args.search } : undefined,
      }),
      transformResponse: (res: unknown) => unwrapList(res, toChatThread),
      providesTags: [{ type: "Chats", id: "DELIVERY-LIST" }],
    }),

    /**
     * Messages in one thread, keyed on the `chat_id` **query param** (an
     * integer), not a path segment.
     */
    getChatMessages: builder.query<ListResult<ChatMessage>, { chatId: string }>({
      query: ({ chatId }) => ({
        url: CHAT_ENDPOINTS.GET_CHAT_MESSAGES,
        method: "GET",
        params: { chat_id: chatId },
      }),
      transformResponse: (res: unknown) => unwrapList(res, toChatMessage),
      providesTags: (_r, _e, { chatId }) => [{ type: "Chats", id: `MESSAGES-${chatId}` }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetUserChatsQuery, useGetDeliveryChatsQuery, useGetChatMessagesQuery } = chatApi;
