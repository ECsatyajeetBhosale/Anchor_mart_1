import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { type OrderDetail, OrderDetailDrawer } from "@/components/common/OrderDetailDrawer";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import {
  actionsColumn,
  avatarColumn,
  idColumn,
  statusColumn,
  textColumn,
  truncatedColumn,
} from "@/components/common/tableColumns";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { useCancelOrderMutation, useGetOrdersQuery } from "@/features/orders/api/orderApi";
import { OrderShipAgentSection } from "@/features/orders/components/OrderShipAgentSection";
import type { Order } from "@/features/orders/types/order.types";
import { getApiMessage } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { IconDownload } from "@tabler/icons-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const M = MESSAGES.ORDERS;

interface OrderRow {
  id: string; // order UUID (stable row key + drawer lookup)
  orderNumber: string; // human-facing order number (displayed in the ID column)
  s: string;
  it: string;
  sh: string;
  pt: string;
  pay: string;
  cp: string;
  t: string;
  st: string;
  shipName: string;
  terminalName: string;
  raw: Order; // full API record for the detail drawer
}

// Status dropdown options (top-right filter).
const STATUS_OPTIONS = [
  { value: "all", label: M.STATUS_FILTER.ALL },
  { value: "New", label: M.STATUS_FILTER.NEW },
  { value: "Verifying", label: M.STATUS_FILTER.VERIFYING },
  { value: "awaiting", label: M.STATUS_FILTER.AWAITING_PAYMENT },
  { value: "In Progress", label: M.STATUS_FILTER.IN_PROGRESS },
  { value: "Delivering", label: M.STATUS_FILTER.DELIVERING },
  { value: "Delivered", label: M.STATUS_FILTER.DELIVERED },
  { value: "Cancelled", label: M.STATUS_FILTER.CANCELLED },
];

// Segmented filter chips. Counts are placeholder figures from the design mock
// (no orders API yet); the value drives the client-side filter.
const ORDER_CHIPS = [
  { label: "All (184)", value: "all" },
  { label: "New (12)", value: "New" },
  { label: "Verifying (8)", value: "Verifying" },
  { label: "Awaiting Payment (12)", value: "awaiting" },
  { label: "In Progress (47)", value: "In Progress" },
  { label: "Delivering (38)", value: "Delivering" },
  { label: "Delivered (129)", value: "Delivered" },
  { label: "Cancelled (6)", value: "Cancelled" },
];

const LIMIT = 10;

/**
 * Compact item summary. The list endpoint returns only `item_count`; the detail
 * endpoint returns the full `items` array. Prefer the item names when present,
 * otherwise fall back to the count ("4 items").
 */
function formatItems(order: Order): string {
  if (order.items?.length) {
    return order.items
      .map((it) => (it.quantity > 1 ? `${it.product_name} ×${it.quantity}` : it.product_name))
      .join(", ");
  }
  const count = order.item_count ?? order.items_count;
  if (count != null) return `${count} ${count === 1 ? "item" : "items"}`;
  return "—";
}

/** Vessel name (or IMO) used in the ship column / drawer. */
function shipLabel(order: Order): string {
  return order.shipping_address?.vessel_name || order.shipping_address?.imo || "—";
}

/** Berth / anchorage (or port) used as the terminal in the ship column / drawer. */
function terminalLabel(order: Order): string {
  return (
    order.anchorage?.anchorage_name ||
    order.anchorage_name ||
    order.port?.port_name ||
    order.port_name ||
    "—"
  );
}

/** Compact "Ship · Terminal" cell value. Falls back to the flat list fields. */
function shipTerminal(order: Order): string {
  const ship = order.shipping_address?.vessel_name || order.shipping_address?.imo;
  const loc = order.anchorage?.anchorage_code || order.port?.port_code;
  const terminal = terminalLabel(order);
  if (ship) return loc ? `${ship} · ${loc}` : ship;
  // List rows have no vessel name — show the anchorage/port instead of "—".
  return terminal;
}

/** Payment cell text, normalised to the tokens `paymentClass` understands. */
function paymentLabel(order: Order): string {
  const status = (order.payment_status ?? "").toLowerCase();
  const orderStatus = (order.status ?? "").toLowerCase();
  if (status === "completed" || status === "paid") {
    return order.payment_method_display ? `${order.payment_method_display} ✓` : "Paid ✓";
  }
  if (status === "refunded" || orderStatus === "cancelled") return "Refund";
  if (status === "pending") return "Pending";
  if (order.payment_status_display) return order.payment_status_display;
  // List rows have no payment_status — infer from `payment_completed_at`.
  return order.payment_completed_at ? "Paid ✓" : "Pending";
}

