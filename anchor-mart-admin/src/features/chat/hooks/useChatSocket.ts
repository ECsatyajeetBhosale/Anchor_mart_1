import { useAppDispatch, useAppSelector } from "@/hooks/useAppDispatch";
import { MESSAGES } from "@/lib/messages";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { chatApi, messagesCacheKey } from "../api/chatApi";
import {
  applyDelete,
  applyEdit,
  frameToMessage,
  mergeIncomingMessage,
  optimisticMessage,
} from "../lib/chatCache";
import { ChatSocket } from "../lib/chatSocket";
import {
  type InboundFrame,
  InboundMsgType,
  type OutboundFrame,
  type SocketChatType,
  type SocketStatus,
} from "../types/chat.types";

const M = MESSAGES.CHAT;

/** How long a typing indicator survives without a refreshing frame. */
const TYPING_TTL_MS = 5_000;
/** Minimum gap between outbound `UserTyping` frames while someone keeps typing. */
const TYPING_THROTTLE_MS = 2_000;

/** Which list cache a screen's rows live in. */
export type ChatListTag = "SUPPORT-LIST" | "DELIVERY-LIST" | "ORDER-LIST";

export interface UseChatSocketArgs {
  /** The open thread. Frames for it patch its message cache directly. */
  activeChatId: string | null;
  /** How to address the open thread when sending. */
  chatType: SocketChatType;
  /** List cache to refresh when a frame lands for some *other* thread. */
  listTag: ChatListTag;
  /** Display name attached to optimistic rows until the echo replaces them. */
  senderName: string;
}

export interface ChatSocketApi {
  status: SocketStatus;
  /** Set once a terminal auth failure occurs; the socket will not retry. */
  authError: string | null;
  /** Sender ids currently typing in the open thread. */
  typingSenders: string[];
  /**
   * User ids known to be connected right now.
   *
   * Every connecting user is announced to the whole admin team (§2.3), so this
   * is authoritative for the people in these inboxes. It starts empty on each
   * connect — presence is announced on *transitions*, so someone already online
   * before this socket opened stays unknown until they next act.
   */
  onlineUsers: ReadonlySet<string>;
  /**
   * This admin's own user id, once known.
   *
   * The auth payload carries only email and role, so the id is **learned**: the
   * server echoes our own sends back, and the first echo matching something we
   * just typed identifies us. Null until then — which is why callers must treat
   * "unknown" as "not me" rather than guessing.
   */
  selfUserId: string | null;
  sendMessage: (text: string) => void;
  notifyTyping: () => void;
  notifyStoppedTyping: () => void;
  markSeen: () => void;
  editMessage: (messageId: string, text: string) => void;
  deleteMessage: (messageId: string) => void;
}

/**
 * Binds the chat websocket to the RTK Query cache (Flow 23 §2).
 *
 * One socket per mounted chat screen, rebuilt only when the token changes.
 * Frames for the open thread patch its message cache in place; frames for any
 * other thread only invalidate the list, so an unread badge updates without
 * refetching a conversation nobody is reading.
 */
