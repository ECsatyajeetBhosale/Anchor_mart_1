import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { chatApi, messagesCacheKey } from "../api/chatApi";
import { ChatSocketContext } from "../context/ChatSocketProvider";
import {
  applyDelete,
  applyEdit,
  frameToMessage,
  mergeIncomingMessage,
  optimisticMessage,
} from "../lib/chatCache";
import type {
  InboundFrame,
  OutboundFrame,
  SocketChatType,
  SocketStatus,
} from "../types/chat.types";

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
  /** This admin's own user id, so their own messages can be told apart. */
  selfUserId: string | null;
  sendMessage: (text: string) => void;
  notifyTyping: () => void;
  notifyStoppedTyping: () => void;
  markSeen: () => void;
  editMessage: (messageId: string, text: string) => void;
  deleteMessage: (messageId: string) => void;
}

/**
 * Binds one chat screen to the app-level socket (Flow 23 §2).
 *
 * The connection itself lives in {@link ChatSocketProvider}, mounted in the app
 * shell — this hook subscribes to it. That split is what §9 requires: the red
 * dot has to light on **every** screen, so the socket cannot belong to the chat
 * screens. It also means switching between the three inboxes no longer tears the
 * connection down and rebuilds it.
 *
 * Frames for the open thread patch its message cache in place; frames for any
 * other thread only invalidate the list, so an unread badge updates without
 * refetching a conversation nobody is reading.
 *
 * ⚠️ Frames are dispatched on the **`type` string**, not the integer `msg_type`.
 * Both are on the wire and they agree, but §3 is explicit that a client picks
 * one and uses it consistently — reading both is how the two drift apart
 * unnoticed when one of them gains a value.
 */
export function useChatSocket({
  activeChatId,
  chatType,
  listTag,
  senderName,
}: UseChatSocketArgs): ChatSocketApi {
  const dispatch = useAppDispatch();
  const ctx = useContext(ChatSocketContext);
  if (!ctx) {
    throw new Error("useChatSocket must be used inside <ChatSocketProvider>.");
  }
  const { subscribe, send: sendFrame, setActiveChatId, status, authError, selfUserId } = ctx;

  const [typing, setTyping] = useState<Record<string, number>>({});
  const lastTypingSentRef = useRef(0);

  // Read inside the frame listener, which is registered once and would otherwise
  // capture whichever thread was open at registration time.
  const activeChatIdRef = useRef(activeChatId);
  activeChatIdRef.current = activeChatId;

  // Tell the provider which thread is being read, so its messages are not
  // counted toward the badge and its dot contribution is retracted.
  useEffect(() => {
    setActiveChatId(activeChatId);
    return () => setActiveChatId(null);
  }, [activeChatId, setActiveChatId]);

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

      switch (frame.type) {
        case "chat_message": {
          patch((draft) => mergeIncomingMessage(draft, frameToMessage(frame)));
          // Either way the list's preview and unread badge are now stale.
          refreshList();
          break;
        }

        case "message_edited":
          patch((draft) => applyEdit(draft, frame));
          break;

        case "message_deleted":
          patch((draft) => applyDelete(draft, frame));
          refreshList();
          break;

        case "user_typing":
          if (isActive && frame.sender) {
            const sender = frame.sender;
            setTyping((prev) => ({ ...prev, [sender]: Date.now() }));
          }
          break;

        case "user_stopped_typing":
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

        case "message_seen":
          // A read receipt moves the list's unread badge, nothing in the pane.
          refreshList();
          break;

        // Presence frames are **not delivered to admins** (§3.5): they go to
        // delivery partners only. The online dots come from polling
        // `…/chat/presence/` instead — see `useChatPresence`. These stay
        // enumerated so a future reader does not "restore" a listener that can
        // never fire here.
        case "user_went_online":
        case "user_went_offline":
          break;

        default:
          // Unknown frame types are ignored rather than thrown on. The socket is
          // shared with the badge, and a throw here would cost that too.
          break;
      }
    },
    [dispatch, listTag],
  );

  useEffect(() => subscribe(handleFrame), [subscribe, handleFrame]);

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
      sendFrame({ chat_type: chatType, receiver_id: chatId, ...frame });
    },
    [chatType, sendFrame],
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

      send({ msg_type: "NewMessage", message: trimmed });
    },
    [dispatch, send, senderName],
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
    selfUserId,
    sendMessage,
    notifyTyping,
    notifyStoppedTyping,
    markSeen,
    editMessage,
    deleteMessage,
  };
}
