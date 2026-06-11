import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { type OrderDetail, OrderDetailDrawer } from "@/components/common/OrderDetailDrawer";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TableActions } from "@/components/common/TableActions";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { IconDownload, IconEye, IconMessage, IconX } from "@tabler/icons-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const M = MESSAGES.ORDERS;

interface OrderRow {
  id: string;
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
}

// Status dropdown options (top-right filter).
const STATUS_OPTIONS = [
  { value: "all", label: M.STATUS_FILTER.ALL },
  { value: "New", label: M.STATUS_FILTER.NEW },
  { value: "Verifying", label: M.STATUS_FILTER.VERIFYING },
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

// Mock dataset — mirrors the design reference until an orders API exists.
const INITIAL_ORDERS: OrderRow[] = [
  {
    id: "#AM2458",
    s: "Lois Becket",
    it: "Titan Watch, Card Holder",
    sh: "0123456 · Anch.2",
    pt: "Rahul Singh",
    pay: "Card ✓",
    cp: "SHIP10",
    t: "$84.00",
    st: "In Progress",
    shipName: "IMO 0123456",
    terminalName: "Anchorage 2",
  },
  {
    id: "#AM2461",
    s: "Ali Mahmoud",
    it: "Nu Republic ×2, Protein Bar",
    sh: "MSC Marvela · B7",
    pt: "Rahul Singh",
    pay: "Card ✓",
    cp: "—",
    t: "$70.45",
    st: "Verifying",
    shipName: "MSC Marvela",
    terminalName: "Berth 7",
  },
  {
    id: "#AM2463",
    s: "James Wren",
    it: "Coffee, Tablets, Side table",
    sh: "Evergreen · Brani",
    pt: "Pita Havili",
    pay: "Card ✓",
    cp: "FREESHIP",
    t: "$48.00",
    st: "Delivering",
    shipName: "Evergreen Faith",
    terminalName: "Brani Terminal",
  },
  {
    id: "#AM2465",
    s: "Sara Chen",
    it: "Echo Dot 5th Gen, Echo Buds",
    sh: "APL Vanda · PSA",
    pt: "Marco Reyes",
    pay: "Card ✓",
    cp: "—",
    t: "$94.99",
    st: "Delivered",
    shipName: "APL Vanda",
    terminalName: "PSA Terminal",
  },
  {
    id: "#AM2467",
    s: "Ravi Patel",
    it: "Express items ×6",
    sh: "IMO 0123456",
    pt: "Unassigned",
    pay: "Pending",
    cp: "—",
    t: "$32.00",
    st: "New",
    shipName: "IMO 0123456",
    terminalName: "PSA Terminal",
  },
  {
    id: "#AM2451",
    s: "Maria Santos",
    it: "KILLER Running Shoes",
    sh: "MSC Marvela",
    pt: "—",
    pay: "Refund",
    cp: "—",
    t: "$67.00",
    st: "Cancelled",
    shipName: "MSC Marvela",
    terminalName: "Keppel Terminal",
  },
];

/** Colour for the payment cell, matching the design reference. */
function paymentClass(pay: string): string {
  if (pay.includes("✓")) return "text-[var(--green-text)] font-bold text-[12.5px]";
  if (pay === "Pending") return "text-[var(--warning-text)] font-bold text-[12.5px]";
  return "text-[var(--danger-text)] font-bold text-[12.5px]";
}

/** Map a table row to the detail-drawer shape. */
function toOrderDetail(o: OrderRow): OrderDetail {
  return {
    id: o.id,
    sailor: o.s,
    ship: o.shipName,
    terminal: o.terminalName,
    partner: o.pt,
    payment: o.pay.includes("✓")
      ? "Card · Paid"
      : o.pay === "Refund"
        ? "Cancelled · Refunded"
        : "Pending Payment",
    coupon: o.cp === "—" ? "" : o.cp,
    total: o.t,
    status: o.st,
    items: [{ name: o.it.split(", ")[0], qty: 1, price: o.t }],
  };
}

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<OrderRow[]>(INITIAL_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // URL-driven filter state (shareable, refresh-safe).
  const search = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";
  const segment = searchParams.get("seg") ?? "all";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const filteredOrders = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.s.toLowerCase().includes(q) ||
      o.it.toLowerCase().includes(q) ||
      o.sh.toLowerCase().includes(q) ||
      o.pt.toLowerCase().includes(q);

    const matchesStatus = statusFilter === "all" || o.st === statusFilter;

    const matchesSegment =
      segment === "all" ? true : segment === "awaiting" ? o.pay === "Pending" : o.st === segment;

    return matchesSearch && matchesStatus && matchesSegment;
  });

  const handleCancel = () => {
    if (!orderToCancel) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === orderToCancel ? { ...o, st: "Cancelled", pay: "Refund" } : o)),
    );
    toast.error(M.ORDER_CANCELLED(orderToCancel));
    setOrderToCancel(null);
  };

  const columns: Column<OrderRow>[] = [
    {
      id: "id",
      header: M.COLUMNS.ORDER_ID,
      cell: (o) => o.id,
      className: "td-id",
    },
    {
      id: "sailor",
      header: M.COLUMNS.SAILOR,
      cell: (o) => (
        <div className="flex items-center gap-2">
          <div className="av av-sm av-navy">{o.s.charAt(0)}</div>
          <span className="td-p">{o.s}</span>
        </div>
      ),
    },
    {
      id: "items",
      header: M.COLUMNS.ITEMS,
      cell: (o) => (
        <span className="td-m trunc block max-w-[170px]" title={o.it}>
          {o.it}
        </span>
      ),
    },
    {
      id: "ship",
      header: M.COLUMNS.SHIP_TERMINAL,
      cell: (o) => o.sh,
      className: "td-m",
    },
    {
      id: "partner",
      header: M.COLUMNS.PARTNER,
      cell: (o) => (
        <span
          className={
            o.pt === M.UNASSIGNED
              ? "text-[var(--danger-text)] font-semibold text-[12.5px]"
              : "text-[var(--t2)] font-semibold text-[12.5px]"
          }
        >
          {o.pt}
        </span>
      ),
    },
    {
      id: "payment",
      header: M.COLUMNS.PAYMENT,
      cell: (o) => <span className={paymentClass(o.pay)}>{o.pay}</span>,
    },
    {
      id: "coupon",
      header: M.COLUMNS.COUPON,
      cell: (o) => o.cp,
      className: "td-m",
    },
    {
      id: "total",
      header: M.COLUMNS.TOTAL,
      cell: (o) => o.t,
      className: "td-p w7",
    },
    {
      id: "status",
      header: M.COLUMNS.STATUS,
      cell: (o) => <StatusBadge status={o.st} className="text-[10px] h-[24px]" />,
    },
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      headerClassName: "text-right",
      className: "text-right",
      cell: (o) => (
        <TableActions
          row={o}
          actions={[
            {
              icon: <IconEye size={15} />,
              title: M.ACTIONS.VIEW,
              onClick: (e, r) => {
                e.stopPropagation();
                setSelectedOrder(toOrderDetail(r));
              },
            },
            {
              icon: <IconMessage size={15} />,
              title: M.ACTIONS.MESSAGE,
              onClick: (e, r) => {
                e.stopPropagation();
                toast.success(M.MESSAGE_SENT(r.s));
              },
            },
            {
              icon: <IconX size={15} />,
              title: M.ACTIONS.CANCEL,
              variant: "danger",
              onClick: (e, r) => {
                e.stopPropagation();
                setOrderToCancel(r.id);
              },
            },
          ]}
        />
      ),
    },
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
        emptyMessage={M.EMPTY_FILTERED}
        onRowClick={(o) => setSelectedOrder(toOrderDetail(o))}
      />

      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onReassign={() => {
          setSelectedOrder(null);
          toast.success(M.PARTNER_REASSIGNED);
        }}
      />

      <ConfirmDialog
        isOpen={!!orderToCancel}
        onClose={() => setOrderToCancel(null)}
        onConfirm={handleCancel}
        title={M.CANCEL_CONFIRM_TITLE}
        description={M.CANCEL_CONFIRM_MSG}
        confirmText={M.CANCEL_CONFIRM_CONFIRM}
      />
    </>
  );
}
