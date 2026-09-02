import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { isMediaUploadEnabled } from "@/lib/appEnv";
import { mediaSrc } from "@/lib/mediaUrl";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconDotsVertical,
  IconMessages,
  IconPaperclip,
  IconPencil,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  MESSAGE_PAGE_SIZE,
  useGetChatMessagesQuery,
  useUploadChatMediaMutation,
} from "../api/chatApi";
import type { ChatSocketApi } from "../hooks/useChatSocket";
import {
  canEditMessage,
  canModerateMessage,
  isFromAdmin,
  isOwnMessage,
  resolveChatRole,
} from "../lib/chatRoles";
import type { ChatMessage, ChatThread, UploadMessageType } from "../types/chat.types";
import { ChatComposer } from "./ChatComposer";
import { OrderContextStrip } from "./OrderContextStrip";

const M = MESSAGES.CHAT;

/** How often the window is re-checked, so Edit disappears while the pane is open. */
const EDIT_WINDOW_TICK_MS = 30_000;

/** Formats one message's timestamp for the line inside its bubble. */
function formatTime(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Local calendar day of a timestamp — the key messages are grouped under. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * The separator's caption. The two most recent days are named rather than
 * dated: "Today" is read at a glance, where its date has to be worked out.
 */
function formatDayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(date) === dayKey(today)) return M.MESSAGES.DAY_TODAY;
  if (dayKey(date) === dayKey(yesterday)) return M.MESSAGES.DAY_YESTERDAY;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

interface DayGroup {
  key: string;
  label: string;
  items: ChatMessage[];
}

/**
 * Splits a transcript into consecutive same-day runs.
 *
 * Runs, not buckets: the list arrives in order, so a day is closed as soon as
 * the next message falls on a different one. An unparseable timestamp joins the
 * run it arrived in rather than opening a group captioned with a bad date.
 */
function groupByDay(messages: ChatMessage[]): DayGroup[] {
  const groups: DayGroup[] = [];

  for (const message of messages) {
    const date = new Date(message.createdAt);
    if (Number.isNaN(date.getTime())) {
      if (groups.length > 0) groups[groups.length - 1].items.push(message);
      continue;
    }

    const key = dayKey(date);
    const current = groups[groups.length - 1];
    if (current?.key === key) current.items.push(message);
    else groups.push({ key, label: formatDayLabel(date), items: [message] });
  }

  return groups;
}

export interface ChatMessagePaneProps {
  thread: ChatThread | null;
  socket: ChatSocketApi;
  /**
   * Online ids from the presence poll (§4.7), not from the socket — an admin
   * receives no presence frames, so the connection cannot answer this.
   */
  onlineUsers: ReadonlySet<string>;
  /**
   * Returns to the thread list. Only rendered below `lg`, where the two panes
   * stack and opening a thread covers the list entirely.
   */
  onBack?: () => void;
  /** Lets the page hide this pane when the two panes stack into one column. */
  className?: string;
}

/**
 * One thread: its history over REST, everything after that over the socket.
 *
 * Admin replies sit right in soft navy, the counterparty left in grey. Which
 * side a message lands on is decided against the thread **owner**, not a
 * hardcoded id; see `isFromAdmin`.
 */
