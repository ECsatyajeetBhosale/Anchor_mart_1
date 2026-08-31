import { PageHeader } from "@/components/common/PageHeader";
import { SegmentedToggle } from "@/components/common/SegmentedToggle";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/hooks/useAppDispatch";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { IconPencilPlus } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  useGetDeliveryChatsQuery,
  useGetOrderChatsQuery,
  useGetUserChatsQuery,
} from "../api/chatApi";
import { useChatPresence } from "../hooks/useChatPresence";
import { type ChatListTag, useChatSocket } from "../hooks/useChatSocket";
import type { ChatSource, OrderChatCategory, SocketChatType } from "../types/chat.types";
import { ChatMessagePane } from "./ChatMessagePane";
import { ChatThreadList } from "./ChatThreadList";
import { StartChatDrawer } from "./StartChatDrawer";

const M = MESSAGES.CHAT;

/** `""` means "both sides" — the endpoint returns every category when omitted. */
const CATEGORY_OPTIONS: { value: OrderChatCategory | ""; label: string }[] = [
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

/** The two support inboxes, shown as one screen with a toggle. */
export const SUPPORT_SOURCES: { value: ChatSource; label: string }[] = [
  { value: "support", label: MESSAGES.CHAT.SUPPORT.TAB_SAILORS },
  { value: "delivery", label: MESSAGES.CHAT.SUPPORT.TAB_PARTNERS },
];

export interface ChatMonitorPageProps {
  /** Which endpoint backs the sidebar initially. */
  source: ChatSource;
  /**
   * When given, the screen renders a toggle between these inboxes.
   *
   * Used by Support to cover sailors and partners under one nav entry. They are
   * two endpoints but one job — a desk answering whoever wrote in — and the
   * separate "Chat Monitor" entry they used to have said nothing about which
   * audience it held.
   */
  sources?: { value: ChatSource; label: string }[];
}

/**
 * Two-pane conversation screen, shared by Support (both its tabs) and Order
 * Chats — they differ only in which list endpoint feeds the sidebar and how the
 * socket addresses a thread, so one component serves all of them rather than
 * near-copies drifting apart.
 *
 * The order inbox is **not** a shared inbox: a sub-admin sees only threads on
 * orders they own, a super-admin sees all. That is enforced server-side, and
 * this screen makes no attempt to widen it.
 */
export function ChatMonitorPage({ source, sources }: ChatMonitorPageProps) {
  // The toggle owns the active inbox once there is one; without it the prop is
  // the whole answer.
  const [activeSource, setActiveSource] = useState<ChatSource>(source);
  const effectiveSource = sources ? activeSource : source;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<OrderChatCategory | "">("");
  const [activeId, setActiveId] = useState<string | null>(null);

  // §8.3 — arriving from "Message sailor" / "Message partner" / "Message", which
  // create the thread and then hand its id over in the route state. Opened here
  // rather than by the caller because the thread may not be on the loaded page
  // yet: the id is authoritative, the list catches up on its own invalidation.
  const routeState = useLocation().state as { openChatId?: string; source?: ChatSource } | null;
  const openChatId = routeState?.openChatId ?? null;
  const routeSource = routeState?.source ?? null;
  useEffect(() => {
    if (openChatId) setActiveId(openChatId);
  }, [openChatId]);

  // A partner's support thread lives in a different inbox from a sailor's, so
  // arriving with one selected has to switch tabs — otherwise the screen opens
  // on the sailor list and the thread that was just created is nowhere on it.
  useEffect(() => {
    if (routeSource) setActiveSource(routeSource);
  }, [routeSource]);
  const [startOpen, setStartOpen] = useState(false);

  const { listTag, chatType, copy } = SOURCE_CONFIG[effectiveSource];
  const adminEmail = useAppSelector((s) => s.auth.user?.email) ?? "Support";

  // All three hooks are always called (rules of hooks); the two that don't back
  // this screen are skipped so they never fire a request.
  //
  // `limit` matters more than it looks. The sidebar has no paginator — it renders
  // exactly what one request returned — so leaving it off meant the server
  // default of **10 threads**, and an eleventh conversation was simply
  // unreachable from this screen. It also silently broke arriving with an
  // `openChatId`: the pane resolves the id against the loaded rows, so a thread
  // outside those ten opened as an empty pane rather than as itself.
  const supportQuery = useGetUserChatsQuery(
    { limit: API_MAX_PAGE_SIZE },
    { skip: effectiveSource !== "support" },
  );
  const deliveryQuery = useGetDeliveryChatsQuery(
    { limit: API_MAX_PAGE_SIZE },
    { skip: effectiveSource !== "delivery" },
  );
  const orderQuery = useGetOrderChatsQuery(
    { category, limit: API_MAX_PAGE_SIZE },
    { skip: effectiveSource !== "order" },
  );
  const { data, isLoading, isError } =
    effectiveSource === "support"
      ? supportQuery
      : effectiveSource === "delivery"
        ? deliveryQuery
        : orderQuery;

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

  // Falls back to the unfiltered list so a thread opened by id from another
  // screen is not hidden by a search term or category filter left on this one.
  const activeThread =
    visibleThreads.find((t) => t.id === activeId) ?? threads.find((t) => t.id === activeId) ?? null;

  const socket = useChatSocket({
    activeChatId: activeThread?.id ?? null,
    chatType,
    listTag,
    senderName: adminEmail,
  });

  // Presence is polled for the rows on screen (§4.7) — an admin socket carries
  // no presence frames. The roster is the *visible* threads, so narrowing the
  // search narrows what is asked about rather than paying for the whole page.
  // Paused while the start-a-conversation drawer is up: it covers the thread
  // list entirely, so the dots behind it are refreshing for nobody.
  const presence = useChatPresence(visibleThreads, { enabled: !startOpen });

  return (
    <div className="page-enter">
      <PageHeader
        title={copy.TITLE}
        actions={
          <div className="flex items-center gap-2.5">
            {/* Sailors / Partners. Two endpoints, one desk — the audiences are
                answered by the same people and were previously split across two
                nav entries, one of which named neither audience. */}
            {sources && (
              <SegmentedToggle
                value={effectiveSource}
                options={sources}
                onChange={(next) => {
                  setActiveSource(next);
                  // The open thread belongs to the inbox being left.
                  setActiveId(null);
                }}
              />
            )}

            {/* Same control as the support toggle above, for the same reason:
                three short, mutually exclusive options fit on a line, and a
                dropdown would hide two of them behind a click. */}
            {effectiveSource === "order" && (
              <SegmentedToggle
                value={category}
                options={CATEGORY_OPTIONS}
                onChange={(next) => {
                  setCategory(next);
                  // The open thread may not survive into the narrowed list.
                  setActiveId(null);
                }}
              />
            )}
            {/* §8.3 — the doc's two entry points start from an order or a user
                the admin is already looking at, and those still exist. This is
                the same two endpoints reached from the inbox itself, which is
                where an admin goes when the conversation is the errand. */}
            <Button variant="primary" size="sm" onClick={() => setStartOpen(true)}>
              <IconPencilPlus size={15} className="mr-1" />
              {M.START.NEW}
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
          onlineUsers={presence.onlineUsers}
        />

        <ChatMessagePane thread={activeThread} socket={socket} onlineUsers={presence.onlineUsers} />
      </div>

      <StartChatDrawer
        isOpen={startOpen}
        onClose={() => setStartOpen(false)}
        // Order inboxes start an order thread; the support inboxes start a
        // support thread. The screen the admin is on already says which.
        mode={effectiveSource === "order" ? "order" : "support"}
      />
    </div>
  );
}

export default ChatMonitorPage;
