import {
  IconBolt,
  IconPackage,
  IconShoppingCart,
  IconStack2,
  IconTruckOff,
} from "@tabler/icons-react";
import { format } from "date-fns";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { useSearchParams } from "react-router-dom";

import { DateRangePicker } from "@/components/common/DateRangePicker";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DataTable } from "@/components/ui/data-table";
import { useGetPartnersQuery } from "@/features/partners";
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

/** Thousands-separated count; `undefined` degrades to 0, not a blank card. */
function count(value: number | undefined): string {
  return (value ?? 0).toLocaleString();
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
  const partnerFilter = searchParams.get("partner") ?? "";
  const sourceableFilter = searchParams.get("sourceable") ?? "";
  const activeFilter = searchParams.get("active") ?? "";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";

  const { data, isLoading, isError, refetch } = useGetExpressItemsQuery(
    {
      page,
      limit: LIMIT,
      search: searchTerm,
      status: statusFilter,
      dateFrom,
      dateTo,
      partnerId: partnerFilter,
    },
    // The orders list is only rendered on its own tab — don't fetch it otherwise.
    { skip: tab !== TAB_ORDERS },
  );

  // Feeds the `?partner_id=` filter only — the drawer fetches its own
  // assignable list, which is a different question (who *may* take this order).
  const { data: partnersData } = useGetPartnersQuery(undefined, { skip: tab !== TAB_ORDERS });
  const partnerOptions = [
    { value: "", label: M.ORDER_FILTERS.PARTNER_ALL },
    ...(partnersData?.partners ?? []).map((p) => ({ value: p.deliveryPartnerId, label: p.n })),
  ];

  // Aggregates span both tabs, so they load regardless of which one is active.
  const { data: stats, isLoading: statsLoading } = useGetExpressStatsQuery();
  const items = stats?.items;
  const orderStats = stats?.orders;

  // Each card shows one headline number and folds its related counts into the
  // footer — the payload carries 15 figures and 15 cards would bury the four
  // that matter.
  const statItems = [
    {
      id: "products",
      label: M.STATS.PRODUCTS,
      value: statsLoading ? M.DASH : count(items?.total_products),
      icon: <IconPackage size={20} />,
      variant: "navy" as const,
    },
    {
      id: "variants",
      label: M.STATS.VARIANTS,
      value: statsLoading ? M.DASH : count(items?.total_variants),
      icon: <IconStack2 size={20} />,
      variant: "purple" as const,
    },
    {
      id: "sourceable",
      label: M.STATS.SOURCEABLE,
      value: statsLoading ? M.DASH : count(items?.sourceable_variants),
      icon: <IconBolt size={20} />,
      variant: "teal" as const,
    },
    {
      id: "orders",
      label: M.STATS.ORDERS,
      // `total_orders` is the backend's own aggregate — the sibling keys are its
      // breakdown, so summing them alongside it would double-count.
      value: statsLoading ? M.DASH : count(orderStats?.total_orders),
      icon: <IconShoppingCart size={20} />,
      variant: "amber" as const,
    },
    {
      id: "failed",
      label: M.STATS.FAILED,
      value: statsLoading ? M.DASH : count(orderStats?.delivery_failed),
      icon: <IconTruckOff size={20} />,
      variant: "red" as const,
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

  /** The picker hands back a range; the API wants two `YYYY-MM-DD` params. */
  const dateRange: DateRange | undefined = dateFrom
    ? { from: new Date(dateFrom), to: dateTo ? new Date(dateTo) : undefined }
    : undefined;

  const handleDateRange = (range: DateRange | undefined) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    // Only a *complete* range is sent — a half-picked one would silently widen
    // the query to "everything after X" while the picker still looks pending.
    if (range?.from && range?.to) {
      next.set("from", format(range.from, "yyyy-MM-dd"));
      next.set("to", format(range.to, "yyyy-MM-dd"));
    } else {
      next.delete("from");
      next.delete("to");
    }
    setSearchParams(next);
  };

  // Switching tabs resets paging and the filters, which mean different things
  // on each side (order status/partner/date vs catalog sort/sourceable/active).
  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    for (const key of [
      "page",
      "search",
      "status",
      "sort",
      "partner",
      "from",
      "to",
      "sourceable",
      "active",
    ]) {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const openOrder = (order: ExpressOrder) => {
    setActiveOrder(order);
    setIsDrawerOpen(true);
  };

  // Assignment lives in the drawer (Flow 28 API 12) — the page only opens it.
  const columns = useExpressColumns({
    statusFilter,
    onStatusFilter: (value) => setFilterParam("status", value),
  });

  const ordersTab = (
    <>
      <div className="mb-4 flex justify-end items-center gap-2">
        <SearchFilters
          searchValue={searchTerm}
          onSearchChange={(val) => setFilterParam("search", val)}
          searchPlaceholder={M.SEARCH_PLACEHOLDER}
          searchDebounceMs={180}
          searchLoading={isLoading}
          filters={[
            {
              id: "partner",
              value: partnerFilter,
              placeholder: M.ORDER_FILTERS.PARTNER_PLACEHOLDER,
              options: partnerOptions,
              width: "180px",
              onValueChange: (val) => setFilterParam("partner", val),
            },
          ]}
        >
          {/* `date_from`/`date_to` filter on `payment_completed_at`, so the
              picker is labelled by that rather than "created". */}
          <DateRangePicker
            value={dateRange}
            onChange={handleDateRange}
            placeholder={M.ORDER_FILTERS.DATE_PLACEHOLDER}
          />
        </SearchFilters>
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
      <PageHeader title={M.TITLE} />

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
                sourceable={sourceableFilter}
                active={activeFilter}
                onPageChange={handlePageChange}
                onSearchChange={(val) => setFilterParam("search", val)}
                onSortChange={(val) => setFilterParam("sort", val)}
                onSourceableChange={(val) => setFilterParam("sourceable", val)}
                onActiveChange={(val) => setFilterParam("active", val)}
              />
            ),
          },
        ]}
      />

      {/* Owns the partner picker (Flow 28 API 12) as well as the order detail. */}
      <ExpressItemDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        item={activeOrder}
      />
    </div>
  );
}
