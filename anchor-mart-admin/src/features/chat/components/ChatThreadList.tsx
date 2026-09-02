import { Search } from "@/components/common/Search";
import { Button } from "@/components/ui/button";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { IconPlus } from "@tabler/icons-react";
import { type ReactNode, useMemo } from "react";
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
  /**
   * User ids currently connected, from the polled presence roster (§4.7) seeded
   * by each row's `owner_is_online`. **Not** from the socket — an admin receives
   * no presence frames.
   */
  onlineUsers: ReadonlySet<string>;
  /**
   * Opens the start-a-conversation drawer.
   *
   * The button sits at the head of this panel rather than in the page header:
   * starting a thread and picking one out of the list are the same errand, and
   * the header is shared with controls that scope the whole screen.
   */
  onNewConversation: () => void;
  /** Label for that button — the caller owns the copy. */
  newConversationLabel: string;
  /** Lets the page hide this panel when the two panes stack into one column. */
  className?: string;
  /**
   * Filter control rendered under the search box — the inbox toggle on Support,
   * the category toggle on Order Chats. A slot rather than typed props because
   * the two switch on different unions; the caller owns the control and keeps
   * its own value type intact.
   *
   * It sits here rather than in a page header because it scopes this panel and
   * nothing else: a control up there read as applying to the whole screen,
   * including the open thread, which it never did.
   */
  tabs?: ReactNode;
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
  onNewConversation,
  newConversationLabel,
  className,
  tabs,
}: ChatThreadListProps) {
  const sections = useMemo(() => {
    const grouped: Record<ChatRoleKey, ChatThread[]> = { partner: [], sailor: [] };
    for (const thread of threads) grouped[resolveChatRole(thread).key].push(thread);
    return SECTION_ORDER.map((key) => ({ key, rows: grouped[key] })).filter(
      (section) => section.rows.length > 0,
    );
  }, [threads]);

  // A heading earns its place by telling one run of rows apart from another, so
  // it is drawn only where there is in fact more than one. On the support
  // inboxes every row is the same role — the tab above already named it — and
  // the heading was restating the tab. The order inbox mixes both sides of the
  // same order, and there the split is the thing that makes the list readable.
  const showSectionTitles = sections.length > 1;

  return (
    <div className={cn("card flex min-h-0 flex-col overflow-hidden", className)}>
      <div className="flex flex-col gap-2.5 border-b border-[var(--border-xs)] p-3">
        <Button variant="primary" className="w-full" onClick={onNewConversation}>
          <IconPlus size={16} />
          {newConversationLabel}
        </Button>

        <Search
          placeholder={searchPlaceholder}
          value={search}
          onSearch={onSearchChange}
          debounceMs={300}
          loading={isLoading}
          style={{ width: "100%" }}
        />

        {tabs}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
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
              {showSectionTitles && (
                <div className="px-3.5 pt-3.5 pb-[7px] text-[10px] font-extrabold uppercase tracking-[1.6px] text-[var(--t4)]">
                  {SECTION_TITLES[section.key]}
                </div>
              )}

              {section.rows.map((thread) => {
                const role = CHAT_ROLES[section.key];
                const isOnline = Boolean(thread.ownerId && onlineUsers.has(thread.ownerId));
                const isActive = activeId === thread.id;

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => onSelect(thread.id)}
                    aria-current={isActive}
                    className={`flex w-full items-center gap-2.5 border-b border-[var(--border-xs)] px-3.5 py-[11px] text-left transition-colors ${
                      isActive
                        ? "bg-[var(--navy-25)]"
                        : "bg-transparent hover:bg-[var(--surface-alt)]"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className={`av ${role.avatarClass}`}>
                        {thread.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Presence pip, mirroring AnchorMart-1: an 8px dot ringed
                          in the surface colour so it reads on any row state. */}
                      {isOnline && (
                        <span className="absolute -right-px -bottom-px h-2 w-2 rounded-full border-2 border-[var(--surface)] bg-[var(--green-icon)]" />
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
                        <span className="badge badge-danger px-[5px] py-px text-[10px]">
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
