import { IconBolt, IconPackage, IconShoppingCart, IconStack2 } from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DynamicTabs } from "@/components/common/DynamicTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { useGetExpressItemsQuery, useGetExpressStatsQuery } from "../api/expressApi";
import type { ExpressOrder } from "../types/expressItem.types";
import { ExpressCatalogTab } from "./ExpressCatalogTab";
import { ExpressItemDrawer } from "./ExpressItemDrawer";
import { useExpressColumns } from "./expressColumns";

const M = MESSAGES.EXPRESS;
const LIMIT = 10;

const TAB_ORDERS = "orders";
const TAB_CATALOG = "catalog";

/** Sums the per-status order counts into a single total. */
function totalOrders(byStatus?: Record<string, number>): number {
  if (!byStatus) return 0;
  return Object.values(byStatus).reduce((sum, n) => sum + (typeof n === "number" ? n : 0), 0);
}

export function ExpressItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<ExpressOrder | null>(null);

  // URL-driven state (shareable, refresh-safe).
  const tab = searchParams.get("tab") === TAB_CATALOG ? TAB_CATALOG : TAB_ORDERS;
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? ""; // "" = all
  const sort = searchParams.get("sort") ?? "";

  const { data, isLoading, isError, refetch } = useGetExpressItemsQuery(
    { page, limit: LIMIT, search: searchTerm, status: statusFilter },
    // The orders list is only rendered on its own tab — don't fetch it otherwise.
    { skip: tab !== TAB_ORDERS },
  );

  // Aggregates span both tabs, so they load regardless of which one is active.
  const { data: stats, isLoading: statsLoading } = useGetExpressStatsQuery();
  const statItems = [
    {
      id: "products",
      label: M.STATS.PRODUCTS,
      footer: M.STATS.PRODUCTS_FOOTER,
      value: statsLoading ? M.DASH : (stats?.products?.total ?? 0).toLocaleString(),
      icon: <IconPackage size={20} />,
      variant: "navy" as const,
    },
    {
      id: "variants",
      label: M.STATS.VARIANTS,
      footer: M.STATS.VARIANTS_FOOTER,
      value: statsLoading ? M.DASH : (stats?.variants?.total ?? 0).toLocaleString(),
      icon: <IconStack2 size={20} />,
      variant: "purple" as const,
    },
    {
      id: "sourceable",
      label: M.STATS.SOURCEABLE,
      footer: M.STATS.SOURCEABLE_FOOTER,
      value: statsLoading ? M.DASH : (stats?.variants?.sourceable ?? 0).toLocaleString(),
      icon: <IconBolt size={20} />,
      variant: "teal" as const,
    },
    {
      id: "orders",
      label: M.STATS.ORDERS,
      footer: M.STATS.ORDERS_FOOTER,
      value: statsLoading ? M.DASH : totalOrders(stats?.orders_by_status).toLocaleString(),
      icon: <IconShoppingCart size={20} />,
      variant: "amber" as const,
    },
  ];

  const orders: ExpressOrder[] = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // --- Handlers ---
  const setFilterParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", newPage.toString());
    setSearchParams(next);
  };

  // Switching tabs resets paging and the filters, which mean different things
  // on each side (order status vs catalog sort).
  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    next.delete("page");
    next.delete("search");
    next.delete("status");
    next.delete("sort");
    setSearchParams(next);
  };

  const openOrder = (order: ExpressOrder) => {
    setActiveOrder(order);
    setIsDrawerOpen(true);
  };

  const columns = useExpressColumns({
    statusFilter,
    onStatusFilter: (value) => setFilterParam("status", value),
    onView: (e, order) => {
      e.stopPropagation();
      openOrder(order);
    },
  });

  const ordersTab = (
    <>
      <div className="mb-4 flex justify-end">
        <SearchFilters
          searchValue={searchTerm}
          onSearchChange={(val) => setFilterParam("search", val)}
          searchPlaceholder={M.SEARCH_PLACEHOLDER}
          searchDebounceMs={180}
          searchLoading={isLoading}
        />
      </div>

      <DataTable
        columns={columns}
        data={orders}
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
        onRowClick={openOrder}
      />
    </>
  );

  return (
    <div className="page-enter">
      <PageHeader title={M.TITLE} subtitle={M.SUBTITLE} />

      <StatsGrid items={statItems} />

      <DynamicTabs
        value={tab}
        onTabChange={handleTabChange}
        tabs={[
          { value: TAB_ORDERS, label: M.TABS.ORDERS, content: ordersTab },
          {
            value: TAB_CATALOG,
            label: M.TABS.CATALOG,
            content: (
              <ExpressCatalogTab
                page={page}
                search={searchTerm}
                sort={sort}
                onPageChange={handlePageChange}
                onSearchChange={(val) => setFilterParam("search", val)}
                onSortChange={(val) => setFilterParam("sort", val)}
              />
            ),
          },
        ]}
      />

      <ExpressItemDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        item={activeOrder}
      />
    </div>
  );
}
