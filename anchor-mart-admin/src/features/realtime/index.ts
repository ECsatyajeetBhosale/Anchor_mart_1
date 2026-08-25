export { useRealtimeBadges, requestBadgeSync } from "./hooks/useRealtimeBadges";
export { ConnectionStatus } from "./components/ConnectionStatus";
export { EventsSocket } from "./lib/eventsSocket";
export { authFailureAction } from "./lib/authFailure";
export {
  isSoundMuted,
  setSoundMuted,
  subscribeSoundMuted,
  playNotificationSound,
  installAudioUnlock,
} from "./lib/notificationSound";
export type { AuthFailureAction } from "./lib/authFailure";
export {
  tagsToInvalidate,
  tagsForQueues,
  tagsForRoute,
  routeForQueue,
} from "./lib/badgeRefetch";
export { showSignalToast, showBadgeToast } from "./lib/arrivalToast";
export { RefetchCoalescer } from "./lib/refetchCoalescer";
export {
  default as realtimeReducer,
  applyBadge,
  setSocketStatus,
  setAuthError,
  resetRealtime,
} from "./slice/realtimeSlice";
export type { RealtimeState } from "./slice/realtimeSlice";
export {
  EMPTY_BADGE_COUNTS,
  isBadgeQueue,
  isSignalScreen,
  sameCounts,
  type MineCounts,
  type OwnedBadgeQueue,
  type BadgeChanged,
  type BadgeCounts,
  type BadgeFrame,
  type BadgeQueue,
  type BadgeDelta,
  type EventsAuthErrorCode,
  type SignalFrame,
  type SignalScreen,
  type SocketStatus,
} from "./types/realtime.types";
