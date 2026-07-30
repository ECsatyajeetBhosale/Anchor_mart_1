import { EmptyState } from "@/components/common/EmptyState";
import { MESSAGES } from "@/lib/messages";
import { IconMessages, IconPaperclip, IconRefresh } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useGetChatMessagesQuery } from "../api/chatApi";
import type { ChatThread } from "../types/chat.types";

const M = MESSAGES.CHAT;

export interface ChatMessagePaneProps {
  thread: ChatThread | null;
}

/**
 * Reader for one thread's messages.
 *
 * Deliberately has no composer: the admin API exposes three GETs and no send
 * route — messages are written over the chat websocket. A disabled input would
 * only imply a capability that isn't there.
 */
export function ChatMessagePane({ thread }: ChatMessagePaneProps) {
  const chatId = thread?.id;
  const { data, isLoading, isError, isFetching, refetch } = useGetChatMessagesQuery(
    { chatId: chatId ?? "" },
    { skip: !chatId },
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const messages = data?.items ?? [];

  // Jump to the newest message when the thread changes or new ones arrive.
  // Guarded so an empty thread doesn't scroll a pane with nothing in it.
  useEffect(() => {
    if (!chatId || messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatId, messages.length]);

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

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border-xs)] px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="av av-sm av-teal shrink-0">{thread.name.charAt(0).toUpperCase()}</div>
          <div className="min-w-0">
            <div className="td-p trunc">{thread.name}</div>
            <div className="td-m trunc">
              {thread.orderNumber
                ? `${M.MESSAGES.ORDER_PREFIX} ${thread.orderNumber}`
                : (thread.email ?? M.DASH)}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <IconRefresh size={15} />
          {M.MESSAGES.REFRESH}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isError ? (
          <p className="text-center text-[12.5px] font-semibold text-[var(--danger-text)]">
            {M.MESSAGES.FETCH_ERROR}
          </p>
        ) : isLoading ? (
          <p className="text-center text-[12.5px] font-medium text-[var(--t4)]">
            {MESSAGES.COMMON.LOADING}
          </p>
        ) : messages.length === 0 ? (
          <p className="text-center text-[12.5px] font-medium text-[var(--t4)]">
            {M.MESSAGES.EMPTY}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-extrabold text-[var(--t2)]">
                    {msg.senderName}
                  </span>
                  <span className="text-[10.5px] font-semibold text-[var(--t4)]">
                    {msg.createdAt}
                  </span>
                </div>

                <div className="max-w-[70%] rounded-[var(--radius-md)] border border-[var(--border-xs)] bg-[var(--surface-alt)] px-3 py-2">
                  {msg.isDeleted ? (
                    <span className="text-[12.5px] font-medium italic text-[var(--t4)]">
                      {M.MESSAGES.DELETED}
                    </span>
                  ) : (
                    <>
                      {msg.content && (
                        <p className="whitespace-pre-wrap text-[13px] font-medium text-[var(--t1)]">
                          {msg.content}
                        </p>
                      )}
                      {msg.media &&
                        (msg.messageType === "image" ? (
                          <img
                            src={msg.media}
                            alt={M.MESSAGES.ATTACHMENT}
                            className="mt-1.5 max-h-[220px] rounded-[var(--radius-sm)]"
                          />
                        ) : (
                          <a
                            href={msg.media}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--teal-600)]"
                          >
                            <IconPaperclip size={14} />
                            {M.MESSAGES.ATTACHMENT}
                          </a>
                        ))}
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="card-foot">{M.MESSAGES.READ_ONLY}</div>
    </div>
  );
}

export default ChatMessagePane;
