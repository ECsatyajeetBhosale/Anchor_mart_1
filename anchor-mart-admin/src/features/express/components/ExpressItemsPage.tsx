import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { IconCookie, IconCup, IconHeartRateMonitor } from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetExpressItemsQuery } from "../api/expressApi";
import type { ExpressItem } from "../types/expressItem.types";
import { ExpressItemDrawer } from "./ExpressItemDrawer";
import { useExpressColumns } from "./expressColumns";

const LIMIT = 10;

// Category summary band — preserved from the current Express page design.
const CATEGORY_CARDS = [
  {
    name: "Beverages",
    icon: IconCup,
    count: 24,
    top: "Bisleri 1L",
    badge: "teal" as const,
    iconClass: "bg-[var(--teal-50)] text-[var(--teal-600)]",
  },
  {
    name: "Snacks",
    icon: IconCookie,
    count: 18,
    top: "Lay's Classic",
    badge: "amber" as const,
    iconClass: "bg-[var(--amber-50)] text-[var(--amber-700)]",
  },
  {
    name: "Personal Care",
    icon: IconHeartRateMonitor,
    count: 12,
    top: "Dettol Antiseptic",
    badge: "navy" as const,
    iconClass: "bg-[var(--navy-50)] text-[var(--navy-600)]",
  },
];

export function ExpressItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<ExpressItem | null>(null);

  // URL-driven state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? ""; // "", "active", "inactive"

  const isActive =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  const { data, isLoading, isError, refetch } = useGetExpressItemsQuery({
    page,
    limit: LIMIT,
    search: searchTerm,
    isActive,
  });

  const items: ExpressItem[] = data?.results?.data ?? [];
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

  const openItem = (item: ExpressItem) => {
    setActiveItem(item);
    setIsDrawerOpen(true);
  };

  const columns = useExpressColumns({
    statusFilter,
    onStatusFilter: (value) => setFilterParam("status", value),
    onView: (e, item) => {
      e.stopPropagation();
      openItem(item);
    },
  });

  return (
    <>
      <PageHeader
        title={MESSAGES.EXPRESS.TITLE}
        subtitle={MESSAGES.EXPRESS.SUBTITLE}
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

      {/* Category summary cards */}
      <div className="grid gap-5 mb-5 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
        {CATEGORY_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.name} className="p-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] ${c.iconClass}`}
                >
                  <Icon size={22} />
                </div>
                <div className="flex-1">
                  <div className="font-extrabold text-[var(--t1)] mb-1">{c.name}</div>
                  <div className="text-[12px] font-medium text-[var(--t4)]">
                    {c.count} items · Top: {c.top}
                  </div>
                </div>
                <Badge variant={c.badge}>{c.count}</Badge>
              </div>
            </Card>
          );
        })}
      </div>

      <DataTable
        columns={columns}
        data={items}
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
        onRowClick={openItem}
      />

      <ExpressItemDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        item={activeItem}
      />
    </>
  );
}
