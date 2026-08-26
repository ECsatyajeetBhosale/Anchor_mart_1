import { playNotificationSound } from "@/features/realtime";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { MESSAGES } from "@/lib/messages";
import type { RootState } from "@/store";
import {
  type ReactNode,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector, useStore } from "react-redux";
import { toast } from "sonner";
import { chatApi } from "../api/chatApi";
import { ChatSocket } from "../lib/chatSocket";
import {
  type UnreadCategory,
  applyUnreadSummary,
  chatMessageArrived,
  chatThreadRead,
  resetChatUnread,
} from "../slice/chatUnreadSlice";
import type { InboundFrame, OutboundFrame, SocketStatus } from "../types/chat.types";

const M = MESSAGES.CHAT;

/**
 * How long to wait after a burst of frames before reconciling the badge.
 *
 * The local increment lights the dot instantly (§9.2 rule 2); this fetch only
 * corrects the per-category numbers, which nobody is reading in the same second.
 * Debouncing collapses a busy morning's frames into one request — and this is
 * event-driven, not the timer §9.1 forbids: an idle panel makes no calls at all.
 */
const RECONCILE_DEBOUNCE_MS = 4_000;

export interface ChatSocketContextValue {
  status: SocketStatus;
  /** Set on a terminal auth failure. The socket will not retry after one. */
  authError: string | null;
  /** Sends a frame, queueing it if the socket is momentarily down. */
  send: (frame: OutboundFrame) => void;
  /** Registers a frame listener. Returns its unsubscribe. */
  subscribe: (listener: (frame: InboundFrame) => void) => () => void;
  /**
   * Tells the provider which thread is open, so its messages are not counted as
   * unread and its dot contribution is retracted on open.
   */
  setActiveChatId: (chatId: string | null) => void;
  /** This admin's user id, from the auth payload. Null only if it is absent. */
  selfUserId: string | null;
}

export const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

/**
 * Resolves a chat id to its badge category by looking through the loaded lists.
 *
 * The socket frame carries `chat_type` (`private` / `order` / `group`), which
 * cannot distinguish `user_support` from `delivery_support` or `order` from
 * `order_delivery` — so the category is recovered from the row if we happen to
 * have it, and reported as unknown if we do not. Unknown is safe: the app-level
 * dot reads the id list, and the reconciling fetch fixes the breakdown.
 */
function resolveCategory(state: RootState, chatId: string): UnreadCategory | null {
  const selectors = [
    chatApi.endpoints.getUserChats.select(undefined),
    chatApi.endpoints.getDeliveryChats.select(undefined),
  ];
  for (const select of selectors) {
    const row = select(state).data?.items.find((t) => t.id === chatId);
    if (row?.category) return row.category;
  }
  // The order list is cached per `category` argument, so every cached variant is
  // searched rather than guessing which filter was last applied.
  for (const entry of Object.values(state[chatApi.reducerPath].queries)) {
    if (entry?.endpointName !== "getOrderChats") continue;
    const data = entry.data as { items?: { id: string; category: UnreadCategory | null }[] };
    const row = data?.items?.find((t) => t.id === chatId);
    if (row?.category) return row.category;
  }
  return null;
}

/**
 * One chat websocket for the whole panel (Flow 23 §2, §9).
 *
 * Mounted in the app shell rather than on the chat screens, because §9 requires
 * the red dot to light **whatever screen is showing** — a socket that only
 * exists while a chat screen is mounted cannot do that. It also fixes a second
 * problem the per-screen socket had: navigating between the three chat inboxes
 * tore the connection down and rebuilt it, dropping queued frames each time.
 *
 * Screens subscribe for the frames they care about; the provider itself only
 * cares about the badge.
 */
