import { DateRangePicker } from "@/components/common/DateRangePicker";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { type OrderDetail, OrderDetailDrawer } from "@/components/common/OrderDetailDrawer";
import { OrderTypeBadges } from "@/components/common/OrderTypeBadges";
import { PageHeader } from "@/components/common/PageHeader";
import { PartnerRequirementBadge } from "@/components/common/PartnerRequirementBadge";
import { PillToggle } from "@/components/common/PillToggle";
import { RowReason } from "@/components/common/RowReason";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import {
  avatarColumn,
  idColumn,
  textColumn,
  truncatedColumn,
} from "@/components/common/tableColumns";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { useGetOrderTimelineQuery } from "@/features/assignments";
import { StatusLegendDialog } from "@/features/intents";
import { getApiMessage } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { dateTimeText, shortDate } from "@/lib/dates";
import { MESSAGES } from "@/lib/messages";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_BY_KEY } from "@/lib/orderStatuses";
import { readPartnerNeed } from "@/lib/partnerRequirement";
import { statsError, statsState, statusText } from "@/lib/stats";
import { terminalReason } from "@/lib/terminalReason";
import { clearParams } from "@/lib/utils";
import {
  IconAlertTriangle,
  IconBan,
  IconCircleCheck,
  IconInfoCircle,
  IconReceiptRefund,
  IconShipOff,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  type OrderStatusKey,
  useGetOrderDetailQuery,
  useGetOrderStatsQuery,
  useGetOrdersQuery,
  useLazyGetOrderSlipQuery,
} from "../api/orderApi";
import { useClaimOrderMutation } from "../api/orderOwnershipApi";
import { useOrderOwnership } from "../hooks/useOrderOwnership";
import type { Order, OrderAssignment } from "../types/order.types";
import type { ClaimConflict } from "../types/ownership.types";
import { OpenCartsCard } from "./OpenCartsCard";
import { OrderAssignPartnerSection } from "./OrderAssignPartnerSection";
import { OrderHandoverDialog } from "./OrderHandoverDialog";
import { OrderLocationDeltaSection } from "./OrderLocationDeltaSection";
import { OrderShipAgentSection } from "./OrderShipAgentSection";
import { OwnerCell } from "./OwnerCell";
import { RefundOrderDialog } from "./RefundOrderDialog";

const M = MESSAGES.ORDERS;

const TAB_ORDERS = "orders";
const TAB_CARTS = "carts";
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
  /**
   * Delivery flags. All three are independent and the tightest SLA wins —
   * `isFastest` is the sailor's opt-in on any order, so a regular one can carry
   * a hard deadline it would otherwise not have.
   */
  isExpress: boolean;
  isEmergency: boolean;
  isFastest: boolean;
  /** Handover is blocked behind an unpaid delivery surcharge. */
  deliveryOnHold: boolean;
  /** Money owed as a decimal string; `"0.00"` until delivery has concluded. */
  undeliveredValue: string;
  /**
   * The backend's explanation for a terminated row and when it was recorded
   * (`lib/terminalReason`). `""` on every row that did not end on an off-ramp,
   * and on the ones the backend recorded no reason for.
   */
  reason: string;
  reasonAt: string;
  /**
   * The backend's outstanding-partner flags, passed through. `null` means the
   * response omitted the field; it is never coerced to `false`.
   */
  needsVerifierPartner: boolean | null;
  needsDeliveryPartner: boolean | null;
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
  // Added 2026-08-19 with per-unit delivery. It is a real status, so it belongs
  // in the dropdown — and it is the status half of the sailed worklist, which
  // the toggle above the table sets together with `?departed=true`.
  "partially_delivered",
  "delivery_failed",
  "cancelled",
  "refunded",
];

/**
 * Derived views the list resolves alongside the raw statuses
 * (`ORDER_DERIVED_FILTERS`). Listed here so the dropdown can *display* what the
 * In Transit card selects, not only offer it — a value with no matching option
 * would leave the control showing its placeholder while a filter was active.
 */
const ORDER_DERIVED_FILTER_OPTIONS = [{ value: "in_progress", label: M.STATS.IN_TRANSIT }];

// Listed in canonical lifecycle order, labelled from the single source of truth.
const STATUS_OPTIONS = [
  { value: "all", label: M.STATUS_FILTER.ALL },
  ...ORDER_FILTER_KEYS.map((key) => ({ value: key, label: ORDER_STATUS_BY_KEY[key].label })),
  ...ORDER_DERIVED_FILTER_OPTIONS,
];

