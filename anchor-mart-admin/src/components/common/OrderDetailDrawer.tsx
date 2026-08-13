import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { Sheet, SheetContent, SheetFooter } from "@/components/ui/sheet";
import { MESSAGES } from "@/lib/messages";
import {
  IconAlertTriangle,
  IconAnchor,
  IconBolt,
  IconCalendar,
  IconCoin,
  IconFileDownload,
  IconPackage,
  IconShip,
  IconTransfer,
  IconX,
} from "@tabler/icons-react";
import { type ReactNode, useEffect, useState } from "react";
import { DynamicTabs } from "./DynamicTabs";
import { LifecycleRail } from "./LifecycleRail";
import {
  KV,
  ReviewCustomerCard,
  ReviewHeader,
  ReviewSummaryStrip,
  ReviewTiles,
  Section,
} from "./ReviewLayout";

const M = MESSAGES.ORDERS;
const D = MESSAGES.ORDERS.DRAWER;

const TAB_OVERVIEW = "overview";
const TAB_ITEMS = "items";
const TAB_FULFILMENT = "fulfilment";

export interface OrderItem {
  /** `product_name`. */
  name: string;
  /** `sku` — shown beneath the name so a variant is identifiable. */
  sku?: string;
  /** `quantity`. */
  qty: number;
  /** Formatted `unit_price`, e.g. "$100.00". */
  price: string;
  /**
   * Formatted `subtotal` — the API's own line total. Shown as the row's figure
   * so a multi-quantity line can't be misread as the unit price.
   */
  lineTotal?: string;
}

/**
 * The order's money breakdown — **every field comes straight from the order
 * response**; nothing here is derived or inferred.
 *
 * These stay at zero until the admin generates a bill (`apply_fees` +
 * `recompute_order_totals`, Flow 07), so each row is hidden while it is zero.
 * On an unbilled order that leaves just the total, which is the only figure the
 * backend has actually committed to.
 */
export interface OrderPricing {
  subtotal: string;
  shippingFee: string;
  tax: string;
  platformFee: string;
  discount: string;
  loyaltyDiscount: string;
  /** `loyalty_points_redeemed` — annotated on the loyalty row when > 0. */
  loyaltyPoints: number;
  total: string;
  /** `coupon_used` — drives whether the applied coupon is named. */
  couponUsed: boolean;
  /** `applied_coupon`, shown under the discount row when a coupon was used. */
  appliedCoupon: string;
}

export interface OrderDetail {
  id: string;
  sailor: string;
  ship: string;
  terminal: string;
  items: OrderItem[];
  total: string;
  status: string;
  partner: string;
  payment: string;
  coupon?: string;
  /** Order channel (Mobile App / Website). Not returned by the API → "—". */
  source?: string;
  /** Intent reference. Not returned by the API → "—". */
  intent?: string;
  /** Anchorage-change summary. Not returned by the API → "—". */
  anchorageChange?: string;
  /** Full money breakdown. Omitted by callers that only have a list row. */
  pricing?: OrderPricing;

  /* --- Review-layout fields (Flow 14) ---------------------------------
   * The drawer used to render a flat key-value list, so it only asked for the
   * handful of strings that list needed. Everything below already arrives on
   * the same `GET /superadmin/orders/orders/{id}/` response the intents review
   * drawer reads — it was simply being discarded in the mapping. All optional,
   * so a caller holding just a list row (the parked Assignments board) still
   * compiles and degrades to "—".
   */
  /** Raw status key, e.g. "order_confirmed" — drives the lifecycle rail. */
  statusKey?: string;
  sailorEmail?: string;
  sailorPhone?: string;
  vesselName?: string;
  imo?: string;
  portName?: string;
  portCode?: string;
  anchorageName?: string;
  shipArrivalDate?: string;
  expectedDeparture?: string;
  orderDate?: string;
  notes?: string;
  itemCount?: number;
  isExpress?: boolean;
  isEmergency?: boolean;
  /**
   * The backend's explanation for a closed order, shown inside the lifecycle
   * rail's terminal notice. Selected from the three reason columns by
   * `lib/terminalReason`; `""` when the backend recorded none.
   */
  terminalReason?: string;
  terminalReasonAt?: string;
  /**
   * Declined charge attempts, newest last — from `payments[].attempts[]`.
   * Shown only in the payment context; a decline is why an order sits unpaid,
   * not a reason the order itself ended.
   */
  paymentFailures?: OrderPaymentFailure[];
}

