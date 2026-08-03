// Public API for the admin notification console — import only from here.
export { NotificationsPage } from "./components/NotificationsPage";
export { RecipientReachCard } from "./components/RecipientReachCard";
export { NotificationHistoryTab } from "./components/NotificationHistoryTab";
export {
  useGetRecipientSummaryQuery,
  useGetRecipientCountQuery,
  useSendRoleNotificationMutation,
  useSendBroadcastMutation,
  useGetNotificationHistoryQuery,
} from "./api/notificationApi";
export {
  NOTIFICATION_ROLES,
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_TRAITS,
  BROADCAST_CATEGORIES,
  BROADCAST_CHANNELS,
} from "./types/notification.types";
export type {
  NotificationRole,
  NotificationType,
  RecipientSummary,
  BroadcastCategory,
  BroadcastChannel,
  BroadcastAudience,
  SendOutcome,
  NotificationHistoryRow,
  NotificationHistoryResult,
  GetNotificationHistoryParams,
} from "./types/notification.types";
