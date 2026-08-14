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
import { Badge } from "@/components/ui/badge";
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

  /**
   * Live KPI stats. **Search is passed, status is not.**
   *
   * The endpoint ignores `?status` by design, and so it should: these five
   * counts *are* the status breakdown, so filtering them by status would zero
   * four cards and leave the fifth restating the row count below it. Search is
   * different — it decides which requests are on the screen at all — so the
   * cards follow it and a searched table gets searched cards.
   */
  const { data: stats, isLoading: statsLoading } = useGetSpecialRequestStatsQuery({ search });
  const statItems = STAT_CONFIG.map((c) => ({
    id: c.id,
    label: c.label,
    value: statsLoading ? "—" : (stats?.[c.key] ?? 0).toLocaleString(),
    icon: c.icon,
    variant: c.variant,
    /**
     * `awaiting_rebill` hangs *inside* Sourcing Confirmed rather than beside it.
     * Those requests already sit in that bucket, so a seventh card would count
     * them twice and break the five-cards-sum-to-total contract. It is the
     * "needs an admin right now" slice: a sailor changed delivery details and is
     * waiting on the re-quote.
     */
    breakdown:
      c.key === "sourcing_confirmed" && !statsLoading && (stats?.awaiting_rebill ?? 0) > 0
        ? [{ label: M.STATS.AWAITING_REBILL, value: String(stats?.awaiting_rebill ?? 0) }]
        : undefined,
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
    // The row's id is the special-request reference (`SR…`). It is not an order
    // number: an order only exists once the sailor pays, and its `AM…` number is
    // on the detail as `order.order_number`.
    idColumn({ id: "ref", header: M.COLUMNS.REFERENCE, get: (r) => r.r }),
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
    badgeColumn({
      id: "status",
      header: M.COLUMNS.STATUS,
      get: (r) => r.st,
      variant: (r) => r.sc,
      // The filter sits on the column it filters, as on Orders and Intents. In
      // the toolbar beside search it implied it rescoped the cards too, which it
      // does not — the cards are the status breakdown and ignore `?status`.
      filter: {
        value: statusFilter === "all" ? "" : statusFilter,
        options: STATUS_OPTIONS.filter((o) => o.value !== "all"),
        onChange: (val: string) => setParam("status", val),
        allLabel: M.ALL_STATUS,
      },
      // The row-level counterpart of the `awaiting_rebill` card: the sailor has
      // asked for different delivery details and is waiting on a re-quote.
      note: (r) =>
        r.rebillRequested ? (
          <Badge variant="warning" className="mt-1 h-[22px] text-[10px]">
            {M.AWAITING_REBILL_ROW}
          </Badge>
        ) : null,
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
