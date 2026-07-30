import { PageHeader } from "@/components/common/PageHeader";
import { MESSAGES } from "@/lib/messages";
import { useMemo, useState } from "react";
import { useGetDeliveryChatsQuery, useGetUserChatsQuery } from "../api/chatApi";
import type { ChatSource } from "../types/chat.types";
import { ChatMessagePane } from "./ChatMessagePane";
import { ChatThreadList } from "./ChatThreadList";

const M = MESSAGES.CHAT;

export interface ChatMonitorPageProps {
  /** Which endpoint backs the sidebar. */
  source: ChatSource;
}

/**
 * Two-pane conversation reader, shared by the Support Threads and Chat Monitor
 * screens — they differ only in which list endpoint feeds the sidebar, so one
 * component serves both rather than two near-copies drifting apart.
 */
export function ChatMonitorPage({ source }: ChatMonitorPageProps) {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const isSupport = source === "support";
  const copy = isSupport ? M.SUPPORT : M.DELIVERY;

  // Both hooks are always called (rules of hooks); the unused one is skipped so
  // it never fires a request.
  const supportQuery = useGetUserChatsQuery({ search }, { skip: !isSupport });
  const deliveryQuery = useGetDeliveryChatsQuery({ search }, { skip: isSupport });
  const { data, isLoading, isError } = isSupport ? supportQuery : deliveryQuery;

  const threads = useMemo(() => data?.items ?? [], [data]);

  // Neither list endpoint documents a `search` param, so filter client-side as
  // well: if the backend ignores it the box still narrows what's on screen, and
  // if it honours it this pass is a harmless no-op.
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

  return (
    <div className="page-enter">
      <PageHeader title={copy.TITLE} subtitle={copy.SUBTITLE} />

      <div className="grid h-[580px] grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
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
        />

        <ChatMessagePane thread={activeThread} />
      </div>
    </div>
  );
}

export default ChatMonitorPage;
