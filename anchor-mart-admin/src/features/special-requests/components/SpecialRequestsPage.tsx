import {
  IconBan,
  IconCheck,
  IconClipboardText,
  IconClock,
  IconEye,
  IconFileSpreadsheet,
  IconSend,
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
  useGetSpecialRequestStatsQuery,
  useGetSpecialRequestsQuery,
  useLazyExportSpecialRequestsQuery,
} from "../api/specialRequestApi";
import { useSpecialRequestActions } from "../hooks/useSpecialRequestActions";
import {
  SPECIAL_REQUEST_STATUS_KEYS,
  type SpecialRequest,
  type SpecialRequestStats,
  type SpecialRequestStatus,
} from "../types/specialRequest.types";
import { AllowChangesDialog } from "./AllowChangesDialog";
import { GenerateBillDialog } from "./GenerateBillDialog";
import { RejectSpecialRequestDialog } from "./RejectSpecialRequestDialog";
import { SpecialRequestDetailDrawer } from "./SpecialRequestDetailDrawer";

const M = MESSAGES.SPECIAL_REQUESTS;

const LIMIT = 10;

type StatVariant = "navy" | "teal" | "amber" | "red" | "green" | "purple" | "blue";

/**
 * Status dropdown — built from the five values the API accepts, in lifecycle
 * order. Sending anything else is a 400 (*"Invalid status. Must be one of …"*),
 * so the labels are keyed off the same list the URL param is validated against.
 */
const STATUS_LABEL: Record<SpecialRequestStatus, string> = {
  pending: M.STATUS_FILTER.PENDING,
  sourcing_confirmed: M.STATUS_FILTER.SOURCING_CONFIRMED,
  quote_sent: M.STATUS_FILTER.QUOTE_SENT,
  accepted: M.STATUS_FILTER.ACCEPTED,
  rejected: M.STATUS_FILTER.REJECTED,
};

const STATUS_OPTIONS = [
  { value: "all", label: M.ALL_STATUS },
  ...SPECIAL_REQUEST_STATUS_KEYS.map((key) => ({ value: key, label: STATUS_LABEL[key] })),
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
    key: "pending",
    icon: <IconClock size={20} />,
    variant: "amber",
  },
  {
    id: "sourcing_confirmed",
    label: M.STATS.SOURCING_CONFIRMED,
    key: "sourcing_confirmed",
    icon: <IconShoppingCart size={20} />,
    variant: "teal",
  },
  {
    id: "quote_sent",
    label: M.STATS.QUOTE_SENT,
    key: "quote_sent",
    icon: <IconSend size={20} />,
    variant: "blue",
  },
  {
    id: "accepted",
    label: M.STATS.ACCEPTED,
    key: "accepted",
    icon: <IconCheck size={20} />,
    variant: "green",
  },
  {
    id: "rejected",
    label: M.STATS.REJECTED,
    key: "rejected",
    icon: <IconBan size={20} />,
    variant: "red",
  },
];

export function SpecialRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRequest, setSelectedRequest] = useState<SpecialRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // URL-driven filter state (shareable, refresh-safe) — mirrors Orders/Intents.
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  // The API 400s on an unknown `?status`, and a hand-edited or stale URL would
  // otherwise break the table — so anything off the accepted list reads as "all".
  const statusParamRaw = searchParams.get("status") ?? "all";
  const statusFilter = SPECIAL_REQUEST_STATUS_KEYS.includes(statusParamRaw as SpecialRequestStatus)
    ? statusParamRaw
    : "all";

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

  const openDetail = (req: SpecialRequest) => {
    setSelectedRequest(req);
    setIsDetailOpen(true);
  };
  const closeDetail = () => setIsDetailOpen(false);

  // Flow 13 write actions + their popup state (see the hook for why the
  // drawer has to close before a popup opens).
  const actions = useSpecialRequestActions(closeDetail);

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

  /**
   * Flow 29c §6 — download the requests as `.xlsx`.
   *
   * Scoped by the active status filter (and nothing else — the endpoint takes
   * `status` only, so the search box does **not** narrow the export). The button
   * label says which set it will contain so that difference is visible rather
   * than surprising.
   */
  const [fetchExport, { isFetching: isExporting }] = useLazyExportSpecialRequestsQuery();

  const handleExport = async () => {
    try {
      const blob = await fetchExport({ status: statusParam }).unwrap();
      downloadBlob(blob, M.EXPORT.FILENAME);
      toast.success(M.EXPORT.SUCCESS);
    } catch (error) {
      toast.error(getApiMessage(error, { labelFields: false }) ?? M.EXPORT.ERROR);
    }
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
            title={M.ACTIONS.VIEW}
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
            <Button
              variant="secondary"
              size="sm"
              loading={isExporting}
              onClick={handleExport}
              title={
                statusParam
                  ? M.EXPORT.TITLE_FILTERED(STATUS_LABEL[statusParam as SpecialRequestStatus])
                  : M.EXPORT.TITLE_ALL
              }
            >
              <IconFileSpreadsheet size={14} className="mr-1" />
              {isExporting ? M.EXPORT.EXPORTING : M.EXPORT.LABEL}
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
        onGenerateBill={actions.open("bill")}
        onReject={actions.open("reject")}
        onAllowChanges={actions.open("changes")}
      />

      {/* Flow 13 API 10 — the quote form */}
      <GenerateBillDialog
        isOpen={actions.openDialog === "bill"}
        request={actions.target}
        isLoading={actions.isQuoting}
        onClose={actions.close}
        onConfirm={actions.submitBill}
      />

      {/* Flow 13 API 11 — reject-reason popup */}
      <RejectSpecialRequestDialog
        isOpen={actions.openDialog === "reject"}
        requestRef={actions.targetRef}
        isLoading={actions.isRejecting}
        onClose={actions.close}
        onConfirm={actions.submitReject}
      />

      {/* Flow 13 API 12 — raise the delivery-change limit */}
      <AllowChangesDialog
        isOpen={actions.openDialog === "changes"}
        requestRef={actions.targetRef}
        used={actions.target?.rebill_count ?? 0}
        cap={actions.target?.rebill_cap ?? 0}
        isLoading={actions.isAllowing}
        onClose={actions.close}
        onConfirm={actions.submitAllowChanges}
      />
    </div>
  );
}

export default SpecialRequestsPage;