/** Sailor display name: "first_name last_name", falling back to full_name → email. */
function customerName(order: Order): string {
  const c = order.customer;
  const firstLast = `${c?.first_name ?? ""} ${c?.last_name ?? ""}`.trim();
  return (
    firstLast ||
    c?.full_name?.trim() ||
    order.customer_name ||
    order.customer_email ||
    order.user_email ||
    "—"
  );
}

/** Map an API order into the flat shape the table columns render. */
function toOrderRow(order: Order): OrderRow {
  return {
    id: order.id,
    orderNumber: order.order_number,
    s: customerName(order),
    it: formatItems(order),
    sh: shipTerminal(order),
    pt: order.active_assignment?.partner_name || order.partner_name || M.UNASSIGNED,
    pay: paymentLabel(order),
    cp: order.applied_coupon || "—",
    t: `$${Number(order.total_amount).toFixed(2)}`,
    st: order.status_display,
    shipName: shipLabel(order),
    terminalName: terminalLabel(order),
    raw: order,
  };
}

/** Colour for the payment cell, matching the design reference. */
function paymentClass(pay: string): string {
  if (pay.includes("✓")) return "text-[var(--success-text)] font-bold text-[12.5px]";
  if (pay === "Pending") return "text-[var(--warning-text)] font-bold text-[12.5px]";
  return "text-[var(--danger-text)] font-bold text-[12.5px]";
}

