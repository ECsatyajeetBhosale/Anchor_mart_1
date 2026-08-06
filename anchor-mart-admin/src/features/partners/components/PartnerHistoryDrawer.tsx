import { IconPencil, IconUsers } from "@tabler/icons-react";
import { useState } from "react";

import { SearchFilters } from "@/components/common/SearchFilters";
import { idColumn, textColumn } from "@/components/common/tableColumns";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { useGetPartnerHistoryQuery } from "../api/partnerApi";
import {
  PARTNER_HISTORY_OUTCOMES,
  type PartnerData,
  type PartnerHistoryRow,
  type PartnerHistorySummary,
} from "../types/partner.types";
import { CapabilityBadges } from "./CapabilityBadges";

const M = MESSAGES.PARTNERS;
const H = M.HISTORY;
const LIMIT = 10;

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

const OUTCOME_OPTIONS = [
  { value: "", label: H.FILTERS.OUTCOME_ALL },
  ...PARTNER_HISTORY_OUTCOMES.map((o) => ({ value: o, label: H.OUTCOMES[o] ?? o })),
];

/**
 * `""` is all time, which is what the endpoint does with no `period` — the
 * screen never narrows the window unless the reader asks for it.
 */
const PERIOD_OPTIONS = [
  { value: "", label: H.FILTERS.PERIOD_ALL },
  { value: "today", label: H.FILTERS.PERIOD_TODAY },
  { value: "week", label: H.FILTERS.PERIOD_WEEK },
  { value: "month", label: H.FILTERS.PERIOD_MONTH },
];

/** Outcome → badge colour. Unknown outcomes fall back to neutral. */
function outcomeVariant(outcome: string): BadgeVariant {
  switch (outcome) {
    case "delivered":
      return "success";
    case "verified":
      return "teal";
    case "in_progress":
      return "info";
    case "failed":
      return "danger";
    case "rejected":
    case "cancelled":
      return "warning";
    default:
      return "neutral";
  }
}

/** Formats an ISO timestamp as "3 Aug 2026"; blanks and unparseable values → "—". */
function formatStamp(iso: string | null): string {
  if (!iso) return H.DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return H.DASH;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Renders a rate that is `null` when no samples exist. `null` must never
 * degrade to "0%" — an untested partner is missing data, not a failing one.
 */
function formatRate(rate: number | null): string {
  return rate === null ? H.STATS.NO_SAMPLES : `${rate}%`;
}

/** One tile in the performance rollup. */
function SummaryTile({ label, value, footer }: { label: string; value: string; footer?: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-sm)] bg-[var(--surface)] px-3 py-2.5">
      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.3px] text-[var(--t4)]">
        {label}
      </div>
      <div className="mt-1 text-[17px] font-extrabold text-[var(--t1)]">{value}</div>
      {footer && <div className="mt-0.5 text-[10.5px] text-[var(--t4)]">{footer}</div>}
    </div>
  );
}

/** The six-tile rollup above the job list. */
function SummarySection({ summary }: { summary: PartnerHistorySummary }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <SummaryTile label={H.STATS.TOTAL} value={String(summary.total_jobs)} />
      <SummaryTile label={H.STATS.DELIVERED} value={String(summary.delivered)} />
      <SummaryTile label={H.STATS.VERIFIED} value={String(summary.verified)} />
      <SummaryTile label={H.STATS.FAILED} value={String(summary.failed)} />
      <SummaryTile label={H.STATS.SUCCESS_RATE} value={formatRate(summary.delivery_success_rate)} />
      <SummaryTile
        label={H.STATS.ON_TIME_RATE}
        value={formatRate(summary.on_time_rate)}
        footer={H.STATS.SLA_FOOTER(summary.sla_bound_deliveries)}
      />
    </div>
  );
}

export interface PartnerHistoryDrawerProps {
  /** Clicked row — gives instant context plus the user id the history keys on. */
  partner: PartnerData | null;
  isOpen: boolean;
  onClose: () => void;
  /** Opens the edit drawer for this partner. */
  onEdit: () => void;
}

/**
 * Read-first partner drill-down: who they are, how they are working, and every
 * job behind those numbers (Flow 28 API 6b).
 *
 * A row click lands here rather than in the edit form — the common reason to
 * open a partner is to look, and dropping straight into editable inputs invites
 * accidental changes to a record an admin only meant to read. Editing is one
 * deliberate click further in, via the footer button.
 */
