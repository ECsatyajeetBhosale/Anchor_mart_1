import { IconEye } from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { Search } from "@/components/common/Search";
import { SearchFilters } from "@/components/common/SearchFilters";
import { badgeColumn, textColumn, truncatedColumn } from "@/components/common/tableColumns";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { useGetOutboundMessagesQuery } from "../api/outboundMessageApi";
import {
  MESSAGE_CHANNELS,
  MESSAGE_STATUSES,
  type MessageChannel,
  type MessageStatus,
  type OutboundMessage,
} from "../types/outboundMessage.types";
import { MessageDetailDrawer } from "./MessageDetailDrawer";

const M = MESSAGES.OUTBOUND_MESSAGES;

// The API caps `page_size` at 50; 20 keeps the table scannable.
const LIMIT = 20;

const CHANNEL_OPTIONS = [
  { value: "all", label: M.ALL_CHANNELS },
  ...MESSAGE_CHANNELS.map((c) => ({ value: c, label: M.CHANNEL_LABELS[c] ?? c })),
];

const STATUS_OPTIONS = [
  { value: "all", label: M.ALL_STATUSES },
  ...MESSAGE_STATUSES.map((s) => ({ value: s, label: M.STATUS_LABELS[s] ?? s })),
];

const ORDERING_OPTIONS = [
  { value: "-created_at", label: M.NEWEST_FIRST },
  { value: "created_at", label: M.OLDEST_FIRST },
];

/**
 * Flow 22 §3.1 — the outbound delivery ledger.
 *
 * Note the filter model: there is no general search here. `recipient` is the
 * only partial-match field the API offers, so the header's search box is
 * labelled as exactly that; `event_type` sits beside it as its own exact-match
 * box rather than being folded into a search that would silently not work.
 */
export function OutboundMessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<OutboundMessage | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const recipient = searchParams.get("recipient") ?? "";
  const eventType = searchParams.get("event_type") ?? "";

  // Unknown values are 400s server-side, so anything off the accepted list is
  // coerced back to "all" before it reaches the query.
  const channelRaw = searchParams.get("channel") ?? "all";
  const channel = MESSAGE_CHANNELS.includes(channelRaw as MessageChannel) ? channelRaw : "all";
  const statusRaw = searchParams.get("status") ?? "all";
  const status = MESSAGE_STATUSES.includes(statusRaw as MessageStatus) ? statusRaw : "all";
  const orderingRaw = searchParams.get("ordering") ?? "-created_at";
  const ordering = ORDERING_OPTIONS.some((o) => o.value === orderingRaw)
    ? orderingRaw
    : "-created_at";

  const { data, isLoading, isFetching, isError, refetch } = useGetOutboundMessagesQuery({
    page,
    limit: LIMIT,
    recipient,
    eventType,
    channel: channel !== "all" ? channel : undefined,
    status: status !== "all" ? status : undefined,
    ordering,
  });

  const messages = data?.messages ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (key !== "page") next.set("page", "1");
    if (value && value !== "all") {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
  };

  const openDetail = (row: OutboundMessage) => {
    setSelected(row);
    setIsDetailOpen(true);
  };

  const columns: Column<OutboundMessage>[] = [
    textColumn({
      id: "created",
      header: M.COLUMNS.CREATED,
      get: (r) => r.createdAt,
      className: "td-m",
    }),
    badgeColumn({
      id: "channel",
      header: M.COLUMNS.CHANNEL,
      get: (r) => r.channelLabel,
      variant: (r) => r.channelVariant,
    }),
    truncatedColumn({ id: "recipient", header: M.COLUMNS.RECIPIENT, get: (r) => r.recipient }),
    truncatedColumn({ id: "subject", header: M.COLUMNS.SUBJECT, get: (r) => r.subject }),
    textColumn({
      id: "event",
      header: M.COLUMNS.EVENT,
      get: (r) => r.eventType,
      className: "td-m",
    }),
    badgeColumn({
      id: "status",
      header: M.COLUMNS.STATUS,
      get: (r) => r.statusLabel,
      variant: (r) => r.statusVariant,
    }),
    textColumn({
      id: "attempts",
      header: M.COLUMNS.ATTEMPTS,
      get: (r) => r.attempts,
      className: "td-m text-center",
      headerClassName: "text-center",
    }),
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      className: "w-16 text-right",
      headerClassName: "text-right",
      cell: (r) => (
        <div className="td-acts">
          <Button
            variant="ghost"
            size="xs"
            title={MESSAGES.COMMON.VIEW}
            onClick={(e) => {
              e.stopPropagation();
              openDetail(r);
            }}
          >
            <IconEye size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-enter">
      <PageHeader
        title={M.TITLE}
        subtitle={M.SUBTITLE}
        actions={
          <SearchFilters
            searchValue={recipient}
            onSearchChange={(val) => setParam("recipient", val)}
            searchPlaceholder={M.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isFetching}
            filters={[
              {
                id: "channel",
                value: channel,
                placeholder: M.ALL_CHANNELS,
                options: CHANNEL_OPTIONS,
                width: "140px",
                onValueChange: (val) => setParam("channel", val),
              },
              {
                id: "status",
                value: status,
                placeholder: M.ALL_STATUSES,
                options: STATUS_OPTIONS,
                width: "140px",
                onValueChange: (val) => setParam("status", val),
              },
              {
                id: "ordering",
                value: ordering,
                placeholder: M.NEWEST_FIRST,
                options: ORDERING_OPTIONS,
                width: "150px",
                onValueChange: (val) => setParam("ordering", val),
              },
            ]}
          >
            {/* Exact-match, unlike the recipient box beside it. */}
            <Search
              value={eventType}
              placeholder={M.EVENT_TYPE_PLACEHOLDER}
              onSearch={(val) => setParam("event_type", val)}
              debounceMs={300}
              style={{ width: "200px" }}
            />
          </SearchFilters>
        }
      />

      <DataTable
        columns={columns}
        data={messages}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={M.EMPTY}
        hasActiveFilters={!!recipient || !!eventType || channel !== "all" || status !== "all"}
        onResetFilters={() => setSearchParams(new URLSearchParams())}
        onRowClick={openDetail}
      />

      <MessageDetailDrawer
        message={selected}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}

export default OutboundMessagesPage;