export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const token = useSelector((s: RootState) => s.auth.token);
  const selfUserId = useSelector((s: RootState) => s.auth.user?.id ?? null);

  const [status, setStatus] = useState<SocketStatus>("idle");
  const [authError, setAuthError] = useState<string | null>(null);

  const socketRef = useRef<ChatSocket | null>(null);
  const listenersRef = useRef(new Set<(frame: InboundFrame) => void>());
  const activeChatIdRef = useRef<string | null>(null);
  const selfUserIdRef = useRef(selfUserId);
  selfUserIdRef.current = selfUserId;
  const reconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Fetches the authoritative badge (§9.1). Used at launch and on reconnect. */
  const fetchSummary = useCallback(() => {
    dispatch(chatApi.endpoints.getChatUnreadSummary.initiate(undefined, { forceRefetch: true }))
      .unwrap()
      .then((summary) => dispatch(applyUnreadSummary(summary)))
      // A failed badge fetch must never surface: the dot is an enhancement on
      // top of the inboxes, and a toast about it would be noise the admin can
      // do nothing with. The next reconnect or reload tries again.
      .catch(() => undefined);
  }, [dispatch]);

  /**
   * Re-seeds the badge **and** the inbox lists after a burst of frames.
   *
   * The lists are what carry `last_message_at`, and that is what they are now
   * ordered by — so without this a thread someone just wrote in keeps its old
   * position until the admin navigates away and back. The socket frame does not
   * carry enough to reorder locally (no timestamp, no row), so the list is
   * refetched rather than patched.
   *
   * All three ids are invalidated because the frame does not say which inbox the
   * thread belongs to. RTK Query only refetches queries that something is
   * currently subscribed to, and an admin is on at most one inbox, so this is
   * one request in practice rather than three.
   *
   * Shares the existing 4s debounce, which is what keeps a fast exchange from
   * refetching per message. It is event-driven, not the polling §9.1 forbids.
   */
  const scheduleReconcile = useCallback(() => {
    if (reconcileTimerRef.current) return;
    reconcileTimerRef.current = setTimeout(() => {
      reconcileTimerRef.current = null;
      fetchSummary();
      dispatch(
        chatApi.util.invalidateTags([
          { type: "Chats", id: "SUPPORT-LIST" },
          { type: "Chats", id: "DELIVERY-LIST" },
          { type: "Chats", id: "ORDER-LIST" },
        ]),
      );
    }, RECONCILE_DEBOUNCE_MS);
  }, [dispatch, fetchSummary]);

  const setActiveChatId = useCallback(
    (chatId: string | null) => {
      activeChatIdRef.current = chatId;
      // Opening a thread reads it, so its local contribution to the dot goes.
      if (chatId) dispatch(chatThreadRead(chatId));
    },
    [dispatch],
  );

  /** The provider's own interest in a frame: the badge, and nothing else. */
  const updateBadge = useCallback(
    (frame: InboundFrame) => {
      const chatId = frame.chat_id === undefined ? null : String(frame.chat_id);

      if (frame.type === "chat_message") {
        if (!chatId) return;

        // Any message moves its thread to the top of the inbox — including our
        // own, and including one in the thread that is already open. Ordering is
        // not a notification, so it is settled before either suppression below.
        scheduleReconcile();

        // Rule 3: our own message echoed back is never unread and never a dot.
        if (frame.sender && frame.sender === selfUserIdRef.current) return;
        // The open thread is being read — the pane appends it and sends
        // `MessageSeen`, so counting it would light a dot the admin is looking at.
        if (chatId === activeChatIdRef.current) return;

        dispatch(
          chatMessageArrived({ chatId, category: resolveCategory(store.getState(), chatId) }),
        );

        // The same chime the intent and order queues use, on the same terms: it
        // fires for a hidden tab (that is the case it exists for), it is muted by
        // the one header toggle, and it is throttled to one per 3s internally —
        // which is what keeps a burst of messages from stuttering. Deliberately
        // after both returns: a sound for a message this admin just sent, or for
        // the thread they are reading, is noise attached to nothing new.
        playNotificationSound();
        return;
      }

      // §3.2: `sender` is whoever *read*, not the author. Our own id here means
      // this admin read the thread somewhere — another tab, another device, or
      // our own `MessageSeen` echo — so the badge has to be re-evaluated.
      if (frame.type === "message_seen" && frame.sender === selfUserIdRef.current) {
        if (chatId) dispatch(chatThreadRead(chatId));
        scheduleReconcile();
      }
    },
    [dispatch, scheduleReconcile, store],
  );

  useEffect(() => {
    if (!token) {
      socketRef.current?.close();
      socketRef.current = null;
      setStatus("idle");
      // Logged out: the counts are privileged, like every other number here.
      dispatch(resetChatUnread());
      return;
    }

    setAuthError(null);

    const socket = new ChatSocket(token, {
      onStatus: (next) => {
        setStatus(next);
        // §9.1: frames sent while the socket was down are **not replayed**, so
        // every open — first connect and every reconnect alike — re-seeds the
        // badge. This is the one thing that keeps the dot honest across a blip.
        if (next === "open") fetchSummary();
      },
      onAuthError: (code, detail) => {
        setAuthError(detail || M.SOCKET.AUTH_ERROR(code));
        setStatus("error");
      },
      onError: (message) => toast.error(message),
      onFrame: (frame) => {
        updateBadge(frame);
        for (const listener of listenersRef.current) listener(frame);
      },
    });

    socketRef.current = socket;
    socket.connect();

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [token, dispatch, fetchSummary, updateBadge]);

  useEffect(
    () => () => {
      if (reconcileTimerRef.current) clearTimeout(reconcileTimerRef.current);
    },
    [],
  );

  const send = useCallback((frame: OutboundFrame) => {
    socketRef.current?.send(frame);
  }, []);

  const subscribe = useCallback((listener: (frame: InboundFrame) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo<ChatSocketContextValue>(
    () => ({ status, authError, send, subscribe, setActiveChatId, selfUserId }),
    [status, authError, send, subscribe, setActiveChatId, selfUserId],
  );

  return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>;
}

export default ChatSocketProvider;