export function PartnerHistoryDrawer({
  partner,
  isOpen,
  onClose,
  onEdit,
}: PartnerHistoryDrawerProps) {
  const [page, setPage] = useState(1);
  const [outcome, setOutcome] = useState("");
  const [period, setPeriod] = useState("");
  const [search, setSearch] = useState("");

  // Opening another partner must not inherit the last one's filters — the
  // counts would look like they belong to this partner when they don't.
  // Adjusted during render rather than in an effect so the first paint for a
  // new partner already shows the reset state, never one stale frame of the
  // previous partner's filters.
  const [viewedUserId, setViewedUserId] = useState(partner?.userId);
  if (partner?.userId !== viewedUserId) {
    setViewedUserId(partner?.userId);
    setPage(1);
    setOutcome("");
    setPeriod("");
    setSearch("");
  }

  const userId = partner?.userId ?? "";
  const { data, isLoading, isFetching, isError, refetch } = useGetPartnerHistoryQuery(
    { userId, outcome, period, search, page, limit: LIMIT },
    { skip: !isOpen || !userId },
  );

  const rows = data?.rows ?? [];
  const summary = data?.summary ?? null;
  const header = data?.partner ?? null;
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));
  const hasFilters = Boolean(outcome || period || search);

  // Prefer the history header (authoritative, just fetched) over the clicked
  // row, which carries only what the list endpoint returns.
  const displayName = header?.name || partner?.n || H.DASH;
  const partnerId = header?.partner_id || partner?.id || "";
  const email = header?.email || partner?.email || H.DASH;
  const port = header?.port || partner?.p || H.DASH;

  const setFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const resetFilters = () => {
    setOutcome("");
    setPeriod("");
    setSearch("");
    setPage(1);
  };

  const columns: Column<PartnerHistoryRow>[] = [
    idColumn({
      id: "order",
      header: H.COLUMNS.ORDER,
      get: (r) => r.order_number || H.DASH,
    }),
    {
      id: "outcome",
      header: H.COLUMNS.OUTCOME,
      cell: (r) => (
        <Badge variant={outcomeVariant(r.outcome)}>
          {r.outcome_display || H.OUTCOMES[r.outcome] || r.outcome || H.DASH}
        </Badge>
      ),
    },
    textColumn({
      id: "assigned",
      header: H.COLUMNS.ASSIGNED,
      get: (r) => formatStamp(r.assigned_at),
      className: "td-m",
    }),
    textColumn({
      id: "completed",
      header: H.COLUMNS.COMPLETED,
      // A failed job has no `completed_at`; `failed_at` is when it ended.
      get: (r) => formatStamp(r.completed_at ?? r.failed_at),
      className: "td-m",
    }),
    {
      id: "on_time",
      header: H.COLUMNS.ON_TIME,
      // `null` means the order carried no deadline — rendered as a dash, never
      // as "Late", which would mark every ordinary delivery a failure.
      cell: (r) =>
        r.on_time === null ? (
          <span className="td-m" title={H.ON_TIME.NA_TITLE}>
            {H.DASH}
          </span>
        ) : (
          <Badge variant={r.on_time ? "success" : "warning"}>
            {r.on_time ? H.ON_TIME.YES : H.ON_TIME.LATE}
          </Badge>
        ),
    },
    textColumn({
      id: "rating",
      header: H.COLUMNS.RATING,
      get: (r) => (r.rating === null ? H.DASH : `${r.rating} ★`),
      className: "td-m",
    }),
  ];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={760}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
              <IconUsers size={22} />
            </div>
            <div>
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {H.TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {H.SUBTITLE}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Identity */}
          <div className="mb-5 flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--navy-25)] p-4">
            <div className="av av-xl av-img">
              <img src={getFallbackAvatar(partnerId || "partner")} alt={displayName} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-[var(--t1)]">{displayName}</div>
              <div className="text-[11.5px] text-[var(--t3)] truncate">{email}</div>
              <div className="text-[11px] text-[var(--t4)]">
                {partnerId ? `${partnerId} · ` : ""}
                {port}
              </div>
            </div>
            {/* Capability is present-tense and admin-owned: it says what work
                this partner may be given now, not what they have ever done. */}
            <div className="flex flex-col items-end gap-1.5">
              {header && (
                <CapabilityBadges canVerify={header.can_verify} canDeliver={header.can_deliver} />
              )}
              {header && (
                <Badge
                  variant={
                    !header.is_active ? "danger" : header.is_available ? "success" : "neutral"
                  }
                >
                  {!header.is_active
                    ? H.STATUS.BLOCKED
                    : header.is_available
                      ? H.STATUS.AVAILABLE
                      : H.STATUS.UNAVAILABLE}
                </Badge>
              )}
            </div>
          </div>

          {/* Performance rollup */}
          {summary && (
            <>
              <div className="sec-label">{H.SECTION_SUMMARY}</div>
              <SummarySection summary={summary} />
              <p className="mt-2 text-[11px] text-[var(--t4)]">{H.SUMMARY_NOTE}</p>
            </>
          )}

          {/* Jobs */}
          <div className="sec-label mt-6">{H.SECTION_JOBS}</div>
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <SearchFilters
              searchValue={search}
              onSearchChange={(v) => setFilter(() => setSearch(v))}
              searchPlaceholder={H.FILTERS.SEARCH_PLACEHOLDER}
              searchDebounceMs={300}
              searchLoading={isFetching}
              filters={[
                {
                  id: "outcome",
                  value: outcome,
                  placeholder: H.FILTERS.OUTCOME_ALL,
                  options: OUTCOME_OPTIONS,
                  onValueChange: (v) => setFilter(() => setOutcome(v)),
                },
                {
                  id: "period",
                  value: period,
                  placeholder: H.FILTERS.PERIOD_ALL,
                  options: PERIOD_OPTIONS,
                  onValueChange: (v) => setFilter(() => setPeriod(v)),
                },
              ]}
            />
          </div>

          <DataTable
            columns={columns}
            data={rows}
            rowKey="assignment_id"
            page={page}
            pages={totalPages}
            isLoading={isLoading}
            isError={isError}
            error={isError ? H.FETCH_ERROR : null}
            onRetry={refetch}
            onPageChange={setPage}
            showPagination
            emptyMessage={hasFilters ? H.EMPTY_FILTERED : H.EMPTY}
            hasActiveFilters={hasFilters}
            onResetFilters={resetFilters}
          />
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end gap-3 w-full">
            <button type="button" className="btn btn-ghost btn-cancel" onClick={onClose}>
              {MESSAGES.COMMON.CLOSE}
            </button>
            <button type="button" className="btn btn-primary" onClick={onEdit}>
              <IconPencil size={16} />
              {H.EDIT}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default PartnerHistoryDrawer;
