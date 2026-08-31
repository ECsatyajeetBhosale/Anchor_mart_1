// Public API for the chat feature (Flow 23) — import only from here.
export { ChatMonitorPage } from "./components/ChatMonitorPage";
export { SupportChatsPage } from "./components/SupportChatsPage";
export { OrderChatsPage } from "./components/OrderChatsPage";
export { StartChatDrawer } from "./components/StartChatDrawer";
export { ChatUserPicker } from "./components/ChatUserPicker";
export type { PickedUser } from "./components/ChatUserPicker";
export {
  useGetUserChatsQuery,
  useGetChatUnreadSummaryQuery,
  useGetOrderContextQuery,
  useGetDeliveryChatsQuery,
  useGetOrderChatsQuery,
  useGetOrderChatQuery,
  useGetChatMessagesQuery,
} from "./api/chatApi";
export { ChatSocketProvider } from "./context/ChatSocketProvider";
export { useChatSocket } from "./hooks/useChatSocket";
export { useChatUnread } from "./hooks/useChatUnread";
export { useStartChat } from "./hooks/useStartChat";
export {
  matchesOrderThread,
  matchesSupportThread,
  orderThreadCategory,
  supportInboxFor,
} from "./lib/threadMatch";
export { OrderContextStrip } from "./components/OrderContextStrip";
export type { ChatListTag, ChatSocketApi } from "./hooks/useChatSocket";
export type {
  ChatCategory,
  ChatCounterparty,
  ChatMessage,
  ChatOrderRef,
  ChatOwner,
  ChatSource,
  ChatThread,
  CreateChatGroupPayload,
  OrderChatCategory,
  SocketChatType,
  SocketStatus,
} from "./types/chat.types";
