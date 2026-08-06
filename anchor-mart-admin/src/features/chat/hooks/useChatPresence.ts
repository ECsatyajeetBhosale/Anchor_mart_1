import { useMemo } from "react";
import { PRESENCE_MAX_IDS, PRESENCE_POLL_MS, useGetChatPresenceQuery } from "../api/chatApi";
import type { ChatThread } from "../types/chat.types";

export interface ChatPresenceApi {
  /** User ids currently online, per the last poll. */
  onlineUsers: ReadonlySet<string>;
  /**
   * How long a presence marker survives without activity, from the server.
   * A dot may be up to this stale — surface it as "as of…", not as live truth.
   */
  ttlSeconds: number;
  /** True while the first poll for the current roster is still in flight. */
  isLoading: boolean;
}

/**
 * Presence for the threads on screen (Flow 23 §4.7).
 *
 * **Polled, not pushed.** Admins receive no presence frames on the chat socket:
 * broadcasting every connect/disconnect made the cost scale with connection-event
 * volume, which is precisely what spikes in a reconnect storm — the storm and the
 * cost of handling it were structurally coupled. Polling bounds the cost by
 * frequency × roster size instead.
 *
 * The roster is taken from the **rendered** threads, never from a global "who is
 * online" query — no such mode exists, deliberately: the presence store is
 * per-user keys carrying their own TTL, which is what lets a crashed worker's
 * ghost entry self-heal, and enumerating would mean maintaining a parallel set
 * that breaks exactly that.
 *
 * Each row's `owner_is_online` seeds the map so the list paints correctly on
 * first render rather than flashing presence in once the first poll lands.
 */
export function useChatPresence(threads: readonly ChatThread[]): ChatPresenceApi {
  // Only the owner's presence is ever exposed — an admin's never is — so the
  // roster is exactly the thread owners, deduped and capped at what the endpoint
  // accepts. Sorted so a re-render in a different order does not look like a new
  // query and restart the poll.
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    for (const thread of threads) {
      const id = thread.owner?.id;
      if (id) ids.add(id);
    }
    return [...ids].sort().slice(0, PRESENCE_MAX_IDS);
  }, [threads]);

  const { data, isLoading } = useGetChatPresenceQuery(userIds, {
    skip: userIds.length === 0,
    pollingInterval: PRESENCE_POLL_MS,
    // Presence at the moment the screen is looked at is the whole point.
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const onlineUsers = useMemo(() => {
    const online = new Set<string>();
    // Seed from the list payload first so the very first paint is right, then
    // let the poll's answer win for any id it actually covered.
    for (const thread of threads) {
      if (thread.ownerIsOnline && thread.owner?.id) online.add(thread.owner.id);
    }
    if (data) {
      for (const [id, isOnline] of Object.entries(data.presence)) {
        if (isOnline) online.add(id);
        else online.delete(id);
      }
    }
    return online;
  }, [threads, data]);

  return { onlineUsers, ttlSeconds: data?.ttlSeconds ?? 0, isLoading };
}

export default useChatPresence;
