import { IconCheck, IconClock, IconEye, IconTrash, IconUserOff, IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import {
  avatarColumn,
  badgeColumn,
  textColumn,
  truncatedColumn,
} from "@/components/common/tableColumns";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import {
  useGetAccountDeletionRequestsQuery,
  useGetAccountDeletionStatsQuery,
} from "../api/accountDeletionApi";
import {
  ACCOUNT_DELETION_ROLE_KEYS,
  ACCOUNT_DELETION_STATUS_KEYS,
  type AccountDeletionRequest,
  type AccountDeletionStats,
  type AccountDeletionStatus,
} from "../types/accountDeletion.types";
import { AccountDeletionDetailDrawer } from "./AccountDeletionDetailDrawer";

const A = MESSAGES.ACCOUNT_MANAGEMENT;
const M = A.DELETIONS;

const LIMIT = 10;

type StatVariant = "navy" | "teal" | "amber" | "red" | "green" | "purple" | "blue";

const STATUS_LABEL: Record<AccountDeletionStatus, string> = {
  pending: M.STATUS_FILTER.PENDING,
  approved: M.STATUS_FILTER.APPROVED,
  rejected: M.STATUS_FILTER.REJECTED,
  completed: M.STATUS_FILTER.COMPLETED,
};

const STATUS_OPTIONS = [
  { value: "all", label: M.ALL_STATUS },
  ...ACCOUNT_DELETION_STATUS_KEYS.map((key) => ({ value: key, label: STATUS_LABEL[key] })),
];

const ROLE_OPTIONS = [
  { value: "all", label: M.ALL_ROLES },
  ...ACCOUNT_DELETION_ROLE_KEYS.map((key) => ({ value: key, label: A.ROLE_LABELS[key] ?? key })),
];

// KPI cards — each maps 1:1 to a field on §8's response.
const STAT_CONFIG: {
  id: string;
  label: string;
  footer?: string;
  key: keyof AccountDeletionStats;
  icon: ReactNode;
  variant: StatVariant;
}[] = [
  {
    id: "total",
    label: M.STATS.TOTAL,
    key: "total",
    icon: <IconUserOff size={20} />,
    variant: "navy",
  },
  {
    id: "pending",
    label: M.STATS.PENDING,
    footer: M.STATS.PENDING_FOOTER,
    key: "pending",
    icon: <IconClock size={20} />,
    variant: "amber",
  },
  {
    id: "approved",
    label: M.STATS.APPROVED,
    footer: M.STATS.APPROVED_FOOTER,
    key: "approved",
    icon: <IconCheck size={20} />,
    variant: "blue",
  },
  {
    id: "rejected",
    label: M.STATS.REJECTED,
    key: "rejected",
    icon: <IconX size={20} />,
    variant: "red",
  },
  {
    id: "completed",
    label: M.STATS.COMPLETED,
    footer: M.STATS.COMPLETED_FOOTER,
    key: "completed",
    icon: <IconTrash size={20} />,
    variant: "purple",
  },
];

/**
 * Flow 31 §8–11 — the account-deletion review queue.
 *
 * The KPI cards sit **inside** this tab rather than above the tab bar: they
 * count deletion requests, and heading the provisioning tab with them would
 * attach numbers to a screen they say nothing about.
 *
 * Filter state lives in the URL (shareable, refresh-safe) exactly as it does on
 * Seller Requests and Special Requests. Values the API would reject are coerced
 * back to "all" before the request goes out, so a hand-edited or stale URL
 * cannot 400 the table.
 */
export function DeletionRequestsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<AccountDeletionRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";

  // Both filters are validated server-side (unknown value → 400), so anything
  // off the accepted list reads as "all" rather than being forwarded.
  const statusRaw = searchParams.get("status") ?? "all";
  const statusFilter = ACCOUNT_DELETION_STATUS_KEYS.includes(statusRaw as AccountDeletionStatus)
    ? statusRaw
    : "all";
  const roleRaw = searchParams.get("role") ?? "all";
  const roleFilter = ROLE_OPTIONS.some((o) => o.value === roleRaw) ? roleRaw : "all";

  const { data, isLoading, isFetching, isError, refetch } = useGetAccountDeletionRequestsQuery({
    page,
    limit: LIMIT,
    search,
    status: statusFilter !== "all" ? statusFilter : undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
  });

  const requests = data?.requests ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  const { data: stats, isLoading: statsLoading } = useGetAccountDeletionStatsQuery();
  const statItems = STAT_CONFIG.map((c) => ({
    id: c.id,
    label: c.label,
    footer: c.footer,
    value: statsLoading ? M.DASH : (stats?.[c.key] ?? 0).toLocaleString(),
    icon: c.icon,
    variant: c.variant,
  }));

  const openDetail = (row: AccountDeletionRequest) => {
    setSelected(row);
    setIsDetailOpen(true);
  };
  const closeDetail = () => setIsDetailOpen(false);

  // Update one URL param; filter/search changes reset to page 1. "all"/empty clears it.
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

  const columns: Column<AccountDeletionRequest>[] = [
    avatarColumn({
      id: "requester",
      header: M.COLUMNS.REQUESTER,
      name: (r) => r.name,
      image: (r) => getFallbackAvatar(r.name),
    }),
    textColumn({ id: "email", header: M.COLUMNS.EMAIL, get: (r) => r.email, className: "td-m" }),
    textColumn({ id: "role", header: M.COLUMNS.ROLE, get: (r) => r.roleLabel, className: "td-m" }),
    truncatedColumn({ id: "reason", header: M.COLUMNS.REASON, get: (r) => r.reason }),
    textColumn({
      id: "requested",
      header: M.COLUMNS.REQUESTED,
      get: (r) => r.createdAt,
      className: "td-m",
    }),
    badgeColumn({
      id: "status",
      header: M.COLUMNS.STATUS,
      get: (r) => r.statusLabel,
      variant: (r) => r.statusVariant,
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
    <div>
      <StatsGrid items={statItems} />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchFilters
          searchValue={search}
          onSearchChange={(val) => setParam("search", val)}
          searchPlaceholder={M.SEARCH_PLACEHOLDER}
          searchDebounceMs={300}
          searchLoading={isFetching}
          filters={[
            {
              id: "status",
              value: statusFilter,
              placeholder: M.ALL_STATUS,
              options: STATUS_OPTIONS,
              width: "150px",
              onValueChange: (val) => setParam("status", val),
            },
            {
              id: "role",
              value: roleFilter,
              placeholder: M.ALL_ROLES,
              options: ROLE_OPTIONS,
              width: "160px",
              onValueChange: (val) => setParam("role", val),
            },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={requests}
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
        hasActiveFilters={!!search || statusFilter !== "all" || roleFilter !== "all"}
        onResetFilters={() => setSearchParams(new URLSearchParams())}
        onRowClick={openDetail}
      />

      <AccountDeletionDetailDrawer request={selected} isOpen={isDetailOpen} onClose={closeDetail} />
    </div>
  );
}

export default DeletionRequestsTab;
