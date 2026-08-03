import { IconInfoCircle } from "@tabler/icons-react";
import { format } from "date-fns";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { DateRangePicker } from "@/components/common/DateRangePicker";
import { DropdownSelect } from "@/components/common/DropdownSelect";
import { badgeColumn, textColumn, truncatedColumn } from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { useGetNotificationHistoryQuery } from "../api/notificationApi";
import {
  BROADCAST_CATEGORIES,
  NOTIFICATION_ROLES,
  NOTIFICATION_TYPES,
  type NotificationHistoryRow,
} from "../types/notification.types";

const M = MESSAGES.NOTIFICATIONS;
const H = M.HISTORY;

const LIMIT = 10;

const CATEGORY_OPTIONS = [
  { value: "all", label: H.ALL_CATEGORIES },
  ...BROADCAST_CATEGORIES.map((c) => ({ value: c, label: H.CATEGORY_LABELS[c] ?? c })),
];

const AUDIENCE_OPTIONS = [
  { value: "all", label: H.ALL_AUDIENCES },
  { value: "all_roles", label: H.AUDIENCE_ALL },
  ...NOTIFICATION_ROLES.map((r) => ({ value: r, label: M.ROLE_LABELS[r] ?? r })),
];

/**
 * Narrowed to the four types an admin can originate, not every `Notification.Type`.
 * A history row is only ever written by the two send endpoints, and the role
 * sender accepts exactly these four — event types like `order_assigned` are
 * raised by business flows and never appear here.
 */
const TYPE_OPTIONS = [
  { value: "all", label: H.ALL_TYPES },
  ...NOTIFICATION_TYPES.map((t) => ({ value: t, label: M.TYPE_LABELS[t] ?? t })),
];

/** Dispatch state → badge colour. Only a real fan-out reads as success. */
const DISPATCH_VARIANT: Record<string, BadgeProps["variant"]> = {
  [H.DISPATCH_SENT]: "success",
  [H.DISPATCH_QUEUED]: "warning",
  [H.DISPATCH_FAILED]: "danger",
};

/**
 * Flow 32 §3.5 — what was actually sent.
 *
 * The column that matters is **Dispatch**, not the row's existence: a row is
 * written the moment a campaign is *accepted*, so an un-dispatched row is still
 * queued (or, with an error, a fan-out that failed). Before this distinction
 * existed the history reported every accepted campaign as sent, including ones
 * a broker outage had silently discarded — hence the note under the table.
 */
export function NotificationHistoryTab() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");
  const [audience, setAudience] = useState("all");
  const [type, setType] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // `date_from`/`date_to` are plain dates (inclusive), unlike the audit trail's
  // ISO-8601 datetimes.
  const dateFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  const { data, isLoading, isError, refetch } = useGetNotificationHistoryQuery({
    page,
    limit: LIMIT,
    category: category !== "all" ? category : undefined,
    // The API takes the literal string "all" for the everyone-audience, which
    // collides with this UI's own "no filter" sentinel — hence the alias.
    audience: audience === "all" ? undefined : audience === "all_roles" ? "all" : audience,
    notificationType: type !== "all" ? type : undefined,
    dateFrom,
    dateTo,
  });

  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  const applyFilter = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const hasActiveFilters =
    category !== "all" || audience !== "all" || type !== "all" || !!dateRange?.from;

  const clearFilters = () => {
    setCategory("all");
    setAudience("all");
    setType("all");
    setDateRange(undefined);
    setPage(1);
  };

  const columns: Column<NotificationHistoryRow>[] = [
    textColumn({
      id: "created",
      header: H.COLUMNS.SENT_AT,
      get: (r) => r.createdAt,
      className: "td-m",
    }),
    {
      id: "title",
      header: H.COLUMNS.TITLE,
      className: "max-w-[220px]",
      // Title over the opening of the body — a campaign is identified by both.
      cell: (r) => (
        <div className="max-w-[210px]">
          <div className="td-p trunc" title={r.title}>
            {r.title}
          </div>
          <div className="td-m trunc" title={r.message}>
            {r.message}
          </div>
        </div>
      ),
    },
    {
      id: "shape",
      header: H.COLUMNS.SHAPE,
      cell: (r) => (
        <div className="flex items-center gap-1.5">
          <span className="td-m">{r.shapeLabel}</span>
          {/* Only a broadcast can still be on display in-app. */}
          {r.isActive && (
            <Badge variant="teal" className="text-[10px] h-[22px]">
              {H.LIVE_IN_APP}
            </Badge>
          )}
        </div>
      ),
    },
    textColumn({
      id: "audience",
      header: H.COLUMNS.AUDIENCE,
      get: (r) => r.audienceLabel,
      className: "td-m",
    }),
    badgeColumn({
      id: "category",
      header: H.COLUMNS.CATEGORY,
      get: (r) => r.categoryLabel,
      // Service overrides the opt-out, so it reads as the louder of the two.
      variant: (r) => (r.category === "service" ? "amber" : "neutral"),
    }),
    textColumn({
      id: "channels",
      header: H.COLUMNS.CHANNELS,
      get: (r) => r.channelsLabel,
      className: "td-m",
    }),
    truncatedColumn({
      id: "sent-by",
      header: H.COLUMNS.SENT_BY,
      get: (r) => r.createdByEmail,
    }),
    {
      id: "dispatch",
      header: H.COLUMNS.DISPATCH,
      cell: (r) => (
        <Badge
          variant={DISPATCH_VARIANT[r.dispatchLabel] ?? "neutral"}
          className="text-[10px] h-[24px]"
          // A failed fan-out carries the reason; surface it without a drawer.
          title={r.dispatchError || r.dispatchedAt}
        >
          {r.dispatchLabel}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <DropdownSelect
          value={category}
          placeholder={H.ALL_CATEGORIES}
          options={CATEGORY_OPTIONS}
          onValueChange={applyFilter(setCategory)}
          width="160px"
        />
        <DropdownSelect
          value={audience}
          placeholder={H.ALL_AUDIENCES}
          options={AUDIENCE_OPTIONS}
          onValueChange={applyFilter(setAudience)}
          width="180px"
        />
        <DropdownSelect
          value={type}
          placeholder={H.ALL_TYPES}
          options={TYPE_OPTIONS}
          onValueChange={applyFilter(setType)}
          width="160px"
        />
        <DateRangePicker
          value={dateRange}
          onChange={(range) => {
            setDateRange(range);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? H.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={setPage}
        showPagination
        emptyMessage={H.EMPTY}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={clearFilters}
      />

      <div className="mt-3 flex items-start gap-2 text-[11.5px] font-medium leading-relaxed text-[var(--t4)]">
        <IconInfoCircle size={15} className="mt-px shrink-0" />
        <span>{H.DISPATCH_HINT}</span>
      </div>
    </div>
  );
}

export default NotificationHistoryTab;
