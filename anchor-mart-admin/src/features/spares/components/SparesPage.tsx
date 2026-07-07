import { IconClipboardText, IconEye } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { avatarColumn, statusColumn, textColumn } from "@/components/common/tableColumns";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { useGetSpareProductsQuery, useGetSpareStatsQuery } from "../api/spareApi";
import type { SpareProduct, SpareStats } from "../types/spare.types";
import { SpareProductDetailDrawer } from "./SpareProductDetailDrawer";

const M = MESSAGES.SPARES;

const LIMIT = 10;

type StatVariant = "navy" | "teal" | "amber" | "red" | "green" | "purple" | "blue";

// KPI cards. Only "Total Products" is backed by the stats API (`total`).
const STAT_CONFIG: {
  id: string;
  label: string;
  footer: string;
  key: keyof SpareStats;
  icon: ReactNode;
  variant: StatVariant;
}[] = [
  {
    id: "total",
    label: M.STATS.TOTAL,
    footer: M.STATS.TOTAL_FOOTER,
    key: "total",
    icon: <IconClipboardText size={20} />,
    variant: "navy",
  },
];

export function SparesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProduct, setSelectedProduct] = useState<SpareProduct | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // URL-driven filter state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";

  const { data, isLoading, isFetching, isError, refetch } = useGetSpareProductsQuery({
    page,
    limit: LIMIT,
    search,
  });

  const products = data?.products ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // Live KPI stats from the API; cards show "—" while loading and 0 when absent.
  const { data: stats, isLoading: statsLoading } = useGetSpareStatsQuery();
  const statItems = STAT_CONFIG.map((c) => ({
    id: c.id,
    label: c.label,
    footer: c.footer,
    value: statsLoading ? "—" : (stats?.[c.key] ?? totalCount).toLocaleString(),
    icon: c.icon,
    variant: c.variant,
  }));

  const openDetail = (product: SpareProduct) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };
  const closeDetail = () => setIsDetailOpen(false);

  // Update one URL param; search changes reset to page 1. Empty clears it.
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (key !== "page") next.set("page", "1");
    if (value) {
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

  const columns: Column<SpareProduct>[] = [
    avatarColumn({
      id: "product",
      header: M.COLUMNS.PRODUCT,
      name: (r) => r.name,
      image: (r) => r.image || getFallbackAvatar(r.name),
    }),
    textColumn({
      id: "category",
      header: M.COLUMNS.CATEGORY,
      get: (r) => r.category,
      className: "td-m",
    }),
    textColumn({ id: "price", header: M.COLUMNS.PRICE, get: (r) => r.price, className: "td-p" }),
    textColumn({
      id: "variants",
      header: M.COLUMNS.VARIANTS,
      get: (r) => r.variants,
      className: "td-m text-center",
      headerClassName: "text-center",
    }),
    textColumn({
      id: "rating",
      header: M.COLUMNS.RATING,
      get: (r) => r.rating,
      className: "td-m text-center",
      headerClassName: "text-center",
    }),
    statusColumn({
      id: "status",
      header: M.COLUMNS.STATUS,
      get: (r) => r.active,
      activeLabel: M.DETAIL.ACTIVE,
      inactiveLabel: M.DETAIL.INACTIVE,
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
          />
        }
      />

      <StatsGrid items={statItems} />

      <DataTable
        columns={columns}
        data={products}
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

      <SpareProductDetailDrawer
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={closeDetail}
      />
    </div>
  );
}

export default SparesPage;
