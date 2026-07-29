import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetExpressItemsQuery } from "../api/expressApi";
import type { ExpressOrder } from "../types/expressItem.types";
import { ExpressItemDrawer } from "./ExpressItemDrawer";
import { useExpressColumns } from "./expressColumns";

const LIMIT = 10;

export function ExpressItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<ExpressOrder | null>(null);

  // URL-driven state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? ""; // "" = all

  const { data, isLoading, isError, refetch } = useGetExpressItemsQuery({
    page,
    limit: LIMIT,
    search: searchTerm,
    status: statusFilter,
  });

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

  return (
    <>
      <PageHeader
        title={MESSAGES.EXPRESS.TITLE}
        actions={
          <SearchFilters
            searchValue={searchTerm}
            onSearchChange={(val) => setFilterParam("search", val)}
            searchPlaceholder={MESSAGES.EXPRESS.SEARCH_PLACEHOLDER}
            searchDebounceMs={180}
            searchLoading={isLoading}
          />
        }
      />

      <DataTable
        columns={columns}
        data={orders}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? MESSAGES.EXPRESS.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={MESSAGES.EXPRESS.EMPTY}
        onRowClick={openOrder}
      />

      <ExpressItemDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        item={activeOrder}
      />
    </>
  );
}