/** One declined charge attempt, as shown under the order's payment line. */
export interface OrderPaymentFailure {
  /** The gateway's own message, verbatim. */
  message: string;
  /** When the attempt was made, already display-formatted. */
  at: string;
}

/** A step in the order progress timeline (from the live-order details API). */
export interface OrderTimelineItem {
  key: string;
  label: string;
  at: string | null;
  is_done: boolean;
  detail?: string | null;
}

interface OrderDetailDrawerProps {
  order: OrderDetail | null;
  onClose: () => void;
  onReassign?: (orderId: string) => void;
  /**
   * Real cancel handler. When provided, the "Cancel Order" button delegates to
   * it (the caller owns the confirm + API call); otherwise the drawer falls back
   * to its own local confirm dialog with a mock toast.
   */
  onCancel?: () => void;
  /**
   * Opens the refund flow (Flow 12 §3–4). Rendered only when supplied — a paid
   * order is refunded, never "cancelled".
   */
  onRefund?: () => void;
  /** Downloads the picking-slip PDF (Flow 10 API 10). */
  onDownloadSlip?: () => void;
  /** True while the slip is being generated. */
  slipLoading?: boolean;
  /**
   * Live milestone ladder; nothing is invented when it's absent. Drives the
   * lifecycle rail in the summary strip — while it loads, the rail falls back
   * to the status-derived stages, so no loading flag is needed here.
   */
  timeline?: OrderTimelineItem[];
  /**
   * Optional feature-owned section rendered below Order Information (e.g. the
   * delivery-partner assignment, Flow 28 · APIs 11–12). Kept as a slot so this
   * shared drawer stays presentational and doesn't depend on any feature.
   */
  detailSlot?: ReactNode;
}

/** True when a formatted money string carries no value (e.g. "$0.00", "—"). */
function isZeroMoney(value: string): boolean {
  const n = Number(value.replace(/[^0-9.-]/g, ""));
  return !Number.isFinite(n) || n === 0;
}

/**
 * One line of the money breakdown.
 *
 * `negative` renders a deduction with a leading minus so a discount can't be
 * read as a charge — but only when it actually has a value, since "− $0.00"
 * suggests a deduction that never happened.
 */
