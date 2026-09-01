// Public API for the admin notification console — import only from here.
export { NotificationsPage } from "./components/NotificationsPage";
export { NotificationInboxPage } from "./components/NotificationInboxPage";
export { RecipientReachCard } from "./components/RecipientReachCard";
export { NotificationHistoryTab } from "./components/NotificationHistoryTab";
export { NotificationInboxTab } from "./components/NotificationInboxTab";
export { NotificationDetailDrawer } from "./components/NotificationDetailDrawer";
export {
  useGetRecipientSummaryQuery,
  useGetRecipientCountQuery,
  useSendRoleNotificationMutation,
  useSendBroadcastMutation,
  useGetNotificationHistoryQuery,
} from "./api/notificationApi";
export {
  selectUnreadCount,
  useGetNotificationInboxQuery,
  useMarkNotificationReadMutation,
  NOTIFICATION_INBOX_TAG,
} from "./api/notificationInboxApi";
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
  AdminNotification,
  AdminNotificationType,
  AdminNotificationCategory,
  AdminNotificationPriority,
  AdminNotificationInbox,
} from "./types/notification.types";