export function ChatMessagePane({
  thread,
  socket,
  onlineUsers,
  onBack,
  className,
}: ChatMessagePaneProps) {
  const chatId = thread?.id;
  const { data, isLoading, isError, isFetching, refetch } = useGetChatMessagesQuery(
    { chatId: chatId ?? "", page: 1, limit: MESSAGE_PAGE_SIZE },
    { skip: !chatId },
  );

  const [uploadMedia, { isLoading: isUploading }] = useUploadChatMediaMutation();

  const scrollRef = useRef<HTMLDivElement>(null);
  /** The thread the pane has already jumped to the bottom of. */
  const landedOn = useRef<string | undefined>(undefined);
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const [toDelete, setToDelete] = useState<ChatMessage | null>(null);
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  // Re-read on a timer rather than at render: nothing else changes when a
  // message crosses twenty minutes, so without this the Edit button would sit
  // there until an unrelated update happened to repaint the pane.
  const [now, setNow] = useState(() => Date.now());
  const messages = useMemo(() => data?.items ?? [], [data]);
  const dayGroups = useMemo(() => groupByDay(messages), [messages]);
  const messageCount = messages.length;
  const hasMessages = messageCount > 0;

  /**
   * Puts the newest message at the bottom of the pane.
   *
   * Sets `scrollTop` on the container rather than calling `scrollIntoView` on
   * a trailing element: that walks up the tree and scrolls **every** scrollable
   * ancestor, which on this screen also nudged the page itself.
   */
  const scrollToLatest = useCallback((behavior: ScrollBehavior) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // Opening a thread lands **at** the bottom; later messages animate down to
  // it. Smooth on open meant watching the whole history scroll past, and on a
  // long thread the animation was still running when the reply was typed.
  useEffect(() => {
    if (!chatId || messageCount === 0) return;
    const isOpening = landedOn.current !== chatId;
    landedOn.current = chatId;
    scrollToLatest(isOpening ? "auto" : "smooth");
  }, [chatId, messageCount, scrollToLatest]);

  useEffect(() => {
    if (!chatId) return;
    const timer = setInterval(() => setNow(Date.now()), EDIT_WINDOW_TICK_MS);
    return () => clearInterval(timer);
  }, [chatId]);

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
      <div className={cn("card flex items-center justify-center", className)}>
        <EmptyState
          icon={<IconMessages size={36} className="text-[var(--t4)]" />}
          title={M.MESSAGES.PLACEHOLDER_TITLE}
          description={M.MESSAGES.PLACEHOLDER_BODY}
        />
      </div>
    );
  }

  const role = resolveChatRole(thread);
  const ownerId = thread.ownerId;

  // Bound to this admin's id once, so each row asks the same three questions
  // of the shared rules rather than restating them. Gating on *whose* message
  // it is — not which side of the pane it sits on — is the point: the desk is
  // worked by several admins, and a colleague's wording is theirs to change.
  const selfId = socket.selfUserId;
  const isSelf = (msg: ChatMessage) => isOwnMessage(msg, selfId);
  const canModerate = (msg: ChatMessage) => canModerateMessage(msg, selfId);
  const canEdit = (msg: ChatMessage) => canEditMessage(msg, selfId, now);

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
    <div className={cn("card flex min-h-0 flex-col overflow-hidden", className)}>
      {/* Thread header — avatar, name + role, presence line, and the thread menu.
          Kept to who this is: the order and its detail live in the strip below,
          which is where an admin looks for them. */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--border-xs)] px-[18px] py-[13px]">
        {onBack && (
          <button
            type="button"
            className="-ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--t3)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--t1)] lg:hidden"
            onClick={onBack}
            title={M.THREADS.BACK}
            aria-label={M.THREADS.BACK}
          >
            <IconArrowLeft size={18} />
          </button>
        )}

        <div className={`av ${role.avatarClass} shrink-0`}>
          {thread.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-[3px] flex items-center gap-2">
            <span className="w7 c1 trunc">{thread.name}</span>
            <Badge variant={role.badgeVariant}>{role.label}</Badge>
          </div>

          {/* Shown **only** on a confirmed-true presence result. The context
              line takes the slot otherwise: the endpoint answers for the ids it
              was asked about, so "not online" also covers "never asked", and
              labelling that "Offline" would state something the server never
              said. A missing marker means "no claim", not "away". */}
          {isOnline ? (
            <span
              className="sdot on xs csuccess"
              title={M.PRESENCE.RECENT_HINT}
              aria-label={M.PRESENCE.RECENT}
            >
              {M.PRESENCE.RECENT}
            </span>
          ) : (
            <div className="xs c4 w6 trunc">{contextLine}</div>
          )}
        </div>

        {thread.orderNumber && (
          <span className="badge badge-neutral mono shrink-0">{thread.orderNumber}</span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--t3)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--t1)]"
              title={M.MESSAGES.THREAD_ACTIONS}
              aria-label={M.MESSAGES.THREAD_ACTIONS}
            >
              <IconDotsVertical size={17} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => refetch()} disabled={isFetching}>
              <IconRefresh size={15} />
              {M.MESSAGES.REFRESH}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* §5 — the order, pinned between the header and the messages. Present
          only on order threads, which is exactly what a non-null `order` means.
          It renders from this row immediately and never gates the pane below. */}
      {thread.order && <OrderContextStrip chatId={thread.id} order={thread.order} />}

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
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
          dayGroups.map((group) => (
            <div key={group.key} className="flex flex-col gap-3">
              <div className="flex justify-center">
                <span className="rounded-full border border-[var(--border-xs)] bg-[var(--surface-alt)] px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.6px] text-[var(--t4)]">
                  {group.label}
                </span>
              </div>

              {group.items.map((msg) => {
                const sent = isFromAdmin(msg, ownerId);
                return (
                  <div
                    key={msg.id}
                    className={`group flex flex-col gap-1 ${msg.pending ? "opacity-60" : ""} ${
                      sent ? "items-end" : "items-start"
                    }`}
                  >
                    <div className={`chat-bubble ${sent ? "sent" : "recv"}`}>
                      {msg.isDeleted ? (
                        <span className="italic opacity-70">{M.MESSAGES.DELETED}</span>
                      ) : (
                        <>
                          {msg.content && (
                            <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                          )}
                          {msg.media &&
                            (msg.messageType === "image" ? (
                              <button
                                type="button"
                                title={M.MESSAGES.VIEW_IMAGE}
                                onClick={() =>
                                  setPreview({
                                    src: mediaSrc(msg.media as string),
                                    alt: msg.content || M.MESSAGES.ATTACHMENT,
                                  })
                                }
                                className="mt-1.5 block cursor-zoom-in overflow-hidden rounded-[var(--radius-sm)]"
                              >
                                <img
                                  src={mediaSrc(msg.media)}
                                  alt={M.MESSAGES.ATTACHMENT}
                                  // An image arrives with no height, so the
                                  // pane has already scrolled by the time it
                                  // paints and the newest message is pushed
                                  // back out of view. Re-pin once it lands.
                                  onLoad={() => scrollToLatest("auto")}
                                  className="max-h-[220px] transition-transform hover:scale-[1.02]"
                                />
                              </button>
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

                      {/* Time rides in the bubble's bottom corner — trailing
                          edge on each side, so it settles under the end of the
                          text rather than across the gutter from it. Held at
                          10.5px and `--t4` so it stays clearly secondary to the
                          message, and pushed off the last line by `ml-auto`
                          rather than a fixed indent, which keeps a one-word
                          message and a paragraph looking alike.

                          The marker beside it means **accepted by the server**,
                          not read — no endpoint reports per-message read state,
                          so a second "seen" tick would be inventing one. */}
                      <span
                        className={`mt-1 flex w-full items-center gap-1 text-[10.5px] font-semibold text-[var(--t4)] ${
                          sent ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.isEdited && !msg.isDeleted && (
                          <span className="italic">{M.COMPOSER.EDITED}</span>
                        )}
                        {formatTime(msg.createdAt)}
                        {sent &&
                          !msg.isDeleted &&
                          (msg.pending ? (
                            <IconClock size={12} aria-label={M.MESSAGES.SENDING} />
                          ) : (
                            <IconCheck size={12} aria-label={M.MESSAGES.SENT_TICK} />
                          ))}
                      </span>
                    </div>

                    {/* Author, and — on one's own messages only — the two
                        moderation controls. Revealed on hover so the transcript
                        stays clean.

                        The attribution is worth keeping on both sides: this is
                        a shared desk, and "who on our side said this" is not
                        answerable from the bubble's position alone. What is
                        *not* offered on someone else's message is any way to
                        change it — there is no hover control, no menu and no
                        context menu, because a colleague's wording is theirs. */}
                    <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="xs c4 w6">
                        {isSelf(msg) ? M.MESSAGES.YOU : msg.senderName}
                      </span>

                      {/* Edit goes away twenty minutes in; Delete does not,
                          because withdrawing something said in error has no
                          equivalent deadline — and it leaves a tombstone
                          everyone can see rather than a silent rewrite. */}
                      {canEdit(msg) && (
                        <button
                          type="button"
                          title={M.COMPOSER.EDIT}
                          aria-label={M.COMPOSER.EDIT}
                          className="text-[var(--t4)] hover:text-[var(--teal-600)]"
                          onClick={() => setEditing({ id: msg.id, content: msg.content })}
                        >
                          <IconPencil size={13} />
                        </button>
                      )}
                      {canModerate(msg) && (
                        <button
                          type="button"
                          title={M.COMPOSER.DELETE}
                          aria-label={M.COMPOSER.DELETE}
                          className="text-[var(--t4)] hover:text-[var(--danger-text)]"
                          onClick={() => setToDelete(msg)}
                        >
                          <IconTrash size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {typingCount > 0 && (
          <p className="xs c4 italic">
            {typingCount === 1 ? M.COMPOSER.TYPING_ONE : M.COMPOSER.TYPING_MANY(typingCount)}
          </p>
        )}
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
        /*
          Media upload is production-only (`isMediaUploadEnabled`). Passing
          undefined is what hides the paperclip rather than disabling it — the
          composer already treats "caller cannot take an upload" that way, and a
          disabled button would only invite someone to work out how to enable it.

          These bytes go to our own API server, not to S3, so nothing about the
          bucket forces this. It is gated alongside the presigned path so that
          "media upload" means one thing across the panel. Text messages are
          untouched.
        */
        onAttach={isMediaUploadEnabled() ? handleAttach : undefined}
        isUploading={isUploading}
      />

      <ImageLightbox
        src={preview?.src ?? null}
        alt={preview?.alt}
        onClose={() => setPreview(null)}
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
