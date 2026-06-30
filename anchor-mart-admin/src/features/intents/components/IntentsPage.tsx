import {
  IconCheck,
  IconClock,
  IconFileInvoice,
  IconPackage,
  IconRefresh,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { avatarColumn, badgeColumn, textColumn } from "@/components/common/tableColumns";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { toast } from "sonner";
import { useGetIntentStatsQuery, useGetIntentsQuery } from "../api/intentApi";
import type { IntentData, IntentStats } from "../types/intent.types";
import { IntentReviewDrawer } from "./IntentReviewDrawer";

const M = MESSAGES.INTENTS;

const LIMIT = 10;

type StatVariant = "navy" | "teal" | "amber" | "red" | "green" | "purple" | "blue";

// KPI cards — each maps 1:1 to a field on the intents stats API response.
const STAT_CONFIG: {
  id: string;
  label: string;
  key: keyof IntentStats;
  icon: ReactNode;
  variant: StatVariant;
}[] = [
  {
    id: "total",
    label: M.STATS.TOTAL,
    key: "total_intents",
    icon: <IconFileInvoice size={20} />,
    variant: "navy",
  },
  {
    id: "awaiting-payment",
    label: M.STATS.AWAITING_PAYMENT,
    key: "awaiting_payment",
    icon: <IconClock size={20} />,
    variant: "amber",
  },
  {
    id: "subs",
    label: M.STATS.SUBSTITUTIONS,
    key: "substitution_needed",
    icon: <IconRefresh size={20} />,
    variant: "red",
  },
  {
    id: "confirmed",
    label: M.STATS.CONFIRMED_TODAY,
    key: "confirmed_today",
    icon: <IconCheck size={20} />,
    variant: "green",
  },
];

// Status dropdown options — values map 1:1 to the API `status` query param.
const STATUS_OPTIONS = [
  { value: "all", label: M.ALL_STATUS },
  { value: "intent_received", label: M.STATUS_FILTER.INTENT_RECEIVED },
  { value: "sourcing", label: M.STATUS_FILTER.SOURCING },
  { value: "verification_submitted", label: M.STATUS_FILTER.VERIFICATION_SUBMITTED },
  { value: "partner_verifying", label: M.STATUS_FILTER.PARTNER_VERIFYING },
  { value: "payment_pending", label: M.STATUS_FILTER.PAYMENT_PENDING },
  { value: "pending_customer_response", label: M.STATUS_FILTER.PENDING_CUSTOMER_RESPONSE },
  { value: "pending_intent", label: M.STATUS_FILTER.PENDING_INTENT },
  { value: "intent_rejected", label: M.STATUS_FILTER.INTENT_REJECTED },
];

export function IntentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven state (shareable, refresh-safe, preserved across pagination).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";

  const [selectedIntent, setSelectedIntent] = useState<IntentData | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Intents list — search + status filter server-side; paginated by DRF.
  const statusParam = statusFilter !== "all" ? statusFilter : undefined;
  const { data, isLoading, isFetching, isError, refetch } = useGetIntentsQuery({
    page,
    limit: LIMIT,
    search: searchTerm,
    status: statusParam,
  });

  // Live KPI stats from the API; cards show "—" while loading and 0 when absent.
  const { data: stats, isLoading: statsLoading } = useGetIntentStatsQuery();
  const statItems = STAT_CONFIG.map((c) => ({
    id: c.id,
    label: c.label,
    value: statsLoading ? "—" : (stats?.[c.key] ?? 0).toLocaleString(),
    icon: c.icon,
    variant: c.variant,
  }));

  const intents = data?.intents ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

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

  const handleOpenReview = (intent: IntentData) => {
    setSelectedIntent(intent);
    setIsReviewOpen(true);
  };

  const handleConfirmIntent = () => {
    if (!selectedIntent) return;
    toast.success(M.TOAST.CONFIRMED(selectedIntent.r, selectedIntent.s));
    setIsReviewOpen(false);
  };

  const handleRejectIntent = () => {
    if (!selectedIntent) return;
    toast.error(M.TOAST.REJECTED(selectedIntent.r));
    setIsReviewOpen(false);
  };

  const columns: Column<IntentData>[] = [
    avatarColumn({
      id: "sailor",
      header: M.COLUMNS.SAILOR,
      name: (i) => i.s,
      image: (i) => getFallbackAvatar(i.s),
    }),
    {
      id: "items",
      header: M.COLUMNS.ITEMS,
      cell: (i) => (
        <div className="flex aic g8">
          <div className="prod-thumb h-8 w-8">
            <IconPackage size={16} />
          </div>
          <span
            className="trunc block max-w-[170px] text-[12.5px] font-medium text-[var(--t3)]"
            title={i.it}
          >
            {i.it}
          </span>
        </div>
      ),
    },
    textColumn({ id: "ship", header: M.COLUMNS.SHIP, get: (i) => i.sh, className: "td-m" }),
    textColumn({ id: "arrival", header: M.COLUMNS.ARRIVAL, get: (i) => i.ar, className: "td-m" }),
    textColumn({ id: "stay", header: M.COLUMNS.STAY, get: (i) => i.sy, className: "td-m" }),
    textColumn({
      id: "submitted",
      header: M.COLUMNS.SUBMITTED,
      get: (i) => i.sb,
      className: "td-m",
    }),
    badgeColumn({ id: "status", header: M.COLUMNS.STATUS, get: (i) => i.st, variant: (i) => i.sc }),
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      cell: (i) => (
        <div className="td-acts">
          <Button
            variant="primary"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenReview(i);
            }}
          >
            {M.ACTION_REVIEW}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Page Header */}
      <PageHeader
        title={M.TITLE}
        actions={
          <SearchFilters
            searchValue={searchTerm}
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
                width: "180px",
                onValueChange: (val) => setParam("status", val),
              },
            ]}
          />
        }
      />

      <StatsGrid items={statItems} />

      <DataTable
        columns={columns}
        data={intents}
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
        onRowClick={handleOpenReview}
      />

      {/* Review Intent Drawer */}
      <IntentReviewDrawer
        intent={selectedIntent}
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onConfirm={handleConfirmIntent}
        onReject={handleRejectIntent}
      />
    </>
  );
}