type StatVariant = "navy" | "teal" | "amber" | "red" | "green" | "purple" | "blue";

/**
 * KPI cards. The stats response isn't pinned by an example, so each card lists
 * candidate field names and takes the first one present.
 */
const STAT_CONFIG: {
  id: string;
  label: string;
  /** The `status_counts` token this card counts — see `OrderStatusKey`. */
  key: OrderStatusKey;
  icon: ReactNode;
  variant: StatVariant;
  /**
   * The `?status=` value this card selects.
   *
   * `total` is the page heading rather than a seventh card — as a card it read
   * as another bucket beside these six. It is the backend's own figure and is
   * never recomputed from them; the standardized contract is explicit that the
   * buckets are not guaranteed to add up to it.
   *
   * Every card maps to something: the aggregate ones use the derived filters
   * the list resolves alongside raw statuses (`ORDER_DERIVED_FILTERS`).
   */
  filter: string | null;
}[] = [
  {
    id: "confirmed",
    label: M.STATS.CONFIRMED,
    key: "new",
    icon: <IconCircleCheck size={20} />,
    variant: "blue",
    filter: "order_confirmed",
  },
  {
    id: "in-transit",
    label: M.STATS.IN_TRANSIT,
    key: "in_progress",
    icon: <IconTruckDelivery size={20} />,
    variant: "teal",
    // `in_progress` is a derived filter (`ORDER_DERIVED_FILTERS`) resolving to
    // the same `ORDER_IN_PROGRESS_STATUSES` constant this card counts — the
    // backend references the constant rather than re-listing it, so the card
    // and its drill-in cannot drift apart.
    filter: "in_progress",
  },
  {
    id: "delivered",
    label: M.STATS.DELIVERED,
    key: "delivered",
    icon: <IconCircleCheck size={20} />,
    variant: "green",
    filter: "delivered",
  },
  {
    id: "delivery-failed",
    label: M.STATS.FAILED,
    key: "delivery_failed",
    icon: <IconAlertTriangle size={20} />,
    variant: "amber",
    filter: "delivery_failed",
  },
  {
    id: "cancelled",
    label: M.STATS.CANCELLED,
    key: "cancelled",
    icon: <IconBan size={20} />,
    variant: "red",
    filter: "cancelled",
  },
  {
    id: "refunded",
    label: M.STATS.REFUNDED,
    key: "refunded",
    icon: <IconReceiptRefund size={20} />,
    variant: "purple",
    filter: "refunded",
  },
];

/**
 * Order-type filter — a **clean partition** since 2026-08-17: `regular +
 * emergency == all`, so the chips sum to the total.
 *
 * They did not before. Express used to be a third overlapping option, and an
 * order could be express *and* emergency, so the four counts needed
 * inclusion-exclusion to reconcile. Express orders now have their own screen
 * (`express/orders/`) and no longer reach this endpoint at all, which leaves one
 * boolean and two sides of it.
 *
 * "Regular" is the complement of emergency, expressed as `false` rather than as
 * a value the API knows about.
 */
const ORDER_TYPE_QUERY = {
  all: {},
  emergency: { isEmergency: true },
  regular: { isEmergency: false },
} as const;

type OrderTypeFilter = keyof typeof ORDER_TYPE_QUERY;

/** Narrows the URL's `?type=` to a known option; anything else falls back to All. */
function asOrderType(value: string | null): OrderTypeFilter {
  return value && value in ORDER_TYPE_QUERY ? (value as OrderTypeFilter) : "all";
}

const ORDER_TYPE_CONFIG: {
  value: OrderTypeFilter;
  label: string;
  /** Which `type_counts` field carries this option's count. */
  countKey: "all" | "emergency" | "regular";
}[] = [
  { value: "all", label: M.TYPE_FILTER.ALL, countKey: "all" },
  { value: "emergency", label: M.TYPE_FILTER.EMERGENCY, countKey: "emergency" },
  { value: "regular", label: M.TYPE_FILTER.REGULAR, countKey: "regular" },
];

/** `Date` → the `YYYY-MM-DD` the list endpoint expects. */
/**
 * ISO timestamp → "Aug 16, 2026", matching the intents review drawer so the two
 * screens format the same field identically. Blank/invalid → "—".
 */
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

