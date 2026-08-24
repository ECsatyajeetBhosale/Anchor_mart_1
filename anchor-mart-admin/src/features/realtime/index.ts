export { useRealtimeBadges, requestBadgeSync } from "./hooks/useRealtimeBadges";
export { ConnectionStatus } from "./components/ConnectionStatus";
export { EventsSocket } from "./lib/eventsSocket";
export { authFailureAction } from "./lib/authFailure";
export type { AuthFailureAction } from "./lib/authFailure";
export { tagsToInvalidate, tagsForQueues, tagsForRoute } from "./lib/badgeRefetch";
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
  sameCounts,
  type MineCounts,
  type OwnedBadgeQueue,
  type BadgeChanged,
  type BadgeCounts,
  type BadgeFrame,
  type BadgeQueue,
  type EventsAuthErrorCode,
  type SocketStatus,
} from "./types/realtime.types";
