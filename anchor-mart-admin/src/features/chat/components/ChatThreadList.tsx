import { Search } from "@/components/common/Search";
import { Badge } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/messages";
import type { ChatThread } from "../types/chat.types";

const M = MESSAGES.CHAT;

export interface ChatThreadListProps {
  threads: ChatThread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  emptyMessage: string;
  isLoading: boolean;
  isError: boolean;
}

/** Sidebar list of conversations. Selection is lifted so the page owns it. */
export function ChatThreadList({
  threads,
  activeId,
  onSelect,
  search,
  onSearchChange,
  searchPlaceholder,
  emptyMessage,
  isLoading,
  isError,
}: ChatThreadListProps) {
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="border-b border-[var(--border-xs)] p-3">
        <Search
          placeholder={searchPlaceholder}
          value={search}
          onSearch={onSearchChange}
          debounceMs={300}
          loading={isLoading}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isError ? (
          <p className="p-4 text-center text-[12.5px] font-semibold text-[var(--danger-text)]">
            {M.THREADS.FETCH_ERROR}
          </p>
        ) : isLoading ? (
          <p className="p-4 text-center text-[12.5px] font-medium text-[var(--t4)]">
            {MESSAGES.COMMON.LOADING}
          </p>
        ) : threads.length === 0 ? (
          <p className="p-4 text-center text-[12.5px] font-medium text-[var(--t4)]">
            {emptyMessage}
          </p>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => onSelect(thread.id)}
              className={`flex w-full items-center gap-2.5 border-b border-[var(--border-xs)] px-3.5 py-3 text-left transition-colors ${
                activeId === thread.id ? "bg-[var(--teal-50)]" : "hover:bg-[var(--surface-alt)]"
              }`}
            >
              <div className="av av-sm av-teal shrink-0">{thread.name.charAt(0).toUpperCase()}</div>

              <div className="min-w-0 flex-1">
                <div className="td-p trunc">{thread.name}</div>
                <div className="td-m trunc">
                  {thread.orderNumber ? `${M.MESSAGES.ORDER_PREFIX} ${thread.orderNumber} · ` : ""}
                  {thread.lastMessage || M.THREADS.NO_PREVIEW}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                {thread.lastMessageAt && (
                  <span className="text-[10px] font-semibold text-[var(--t4)]">
                    {thread.lastMessageAt}
                  </span>
                )}
                {thread.unreadCount > 0 && (
                  <Badge variant="danger" className="h-[18px] px-1.5 text-[10px]">
                    {thread.unreadCount}
                  </Badge>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default ChatThreadList;
