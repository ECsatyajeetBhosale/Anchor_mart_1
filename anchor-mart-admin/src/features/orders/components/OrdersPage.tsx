import { DateRangePicker } from "@/components/common/DateRangePicker";
import { type OrderDetail, OrderDetailDrawer } from "@/components/common/OrderDetailDrawer";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  avatarColumn,
  idColumn,
  textColumn,
  truncatedColumn,
} from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { useGetOrderTimelineQuery } from "@/features/assignments";
import { StatusLegendDialog } from "@/features/intents";
import { getApiMessage } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { ORDER_STATUS_BY_KEY } from "@/lib/orderStatuses";
import {
  IconBan,
  IconCircleCheck,
  IconInfoCircle,
  IconPackage,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  type OrderStats,
  useCancelOrderMutation,
  useGetOrderDetailQuery,
  useGetOrderStatsQuery,
  useGetOrdersQuery,
  useLazyGetOrderSlipQuery,
} from "../api/orderApi";
import { useClaimOrderMutation } from "../api/orderOwnershipApi";
import { useOrderOwnership } from "../hooks/useOrderOwnership";
import type { Order } from "../types/order.types";
import type { ClaimConflict } from "../types/ownership.types";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { OrderAssignPartnerSection } from "./OrderAssignPartnerSection";
import { OrderLocationDeltaSection } from "./OrderLocationDeltaSection";
import { OrderShipAgentSection } from "./OrderShipAgentSection";
import { OwnerCell } from "./OwnerCell";
import { RefundOrderDialog } from "./RefundOrderDialog";

const M = MESSAGES.ORDERS;
// Flow 27 ownership copy and the status legend are shared with the Intents
// queue — same gate, same 18 statuses — so the strings are reused, not copied.
const O = MESSAGES.INTENTS.OWNERSHIP;
const L = MESSAGES.INTENTS.STATUS_LEGEND;

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

/**
 * Status values the orders list accepts — the post-payment tail only, exactly
 * as documented in the API collection. Pre-payment statuses belong to the
 * Intents screen, and sending one here is a 400.
 */
const ORDER_FILTER_KEYS = [
  "order_confirmed",
  "partner_assigned",
  "items_collected",
  "at_port",
  "at_berth",
  "delivered",
  "delivery_failed",
  "cancelled",
  "refunded",
];

// Listed in canonical lifecycle order, labelled from the single source of truth.
const STATUS_OPTIONS = [
  { value: "all", label: M.STATUS_FILTER.ALL },
  ...ORDER_FILTER_KEYS.map((key) => ({ value: key, label: ORDER_STATUS_BY_KEY[key].label })),
];

type StatVariant = "navy" | "teal" | "amber" | "red" | "green" | "purple" | "blue";

/**
 * KPI cards. The stats response isn't pinned by an example, so each card lists
 * candidate field names and takes the first one present.
 */
const STAT_CONFIG: {
  id: string;
  label: string;
  keys: string[];
  icon: ReactNode;
  variant: StatVariant;
}[] = [
  {
    id: "total",
    label: M.STATS.TOTAL,
    keys: ["total_orders", "total", "orders"],
    icon: <IconPackage size={20} />,
    variant: "navy",
  },
  {
    id: "in-transit",
    label: M.STATS.IN_TRANSIT,
    keys: ["in_transit", "in_progress", "delivering"],
    icon: <IconTruckDelivery size={20} />,
    variant: "teal",
  },
  {
    id: "delivered",
    label: M.STATS.DELIVERED,
    keys: ["delivered"],
    icon: <IconCircleCheck size={20} />,
    variant: "green",
  },
  {
    id: "cancelled",
    label: M.STATS.CANCELLED,
    keys: ["cancelled", "cancelled_orders"],
    icon: <IconBan size={20} />,
    variant: "red",
  },
];

/** First present counter among the candidate keys; 0 when none are returned. */
function pickStat(stats: OrderStats | undefined, keys: string[]): number {
  if (!stats) return 0;
  for (const key of keys) {
    const value = stats[key];
    if (typeof value === "number") return value;
  }
  return 0;
}

