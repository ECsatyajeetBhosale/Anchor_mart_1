import { IconClockDollar, IconShoppingCart, IconTruckOff } from "@tabler/icons-react";
import { format } from "date-fns";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { useSearchParams } from "react-router-dom";

import { DateRangePicker } from "@/components/common/DateRangePicker";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DataTable } from "@/components/ui/data-table";
import { useGetPartnersQuery } from "@/features/partners";
import { MESSAGES } from "@/lib/messages";
import { useGetExpressOrdersQuery, useGetExpressStatsQuery } from "../api/expressApi";
import type { ExpressOrder } from "../types/expressItem.types";
import { ExpressItemDrawer } from "./ExpressItemDrawer";
import { useExpressColumns } from "./expressColumns";

const M = MESSAGES.EXPRESS;
const LIMIT = 10;

/** Thousands-separated count; `undefined` degrades to 0, not a blank card. */
function count(value: number | undefined): string {
  return (value ?? 0).toLocaleString();
}

/**
 * Express orders — **all of them, paid and unpaid**.
 *
 * The admin order surface is split by fulfilment flow, not by payment state.
 * Regular and marine share one funnel (intent → partner verifies → admin bills →
 * customer pays) and are served by the Orders and Intent Requests screens.
 * Express is direct-pay and skips the funnel entirely, so it gets this screen —
 * and since neither shared list carries express any more, an express order that
 * did not appear here would appear nowhere at all.
 *
 * That is also why `?status=payment_pending` is valid here and a 400 on the
 * Orders screen: this list spans both sides of payment.
 */
export function ExpressOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<ExpressOrder | null>(null);

  // URL-driven state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? ""; // "" = all
  const partnerFilter = searchParams.get("partner") ?? "";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";

  const { data, isLoading, isError, refetch } = useGetExpressOrdersQuery({
    page,
    limit: LIMIT,
    search: searchTerm,
    status: statusFilter,
    dateFrom,
    dateTo,
    partnerId: partnerFilter,
  });

  // Feeds the `?partner_id=` filter only — the drawer fetches its own assignable
  // list, which is a different question (who *may* take this order).
  const { data: partnersData } = useGetPartnersQuery(undefined);
  const partnerOptions = [
    { value: "", label: M.ORDER_FILTERS.PARTNER_ALL },
    ...(partnersData?.partners ?? []).map((p) => ({ value: p.deliveryPartnerId, label: p.n })),
  ];

  /**
   * Order aggregates only — the `items` half of this payload belongs to the
   * catalog screen. `express/stats/` narrows `items` by the item filter bar and
   * deliberately leaves `orders` whole, so these three do **not** follow the
   * toolbar below.
   */
  const { data: stats, isLoading: statsLoading } = useGetExpressStatsQuery({});
  const orderStats = stats?.orders;

  const statItems = [
    {
      id: "orders",
      label: M.STATS.ORDERS,
      // `total_orders` is the backend's own aggregate — the sibling keys are its
      // breakdown, so summing them alongside it would double-count.
      value: statsLoading ? M.DASH : count(orderStats?.total_orders),
      icon: <IconShoppingCart size={19} />,
      variant: "navy" as const,
    },
    {
      id: "awaiting-payment",
      /**
       * Added with the order split. Express is direct-pay, so an unpaid order is
       * simply waiting on Stripe — but it now reaches no other screen, which
       * makes "how many are stuck before payment" a question only this card
       * answers.
       */
      label: M.STATS.AWAITING_PAYMENT,
      value: statsLoading ? M.DASH : count(orderStats?.awaiting_payment),
      icon: <IconClockDollar size={19} />,
      variant: "amber" as const,
    },
    {
      id: "failed",
      // Express skips verification entirely, so a failed delivery is the first
      // point where an express order needs a human — it earns its own card.
      label: M.STATS.FAILED,
      value: statsLoading ? M.DASH : count(orderStats?.delivery_failed),
      icon: <IconTruckOff size={19} />,
      variant: "red" as const,
    },
  ];

  const orders: ExpressOrder[] = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

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

  // Assignment lives in the drawer (Flow 28 API 12) — the page only opens it.
  const columns = useExpressColumns({
    statusFilter,
    onStatusFilter: (value) => setFilterParam("status", value),
  });

  return (
    <>
      <PageHeader
        title={M.ORDERS_TITLE}
        actions={
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
        }
      />

      <StatsGrid items={statItems} className="cols-4" />

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
        onRowClick={(order) => {
          setActiveOrder(order);
          setIsDrawerOpen(true);
        }}
      />

      {/* Owns the partner picker (Flow 28 API 12) as well as the order detail. */}
      <ExpressItemDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        item={activeOrder}
      />
    </>
  );
}
