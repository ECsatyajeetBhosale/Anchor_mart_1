import { DropdownSelect } from "@/components/common/DropdownSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/hooks/useAppDispatch";
import { MESSAGES } from "@/lib/messages";
import { IconUsersGroup } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  useGetDeliveryChatsQuery,
  useGetOrderChatsQuery,
  useGetUserChatsQuery,
} from "../api/chatApi";
import { type ChatListTag, useChatSocket } from "../hooks/useChatSocket";
import type { ChatSource, OrderChatCategory, SocketChatType } from "../types/chat.types";
import { ChatMessagePane } from "./ChatMessagePane";
import { ChatThreadList } from "./ChatThreadList";
import { CreateGroupChatDrawer } from "./CreateGroupChatDrawer";

const M = MESSAGES.CHAT;

/** `""` means "both sides" — the endpoint returns every category when omitted. */
const CATEGORY_OPTIONS = [
  { value: "", label: M.ORDER.CATEGORY_ALL },
  { value: "order", label: M.ORDER.CATEGORY_ORDER },
  { value: "order_delivery", label: M.ORDER.CATEGORY_DELIVERY },
];

interface SourceConfig {
  listTag: ChatListTag;
  chatType: SocketChatType;
  copy: { TITLE: string; SUBTITLE: string; SEARCH_PLACEHOLDER: string; EMPTY: string };
}

/** Per-source configuration: copy, which cache the rows live in, how to address them. */
const SOURCE_CONFIG: Record<ChatSource, SourceConfig> = {
  // Global support threads are addressed as `private` on the socket — the same
  // word the REST payload uses for them. It does not mean a direct message.
  support: { listTag: "SUPPORT-LIST", chatType: "private", copy: M.SUPPORT },
  delivery: { listTag: "DELIVERY-LIST", chatType: "private", copy: M.DELIVERY },
  order: { listTag: "ORDER-LIST", chatType: "order", copy: M.ORDER },
};

export interface ChatMonitorPageProps {
  /** Which endpoint backs the sidebar. */
  source: ChatSource;
}

/**
 * Two-pane conversation screen, shared by Support Threads, Chat Monitor and
 * Order Chats — they differ only in which list endpoint feeds the sidebar and
 * how the socket addresses a thread, so one component serves all three rather
 * than three near-copies drifting apart.
 *
 * The order inbox is **not** a shared inbox: a sub-admin sees only threads on
 * orders they own, a super-admin sees all. That is enforced server-side, and
 * this screen makes no attempt to widen it.
 */
export function ChatMonitorPage({ source }: ChatMonitorPageProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<OrderChatCategory | "">("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);

  const { listTag, chatType, copy } = SOURCE_CONFIG[source];
  const adminEmail = useAppSelector((s) => s.auth.user?.email) ?? "Support";

  // All three hooks are always called (rules of hooks); the two that don't back
  // this screen are skipped so they never fire a request.
  const supportQuery = useGetUserChatsQuery(undefined, { skip: source !== "support" });
  const deliveryQuery = useGetDeliveryChatsQuery(undefined, { skip: source !== "delivery" });
  const orderQuery = useGetOrderChatsQuery({ category }, { skip: source !== "order" });
  const { data, isLoading, isError } =
    source === "support" ? supportQuery : source === "delivery" ? deliveryQuery : orderQuery;

  const threads = useMemo(() => data?.items ?? [], [data]);

  // No list endpoint documents a `search` param, so filtering is client-side:
  // the box narrows what is on screen without inventing a query the API would
  // ignore. Order number is included because that is how an admin searches.
  const visibleThreads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return threads;
    return threads.filter((t) =>
      [t.name, t.email, t.orderNumber, t.lastMessage]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(term)),
    );
  }, [threads, search]);

  const activeThread = visibleThreads.find((t) => t.id === activeId) ?? null;

  const socket = useChatSocket({
    activeChatId: activeThread?.id ?? null,
    chatType,
    listTag,
    senderName: adminEmail,
  });

  return (
    <div className="page-enter">
      <PageHeader
        title={copy.TITLE}
        actions={
          <div className="flex items-center gap-2.5">
            {source === "order" && (
              <DropdownSelect
                value={category}
                placeholder={M.ORDER.CATEGORY_ALL}
                options={CATEGORY_OPTIONS}
                onValueChange={(v) => {
                  setCategory(v as OrderChatCategory | "");
                  // The open thread may not survive into the narrowed list.
                  setActiveId(null);
                }}
                width="170px"
              />
            )}
            <Button variant="secondary" size="sm" onClick={() => setGroupOpen(true)}>
              <IconUsersGroup size={15} className="mr-1" />
              {M.GROUP.CREATE}
            </Button>
          </div>
        }
      />

      {/* Height follows the viewport rather than a fixed 580px box. The old
          fixed height left dead space below the panes on a normal screen while
          scrolling the thread list and message history internally against it —
          the one layout on the app where the content genuinely wants the whole
          page. `min-h` keeps it usable on short windows. */}
      <div className="grid h-[calc(100vh-230px)] min-h-[480px] grid-cols-1 gap-4 lg:grid-cols-[290px_1fr]">
        <ChatThreadList
          threads={visibleThreads}
          activeId={activeId}
          onSelect={setActiveId}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={copy.SEARCH_PLACEHOLDER}
          emptyMessage={copy.EMPTY}
          isLoading={isLoading}
          isError={isError}
          onlineUsers={socket.onlineUsers}
        />

        <ChatMessagePane thread={activeThread} socket={socket} />
      </div>

      <CreateGroupChatDrawer isOpen={groupOpen} onClose={() => setGroupOpen(false)} />
    </div>
  );
}

export default ChatMonitorPage;
