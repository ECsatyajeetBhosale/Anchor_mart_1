// Public API for the admin notification console — import only from here.
export { NotificationsPage } from "./components/NotificationsPage";
export { RecipientReachCard } from "./components/RecipientReachCard";
export {
  useGetRecipientSummaryQuery,
  useGetRecipientCountQuery,
  useSendRoleNotificationMutation,
  useSendBroadcastMutation,
} from "./api/notificationApi";
export {
  NOTIFICATION_ROLES,
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_TRAITS,
} from "./types/notification.types";
export type {
  NotificationRole,
  NotificationType,
  RecipientSummary,
} from "./types/notification.types";
