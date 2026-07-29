import { IconPackage } from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DashboardOrderDrawer } from "@/components/common/DashboardOrderDrawer";
import { SearchFilters } from "@/components/common/SearchFilters";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import {
  useGetDashboardOrderDetailQuery,
  useGetDashboardOrdersQuery,
  useGetDashboardPortsQuery,
} from "../api/dashboardApi";
import { detailsToOrderDetail } from "../lib/orderAdapters";
import type { DashboardOrderRow, DashboardOrderStatus } from "../types/dashboard.types";

const M = MESSAGES.DASHBOARD;
const S = M.ORDERS_SECTION;
const LIMIT = 10;

/**
 * Status options, in the order the fulfilment pipeline runs. Values are the
 * exact tokens the `order_status` param validates against.
 */
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: S.ALL_STATUSES },
  { value: "intent_received", label: S.STATUS.INTENT_RECEIVED },
  { value: "intent_rejected", label: S.STATUS.INTENT_REJECTED },
  { value: "sourcing", label: S.STATUS.SOURCING },
  { value: "payment_pending", label: S.STATUS.PAYMENT_PENDING },
  { value: "confirmed", label: S.STATUS.CONFIRMED },
  { value: "partner_assigned", label: S.STATUS.PARTNER_ASSIGNED },
  { value: "items_collected", label: S.STATUS.ITEMS_COLLECTED },
  { value: "at_port", label: S.STATUS.AT_PORT },
  { value: "at_berth", label: S.STATUS.AT_BERTH },
  { value: "delivered", label: S.STATUS.DELIVERED },
  { value: "cancelled", label: S.STATUS.CANCELLED },
  { value: "refunded", label: S.STATUS.REFUNDED },
];

/**
 * The dashboard's full order list — searchable and filterable by status and
 * port, with a detail drawer. Complements the Live Orders preview, which is
 * capped and unfilterable.
 */
export function DashboardOrdersCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<DashboardOrderRow | null>(null);

  // URL-driven so a filtered view is shareable and survives a refresh.
  const page = Number.parseInt(searchParams.get("opage") ?? "1", 10);
  const search = searchParams.get("osearch") ?? "";
  const status = searchParams.get("ostatus") ?? "all";
  const port = searchParams.get("oport") ?? "all";

  const { data, isLoading, isFetching, isError, refetch } = useGetDashboardOrdersQuery({
    page,
    limit: LIMIT,
    search,
    order_status: status !== "all" ? (status as DashboardOrderStatus) : undefined,
    // The API filters on the port NAME, which is what the options carry.
    filter_by_port: port !== "all" ? port : undefined,
  });

  const { data: ports = [] } = useGetDashboardPortsQuery();
  const portOptions = [
    { value: "all", label: S.ALL_PORTS },
    ...ports.filter((p) => p.name).map((p) => ({ value: p.name, label: p.name })),
  ];

  // Detail is fetched only once a row is open; the clicked row seeds the drawer
  // so it renders immediately instead of flashing an empty shell.
  const { data: detail, isFetching: detailLoading } = useGetDashboardOrderDetailQuery(
    selectedOrderId ?? "",
    { skip: !selectedOrderId },
  );

  const orders = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (key !== "opage") next.set("opage", "1");
    if (value && value !== "all") {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const openOrder = (order: DashboardOrderRow) => {
    setSelectedRow(order);
    setSelectedOrderId(order.id);
  };

  const closeOrder = () => {
    setSelectedOrderId(null);
    setSelectedRow(null);
  };

  // Every field is already normalised to a present string by the API transform,
  // so the cells render it directly.
  const columns: Column<DashboardOrderRow>[] = [
    {
      id: "order",
      header: M.LIVE_ORDERS_COLUMNS.ORDER_ID,
      className: "td-id",
      cell: (o) => o.orderNumber,
    },
    {
      id: "sailor",
      header: M.LIVE_ORDERS_COLUMNS.SAILOR,
      cell: (o) => (
        <div className="flex aic g8">
          <div className="av av-sm av-navy">{o.sailorName.charAt(0)}</div>
          <span className="td-p">{o.sailorName}</span>
        </div>
      ),
    },
    {
      id: "shipport",
      header: M.LIVE_ORDERS_COLUMNS.SHIP_PORT,
      className: "td-m",
      cell: (o) => o.shipPort,
    },
    {
      id: "partner",
      header: M.LIVE_ORDERS_COLUMNS.PARTNER,
      className: "td-m",
      cell: (o) => o.partnerName,
    },
    {
      id: "status",
      header: M.LIVE_ORDERS_COLUMNS.STATUS,
      cell: (o) => <StatusBadge status={o.status} />,
    },
    {
      id: "total",
      header: M.LIVE_ORDERS_COLUMNS.TOTAL,
      className: "td-p",
      cell: (o) => o.total,
    },
  ];

  return (
    <>
      <SectionCard
        icon={<IconPackage size={18} />}
        title={S.TITLE}
        bodyPadding="none"
        className="mt-5"
        actions={
          <SearchFilters
            searchValue={search}
            onSearchChange={(val) => setParam("osearch", val)}
            searchPlaceholder={S.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isFetching}
            filters={[
              {
                id: "status",
                value: status,
                placeholder: S.ALL_STATUSES,
                options: STATUS_OPTIONS,
                width: "175px",
                onValueChange: (val) => setParam("ostatus", val),
              },
              {
                id: "port",
                value: port,
                placeholder: S.ALL_PORTS,
                options: portOptions,
                width: "175px",
                onValueChange: (val) => setParam("oport", val),
              },
            ]}
          />
        }
      >
        <DataTable
          columns={columns}
          data={orders}
          rowKey="id"
          page={page}
          pages={totalPages}
          isLoading={isLoading}
          isError={isError}
          error={isError ? S.FETCH_ERROR : null}
          onRetry={refetch}
          onPageChange={(next) => setParam("opage", String(next))}
          showPagination
          emptyMessage={S.EMPTY}
          onRowClick={openOrder}
          bare
        />
      </SectionCard>

      <DashboardOrderDrawer
        // Prefer the full detail payload; fall back to the row until it lands.
        order={
          detail
            ? detailsToOrderDetail(detail)
            : selectedRow
              ? {
                  // Seed from the row so the drawer paints immediately; the
                  // full payload replaces this as soon as it lands.
                  id: selectedRow.orderNumber,
                  sailor: selectedRow.sailorName,
                  ship: selectedRow.shipPort,
                  terminal: selectedRow.shipPort,
                  partner: selectedRow.partnerName,
                  status: selectedRow.status,
                  total: selectedRow.total,
                  payment: "—",
                  items: [],
                }
              : null
        }
        timeline={detail?.timeline}
        timelineLoading={detailLoading}
        onClose={closeOrder}
      />
    </>
  );
}

export default DashboardOrdersCard;