/**
 * Vessel name (or IMO) for the ship column and the drawer.
 *
 * `shipping_address` is the only source: the row root carries no vessel name,
 * and `imo` no longer exists — it is always `imo_number`.
 */
function shipLabel(order: Order): string {
  const sa = order.shipping_address;
  return sa?.vessel_name || sa?.imo_number || "—";
}

/**
 * Berth / anchorage (or port) — the terminal.
 *
 * `shipping_address` first, because since 2026-08-19 the list row has no
 * top-level `port_name` / `anchorage_name` and its names are filled from the
 * order's foreign keys, so they are populated on every row. The nested objects
 * are kept as **detail-read** fallbacks: they are absent from a list row and
 * present on `GET orders/{id}/`, and one mapper serves both.
 */
function terminalLabel(order: Order): string {
  const sa = order.shipping_address;
  return (
    sa?.anchorage_name ||
    sa?.port_name ||
    order.anchorage?.anchorage_name ||
    order.port?.port_name ||
    "—"
  );
}

/** Compact "Ship · Terminal" cell value. */
function shipTerminal(order: Order): string {
  const sa = order.shipping_address;
  const ship = sa?.vessel_name || sa?.imo_number;
  const loc = sa?.anchorage_code || sa?.port_code || order.anchorage?.anchorage_code;
  const terminal = terminalLabel(order);
  if (ship) return loc ? `${ship} · ${loc}` : ship;
  // No vessel recorded — show the anchorage/port rather than an em dash.
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

/**
 * The assignment that answers for a failed delivery.
 *
 * The list serializer sends `failure_reason` at the top level; the detail one
 * does not, so the drawer has to find it among the assignments. It is not
 * always the active one: a failure is retried by REASSIGNING, and the backend's
 * own `timeline.delivery_failure` therefore picks the latest assignment with a
 * `failed_at` rather than the live one. `assignments[]` arrives newest-first
 * (`Meta.ordering = ["-assigned_at"]`), so the first failed entry is that one.
 *
 * Timestamps here are display-formatted strings, so they are never compared —
 * the backend's ordering is the ordering.
 */
function failedAssignment(order: Order): OrderAssignment | null {
  if (order.active_assignment?.failed_at) return order.active_assignment;
  return (order.assignments ?? []).find((a) => !!a.failed_at) ?? null;
}

/** The reason columns that apply to this order, whichever read produced it. */
function orderTerminalReason(order: Order) {
  const failed = failedAssignment(order);
  return terminalReason({
    status: order.status,
    cancellation_reason: order.cancellation_reason,
    cancelled_at: order.cancelled_at,
    rejection_reason: order.rejection_reason,
    failure_reason: order.failure_reason || failed?.failure_reason,
    failed_at: failed?.failed_at,
  });
}

/** Map an API order into the flat shape the table columns render. */
function toOrderRow(order: Order): OrderRow {
  const reason = orderTerminalReason(order);
  return {
    id: order.id,
    orderNumber: order.order_number,
    s: customerName(order),
    it: formatItems(order),
    sh: shipTerminal(order),
    pt: order.active_assignment?.partner_name || order.partner_name || M.UNASSIGNED,
    pay: paymentLabel(order),
    cp: order.applied_coupon || "—",
    t: money(order.total_amount),
    st: order.status_display,
    shipName: shipLabel(order),
    terminalName: terminalLabel(order),
    isExpress: order.is_express === true,
    isEmergency: order.is_emergency === true,
    reason: reason.text,
    reasonAt: reason.at,
    needsVerifierPartner: readPartnerNeed(order.needs_verifier_partner),
    needsDeliveryPartner: readPartnerNeed(order.needs_delivery_partner),
    isFastest: order.is_fastest_delivery === true,
    // Handover is blocked behind an unpaid surcharge — not a background charge.
    deliveryOnHold: order.delivery_on_hold === true,
    /**
     * Money owed, as sent. `"0.00"` unless delivery has concluded, so an
     * in-flight order shows nothing rather than a figure that reads as debt.
     * Never derived here: the backend annotates it from one definition.
     */
    undeliveredValue: order.undelivered_value ?? "0.00",
    raw: order,
  };
}

/**
 * Badge colour for an order status, from the canonical map (`lib/orderStatuses`)
 * that the status-legend popup renders its swatches from — so the legend and the
 * table cannot disagree about what a status means.
 *
 * `StatusBadge` matched on the *display label* against a list written for generic
 * active/inactive rows. "Cancelled" happened to be in that list and "Delivery
 * Failed" did not, so a failed delivery rendered neutral next to a red
 * cancellation while the legend called both `danger` — along with every other
 * post-payment status, none of which were in the list either.
 */
function orderStatusVariant(status: string): BadgeProps["variant"] {
  return ORDER_STATUS_BY_KEY[status]?.variant ?? "neutral";
}

/** Colour for the payment cell, matching the design reference. */
function paymentClass(pay: string): string {
  if (pay.includes("✓")) return "text-[var(--success-text)] font-bold text-[12.5px]";
  if (pay === "Pending") return "text-[var(--warning-text)] font-bold text-[12.5px]";
  return "text-[var(--danger-text)] font-bold text-[12.5px]";
}

/**
 * Is there actually money outstanding?
 *
 * The backend sends `"0.00"` on every order whose delivery has not concluded,
 * so this is a "should we say anything" check rather than a truthiness one —
 * `"0.00"` is a non-empty string and would otherwise always render.
 */
function isMoneyOwed(value: string): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

/**
 * `$0.00` for a real amount, "—" when the field is absent.
 *
 * The previous version coerced anything unreadable to `$0.00` **by design**,
 * which is how an order whose optional `platform_fee` was simply not sent came
 * to assert that its platform fee is zero.
 */
function money(value: unknown): string {
  return formatMoney(value as string | number | null | undefined);
}

/**
 * Reads a coupon label off `applied_coupon`. It is a code string in the current
 * responses, but is read as an object too so a serializer that nests the coupon
 * doesn't render "[object Object]".
 */
function couponLabel(coupon: unknown): string {
  if (typeof coupon === "string") return coupon.trim();
  if (coupon && typeof coupon === "object") {
    const c = coupon as Record<string, unknown>;
    const label = c.code ?? c.title ?? c.name;
    return typeof label === "string" ? label.trim() : "";
  }
  return "";
}

/** Map a table row to the detail-drawer shape. */
/**
 * Exported so the **Express Orders** screen renders through the same mapper.
 *
 * Both screens feed the one shared `OrderDetailDrawer`, and a second mapper
 * would be a second definition of what an order looks like — the drift that the
 * shared product columns already argued against.
 */
export function toOrderDetail(order: Order): OrderDetail {
  // Only the detail read returns `items`; a list row has just `item_count`.
  const items = order.items ?? [];
  const closedReason = orderTerminalReason(order);
  // Every declined attempt across every payment on the order, in the order the
  // gateway made them. `Payment.failure_reason` holds only the last decline, so
  // a card refused three times is three rows here and one there.
  const paymentFailures = (order.payments ?? []).flatMap((p) =>
    (p.attempts ?? [])
      .filter((a) => !!a.failure_message)
      .map((a) => ({ message: a.failure_message, at: a.created_at })),
  );

  return {
    // Display identity. The UUID rides alongside it — see `orderUuid`.
    id: order.order_number,
    orderUuid: order.id,
    // `customer.id` is the sailor's user id. It has always been on this payload;
    // only the name was being read off it.
    sailorUserId: order.customer?.id,
    sailor: customerName(order),
    ship: shipLabel(order),
    terminal: terminalLabel(order),
    partner: order.active_assignment?.partner_name || order.partner_name || M.UNASSIGNED,
    payment: paymentLabel(order),
    coupon: order.applied_coupon || "",
    total: money(order.total_amount),
    status: order.status_display,
    items: items.map((it) => ({
      name: it.product_name,
      // Fall back to the variant's SKU when the line omits its own.
      sku: it.sku || it.variant?.sku || "",
      qty: it.quantity,
      price: money(it.unit_price),
      lineTotal: money(it.subtotal),
    })),
    // Straight passthrough of the order's own money fields — nothing summed
    // or inferred here, so the drawer can only show what the backend committed.
    pricing: {
      subtotal: money(order.subtotal),
      shippingFee: money(order.shipping_fee),
      tax: money(order.tax_amount),
      platformFee: money(order.platform_fee),
      discount: money(order.discount_amount),
      loyaltyDiscount: money(order.loyalty_discount),
      loyaltyPoints: order.loyalty_points_redeemed ?? 0,
      total: money(order.total_amount),
      couponUsed: order.coupon_used === true,
      appliedCoupon: couponLabel(order.applied_coupon),
    },

    // Review-layout fields. Every one of these was already on the detail
    // response and thrown away — the drawer rendered a flat key-value list, so
    // the mapping only carried what that list showed. Present only on the
    // detail read; a list row leaves them undefined and the drawer shows "—".
    statusKey: order.status,
    sailorEmail: order.customer?.email || order.customer_email || order.user_email || "",
    // `phone`, not `contact` — the key was renamed with the address contract.
    sailorPhone: order.customer?.whatsapp_number || order.shipping_address?.phone || "",
    vesselName: order.shipping_address?.vessel_name || "",
    imo: order.shipping_address?.imo_number || "",
    // Address first (populated on every row, filled from the FKs), nested
    // objects as the detail-read fallback.
    portName: order.shipping_address?.port_name || order.port?.port_name || "",
    portCode: order.shipping_address?.port_code || order.port?.port_code || "",
    anchorageName: order.shipping_address?.anchorage_name || order.anchorage?.anchorage_name || "",
    // Display strings on the wire — read, never parsed. See `lib/dates.ts`.
    shipArrivalDate: shortDate(order.ship_arrival_date),
    expectedDeparture: shortDate(order.expected_departure),
    orderDate: dateTimeText(order.created_at),
    notes: order.notes || "",
    itemCount: order.items_count ?? order.item_count ?? items.length,
    isExpress: order.is_express === true,
    isEmergency: order.is_emergency === true,
    terminalReason: closedReason.text,
    terminalReasonAt: closedReason.at,
    paymentFailures,
  };
}

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  /** The clicked row's record — opens the drawer and seeds it before detail lands. */
  const [selectedRaw, setSelectedRaw] = useState<Order | null>(null);
  /** The order being refunded (Flow 12 §3–4), or null when closed. */
  const [orderToRefund, setOrderToRefund] = useState<Order | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  /** Which row's claim is in flight — scopes the spinner to that button. */
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [fetchSlip, { isFetching: slipLoading }] = useLazyGetOrderSlipQuery();

  // Flow 27 — every admin order write is gated on ownership, so the claim
  // action has to live here too, not only on the Intents queue.
  const { stateOf, canClaim, canReassign, canRelease } = useOrderOwnership();
  const [claimOrder] = useClaimOrderMutation();
  /** The order whose handover dialog is open, or null when closed. */
  const [orderToHandover, setOrderToHandover] = useState<Order | null>(null);

  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // URL-driven filter state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";
  // Tab lives in the URL alongside the filters so a shared link reopens the
  // same surface, not just the same query.
  const activeTab = searchParams.get("tab") === TAB_CARTS ? TAB_CARTS : TAB_ORDERS;
  const typeFilter = asOrderType(searchParams.get("type"));

  /** The scope every counter and the table share — everything except `status`. */
  /**
   * The deadline half of the partial-delivery worklist, from `?departed=`.
   *
   * Server-side because it has to be: the row's `expected_departure` is a
   * pre-formatted UTC wall-clock string with no offset, so comparing it here
   * would mean parsing exactly what the datetime contract forbids.
   *
   * Part of `scope`, so the cards narrow with the table — the rule every other
   * filter on this screen follows.
   */
  const departedParam = searchParams.get("departed");
  const departed = departedParam === "true" ? true : departedParam === "false" ? false : undefined;

  const scope = {
    search,
    dateFrom: toApiDate(dateRange?.from),
    dateTo: toApiDate(dateRange?.to),
    departed,
  };

  // Every filter is applied server-side, so pagination stays truthful.
  const { data, isLoading, isFetching, isError, refetch } = useGetOrdersQuery({
    page,
    limit: LIMIT,
    ...scope,
    status: statusFilter !== "all" ? statusFilter : undefined,
    ...ORDER_TYPE_QUERY[typeFilter],
  });

  // Cards follow the whole screen, order type included: filter to Express and
  // the lifecycle breakdown is Express's breakdown.
  const statsQuery = useGetOrderStatsQuery({
    ...scope,
    ...ORDER_TYPE_QUERY[typeFilter],
  });
  const stats = statsQuery.data;
  // Loading / error / ready — a failed counter request dashes out rather than
  // reading as a genuinely empty pipeline. See `lib/stats.ts`.
  const cardsState = statsState(statsQuery);
  const refetchStats = statsQuery.refetch;

  /**
   * Retry after a failed load — reloads the cards as well as the table.
   *
   * `refetch` alone only re-ran the list, so a screen that errored came back
   * with fresh rows under whatever the counters happened to be holding. The two
   * are meant to describe the same population; a retry that refreshes one of
   * them breaks that for as long as the page stays open.
   */
  const retryAll = () => {
    refetch();
    refetchStats();
  };

  // Counts for the filter itself come from `type_counts`, which the endpoint
  // computes over a population the type filter has not touched — so selecting
  // Emergency does not zero the other options, while search and date still
  // apply. Read exactly as sent, including `all`: deriving it from the siblings
  // assumes they partition the population, which is the backend's call to make
  // and would silently break the day a third type appears.
  const typeCounts = stats?.type_counts;

  const typeOptions = ORDER_TYPE_CONFIG.map((t) => ({
    value: t.value,
    label: M.TYPE_FILTER.OPTION(t.label, typeCounts?.[t.countKey]),
  }));

  // The cards ARE the status breakdown, which is why the stats endpoint ignores
  // `?status=` — applying it would zero every card but the selected one. Making
  // them the control instead of a passive readout is what makes that legible:
  // click a card to filter the table to it, click again to clear.
  const statItems = STAT_CONFIG.map((c) => ({
    id: c.id,
    label: c.label,
    value: statusText(cardsState, stats, c.key),
    icon: c.icon,
    variant: c.variant,
    active: c.filter !== null && c.filter !== "" && statusFilter === c.filter,
    onClick:
      c.filter === null
        ? undefined
        : () => setParam("status", statusFilter === c.filter ? "" : (c.filter as string)),
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
  // while the drawer is open; until it lands the drawer's rail falls back to the
  // status-derived stages, so there is no loading state to thread through.
  const { data: timeline } = useGetOrderTimelineQuery(selectedRaw?.id ?? "", {
    skip: !selectedRaw?.id,
  });

  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));
  const orders = (data?.results ?? []).map(toOrderRow);

  // Changing a filter resets to page 1; clearing it drops the param.
  /**
   * The sailed worklist is two params at once — the status and the deadline —
   * so it is one control rather than asking the operator to line both up.
   * Toggling off clears both rather than leaving a half-applied scope.
   */
  const isSailedWorklist = statusFilter === "partially_delivered" && departed === true;

  const toggleSailedWorklist = () => {
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    if (isSailedWorklist) {
      next.delete("status");
      next.delete("departed");
    } else {
      next.set("status", "partially_delivered");
      next.set("departed", "true");
    }
    setSearchParams(next);
  };

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

  // Switching tabs clears the orders-only filters — they don't apply to carts,
  // and leaving them set would silently narrow the list on the way back.
  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === TAB_ORDERS) {
      next.delete("tab");
    } else {
      next.set("tab", value);
    }
    next.delete("page");
    next.delete("search");
    next.delete("status");
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", newPage.toString());
    setSearchParams(next);
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
    avatarColumn({
      id: "sailor",
      header: M.COLUMNS.SAILOR,
      name: (o) => o.s,
      image: (o) => getFallbackAvatar(o.s),
    }),
    truncatedColumn({ id: "items", header: M.COLUMNS.ITEMS, get: (o) => o.it }),
    {
      id: "type",
      header: M.COLUMNS.TYPE,
      cell: (o) => (
        <OrderTypeBadges
          isExpress={o.isExpress}
          isEmergency={o.isEmergency}
          isFastest={o.isFastest}
        />
      ),
    },
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
    {
      id: "partner",
      header: M.COLUMNS.PARTNER,
      // The name alone was misleading: a paid order still waiting for a
      // deliverer showed the verifier who had already finished, which reads as
      // "a delivery partner is on this". The name stays — it is real history —
      // and the backend's requirement flag says what is still outstanding.
      cell: (o) => (
        <div>
          <div
            className={
              o.pt === M.UNASSIGNED
                ? "text-[var(--danger-text)] font-semibold text-[12.5px]"
                : "text-[var(--t3)] font-semibold text-[12.5px]"
            }
          >
            {o.pt}
          </div>
          <PartnerRequirementBadge
            needsVerifierPartner={o.needsVerifierPartner}
            needsDeliveryPartner={o.needsDeliveryPartner}
          />
        </div>
      ),
    },
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
      // `DataTable` turns a column with `filter` into a dropdown header. The
      // control belongs here rather than in the page toolbar: it narrows the
      // table only — the cards are the status breakdown and ignore it — so
      // sitting beside search and date, which rescope the whole screen, implied
      // a reach it does not have.
      filter: {
        // The URL uses "" for unfiltered; the local sentinel is "all".
        value: statusFilter === "all" ? "" : statusFilter,
        options: STATUS_OPTIONS.filter((o) => o.value !== "all"),
        onChange: (val: string) => setParam("status", val),
        allLabel: M.STATUS_FILTER.ALL,
      },
      cell: (o) => (
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Coloured from the raw status key, not the display label — see
                `orderStatusVariant`. */}
            <Badge variant={orderStatusVariant(o.raw.status)}>{o.st}</Badge>
            {/* Flow 11 §17 — self-clearing "needs attention" flag: true only while
                an unactioned pending location report exists. */}
            {o.raw.has_location_request && (
              <Badge variant="warning" className="h-[22px] text-[10px]">
                {M.LOCATION_REQUEST}
              </Badge>
            )}
            {/* A different fact from the one above: that says the sailor
                reported a move, this says an unpaid surcharge is stopping the
                partner handing over. An order can carry either without the
                other, and only this one holds the goods. */}
            {o.deliveryOnHold && (
              <Badge variant="danger" className="h-[22px] text-[10px]" title={M.HOLD_HINT}>
                {M.DELIVERY_ON_HOLD}
              </Badge>
            )}
          </div>
          {/* What a refund would be for — shown only once delivery has
              concluded, which is the only time the backend reports it as
              non-zero. Turns the worklist into a decision surface: the amount
              is on the row rather than one drawer-open away. */}
          {isMoneyOwed(o.undeliveredValue) && (
            <div className="mt-1 text-[11.5px] font-bold text-[var(--danger-text)] tabular-nums">
              {M.UNDELIVERED_VALUE(money(o.undeliveredValue))}
            </div>
          )}
          {/* Why a failed or cancelled row ended here — the backend sends it on
              the list itself, so the reassign-or-refund call no longer costs a
              drawer open per row. */}
          <RowReason text={o.reason} at={o.reasonAt} className="mt-1" />
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
          // Flow 27 — the dialog behind this holds two actions with two gates:
          // reassign (admin only) and release (the owner's way out). Offered
          // when either applies; the dialog itself shows only the half that
          // does. Offering it to anyone else would produce a guaranteed 403.
          onHandover={
            canReassign(o.raw.assigned_admin) || canRelease(o.raw.assigned_admin)
              ? () => setOrderToHandover(o.raw)
              : undefined
          }
        />
      ),
    },
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      className: "w-40 text-right",
      cell: (o) => (
        <div className="td-acts">
          {/* Assigning an order — to yourself included — is an Admin-only
              decision, so an Operator never sees this. For an Admin it is
              offered only while unassigned; on a held order it 409s. */}
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
        subtitle={cardsState === "ready" ? M.STATS.TOTAL_SUMMARY(stats?.total ?? 0) : undefined}
        actions={
          // Search, status and date range all scope the orders query, so they
          // only make sense while that tab is showing.
          activeTab === TAB_ORDERS ? (
            <SearchFilters
              searchValue={search}
              onSearchChange={(val) => setParam("search", val)}
              searchPlaceholder={M.SEARCH_PLACEHOLDER}
              searchDebounceMs={180}
              searchLoading={isFetching}
              // Status lives on the STATUS column header, not here. It narrows
              // the table only — the cards are the status breakdown and ignore
              // it — so a toolbar slot beside search and date, which DO rescope
              // the whole screen, implied a reach it does not have.
              filters={[]}
              // The date range is local state, not a URL param, so the toolbar
              // can't see it — report it so Reset offers itself for a range too.
              isFiltered={!!dateRange?.from}
              onReset={() => {
                setDateRange(undefined);
                setSearchParams(clearParams(searchParams, ["search", "status", "page"]));
              }}
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
              {/* Matched to the search box, not to the button scale.
                  `DateRangePicker` renders a `size="sm"` Button — 32px — while
                  the `Search` input beside it is `h-10`, 40px, so the two sat
                  8px apart in a row that reads as one control strip. `h-10`
                  lands after `sizeClasses` in the Button's `cn()`, so twMerge
                  drops the 32px rather than stacking two heights. */}
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder={M.DATE_RANGE}
                className="h-10"
              />
              {/* No Export button: neither the flow docs nor the API collection
                  document an orders-export endpoint, and the old one reported a
                  success it never performed. */}
            </SearchFilters>
          ) : null
        }
      />

      {/*
        Six buckets, three across — 3 + 3 rather than 4 + 2. The trailing pair
        was reading as a second, lesser group when the six are one set.
        `fill` so each row divides the full width between its three.
      */}
      <StatsGrid
        items={statItems}
        className="fill cols-3"
        error={statsError(cardsState)}
        onRetry={refetchStats}
      />

      {/* Order-type filter. Replaces the Express/Emergency cards that sat here:
          the same two numbers, but actionable, and with the complement
          ("Regular") that the cards could not express. Counts come from a
          type-free scope so they stay put when an option is selected. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="sec-label !mb-0">{M.TYPE_FILTER.LABEL}</span>
        <PillToggle
          options={typeOptions}
          value={typeFilter}
          onChange={(value) => setParam("type", value === "all" ? "" : value)}
        />
      </div>

      <DynamicTabs
        value={activeTab}
        onTabChange={handleTabChange}
        tabs={[
          {
            value: TAB_ORDERS,
            label: M.TABS.ORDERS,
            content: (
              <DataTable
                columns={columns}
                data={orders}
                rowKey="id"
                page={page}
                pages={totalPages}
                isLoading={isLoading}
                isError={isError}
                error={isError ? M.FETCH_ERROR : null}
                onRetry={retryAll}
                onPageChange={handlePageChange}
                showPagination
                emptyMessage={search || statusFilter !== "all" ? M.EMPTY_FILTERED : M.EMPTY}
                onRowClick={(o) => setSelectedRaw(o.raw)}
              />
            ),
          },
          {
            // Pre-checkout baskets — a different lifecycle from paid orders.
            value: TAB_CARTS,
            label: M.TABS.CARTS,
            content: <OpenCartsCard />,
          },
        ]}
      />

      <OrderDetailDrawer
        order={selectedOrder}
        timeline={timeline?.steps}
        onClose={() => setSelectedRaw(null)}
        // No `onReassign`: the drawer's own partner section owns assignment now.
        // Both popups are custom Dialogs, which would render behind the Sheet
        // overlay — so the drawer closes first and the order is retained.
        // No `onCancel`. Every order on this screen is paid, and the cancel
        // endpoint refuses a paid order outright — "use the refund flow to
        // cancel it". The button could only ever 409, so the money-back path
        // here is refund, and cancel lives on the intents screen where the
        // population is unpaid.

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
              {/* §4.4 — shown ABOVE the partner section on purpose: the whole
                  point is that the admin reads it before assigning, not after
                  a partner is already committed to a deadline they cannot make. */}
              {openOrder.delivery_window_infeasible && (
                <div className="mb12 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-[12px] text-[var(--danger-text)]">
                  <IconAlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold">{M.INFEASIBLE.TITLE}</div>
                    <div className="mt-0.5">{M.INFEASIBLE.BODY}</div>
                  </div>
                </div>
              )}

              <OrderAssignPartnerSection
                orderId={openOrder.id}
                status={openOrder.status}
                activeAssignment={openOrder.active_assignment}
                // Detail carries the owning admin the list row usually omits, so
                // the ownership gate resolves properly once it lands.
                assignedAdmin={openOrder.assigned_admin}
                // The backend's answer to "what is this order short of". Passed
                // through untouched — see `lib/partnerRequirement`.
                needsVerifierPartner={readPartnerNeed(openOrder.needs_verifier_partner)}
                needsDeliveryPartner={readPartnerNeed(openOrder.needs_delivery_partner)}
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
                // §4.3 — the reallocation prompt only makes sense when someone
                // is actually out on the job.
                hasAssignedPartner={!!openOrder.active_assignment?.is_active}
                // Assignment lives in this same drawer, above; scroll to it
                // rather than navigating away and losing the report context.
                onReassignPartner={() => {
                  document
                    .querySelector("[data-assign-partner-section]")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
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

      {/* Flow 27 — reassign to another admin, or release back to the pool. */}
      <OrderHandoverDialog
        isOpen={!!orderToHandover}
        orderId={orderToHandover?.id ?? ""}
        orderRef={orderToHandover?.order_number ?? orderToHandover?.id ?? ""}
        assignedAdmin={orderToHandover?.assigned_admin ?? null}
        onClose={() => setOrderToHandover(null)}
      />
    </>
  );
}