export function useChatSocket({
  activeChatId,
  chatType,
  listTag,
  senderName,
}: UseChatSocketArgs): ChatSocketApi {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);

  const [status, setStatus] = useState<SocketStatus>("idle");
  const [authError, setAuthError] = useState<string | null>(null);
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [online, setOnline] = useState<ReadonlySet<string>>(() => new Set());
  const [selfUserId, setSelfUserId] = useState<string | null>(null);

  const socketRef = useRef<ChatSocket | null>(null);
  const lastTypingSentRef = useRef(0);
  // Text we have just sent and not yet seen echoed. Used once, to learn our own
  // user id — see `selfUserId`. Kept small: entries are removed on match.
  const awaitingEchoRef = useRef<Set<string>>(new Set());
  // Read inside socket callbacks, which are created once per connection and
  // would otherwise capture whichever thread was open when it was created.
  const activeChatIdRef = useRef(activeChatId);
  activeChatIdRef.current = activeChatId;

  /* ── inbound frames ──────────────────────────────────────────────────────── */

  const handleFrame = useCallback(
    (frame: InboundFrame) => {
      const chatId = frame.chat_id === undefined ? null : String(frame.chat_id);
      const isActive = chatId !== null && chatId === activeChatIdRef.current;
      const patch = (apply: (draft: Parameters<typeof mergeIncomingMessage>[0]) => void) => {
        if (!isActive || !chatId) return;
        dispatch(chatApi.util.updateQueryData("getChatMessages", messagesCacheKey(chatId), apply));
      };
      const refreshList = () =>
        dispatch(chatApi.util.invalidateTags([{ type: "Chats", id: listTag }]));

      switch (frame.msg_type) {
        case InboundMsgType.ChatMessage: {
          // An echo of something we just typed tells us which sender id is us —
          // the only way to know, since the auth payload has no user id.
          const echoed = frame.content ?? "";
          if (frame.sender && awaitingEchoRef.current.delete(echoed)) {
            setSelfUserId(frame.sender);
          }
          patch((draft) => mergeIncomingMessage(draft, frameToMessage(frame)));
          // Either way the list's preview and unread badge are now stale.
          refreshList();
          break;
        }

        case InboundMsgType.MessageEdited:
          patch((draft) => applyEdit(draft, frame));
          break;

        case InboundMsgType.MessageDeleted:
          patch((draft) => applyDelete(draft, frame));
          refreshList();
          break;

        case InboundMsgType.UserTyping:
          if (isActive && frame.sender) {
            const sender = frame.sender;
            setTyping((prev) => ({ ...prev, [sender]: Date.now() }));
          }
          break;

        case InboundMsgType.UserStoppedTyping:
          if (frame.sender) {
            const sender = frame.sender;
            setTyping((prev) => {
              if (!(sender in prev)) return prev;
              const next = { ...prev };
              delete next[sender];
              return next;
            });
          }
          break;

        case InboundMsgType.MessageSeen:
          // A read receipt moves the list's unread badge, nothing in the pane.
          refreshList();
          break;

        // Presence frames carry no chat_id — they describe a user, not a
        // thread — so they are tracked by sender id and matched against each
        // thread's owner when the sidebar renders its online dots.
        case InboundMsgType.UserWentOnline:
        case InboundMsgType.UserWentOffline: {
          if (!frame.sender) break;
          const sender = frame.sender;
          const isOnline = frame.msg_type === InboundMsgType.UserWentOnline;
          setOnline((prev) => {
            if (prev.has(sender) === isOnline) return prev;
            const next = new Set(prev);
            if (isOnline) next.add(sender);
            else next.delete(sender);
            return next;
          });
          break;
        }

        default:
          break;
      }
    },
    [dispatch, listTag],
  );

  // Held in a ref so the connection effect depends on the token alone.
  // Reconnecting on every thread switch would drop queued frames and
  // re-announce this admin's presence to every partner.
  const handleFrameRef = useRef(handleFrame);
  handleFrameRef.current = handleFrame;

  /* ── connection lifecycle ────────────────────────────────────────────────── */

  useEffect(() => {
    if (!token) {
      setStatus("idle");
      return;
    }
    setAuthError(null);
    // Presence is announced on transitions, so a stale set from the previous
    // connection would show people as online who may have left while we were
    // disconnected. Starting empty under-reports rather than lies.
    setOnline(new Set());

    const socket = new ChatSocket(token, {
      onStatus: setStatus,
      onAuthError: (code, detail) => {
        setAuthError(detail || M.SOCKET.AUTH_ERROR(code));
        setStatus("error");
      },
      // In-band errors are per-frame and non-fatal ("Message text is required"),
      // so they surface as a toast and leave the connection alone.
      onError: (message) => toast.error(message),
      onFrame: (frame) => handleFrameRef.current(frame),
    });

    socketRef.current = socket;
    socket.connect();

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [token]);

  /* ── typing indicator upkeep ─────────────────────────────────────────────── */

  // Indicators expire on their own: a sender who disconnects mid-word never
  // sends `UserStoppedTyping`, and a stuck "typing…" is worse than none.
  useEffect(() => {
    if (Object.keys(typing).length === 0) return;
    const timer = setInterval(() => {
      const cutoff = Date.now() - TYPING_TTL_MS;
      setTyping((prev) => {
        const next = Object.fromEntries(Object.entries(prev).filter(([, at]) => at > cutoff));
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1_000);
    return () => clearInterval(timer);
  }, [typing]);

  // Switching threads must clear the previous one's indicators.
  const clearedForRef = useRef(activeChatId);
  if (clearedForRef.current !== activeChatId) {
    clearedForRef.current = activeChatId;
    if (Object.keys(typing).length > 0) setTyping({});
  }

  /* ── outbound frames ─────────────────────────────────────────────────────── */

  const send = useCallback(
    (frame: Omit<OutboundFrame, "chat_type" | "receiver_id">) => {
      const chatId = activeChatIdRef.current;
      if (!chatId) return;
      // An admin must always address the thread explicitly — only a
      // customer/partner may omit `receiver_id`, having exactly one thread.
      socketRef.current?.send({ chat_type: chatType, receiver_id: chatId, ...frame });
    },
    [chatType],
  );

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const chatId = activeChatIdRef.current;
      if (!trimmed || !chatId) return;

      // Render it immediately, flagged pending. The server echoes the send back
      // to its author, and that echo replaces this row (see mergeIncomingMessage).
      dispatch(
        chatApi.util.updateQueryData("getChatMessages", messagesCacheKey(chatId), (draft) => {
          draft.items.push(optimisticMessage(trimmed, senderName));
          draft.count += 1;
        }),
      );

      // Only worth recording until we have identified ourselves once.
      if (!selfUserId) awaitingEchoRef.current.add(trimmed);

      send({ msg_type: "NewMessage", message: trimmed });
    },
    [dispatch, send, senderName, selfUserId],
  );

  const notifyTyping = useCallback(() => {
    // Throttled: one frame every couple of seconds holds the indicator open,
    // and a frame per keystroke would flood the channel layer.
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return;
    lastTypingSentRef.current = now;
    send({ msg_type: "UserTyping" });
  }, [send]);

  const notifyStoppedTyping = useCallback(() => {
    lastTypingSentRef.current = 0;
    send({ msg_type: "UserStoppedTyping" });
  }, [send]);

  const markSeen = useCallback(() => {
    send({ msg_type: "MessageSeen" });
  }, [send]);

  const editMessage = useCallback(
    (messageId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      send({ msg_type: "MessageEdited", message_id: messageId, message: trimmed });
    },
    [send],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      send({ msg_type: "MessageDeleted", message_id: messageId });
    },
    [send],
  );

  const typingSenders = useMemo(() => Object.keys(typing), [typing]);

  return {
    status,
    authError,
    typingSenders,
    onlineUsers: online,
    selfUserId,
    sendMessage,
    notifyTyping,
    notifyStoppedTyping,
    markSeen,
    editMessage,
    deleteMessage,
  };
}
