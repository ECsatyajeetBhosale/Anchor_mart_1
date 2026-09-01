import { IconBuildingStore, IconCheck, IconClock, IconEye, IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import {
  avatarColumn,
  badgeColumn,
  textColumn,
  truncatedColumn,
} from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { useGetSellerRequestStatsQuery, useGetSellerRequestsQuery } from "../api/sellerRequestApi";
import type { SellerRequest, SellerRequestStats } from "../types/sellerRequest.types";
import { SellerRequestDetailDrawer } from "./SellerRequestDetailDrawer";

const M = MESSAGES.SELLERS;

const LIMIT = 10;

type StatVariant = "navy" | "teal" | "amber" | "red" | "green" | "purple" | "blue";

// Status dropdown options — values map 1:1 to the API `status` query param.
const STATUS_OPTIONS = [
  { value: "all", label: M.ALL_STATUS },
  { value: "pending", label: M.STATUS_FILTER.PENDING },
  { value: "reviewing", label: M.STATUS_FILTER.REVIEWING },
  { value: "approved", label: M.STATUS_FILTER.APPROVED },
  { value: "rejected", label: M.STATUS_FILTER.REJECTED },
];

// KPI cards — each maps 1:1 to a field on the seller stats API response.
const STAT_CONFIG: {
  id: string;
  label: string;
  key: keyof SellerRequestStats;
  icon: ReactNode;
  variant: StatVariant;
}[] = [
  {
    id: "pending",
    label: M.STATS.PENDING,
    key: "pending",
    icon: <IconClock size={20} />,
    variant: "amber",
  },
  {
    id: "approved",
    label: M.STATS.APPROVED,
    key: "approved",
    icon: <IconCheck size={20} />,
    variant: "green",
  },
  {
    id: "rejected",
    label: M.STATS.REJECTED,
    key: "rejected",
    icon: <IconX size={20} />,
    variant: "red",
  },
  {
    id: "active",
    label: M.STATS.ACTIVE,
    key: "active_sellers",
    icon: <IconBuildingStore size={20} />,
    variant: "navy",
  },
];

export function SellerRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSeller, setSelectedSeller] = useState<SellerRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // URL-driven filter state (shareable, refresh-safe) — mirrors Special Requests.
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";

  const statusParam = statusFilter !== "all" ? statusFilter : undefined;
  const { data, isLoading, isFetching, isError, refetch } = useGetSellerRequestsQuery({
    page,
    limit: LIMIT,
    search,
    status: statusParam,
  });

  const requests = data?.requests ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // Live KPI stats from the API; cards show "—" while loading and 0 when absent.
  const { data: stats, isLoading: statsLoading } = useGetSellerRequestStatsQuery();
  const statItems = STAT_CONFIG.map((c) => ({
    id: c.id,
    label: c.label,
    value: statsLoading ? "—" : (stats?.[c.key] ?? 0).toLocaleString(),
    icon: c.icon,
    variant: c.variant,
  }));

  const openDetail = (seller: SellerRequest) => {
    setSelectedSeller(seller);
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

  const columns: Column<SellerRequest>[] = [
    avatarColumn({
      id: "applicant",
      header: M.COLUMNS.APPLICANT,
      name: (r) => r.n,
      image: (r) => getFallbackAvatar(r.n),
    }),
    textColumn({ id: "email", header: M.COLUMNS.EMAIL, get: (r) => r.e, className: "td-m" }),
    textColumn({ id: "business", header: M.COLUMNS.BUSINESS, get: (r) => r.b }),
    truncatedColumn({ id: "products", header: M.COLUMNS.PRODUCTS, get: (r) => r.prod }),
    {
      id: "documents",
      header: M.COLUMNS.DOCUMENTS,
      // Badge when the backend reports a document status; "-" when it omits it.
      cell: (r) =>
        r.docsOk === null ? (
          <span className="td-m">{r.docs}</span>
        ) : (
          <Badge variant={r.docsOk ? "success" : "danger"} className="text-[10px] h-[24px]">
            {r.docs}
          </Badge>
        ),
    },
    textColumn({
      id: "submitted",
      header: M.COLUMNS.SUBMITTED,
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
            title={M.ACTION_REVIEW}
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
          />
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

      <SellerRequestDetailDrawer
        seller={selectedSeller}
        isOpen={isDetailOpen}
        onClose={closeDetail}
      />
    </div>
  );
}

export default SellerRequestsPage;
