import {
  IconCheck,
  IconClipboardText,
  IconClock,
  IconDownload,
  IconEye,
  IconShoppingCart,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import {
  avatarColumn,
  badgeColumn,
  idColumn,
  textColumn,
  truncatedColumn,
} from "@/components/common/tableColumns";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { getApiMessage } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { downloadBlob } from "@/lib/download";
import { MESSAGES } from "@/lib/messages";
import {
  useExportSpecialRequestsMutation,
  useGetSpecialRequestStatsQuery,
  useGetSpecialRequestsQuery,
} from "../api/specialRequestApi";
import type { SpecialRequest, SpecialRequestStats } from "../types/specialRequest.types";
import { SpecialRequestDetailDrawer } from "./SpecialRequestDetailDrawer";

const M = MESSAGES.SPECIAL_REQUESTS;

const LIMIT = 10;

type StatVariant = "navy" | "teal" | "amber" | "red" | "green" | "purple" | "blue";

// Status dropdown options — values map 1:1 to the API `status` query param.
const STATUS_OPTIONS = [
  { value: "all", label: M.ALL_STATUS },
  { value: "pending", label: M.STATUS_FILTER.PENDING },
  { value: "sourcing_confirmed", label: M.STATUS_FILTER.SOURCING_CONFIRMED },
  { value: "quote_sent", label: M.STATUS_FILTER.QUOTE_SENT },
  { value: "rejected", label: M.STATUS_FILTER.REJECTED },
  { value: "fulfilled", label: M.STATUS_FILTER.FULFILLED },
];

// KPI cards — each maps 1:1 to a field on the special-request stats API response.
const STAT_CONFIG: {
  id: string;
  label: string;
  key: keyof SpecialRequestStats;
  icon: ReactNode;
  variant: StatVariant;
}[] = [
  {
    id: "total",
    label: M.STATS.TOTAL,
    key: "total_requests",
    icon: <IconClipboardText size={20} />,
    variant: "navy",
  },
  {
    id: "pending",
    label: M.STATS.PENDING,
    key: "pending_review",
    icon: <IconClock size={20} />,
    variant: "amber",
  },
  {
    id: "sourcing",
    label: M.STATS.SOURCING,
    key: "sourcing",
    icon: <IconShoppingCart size={20} />,
    variant: "teal",
  },
  {
    id: "approved",
    label: M.STATS.APPROVED,
    key: "approved",
    icon: <IconCheck size={20} />,
    variant: "green",
  },
];

export function SpecialRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRequest, setSelectedRequest] = useState<SpecialRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // URL-driven filter state (shareable, refresh-safe) — mirrors Orders/Intents.
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";

  // Special-requests list — search + status filter server-side; paginated by DRF.
  const statusParam = statusFilter !== "all" ? statusFilter : undefined;
  const { data, isLoading, isFetching, isError, refetch } = useGetSpecialRequestsQuery({
    page,
    limit: LIMIT,
    search,
    status: statusParam,
  });

  const requests = data?.requests ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // Live KPI stats from the API; cards show "—" while loading and 0 when absent.
  const { data: stats, isLoading: statsLoading } = useGetSpecialRequestStatsQuery();
  const statItems = STAT_CONFIG.map((c) => ({
    id: c.id,
    label: c.label,
    value: statsLoading ? "—" : (stats?.[c.key] ?? 0).toLocaleString(),
    icon: c.icon,
    variant: c.variant,
  }));

  // Excel export — respects the current status filter; downloads the returned file.
  const [exportRequests, { isLoading: isExporting }] = useExportSpecialRequestsMutation();
  const handleExport = async () => {
    try {
      const blob = await exportRequests({ status: statusParam }).unwrap();
      downloadBlob(blob, M.EXPORT_FILENAME);
      toast.success(M.TOAST.EXPORTED);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.EXPORT_ERROR);
    }
  };

  const openDetail = (req: SpecialRequest) => {
    setSelectedRequest(req);
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

  const columns: Column<SpecialRequest>[] = [
    idColumn({ id: "ref", header: M.COLUMNS.ORDER_ID, get: (r) => r.r }),
    avatarColumn({
      id: "sailor",
      header: M.COLUMNS.SAILOR,
      name: (r) => r.n,
      image: (r) => getFallbackAvatar(r.n),
    }),
    textColumn({ id: "phone", header: M.COLUMNS.PHONE, get: (r) => r.ph, className: "td-m" }),
    truncatedColumn({ id: "product", header: M.COLUMNS.PRODUCT, get: (r) => r.prod }),
    textColumn({ id: "brand", header: M.COLUMNS.BRAND, get: (r) => r.brand, className: "td-m" }),
    textColumn({
      id: "qty",
      header: M.COLUMNS.QTY,
      get: (r) => r.qty,
      className: "td-m text-center",
      headerClassName: "text-center",
    }),
    textColumn({
      id: "requested",
      header: M.COLUMNS.REQUESTED,
      get: (r) => r.dt,
      className: "td-m",
    }),
    badgeColumn({ id: "status", header: M.COLUMNS.STATUS, get: (r) => r.st, variant: (r) => r.sc }),
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
            title="View"
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
        actions={
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
            ]}
          >
            <Button variant="secondary" size="default" loading={isExporting} onClick={handleExport}>
              <IconDownload size={15} className="mr-1" />
              {M.EXPORT}
            </Button>
          </SearchFilters>
        }
      />

      <StatsGrid items={statItems} />

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
        onRowClick={openDetail}
      />

      <SpecialRequestDetailDrawer
        requestId={selectedRequest?.id ?? null}
        isOpen={isDetailOpen}
        onClose={closeDetail}
      />
    </div>
  );
}

export default SpecialRequestsPage;