/** Map a table row to the detail-drawer shape. */
function toOrderDetail(o: OrderRow): OrderDetail {
  const order = o.raw;
  return {
    id: o.orderNumber,
    sailor: o.s,
    ship: o.shipName,
    terminal: o.terminalName,
    partner: o.pt,
    payment: o.pay,
    coupon: o.cp === "—" ? "" : o.cp,
    total: o.t,
    status: o.st,
    items: (order.items ?? []).map((it) => ({
      name: it.product_name,
      qty: it.quantity,
      price: `$${Number(it.unit_price).toFixed(2)}`,
    })),
  };
}

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  // Full API record for the open order — the drawer's synthetic `OrderDetail`
  // drops the UUID / ship_agent / assigned_admin that API 17 needs.
  const [selectedRaw, setSelectedRaw] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();

  // URL-driven filter state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";
  const segment = searchParams.get("seg") ?? "all";

  // Server-side: pagination + free-text search (DRF `page` / `search`).
  const { data, isLoading, isError, refetch } = useGetOrdersQuery({
    page,
    limit: LIMIT,
    search,
  });

  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));
  const orders = (data?.results ?? []).map(toOrderRow);

  // Changing a filter resets to page 1; clearing it drops the param.
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    if (value && value !== "all") {
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

  // Status dropdown + segment chips filter the current page client-side (the
  // backend status-code contract isn't wired yet); search/paging are server-side.
  const filteredOrders = orders.filter((o) => {
    // "awaiting" (dropdown or chip) keys off the pending payment, matching the source.
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "awaiting"
          ? o.pay === "Pending"
          : o.st === statusFilter;
    const matchesSegment =
      segment === "all" ? true : segment === "awaiting" ? o.pay === "Pending" : o.st === segment;
    return matchesStatus && matchesSegment;
  });

  const handleCancel = async () => {
    if (!orderToCancel) return;
    try {
      const res = await cancelOrder(orderToCancel).unwrap();
      // Success: tag invalidation refreshes the row's status automatically.
      toast.success(getApiMessage(res) ?? M.CANCEL_SUCCESS);
      setOrderToCancel(null);
    } catch (error) {
      // Failure (e.g. 409 unclaimed / already paid): surface the real reason,
      // keep the dialog open so the user can retry after claiming.
      toast.error(getApiMessage(error) ?? M.CANCEL_ERROR);
    }
  };

  const columns: Column<OrderRow>[] = [
    idColumn({ id: "id", header: M.COLUMNS.ORDER_ID, get: (o) => o.orderNumber }),
    // Order source (Mobile App / Website) isn't returned by the API → "-".
    textColumn({
      id: "source",
      header: M.COLUMNS.SOURCE,
      get: () => "—",
      className: "td-m text-center",
    }),
    avatarColumn({
      id: "sailor",
      header: M.COLUMNS.SAILOR,
      name: (o) => o.s,
      image: (o) => getFallbackAvatar(o.s),
    }),
    truncatedColumn({ id: "items", header: M.COLUMNS.ITEMS, get: (o) => o.it }),
    textColumn({
      id: "ship",
      header: M.COLUMNS.SHIP_TERMINAL,
      get: (o) => o.sh,
      className: "td-m",
    }),
    // Anchorage-change details aren't returned by the API → "-".
    textColumn({
      id: "changed-anchorage",
      header: M.COLUMNS.CHANGED_ANCHORAGE,
      get: () => "—",
      className: "td-m text-center",
    }),
    textColumn({
      id: "partner",
      header: M.COLUMNS.PARTNER,
      get: (o) => o.pt,
      cellClassName: (o) =>
        o.pt === M.UNASSIGNED
          ? "text-[var(--danger-text)] font-semibold text-[12.5px]"
          : "text-[var(--t3)] font-semibold text-[12.5px]",
    }),
    textColumn({
      id: "payment",
      header: M.COLUMNS.PAYMENT,
      get: (o) => o.pay,
      cellClassName: (o) => paymentClass(o.pay),
    }),
    textColumn({ id: "coupon", header: M.COLUMNS.COUPON, get: (o) => o.cp, className: "td-m" }),
    textColumn({ id: "total", header: M.COLUMNS.TOTAL, get: (o) => o.t, className: "td-p w7" }),
    statusColumn({ id: "status", header: M.COLUMNS.STATUS, get: (o) => o.st }),
    actionsColumn({
      header: M.COLUMNS.ACTIONS,
      className: "text-right",
      actions: () => ({
        view: {
          title: M.ACTIONS.VIEW,
          onClick: (e, r) => {
            e.stopPropagation();
            setSelectedRaw(r.raw);
            setSelectedOrder(toOrderDetail(r));
          },
        },
        message: {
          title: M.ACTIONS.MESSAGE,
          onClick: (e, r) => {
            e.stopPropagation();
            toast.success(M.MESSAGE_SENT(r.s));
          },
        },
        cancel: {
          title: M.ACTIONS.CANCEL,
          onClick: (e, r) => {
            e.stopPropagation();
            setOrderToCancel(r.id);
          },
        },
      }),
    }),
  ];

  return (
    <>
      <PageHeader
        title={M.TITLE}
        actions={
          <SearchFilters
            searchValue={search}
            onSearchChange={(val) => setParam("search", val)}
            searchPlaceholder={M.SEARCH_PLACEHOLDER}
            searchDebounceMs={180}
            searchLoading={isLoading}
            filters={[
              {
                id: "status",
                value: statusFilter,
                placeholder: M.STATUS_FILTER.ALL,
                options: STATUS_OPTIONS,
                width: "150px",
                onValueChange: (val) => setParam("status", val),
              },
            ]}
          >
            <DateRangePicker value={dateRange} onChange={setDateRange} placeholder={M.DATE_RANGE} />
            <Button variant="primary" size="sm" onClick={() => toast.success(M.EXPORTED)}>
              <IconDownload size={14} className="mr-1" />
              {M.EXPORT}
            </Button>
          </SearchFilters>
        }
      />

      {/* Segmented status chips */}
      <div className="filter-row">
        {ORDER_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            className={`fchip ${segment === chip.value ? "active" : ""}`}
            onClick={() => setParam("seg", chip.value)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredOrders}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={
          search || statusFilter !== "all" || segment !== "all" ? M.EMPTY_FILTERED : M.EMPTY
        }
        onRowClick={(o) => {
          setSelectedRaw(o.raw);
          setSelectedOrder(toOrderDetail(o));
        }}
      />

      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => {
          setSelectedOrder(null);
          setSelectedRaw(null);
        }}
        onReassign={() => {
          setSelectedOrder(null);
          setSelectedRaw(null);
          toast.success(M.PARTNER_REASSIGNED);
        }}
        onCancel={
          selectedRaw
            ? () => {
                const id = selectedRaw.id;
                setSelectedOrder(null);
                setSelectedRaw(null);
                setOrderToCancel(id);
              }
            : undefined
        }
        shipAgentSlot={
          selectedRaw ? (
            <OrderShipAgentSection
              orderId={selectedRaw.id}
              status={selectedRaw.status}
              shipAgent={selectedRaw.ship_agent}
              shipAgentSnapshot={selectedRaw.ship_agent_snapshot}
              assignedAdmin={selectedRaw.assigned_admin}
            />
          ) : null
        }
      />

      <ConfirmDialog
        isOpen={!!orderToCancel}
        onClose={() => setOrderToCancel(null)}
        onConfirm={handleCancel}
        title={M.CANCEL_CONFIRM_TITLE}
        description={M.CANCEL_CONFIRM_MSG}
        confirmText={M.CANCEL_CONFIRM_CONFIRM}
        isLoading={isCancelling}
      />
    </>
  );
}
