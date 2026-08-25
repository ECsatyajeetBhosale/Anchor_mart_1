import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { mediaSrc } from "@/lib/mediaUrl";
import { MESSAGES } from "@/lib/messages";
import {
  IconMessages,
  IconPaperclip,
  IconPencil,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  MESSAGE_PAGE_SIZE,
  useGetChatMessagesQuery,
  useUploadChatMediaMutation,
} from "../api/chatApi";
import type { ChatSocketApi } from "../hooks/useChatSocket";
import { isFromAdmin, resolveChatRole } from "../lib/chatRoles";
import type { ChatMessage, ChatThread, UploadMessageType } from "../types/chat.types";
import { ChatComposer } from "./ChatComposer";
import { OrderContextStrip } from "./OrderContextStrip";

const M = MESSAGES.CHAT;

/** Formats one message's timestamp for the hover meta line. */
function formatTime(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export interface ChatMessagePaneProps {
  thread: ChatThread | null;
  socket: ChatSocketApi;
  /**
   * Online ids from the presence poll (§4.7), not from the socket — an admin
   * receives no presence frames, so the connection cannot answer this.
   */
  onlineUsers: ReadonlySet<string>;
}

/**
 * One thread: its history over REST, everything after that over the socket.
 *
 * Laid out to match the AnchorMart-1 chat monitor — admin replies right-aligned
 * in navy, the counterparty left in grey. Which side a message lands on is
 * decided against the thread **owner**, not a hardcoded id; see `isFromAdmin`.
 */
export function ChatMessagePane({ thread, socket, onlineUsers }: ChatMessagePaneProps) {
  const chatId = thread?.id;
  const { data, isLoading, isError, isFetching, refetch } = useGetChatMessagesQuery(
    { chatId: chatId ?? "", page: 1, limit: MESSAGE_PAGE_SIZE },
    { skip: !chatId },
  );

  const [uploadMedia, { isLoading: isUploading }] = useUploadChatMediaMutation();

  const bottomRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const [toDelete, setToDelete] = useState<ChatMessage | null>(null);
  const messages = data?.items ?? [];
  const messageCount = messages.length;
  const hasMessages = messageCount > 0;

  // Jump to the newest message when the thread changes or new ones arrive.
  // Guarded so an empty thread doesn't scroll a pane with nothing in it.
  useEffect(() => {
    if (!chatId || messageCount === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatId, messageCount]);

  // Opening a thread marks it read, which is what clears the sidebar badge.
  // Held until the history has actually landed — claiming to have read a
  // still-loading pane would be a lie, and `MessageSeen` marks the whole thread.
  const { markSeen } = socket;
  useEffect(() => {
    if (!chatId || isLoading || !hasMessages) return;
    markSeen();
  }, [chatId, isLoading, hasMessages, markSeen]);

  // A thread switch must not leave the previous thread's edit draft open.
  const draftForRef = useRef(chatId);
  if (draftForRef.current !== chatId) {
    draftForRef.current = chatId;
    if (editing) setEditing(null);
    if (toDelete) setToDelete(null);
  }

  if (!thread) {
    return (
      <div className="card flex items-center justify-center">
        <EmptyState
          icon={<IconMessages size={36} style={{ color: "var(--t4)" }} />}
          title={M.MESSAGES.PLACEHOLDER_TITLE}
          description={M.MESSAGES.PLACEHOLDER_BODY}
        />
      </div>
    );
  }

  const role = resolveChatRole(thread);
  const ownerId = thread.ownerId;

  /**
   * Whether *this* admin wrote the message, which is narrower than "the admin
   * side wrote it": support and order inboxes are worked by more than one
   * person, and labelling a colleague's reply "You" would misattribute it.
   * An optimistic row is ours by construction; anything else has to match the
   * id the socket learned for us, and stays under its author's name until it does.
   */
  const isSelf = (msg: ChatMessage) =>
    Boolean(msg.pending || (socket.selfUserId && msg.senderId === socket.selfUserId));

  /**
   * Sends an attachment (§4.4).
   *
   * Addressed by **order id on an order thread** and chat id on a support one —
   * the two are different parameters on the endpoint, and an order thread keyed
   * by its chat id would be accepted for the wrong conversation.
   *
   * Nothing is appended here on success. The server broadcasts the created
   * message to every participant as a normal `chat_message` frame, so the socket
   * already puts it in the thread exactly once; adding the response as well is
   * how a sender sees their own attachment twice.
   */
  const handleAttach = async (file: File, messageType: UploadMessageType, caption: string) => {
    try {
      await uploadMedia({
        file,
        messageType,
        message: caption,
        ...(thread.order ? { orderId: thread.order.id } : { chatId: thread.id }),
      }).unwrap();
    } catch (error) {
      // 413 is the size limit and 400 is usually the byte-sniff rejecting a
      // renamed file; the composer pre-flights both, so reaching here means the
      // server disagreed with us and its own wording is the more useful one.
      const detail = (error as { data?: { detail?: unknown } })?.data?.detail;
      toast.error(typeof detail === "string" && detail ? detail : M.COMPOSER.UPLOAD_FAILED);
    }
  };

  const isOnline = Boolean(ownerId && onlineUsers.has(ownerId));
  const offlineNotice = socket.authError ?? (socket.status === "open" ? null : M.SOCKET.QUEUED);
  const typingCount = socket.typingSenders.length;

  // The status line under the name: what this person is doing, not just who
  // they are. Order threads carry the order; support threads have only contact.
  const contextLine = thread.order
    ? `${M.MESSAGES.ORDER_PREFIX} ${thread.order.orderNumber} · ${thread.order.status}`
    : (thread.email ?? M.DASH);

  return (
    <div className="card flex flex-col overflow-hidden">
      {/* Thread header — avatar, name + role badge, presence line, then the
          identifier and the live/refresh controls. */}
      <div
        className="flex items-center gap-3 border-b border-[var(--border-xs)]"
        style={{ padding: "13px 18px" }}
      >
        <div className={`av ${role.avatarClass} shrink-0`}>
          {thread.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-[3px] flex items-center gap-2">
            <span className="w7 c1 trunc">{thread.name}</span>
            <Badge variant={role.badgeVariant}>{role.label}</Badge>
            {/* Shown **only** on a confirmed-true presence result. Nothing is
                rendered otherwise: the endpoint answers for the ids it was
                asked about, so "not online" also covers "never asked", and
                labelling that "Offline" would state something the server never
                said. A missing marker means "no claim", not "away". */}
            {isOnline && (
              <span
                className="sdot on xs csuccess shrink-0"
                title={M.PRESENCE.RECENT_HINT}
                aria-label={M.PRESENCE.RECENT}
              >
                {M.PRESENCE.RECENT}
              </span>
            )}
          </div>
          <div className="xs c4 w6 trunc">{contextLine}</div>
        </div>

        {thread.orderNumber && (
          <span className="badge badge-neutral mono shrink-0">{thread.orderNumber}</span>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-sm shrink-0"
          onClick={() => refetch()}
          disabled={isFetching}
          title={M.MESSAGES.REFRESH}
        >
          <IconRefresh size={15} />
        </button>
      </div>

      {/* §5 — the order, pinned between the header and the messages. Present
          only on order threads, which is exactly what a non-null `order` means.
          It renders from this row immediately and never gates the pane below. */}
      {thread.order && <OrderContextStrip chatId={thread.id} order={thread.order} />}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {isError ? (
          <p className="text-center text-[12.5px] font-semibold text-[var(--danger-text)]">
            {M.MESSAGES.FETCH_ERROR}
          </p>
        ) : isLoading ? (
          <p className="text-center text-[12.5px] font-medium text-[var(--t4)]">
            {MESSAGES.COMMON.LOADING}
          </p>
        ) : !hasMessages ? (
          <p className="text-center text-[12.5px] font-medium text-[var(--t4)]">
            {M.MESSAGES.EMPTY}
          </p>
        ) : (
          messages.map((msg) => {
            const sent = isFromAdmin(msg, ownerId);
            return (
              <div
                key={msg.id}
                className={`group flex flex-col gap-1 ${msg.pending ? "opacity-60" : ""}`}
                style={{ alignItems: sent ? "flex-end" : "flex-start" }}
              >
                <div className={`chat-bubble ${sent ? "sent" : "recv"}`}>
                  {msg.isDeleted ? (
                    <span className="italic opacity-70">{M.MESSAGES.DELETED}</span>
                  ) : (
                    <>
                      {msg.content && <span className="whitespace-pre-wrap">{msg.content}</span>}
                      {msg.media &&
                        (msg.messageType === "image" ? (
                          <img
                            src={mediaSrc(msg.media)}
                            alt={M.MESSAGES.ATTACHMENT}
                            className="mt-1.5 max-h-[220px] rounded-[var(--radius-sm)]"
                          />
                        ) : (
                          <a
                            href={mediaSrc(msg.media)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1.5 font-bold underline"
                          >
                            <IconPaperclip size={14} />
                            {M.MESSAGES.ATTACHMENT}
                          </a>
                        ))}
                    </>
                  )}
                </div>

                {/* Meta + moderation, revealed on hover so the transcript stays
                    clean. An admin may edit or delete any message in a thread
                    they can already reach; the server treats an id outside the
                    thread as not-found, so it cannot probe another conversation. */}
                <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="xs c4 w6">
                    {isSelf(msg) ? M.MESSAGES.YOU : msg.senderName} · {formatTime(msg.createdAt)}
                  </span>
                  {msg.isEdited && <span className="xs c4 italic">{M.COMPOSER.EDITED}</span>}
                  {!msg.isDeleted && !msg.pending && (
                    <>
                      <button
                        type="button"
                        title={M.COMPOSER.EDIT}
                        className="text-[var(--t4)] hover:text-[var(--teal-600)]"
                        onClick={() => setEditing({ id: msg.id, content: msg.content })}
                      >
                        <IconPencil size={13} />
                      </button>
                      <button
                        type="button"
                        title={M.COMPOSER.DELETE}
                        className="text-[var(--t4)] hover:text-[var(--danger-text)]"
                        onClick={() => setToDelete(msg)}
                      >
                        <IconTrash size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}

        {typingCount > 0 && (
          <p className="xs c4 italic">
            {typingCount === 1 ? M.COMPOSER.TYPING_ONE : M.COMPOSER.TYPING_MANY(typingCount)}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatComposer
        // A terminal auth failure is the one state where typing is pointless:
        // the socket will not retry, so the frame could never be delivered.
        disabled={Boolean(socket.authError)}
        offlineNotice={offlineNotice}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        onSend={socket.sendMessage}
        onSubmitEdit={socket.editMessage}
        onTyping={socket.notifyTyping}
        onStoppedTyping={socket.notifyStoppedTyping}
        onAttach={handleAttach}
        isUploading={isUploading}
      />

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) socket.deleteMessage(toDelete.id);
          setToDelete(null);
        }}
        title={M.COMPOSER.CONFIRM_DELETE_TITLE}
        description={M.COMPOSER.CONFIRM_DELETE_BODY}
        confirmText={M.COMPOSER.DELETE}
      />
    </div>
  );
}

export default ChatMessagePane;
