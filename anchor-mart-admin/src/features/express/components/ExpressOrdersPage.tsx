import {
  IconBan,
  IconCircleCheck,
  IconClockDollar,
  IconReceiptRefund,
  IconShoppingCart,
  IconTruckDelivery,
  IconTruckOff,
} from "@tabler/icons-react";
import { format } from "date-fns";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { useSearchParams } from "react-router-dom";

import { DateRangePicker } from "@/components/common/DateRangePicker";
import { OrderDetailDrawer } from "@/components/common/OrderDetailDrawer";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DataTable } from "@/components/ui/data-table";
import {
  OrderAssignPartnerSection,
  toOrderDetail,
  useGetOrderDetailQuery,
} from "@/features/orders";
import { useGetPartnersQuery } from "@/features/partners";
import { MESSAGES } from "@/lib/messages";
import { useGetExpressOrdersQuery, useGetExpressStatsQuery } from "../api/expressApi";
import { toExpressOrderDetail } from "../lib/expressOrderDetail";
import type { ExpressOrder } from "../types/expressItem.types";
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
  /** The clicked row. It alone decides whether the drawer is open. */
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

  /**
   * The whole `orders` block, one card per bucket — 4 + 4.
   *
   * Every card drills into the rows it counts, using the same `?status=` the
   * table's own filter writes, so a number and the list it opens can never
   * disagree. `total_orders` clears the filter instead of setting one: it is
   * the population, and "filter to everything" is the same thing as no filter.
   *
   * The seven buckets do **not** sum to the total — `payment_received` belongs
   * to none of them — so they are presented as seven independent counts rather
   * than a breakdown that reconciles.
   */
  const statItems = [
    {
      id: "orders",
      label: M.STATS.ORDERS,
      // `total_orders` is the backend's own aggregate — the sibling keys are its
      // breakdown, so summing them alongside it would double-count.
      value: statsLoading ? M.DASH : count(orderStats?.total_orders),
      icon: <IconShoppingCart size={19} />,
      variant: "navy" as const,
      // Clears rather than sets — this card *is* "no filter".
      onClick: () => setFilterParam("status", ""),
      active: statusFilter === "",
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
      /**
       * Drills to the rows it counts. `payment_pending` is valid **here only** —
       * the main Orders screen 400s on it — so this card was naming a set that
       * had no other route to it.
       */
      onClick: () => setFilterParam("status", "payment_pending"),
      active: statusFilter === "payment_pending",
    },
    {
      id: "confirmed",
      /**
       * The backend calls this bucket `new`; the status it counts is
       * `order_confirmed` — express pays first, so the webhook moves an order
       * straight to confirmed and that is where the queue starts. Labelled for
       * the status rather than the key, so the card and the badge in the STATUS
       * column read the same word.
       */
      label: M.STATS.CONFIRMED,
      value: statsLoading ? M.DASH : count(orderStats?.new),
      icon: <IconCircleCheck size={19} />,
      variant: "blue" as const,
      onClick: () => setFilterParam("status", "order_confirmed"),
      active: statusFilter === "order_confirmed",
    },
    {
      id: "in-progress",
      label: M.STATS.IN_PROGRESS,
      value: statsLoading ? M.DASH : count(orderStats?.in_progress),
      icon: <IconTruckDelivery size={19} />,
      variant: "teal" as const,
      // A derived filter, not a raw status: it resolves server-side to the same
      // `ORDER_IN_PROGRESS_STATUSES` constant this count is computed from, so
      // the card and its drill-in cannot drift apart.
      onClick: () => setFilterParam("status", "in_progress"),
      active: statusFilter === "in_progress",
    },
    {
      id: "delivered",
      label: M.STATS.DELIVERED,
      value: statsLoading ? M.DASH : count(orderStats?.delivered),
      icon: <IconCircleCheck size={19} />,
      variant: "green" as const,
      onClick: () => setFilterParam("status", "delivered"),
      active: statusFilter === "delivered",
    },
    {
      id: "failed",
      // Express skips verification entirely, so a failed delivery is the first
      // point where an express order needs a human — it earns its own card.
      label: M.STATS.FAILED,
      value: statsLoading ? M.DASH : count(orderStats?.delivery_failed),
      icon: <IconTruckOff size={19} />,
      variant: "red" as const,
      onClick: () => setFilterParam("status", "delivery_failed"),
      active: statusFilter === "delivery_failed",
    },
    {
      id: "cancelled",
      label: M.STATS.CANCELLED,
      value: statsLoading ? M.DASH : count(orderStats?.cancelled),
      icon: <IconBan size={19} />,
      variant: "red" as const,
      onClick: () => setFilterParam("status", "cancelled"),
      active: statusFilter === "cancelled",
    },
    {
      id: "refunded",
      label: M.STATS.REFUNDED,
      value: statsLoading ? M.DASH : count(orderStats?.refunded),
      icon: <IconReceiptRefund size={19} />,
      variant: "purple" as const,
      onClick: () => setFilterParam("status", "refunded"),
      active: statusFilter === "refunded",
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

  /**
   * The full record for the open order, on the **same pattern as Orders**: the
   * drawer opens on the row and upgrades in place when the detail lands.
   *
   * If this endpoint turns out to be scoped away from express — the 2026-08-17
   * split removed express from the `orders/orders/` *list*, and whether the
   * detail route follows is unconfirmed — the query simply errors and the row
   * mapping stands, which is exactly what this screen showed before. So the
   * drawer is strictly better either way and never blank.
   */
  const { data: orderDetail } = useGetOrderDetailQuery(activeOrder?.id ?? "", {
    skip: !activeOrder?.id,
  });
  const openOrder = activeOrder
    ? orderDetail
      ? toOrderDetail(orderDetail)
      : toExpressOrderDetail(activeOrder)
    : null;
  /** Express is direct-pay — `payment_completed_at` is the marker, not a status. */
  const isPaid = !!activeOrder?.payment_completed_at;

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
                // The same fleet as the assign picker, so the same problem.
                searchable: true,
                searchPlaceholder: MESSAGES.ORDERS.ASSIGN_PARTNER.PARTNER_SEARCH,
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
        onRowClick={setActiveOrder}
      />

      {/*
        The **same drawer the Orders screen uses** — same summary strip, same
        lifecycle rail, same tabs — rather than a second, thinner one. The only
        express-specific rule lives in the slot below.

        No `onCancel` / `onRefund` / `onDownloadSlip` yet: the drawer renders
        those buttons only when a handler is supplied, and whether those order
        endpoints accept an express id is the open question with backend. Better
        absent than offered and 404ing.
      */}
      <OrderDetailDrawer
        order={openOrder}
        onClose={() => setActiveOrder(null)}
        detailSlot={
          activeOrder ? (
            // Remounted per order so picker/claim state never leaks across rows.
            <div key={activeOrder.id}>
              {isPaid ? (
                <OrderAssignPartnerSection
                  orderId={activeOrder.id}
                  status={activeOrder.status}
                  activeAssignment={orderDetail?.active_assignment}
                  assignedAdmin={orderDetail?.assigned_admin}
                />
              ) : (
                /**
                 * The one way this screen differs from Orders. An unpaid express
                 * order has nothing to deliver yet — the sailor may never pay,
                 * and a partner booked against an order that lapses is work
                 * assigned to nothing. Absent rather than disabled: there is no
                 * state before payment where assigning is the right next action.
                 */
                <section className="mt-4">
                  <div className="sec-label">{MESSAGES.EXPRESS.ASSIGN.SECTION}</div>
                  <p className="fg-hint">{MESSAGES.EXPRESS.ASSIGN.AWAITING_PAYMENT}</p>
                </section>
              )}
            </div>
          ) : undefined
        }
      />
    </>
  );
}