function PriceRow({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  const isDeduction = negative && !isZeroMoney(value);
  return (
    <div className="flex items-center justify-between py-1.5 text-[12.5px]">
      <span className="text-[var(--t3)]">{label}</span>
      <span
        className={
          isDeduction
            ? "font-semibold tabular-nums text-[var(--success-text)]"
            : "font-semibold tabular-nums text-[var(--t1)]"
        }
      >
        {isDeduction ? `− ${value}` : value}
      </span>
    </div>
  );
}

/** Map an order status to a `Badge` variant (shared with `DashboardOrderDrawer`). */
function getStatusVariant(status: string) {
  switch (status.toLowerCase()) {
    case "delivered":
      return "success" as const;
    case "in progress":
    case "delivering":
      return "teal" as const;
    case "verifying":
      return "info" as const;
    case "new":
      return "neutral" as const;
    case "cancelled":
      return "danger" as const;
    default:
      return "warning" as const;
  }
}

/**
 * Order-details drawer built on the shared shadcn `Sheet` (the canonical drawer
 * pattern), reusing the `Timeline` component. Presentational only.
 *
 * Every action here is caller-supplied: a button renders **only** when its
 * handler is passed. There are deliberately no built-in fallbacks — a drawer
 * that invents milestones or reports a success it never performed is worse than
 * one that shows nothing.
 */
export function OrderDetailDrawer({
  order,
  onClose,
  onReassign,
  onCancel,
  onRefund,
  onDownloadSlip,
  slipLoading,
  timeline,
  detailSlot,
}: OrderDetailDrawerProps) {
  const [tab, setTab] = useState(TAB_OVERVIEW);

  // Reopening on whichever tab the last order was left on would be disorienting,
  // so each open starts on Overview. Keyed on the order id, not the open flag,
  // so clicking straight from one row to another resets too.
  useEffect(() => {
    if (order?.id) setTab(TAB_OVERVIEW);
  }, [order?.id]);

  /**
   * Item columns, mirroring the intents review drawer so the same order reads
   * identically on both screens. No availability column here: that is a
   * pre-payment verification signal, and by the time an order reaches this
   * drawer the stock question is settled.
   */
  const itemColumns: Column<OrderItem>[] = [
    {
      id: "item",
      header: D.ITEM_COLUMNS.ITEM,
      cell: (row) => (
        <div className="min-w-0 max-w-[230px]">
          <div className="td-p trunc" title={row.name}>
            {row.name}
          </div>
          {row.sku && <div className="td-id trunc">{row.sku}</div>}
        </div>
      ),
    },
    {
      id: "qty",
      header: D.ITEM_COLUMNS.QTY,
      headerClassName: "w-14 text-center",
      className: "w-14 text-center",
      cell: (row) => <span className="td-p tabular-nums">{row.qty}</span>,
    },
    {
      id: "unit",
      header: D.ITEM_COLUMNS.UNIT,
      headerClassName: "w-24 text-right",
      className: "w-24 text-right",
      cell: (row) => <span className="td-m tabular-nums">{row.price}</span>,
    },
    {
      id: "subtotal",
      header: D.ITEM_COLUMNS.SUBTOTAL,
      headerClassName: "w-24 text-right",
      className: "w-24 text-right",
      cell: (row) => <span className="td-p tabular-nums">{row.lineTotal ?? row.price}</span>,
    },
  ];

  return (
    <Sheet open={!!order} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={640}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        {order && (
          <>
            <ReviewHeader
              icon={<IconPackage size={22} />}
              title={D.TITLE(order.id)}
              reference={order.id}
              copyLabel={D.COPY_REF}
              onCopy={() => {
                navigator.clipboard?.writeText(order.id).catch(() => undefined);
              }}
            />

            <ReviewSummaryStrip
              badges={
                <>
                  <Badge
                    variant={getStatusVariant(order.status)}
                    showDot
                    className="h-auto text-[12px] px-3 py-[5px]"
                  >
                    {order.status}
                  </Badge>
                  {order.isExpress && (
                    <Badge variant="teal" className="h-auto text-[12px] px-3 py-[5px]">
                      <IconBolt size={13} />
                      {D.EXPRESS}
                    </Badge>
                  )}
                  {order.isEmergency && (
                    <Badge variant="danger" className="h-auto text-[12px] px-3 py-[5px]">
                      <IconAlertTriangle size={13} />
                      {D.EMERGENCY}
                    </Badge>
                  )}
                </>
              }
              valueLabel={D.SUMMARY.TOTAL}
              value={
                <div className="text-[21px] font-extrabold leading-tight tracking-[-0.5px] text-[var(--t1)] tabular-nums">
                  {order.total}
                </div>
              }
              rail={
                <LifecycleRail
                  status={order.statusKey ?? ""}
                  steps={timeline}
                  reason={order.terminalReason}
                  reasonAt={order.terminalReasonAt}
                />
              }
              facts={[
                { label: D.SUMMARY.ITEMS, value: String(order.itemCount ?? order.items.length) },
                { label: D.SUMMARY.ORDER_DATE, value: order.orderDate ?? "" },
                {
                  label: D.SUMMARY.PORT,
                  value: order.portName || order.terminal,
                  icon: <IconAnchor size={14} className="shrink-0 text-[var(--navy-500)]" />,
                },
                {
                  label: D.SUMMARY.ARRIVAL,
                  value: order.shipArrivalDate ?? "",
                  icon: <IconCalendar size={14} className="shrink-0 text-[var(--t4)]" />,
                },
              ]}
            />

            {/* Tab bar sits outside the scroll container, flush against the
                header, so it never drifts away from the order id. The bar's own
                bottom border is the divider — no wrapper border, or it doubles. */}
            <div className="shrink-0 px-6">
              <DynamicTabs
                tabs={[
                  { label: D.TABS.OVERVIEW, value: TAB_OVERVIEW },
                  { label: D.TABS.ITEMS(order.items.length), value: TAB_ITEMS },
                  { label: D.TABS.FULFILMENT, value: TAB_FULFILMENT },
                ]}
                value={tab}
                onTabChange={setTab}
                listClassName="!mb-0"
              />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* ── Overview: who, where and how it was paid ─────── */}
              {tab === TAB_OVERVIEW && (
                <>
                  <Section title={D.CUSTOMER_INFO}>
                    <ReviewCustomerCard
                      name={order.sailor}
                      roleLabel={D.SAILOR}
                      email={order.sailorEmail ?? ""}
                      phone={order.sailorPhone ?? ""}
                      noEmailLabel={D.NO_EMAIL}
                      noPhoneLabel={D.NO_PHONE}
                    />
                  </Section>

                  <Section title={D.VESSEL_SHIPPING}>
                    <ReviewTiles
                      tiles={[
                        {
                          label: D.VESSEL,
                          value: order.vesselName || order.ship,
                          icon: <IconShip size={15} className="shrink-0 text-[var(--teal-600)]" />,
                        },
                        { label: D.IMO, value: order.imo ?? "", mono: true },
                        {
                          label: D.PORT,
                          value: order.portName ?? "",
                          icon: (
                            <IconAnchor size={15} className="shrink-0 text-[var(--navy-500)]" />
                          ),
                        },
                        { label: D.ANCHORAGE, value: order.anchorageName || order.terminal },
                        {
                          label: D.ARRIVAL,
                          value: order.shipArrivalDate ?? "",
                          icon: <IconCalendar size={14} className="shrink-0" />,
                        },
                        { label: D.EXPECTED_DEPARTURE, value: order.expectedDeparture ?? "" },
                      ]}
                    />
                  </Section>

                  <Section title={D.ORDER_SUMMARY}>
                    <KV label={D.ORDER_DATE} value={order.orderDate ?? ""} />
                    <KV label={D.PORT} value={order.portCode || order.portName || ""} />
                    <KV label={D.SOURCE} value={order.source ?? ""} />
                    <KV label={D.INTENT_REF} value={order.intent ?? ""} className="mono" />
                    <KV label={D.ANCHORAGE_CHANGE} value={order.anchorageChange ?? ""} />
                    <KV label={D.PARTNER} value={order.partner} />
                    <KV label={D.PAYMENT} value={order.payment} className="csuccess" />
                    {/* Declines sit with the payment line they belong to, not in
                        the terminal banner: a refused card explains why an order
                        is unpaid, which is a different question from why an order
                        closed. Each attempt is listed — `failure_reason` on the
                        payment keeps only the last one. */}
                    {(order.paymentFailures ?? []).map((f, i) => (
                      <KV
                        key={`${f.at}-${i}`}
                        label={i === 0 ? D.PAYMENT_DECLINED : ""}
                        value={[f.message, f.at].filter(Boolean).join(" · ")}
                        className="text-[var(--danger-text)]"
                      />
                    ))}
                    <KV label={D.COUPON} value={order.coupon || D.COUPON_NONE} />
                  </Section>

                  <Section title={D.NOTES}>
                    <div className="rounded-[var(--radius-md)] border border-[var(--border-sm)] bg-[var(--navy-25)] px-4 py-3 text-[12.5px] font-medium text-[var(--t3)]">
                      {order.notes || D.NO_NOTES}
                    </div>
                  </Section>
                </>
              )}

              {/* ── Items & pricing ──────────────────────────────── */}
              {tab === TAB_ITEMS && (
                <>
                  <Section title={D.ITEMS}>
                    <DataTable
                      columns={itemColumns}
                      data={order.items}
                      rowKey={(row) => `${row.sku ?? row.name}-${row.qty}-${row.price}`}
                      emptyMessage={D.NO_ITEMS}
                    />
                  </Section>

                  {/* Full breakdown, every row always shown — a zero fee is
                      itself information, and hiding rows makes the arithmetic
                      harder to follow rather than easier. */}
                  {order.pricing && (
                    <>
                      <div className="sec-label">{D.PRICING}</div>
                      <PriceRow label={D.SUBTOTAL} value={order.pricing.subtotal} />
                      <PriceRow label={D.SHIPPING_FEE} value={order.pricing.shippingFee} />
                      <PriceRow label={D.TAX} value={order.pricing.tax} />
                      <PriceRow label={D.DISCOUNT} value={order.pricing.discount} negative />
                      {/* The coupon sits with the discount it produced. */}
                      {order.pricing.couponUsed && (
                        <div className="-mt-1 pb-1.5 pl-1 text-[11.5px] text-[var(--t4)]">
                          {D.COUPON_APPLIED(order.pricing.appliedCoupon || D.COUPON_NONE)}
                        </div>
                      )}
                      <PriceRow label={D.PLATFORM_FEE} value={order.pricing.platformFee} />
                      <PriceRow
                        label={
                          order.pricing.loyaltyPoints > 0
                            ? D.LOYALTY_WITH_POINTS(order.pricing.loyaltyPoints)
                            : D.LOYALTY
                        }
                        value={order.pricing.loyaltyDiscount}
                        negative
                      />
                    </>
                  )}

                  <div className="mt16 rounded-[var(--radius-md)] bg-[var(--navy-25)] px-4 py-3.5">
                    <div className="flex jb aic">
                      <span className="sm c3 w6">{D.ORDER_TOTAL}</span>
                      <span className="lg w8">{order.total}</span>
                    </div>
                  </div>
                </>
              )}

              {/* ── Fulfilment: the feature-owned actions ──────────────
                  No milestone ladder here: `timeline` already drives the
                  lifecycle rail in the summary strip above, which is visible
                  from every tab. Rendering it twice showed the same ten steps
                  in two places on one screen. */}
              {tab === TAB_FULFILMENT && (
                <>
                  {/* Feature-owned section (Orders passes partner assignment,
                      ship agent and the location/delta panels). */}
                  {detailSlot}
                </>
              )}
            </div>

            {/* Footer actions — each renders only when the caller owns it. */}
            {(onReassign || onCancel || onRefund || onDownloadSlip) && (
              <SheetFooter className="p-5 border-t border-[var(--border-md)] bg-[var(--surface-alt)]">
                <div className="flex gap-2 w-full">
                  {onReassign && (
                    <Button variant="secondary" size="sm" onClick={() => onReassign(order.id)}>
                      <IconTransfer size={15} />
                      {M.ACTIONS.REASSIGN}
                    </Button>
                  )}
                  {onDownloadSlip && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onDownloadSlip}
                      disabled={slipLoading}
                    >
                      <IconFileDownload size={15} />
                      {slipLoading ? M.SLIP_DOWNLOADING : M.SLIP}
                    </Button>
                  )}
                  {onRefund && (
                    <Button variant="secondary" size="sm" className="ml-auto" onClick={onRefund}>
                      <IconCoin size={15} />
                      {M.ACTIONS.REFUND}
                    </Button>
                  )}
                  {onCancel && (
                    <Button
                      variant="danger"
                      size="sm"
                      className={onRefund ? undefined : "ml-auto"}
                      onClick={onCancel}
                    >
                      <IconX size={15} />
                      {M.ACTIONS.CANCEL_ORDER}
                    </Button>
                  )}
                </div>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
