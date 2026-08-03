import { IconEye, IconInfoCircle, IconShieldLock } from "@tabler/icons-react";
import { endOfDay, startOfDay } from "date-fns";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { DateRangePicker } from "@/components/common/DateRangePicker";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { badgeColumn, textColumn, truncatedColumn } from "@/components/common/tableColumns";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { useGetAuditEntriesQuery } from "../api/auditApi";
import { useAuditAccess } from "../lib/auditAccess";
import {
  AUDIT_CATEGORIES,
  AUDIT_OPERATIONAL_ACTIONS,
  AUDIT_ORDER_ACTIONS,
  AUDIT_SUBJECT_TYPES,
  type AuditEntry,
} from "../types/audit.types";
import { AuditEntryDrawer } from "./AuditEntryDrawer";
import { VerifyChainDialog } from "./VerifyChainDialog";

const M = MESSAGES.AUDIT;

const LIMIT = 20;

const SUBJECT_OPTIONS = [
  { value: "all", label: M.ALL_SUBJECTS },
  ...AUDIT_SUBJECT_TYPES.map((t) => ({ value: t, label: M.SUBJECT_LABELS[t] ?? t })),
];

/** Turns `status_change` into `Status change` for the action dropdown. */
function actionLabel(action: string): string {
  const spaced = action.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Flow 34 §1 — the audit trail.
 *
 * Read-only and role-scoped. A sub-admin's query is pinned to `category=order`
 * (the server enforces it; sending it explicitly keeps the scoping visible in
 * the request), the category filter and the operational actions are hidden from
 * them, and chain verification — super-admin only — is not offered at all.
 */
export function AuditTrailPage() {
  const access = useAuditAccess();

  const [page, setPage] = useState(1);
  const [subjectId, setSubjectId] = useState("");
  const [subjectType, setSubjectType] = useState("all");
  const [category, setCategory] = useState("all");
  const [action, setAction] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [verifySeed, setVerifySeed] = useState<{ type: string; id: string } | null>(null);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);

  const categoryOptions = [
    { value: "all", label: M.ALL_CATEGORIES },
    ...AUDIT_CATEGORIES.map((c) => ({ value: c, label: M.CATEGORY_LABELS[c] ?? c })),
  ];

  // A sub-admin can only ever read order entries, so offering operational
  // actions would just guarantee an empty page.
  const actionOptions = useMemo(() => {
    const actions = access.canReadOperational
      ? [...AUDIT_ORDER_ACTIONS, ...AUDIT_OPERATIONAL_ACTIONS]
      : [...AUDIT_ORDER_ACTIONS];
    return [
      { value: "all", label: M.ALL_ACTIONS },
      ...actions.map((a) => ({ value: a, label: actionLabel(a) })),
    ];
  }, [access.canReadOperational]);

  // `from`/`to` are ISO-8601 datetimes, not dates: widen the picked days to
  // cover the whole span so a same-day range isn't an empty instant.
  const from = dateRange?.from ? startOfDay(dateRange.from).toISOString() : undefined;
  const to = dateRange?.to ? endOfDay(dateRange.to).toISOString() : undefined;

  const { data, isLoading, isFetching, isError, refetch } = useGetAuditEntriesQuery({
    page,
    limit: LIMIT,
    subjectId: subjectId.trim() || undefined,
    subjectType: subjectType !== "all" ? subjectType : undefined,
    category: access.forcedCategory ?? (category !== "all" ? category : undefined),
    action: action !== "all" ? action : undefined,
    from,
    to,
  });

  const entries = data?.entries ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  // Any filter change invalidates the current page number.
  const resetPage = <T,>(setter: (v: T) => void) => {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  };

  const hasActiveFilters =
    !!subjectId.trim() ||
    subjectType !== "all" ||
    (access.canReadOperational && category !== "all") ||
    action !== "all" ||
    !!dateRange?.from;

  const clearFilters = () => {
    setSubjectId("");
    setSubjectType("all");
    setCategory("all");
    setAction("all");
    setDateRange(undefined);
    setPage(1);
  };

  const openDetail = (entry: AuditEntry) => {
    setSelected(entry);
    setIsDetailOpen(true);
  };

  const openVerify = (seed: { type: string; id: string } | null) => {
    setVerifySeed(seed);
    setIsVerifyOpen(true);
  };

  const columns: Column<AuditEntry>[] = [
    textColumn({ id: "when", header: M.COLUMNS.WHEN, get: (r) => r.createdAt, className: "td-m" }),
    textColumn({ id: "action", header: M.COLUMNS.ACTION, get: (r) => r.actionLabel }),
    badgeColumn({
      id: "category",
      header: M.COLUMNS.CATEGORY,
      get: (r) => r.categoryLabel,
      variant: (r) => r.categoryVariant,
    }),
    {
      id: "subject",
      header: M.COLUMNS.SUBJECT,
      className: "max-w-[190px]",
      // Two lines: the readable handle over the type it belongs to — an id
      // alone says nothing, and a type alone doesn't identify the row.
      cell: (r) => (
        <div className="max-w-[180px]">
          <div className="td-p trunc" title={r.subjectLabel}>
            {r.subjectLabel}
          </div>
          <div className="td-m trunc">{r.subjectTypeLabel}</div>
        </div>
      ),
    },
    textColumn({
      id: "actor",
      header: M.COLUMNS.ACTOR,
      get: (r) => r.actorEmail,
      className: "td-m",
    }),
    truncatedColumn({
      id: "summary",
      header: M.COLUMNS.SUMMARY,
      get: (r) => r.summary,
      className: "max-w-[240px]",
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
            searchValue={subjectId}
            onSearchChange={resetPage(setSubjectId)}
            searchPlaceholder={M.FILTERS.SUBJECT_ID_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isFetching}
            filters={[
              ...(access.canReadOperational
                ? [
                    {
                      id: "category",
                      value: category,
                      placeholder: M.ALL_CATEGORIES,
                      options: categoryOptions,
                      width: "150px",
                      onValueChange: resetPage(setCategory),
                    },
                  ]
                : []),
              {
                id: "subject-type",
                value: subjectType,
                placeholder: M.ALL_SUBJECTS,
                options: SUBJECT_OPTIONS,
                width: "150px",
                onValueChange: resetPage(setSubjectType),
              },
              {
                id: "action",
                value: action,
                placeholder: M.ALL_ACTIONS,
                options: actionOptions,
                width: "190px",
                onValueChange: resetPage(setAction),
              },
            ]}
          >
            <DateRangePicker
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
                setPage(1);
              }}
            />
            {access.canVerify && (
              <Button variant="secondary" size="sm" onClick={() => openVerify(null)}>
                <IconShieldLock size={14} />
                {M.VERIFY.SUBMIT}
              </Button>
            )}
          </SearchFilters>
        }
      />

      {/* Sub-admins are scoped server-side; saying so beats an unexplained
          half-empty trail. */}
      {!access.canReadOperational && (
        <div className="card mb-5 flex items-start gap-2.5 p-4">
          <IconInfoCircle size={18} className="mt-px shrink-0 text-[var(--info-icon)]" />
          <p className="text-[12.5px] font-medium leading-relaxed text-[var(--t3)]">
            {M.SUBADMIN_NOTICE}
          </p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={entries}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={setPage}
        showPagination
        emptyMessage={M.EMPTY}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={clearFilters}
        onRowClick={openDetail}
      />

      <AuditEntryDrawer
        entry={selected}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        // Passing the handler at all is the permission gate — a sub-admin never
        // sees the button, because the endpoint would 403 them.
        onVerifySubject={
          access.canVerify
            ? (entry) => {
                setIsDetailOpen(false);
                openVerify({ type: entry.subjectType, id: entry.subjectId });
              }
            : undefined
        }
      />

      {access.canVerify && (
        <VerifyChainDialog
          isOpen={isVerifyOpen}
          onClose={() => setIsVerifyOpen(false)}
          initialSubjectType={verifySeed?.type}
          initialSubjectId={verifySeed?.id}
        />
      )}
    </div>
  );
}

export default AuditTrailPage;
