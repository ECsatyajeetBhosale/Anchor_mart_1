import { Search } from "@/components/common/Search";
import { MESSAGES } from "@/lib/messages";
import { useMemo } from "react";
import { CHAT_ROLES, type ChatRoleKey, resolveChatRole } from "../lib/chatRoles";
import type { ChatThread } from "../types/chat.types";

const M = MESSAGES.CHAT;

/**
 * `last_message_at` is a raw ISO timestamp, unlike most of this API's
 * pre-formatted display strings. Recent threads read as a relative age and
 * older ones as a date — AnchorMart-1 shows "2m" / "8m" / "1h" here, and a full
 * timestamp is unreadable at sidebar width.
 */
function formatAge(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

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
  /** User ids currently connected, from the socket's presence frames. */
  onlineUsers: ReadonlySet<string>;
}

/** Section order — partners first, as in the AnchorMart-1 monitor. */
const SECTION_ORDER: ChatRoleKey[] = ["partner", "sailor"];
const SECTION_TITLES: Record<ChatRoleKey, string> = {
  partner: "Delivery Partners",
  sailor: "Sailors",
};

/**
 * Sidebar list of conversations, grouped by counterparty role.
 *
 * A section header only renders when that group has rows, so the single-role
 * support inboxes stay flat while the order inbox — which mixes both sides of
 * the same order — gets the split that makes it readable.
 */
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
  onlineUsers,
}: ChatThreadListProps) {
  const sections = useMemo(() => {
    const grouped: Record<ChatRoleKey, ChatThread[]> = { partner: [], sailor: [] };
    for (const thread of threads) grouped[resolveChatRole(thread).key].push(thread);
    return SECTION_ORDER.map((key) => ({ key, rows: grouped[key] })).filter(
      (section) => section.rows.length > 0,
    );
  }, [threads]);

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="border-b border-[var(--border-xs)] p-3">
        <Search
          placeholder={searchPlaceholder}
          value={search}
          onSearch={onSearchChange}
          debounceMs={300}
          loading={isLoading}
          style={{ width: "100%" }}
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
          sections.map((section) => (
            <div key={section.key}>
              <div className="sec-label" style={{ padding: "14px 14px 7px", margin: 0 }}>
                {SECTION_TITLES[section.key]}
              </div>

              {section.rows.map((thread) => {
                const role = CHAT_ROLES[section.key];
                const isOnline = Boolean(thread.owner?.id && onlineUsers.has(thread.owner.id));
                const isActive = activeId === thread.id;

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => onSelect(thread.id)}
                    className="flex w-full items-center gap-2.5 border-b border-[var(--border-xs)] px-3.5 py-[11px] text-left transition-colors"
                    style={{ background: isActive ? "var(--navy-25)" : "transparent" }}
                  >
                    <div className="relative shrink-0">
                      <div className={`av ${role.avatarClass}`}>
                        {thread.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Presence pip, mirroring AnchorMart-1: an 8px dot ringed
                          in the surface colour so it reads on any row state. */}
                      {isOnline && (
                        <span
                          className="absolute -bottom-px -right-px h-2 w-2 rounded-full"
                          style={{
                            background: "var(--green-icon)",
                            border: "2px solid var(--surface)",
                          }}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="sm w7 c1 trunc">{thread.name}</div>
                      <div className="xs c4 w5 trunc">
                        {thread.lastMessage || M.THREADS.NO_PREVIEW}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {thread.lastMessageAt && (
                        <span className="xs c4 w6">{formatAge(thread.lastMessageAt)}</span>
                      )}
                      {thread.unreadCount > 0 && (
                        <span
                          className="badge badge-danger"
                          style={{ padding: "1px 5px", fontSize: "10px" }}
                        >
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ChatThreadList;
