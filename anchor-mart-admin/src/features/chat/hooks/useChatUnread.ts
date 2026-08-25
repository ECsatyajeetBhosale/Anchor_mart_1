import { useAppSelector } from "@/hooks/useAppDispatch";
import { useMemo } from "react";
import type { UnreadCategory } from "../slice/chatUnreadSlice";

export interface ChatUnreadApi {
  /** True when anything anywhere is unread — the app-level dot (§9.2 rule 4). */
  hasUnread: boolean;
  /** Total unread messages. Only render this if a count can be kept accurate. */
  total: number;
  /** True when any of the given categories is unread. */
  hasUnreadIn: (categories: readonly UnreadCategory[] | undefined) => boolean;
}

/**
 * Reads the chat red dot (Flow 23 §9).
 *
 * The app-level answer is `hasUnread` **or** any thread the socket lit since the
 * last summary fetch — the second half matters because a frame arriving between
 * fetches is precisely the case the dot exists for, and the server's boolean is
 * stale by then.
 *
 * §9.2 rule 4: reading one thread of three clears that thread's count, not the
 * dot. That falls out of this rather than needing enforcing — the dot is a
 * question about the whole set.
 */
export function useChatUnread(): ChatUnreadApi {
  const { hasUnread, total, byCategory, unreadChatIds } = useAppSelector((s) => s.chatUnread);

  return useMemo(() => {
    const liveIds = unreadChatIds.length > 0;
    return {
      hasUnread: hasUnread || liveIds,
      total,
      hasUnreadIn: (categories) => {
        if (!categories || categories.length === 0) return false;
        return categories.some((category) => byCategory[category] > 0);
      },
    };
  }, [hasUnread, total, byCategory, unreadChatIds]);
}

export default useChatUnread;
