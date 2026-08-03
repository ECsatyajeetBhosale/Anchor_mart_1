// Public API for the outbound-message ledger (Flow 22 §3.1–3.2) —
// import only from here.
export { OutboundMessagesPage } from "./components/OutboundMessagesPage";
export { MessageDetailDrawer } from "./components/MessageDetailDrawer";
export {
  useGetOutboundMessagesQuery,
  useGetOutboundMessageQuery,
  messageStatusVariant,
  messageChannelVariant,
} from "./api/outboundMessageApi";
export { MESSAGE_CHANNELS, MESSAGE_STATUSES } from "./types/outboundMessage.types";
export type {
  OutboundMessage,
  OutboundMessageApi,
  OutboundMessageListResult,
  MessageChannel,
  MessageStatus,
  GetOutboundMessagesParams,
} from "./types/outboundMessage.types";