/** `Date` → the `YYYY-MM-DD` the list endpoint expects. */
function toApiDate(date?: Date): string | undefined {
  if (!date) return undefined;
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

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
function toOrderDetail(order: Order): OrderDetail {
  return {
    id: order.order_number,
    sailor: customerName(order),
    ship: shipLabel(order),
    terminal: terminalLabel(order),
    partner: order.active_assignment?.partner_name || order.partner_name || M.UNASSIGNED,
    payment: paymentLabel(order),
    coupon: order.applied_coupon || "",
    total: `$${Number(order.total_amount).toFixed(2)}`,
    status: order.status_display,
    // Only the detail read returns `items`; a list row has just `item_count`.
    items: (order.items ?? []).map((it) => ({
      name: it.product_name,
      qty: it.quantity,
      price: `$${Number(it.unit_price).toFixed(2)}`,
    })),
  };
}

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  /** The clicked row's record — opens the drawer and seeds it before detail lands. */
  const [selectedRaw, setSelectedRaw] = useState<Order | null>(null);
  /** The order awaiting a cancel reason, or null when the popup is closed. */
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  /** The order being refunded (Flow 12 §3–4), or null when closed. */
  const [orderToRefund, setOrderToRefund] = useState<Order | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  /** Which row's claim is in flight — scopes the spinner to that button. */
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [fetchSlip, { isFetching: slipLoading }] = useLazyGetOrderSlipQuery();
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();

  // Flow 27 — every admin order write is gated on ownership, so the claim
  // action has to live here too, not only on the Intents queue.
  const { stateOf, canClaim } = useOrderOwnership();
  const [claimOrder] = useClaimOrderMutation();

  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // URL-driven filter state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";

  // Every filter is applied server-side, so pagination stays truthful.
  const { data, isLoading, isFetching, isError, refetch } = useGetOrdersQuery({
    page,
    limit: LIMIT,
    search,
    status: statusFilter !== "all" ? statusFilter : undefined,
    dateFrom: toApiDate(dateRange?.from),
    dateTo: toApiDate(dateRange?.to),
  });

  // Live KPI stats; cards show "—" while loading and 0 when a field is absent.
  const { data: stats, isLoading: statsLoading } = useGetOrderStatsQuery();
  const statItems = STAT_CONFIG.map((c) => ({
    id: c.id,
    label: c.label,
    value: statsLoading ? "—" : pickStat(stats, c.keys).toLocaleString(),
    icon: c.icon,
    variant: c.variant,
  }));

  // Flow 11 §14 — the full record for the open order. The list row only carries
  // a summary (no `items`, usually no `assigned_admin`), so the drawer opens on
  // the row and upgrades in place the moment the detail lands.
  const { data: orderDetail } = useGetOrderDetailQuery(selectedRaw?.id ?? "", {
    skip: !selectedRaw?.id,
  });
  // `selectedRaw` alone decides whether the drawer is open. Falling back to the
  // detail result here would keep the drawer mounted on close if RTK Query
  // still held the last response, so the row gates it explicitly.
  const openOrder = selectedRaw ? (orderDetail ?? selectedRaw) : null;
  const selectedOrder = openOrder ? toOrderDetail(openOrder) : null;

  // Flow 28 API 16 — the real milestone ladder for the open order. Fetched only
  // while the drawer is open; the drawer shows an empty state until it lands.
  const { data: timeline, isFetching: timelineLoading } = useGetOrderTimelineQuery(
    selectedRaw?.id ?? "",
    { skip: !selectedRaw?.id },
  );

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

  /**
   * Flow 12 §2 — cancel a pre-payment order with the required reason. The
   * documented failures all arrive as the backend's own message: 409 unclaimed
   * or already paid ("use the refund flow"), 403 another admin's order, 400 for
   * a post-payment status.
   */
  const handleCancel = async (reason: string) => {
    if (!orderToCancel) return;
    try {
      const res = await cancelOrder({ orderId: orderToCancel.id, reason }).unwrap();
      // Success: tag invalidation refreshes the row's status automatically.
      toast.success(getApiMessage(res) ?? M.CANCEL_SUCCESS);
      setOrderToCancel(null);
    } catch (error) {
      // Failure: keep the popup open (the typed reason is preserved) and
      // surface why.
      toast.error(getApiMessage(error) ?? M.CANCEL_ERROR);
    }
  };

  /**
   * Flow 10 API 10 — download the picking slip. The endpoint streams a PDF, so
   * the blob is turned into a temporary object URL and clicked; the URL is
   * revoked immediately after, since the file is regenerated per request.
   */
  const handleDownloadSlip = async (order: Order) => {
    try {
      const blob = await fetchSlip(order.id).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = M.SLIP_FILENAME(order.order_number);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getApiMessage(error, { labelFields: false }) ?? M.SLIP_FAILED);
    }
  };

  /**
   * Flow 27 API 1 — claim the order ("Manage Order"). A 409 isn't a retryable
   * failure: another admin holds it, and the body names them.
   */
  const handleClaim = async (order: Order) => {
    setClaimingId(order.id);
    try {
      await claimOrder(order.id).unwrap();
      toast.success(O.CLAIMED(order.order_number || order.id));
    } catch (err) {
      if ((err as { status?: unknown })?.status === 409) {
        const owner = (err as { data?: ClaimConflict })?.data?.assigned_admin;
        toast.error(owner ? O.HELD_BY(owner.name) : O.HELD_BY_UNKNOWN);
        return;
      }
      toast.error(getApiMessage(err) ?? O.CLAIM_FAILED);
    } finally {
      setClaimingId(null);
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
    {
      id: "status",
      header: M.COLUMNS.STATUS,
      cell: (o) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={o.st} />
          {/* Flow 11 §17 — self-clearing "needs attention" flag: true only while
              an unactioned pending location report exists. */}
          {o.raw.has_location_request && (
            <Badge variant="warning" className="h-[22px] text-[10px]">
              {M.LOCATION_REQUEST}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "owner",
      header: M.COLUMNS.OWNER,
      cell: (o) => (
        <OwnerCell
          assignedAdmin={o.raw.assigned_admin ?? null}
          state={stateOf(o.raw.assigned_admin)}
        />
      ),
    },
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      className: "w-40 text-right",
      cell: (o) => (
        <div className="td-acts">
          {/* Claim is offered only while unassigned — on a held order it 409s. */}
          {canClaim(o.raw.assigned_admin) && (
            <Button
              variant="teal"
              size="xs"
              className="max-w-[4.25rem] whitespace-normal px-2 text-[9px] leading-[1.05]"
              disabled={claimingId === o.id}
              onClick={(e) => {
                e.stopPropagation();
                handleClaim(o.raw);
              }}
            >
              {claimingId === o.id ? O.CLAIMING : O.MANAGE}
            </Button>
          )}
          <Button
            variant="primary"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRaw(o.raw);
            }}
          >
            {M.ACTION_VIEW}
          </Button>
        </div>
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
            searchLoading={isFetching}
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
            {/* Info icon beside the status filter → the shared status legend. */}
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              aria-label={L.OPEN_LABEL}
              title={L.OPEN_LABEL}
              onClick={() => setIsLegendOpen(true)}
            >
              <IconInfoCircle size={18} />
            </button>
            <DateRangePicker value={dateRange} onChange={setDateRange} placeholder={M.DATE_RANGE} />
            {/* No Export button: neither the flow docs nor the API collection
                document an orders-export endpoint, and the old one reported a
                success it never performed. */}
          </SearchFilters>
        }
      />

      <StatsGrid items={statItems} />

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
        emptyMessage={search || statusFilter !== "all" ? M.EMPTY_FILTERED : M.EMPTY}
        onRowClick={(o) => setSelectedRaw(o.raw)}
      />

      <OrderDetailDrawer
        order={selectedOrder}
        timeline={timeline?.steps}
        timelineLoading={timelineLoading}
        onClose={() => setSelectedRaw(null)}
        // No `onReassign`: the drawer's own partner section owns assignment now.
        // Both popups are custom Dialogs, which would render behind the Sheet
        // overlay — so the drawer closes first and the order is retained.
        onCancel={
          openOrder
            ? () => {
                const order = openOrder;
                setSelectedRaw(null);
                setOrderToCancel(order);
              }
            : undefined
        }
        onRefund={
          openOrder
            ? () => {
                const order = openOrder;
                setSelectedRaw(null);
                setOrderToRefund(order);
              }
            : undefined
        }
        // The slip downloads in place — no need to close the drawer.
        onDownloadSlip={openOrder ? () => handleDownloadSlip(openOrder) : undefined}
        slipLoading={slipLoading}
        detailSlot={
          openOrder ? (
            // Remount per order so picker/claim state never leaks across orders.
            <div key={openOrder.id}>
              <OrderAssignPartnerSection
                orderId={openOrder.id}
                status={openOrder.status}
                activeAssignment={openOrder.active_assignment}
                // Detail carries the owning admin the list row usually omits, so
                // the ownership gate resolves properly once it lands.
                assignedAdmin={openOrder.assigned_admin}
              />
              {/* Flow 02 · API 17 — ship-agent binding. Kept alongside partner
                  assignment rather than replaced by it: they are different
                  relationships (the vessel's agent vs. who delivers). */}
              <OrderShipAgentSection
                orderId={openOrder.id}
                status={openOrder.status}
                shipAgent={openOrder.ship_agent}
                shipAgentSnapshot={openOrder.ship_agent_snapshot}
                assignedAdmin={openOrder.assigned_admin}
              />
              {/* Flow 11 — reports and surcharges, both embedded on the detail. */}
              <OrderLocationDeltaSection
                orderId={openOrder.id}
                orderRef={openOrder.order_number}
                locationReports={openOrder.location_reports}
                deltas={openOrder.deltas}
                assignedAdmin={openOrder.assigned_admin}
              />
            </div>
          ) : null
        }
      />

      {/* Status terminology legend (opened from the info icon by the filter) */}
      <StatusLegendDialog isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} />

      {/* Refund popup — quote preview + full/partial refund (Flow 12 §3–4) */}
      <RefundOrderDialog
        isOpen={!!orderToRefund}
        orderId={orderToRefund?.id ?? ""}
        orderRef={orderToRefund?.order_number ?? ""}
        status={orderToRefund?.status ?? ""}
        onClose={() => setOrderToRefund(null)}
      />

      {/* Cancel-order reason popup (Flow 12 §2 — `reason` is required) */}
      <CancelOrderDialog
        isOpen={!!orderToCancel}
        orderRef={orderToCancel?.order_number ?? ""}
        isLoading={isCancelling}
        onClose={() => setOrderToCancel(null)}
        onConfirm={handleCancel}
      />
    </>
  );
}
