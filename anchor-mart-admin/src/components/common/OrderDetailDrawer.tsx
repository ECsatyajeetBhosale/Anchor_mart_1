import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MESSAGES } from "@/lib/messages";
import {
  IconClock,
  IconCoin,
  IconFileDownload,
  IconPackage,
  IconTransfer,
  IconX,
} from "@tabler/icons-react";
import { type ReactNode, useEffect, useState } from "react";
import { DynamicTabs } from "./DynamicTabs";
import { Timeline } from "./Timeline";

const M = MESSAGES.ORDERS;
const D = MESSAGES.ORDERS.DRAWER;

const TAB_OVERVIEW = "overview";
const TAB_ITEMS = "items";
const TAB_FULFILMENT = "fulfilment";

export interface OrderItem {
  name: string;
  qty: number;
  /** Formatted **unit** price, e.g. "$100.00". */
  price: string;
  /**
   * Formatted line total (`unit price × qty`) as returned by the API. Shown
   * beside the unit price so a multi-quantity row can't be misread as one.
   */
  lineTotal?: string;
}

/**
 * The order's money breakdown.
 *
 * `itemsTotal` is the sum of the line subtotals and is always real. Everything
 * else is order-level and stays at zero until the admin generates a bill —
 * `apply_fees` writes the fees and `recompute_order_totals` produces the total
 * (Flow 07). `isBilled` distinguishes "genuinely free" from "not priced yet",
 * which is otherwise indistinguishable at a glance.
 */
export interface OrderPricing {
  itemsTotal: string;
  subtotal: string;
  shippingFee: string;
  tax: string;
  platformFee: string;
  discount: string;
  loyaltyDiscount: string;
  loyaltyPoints: number;
  total: string;
  /** False while every order-level money field is still zero. */
  isBilled: boolean;
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
  /** Live milestone ladder; nothing is invented when it's absent. */
  timeline?: OrderTimelineItem[];
  /** True while the live timeline is being fetched. */
  timelineLoading?: boolean;
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
 * One line of the money breakdown. `omitZero` hides fee rows that don't apply,
 * so an unbilled order shows a short list rather than a wall of zeros.
 */
function PriceRow({
  label,
  value,
  omitZero,
  negative,
}: {
  label: string;
  value: string;
  omitZero?: boolean;
  negative?: boolean;
}) {
  if (omitZero && isZeroMoney(value)) return null;
  return (
    <div className="flex items-center justify-between py-1.5 text-[12.5px]">
      <span className="text-[var(--t3)]">{label}</span>
      <span
        className={
          negative
            ? "font-semibold tabular-nums text-[var(--success-text)]"
            : "font-semibold tabular-nums text-[var(--t1)]"
        }
      >
        {negative ? `− ${value}` : value}
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
  timelineLoading,
  detailSlot,
}: OrderDetailDrawerProps) {
  const [tab, setTab] = useState(TAB_OVERVIEW);

  // Reopening on whichever tab the last order was left on would be disorienting,
  // so each open starts on Overview. Keyed on the order id, not the open flag,
  // so clicking straight from one row to another resets too.
  useEffect(() => {
    if (order?.id) setTab(TAB_OVERVIEW);
  }, [order?.id]);

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
            {/* Header — identity, plus the status/total an admin scans for.
                No bottom border: the tab bar directly beneath supplies the rule,
                so the two read as one block. */}
            <SheetHeader className="p-6 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
                  <IconPackage size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-[15px] font-extrabold">
                    {D.TITLE(order.id)}
                  </SheetTitle>
                  <SheetDescription>{order.terminal}</SheetDescription>
                </div>
                <span className="shrink-0 text-[17px] font-extrabold tabular-nums text-[var(--t1)]">
                  {order.total}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant={getStatusVariant(order.status)}
                  className="h-auto text-[12px] px-3 py-[5px]"
                >
                  {order.status}
                </Badge>
                <Badge variant="teal" className="h-auto text-[12px] px-3 py-[5px]">
                  <IconClock size={13} className="mr-1 inline" />
                  {D.LIVE_TRACKING}
                </Badge>
              </div>
            </SheetHeader>

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
                  <div className="sec-label">{D.ORDER_INFO}</div>
                  <div className="detail-kv">
                    <div className="detail-k">{D.SAILOR}</div>
                    <div className="detail-v">{order.sailor}</div>
                  </div>
                  <div className="detail-kv">
                    <div className="detail-k">{D.SOURCE}</div>
                    <div className="detail-v">{order.source || "—"}</div>
                  </div>
                  <div className="detail-kv">
                    <div className="detail-k">{D.INTENT_REF}</div>
                    <div className="detail-v mono">{order.intent || "—"}</div>
                  </div>
                  <div className="detail-kv">
                    <div className="detail-k">{D.SHIP_IMO}</div>
                    <div className="detail-v mono cteal">{order.ship}</div>
                  </div>
                  <div className="detail-kv">
                    <div className="detail-k">{D.TERMINAL}</div>
                    <div className="detail-v">{order.terminal}</div>
                  </div>
                  <div className="detail-kv">
                    <div className="detail-k">{D.ANCHORAGE_CHANGE}</div>
                    <div className="detail-v">{order.anchorageChange || "—"}</div>
                  </div>
                  <div className="detail-kv">
                    <div className="detail-k">{D.PARTNER}</div>
                    <div className="detail-v">{order.partner}</div>
                  </div>
                  <div className="detail-kv">
                    <div className="detail-k">{D.PAYMENT}</div>
                    <div className="detail-v csuccess">{order.payment}</div>
                  </div>
                  <div className="detail-kv">
                    <div className="detail-k">{D.COUPON}</div>
                    <div className="detail-v">{order.coupon || D.COUPON_NONE}</div>
                  </div>
                </>
              )}

              {/* ── Items & pricing ──────────────────────────────── */}
              {tab === TAB_ITEMS && (
                <>
                  <div className="sec-label">{D.ITEMS}</div>
                  {order.items.length === 0 ? (
                    <div className="detail-kv">
                      <div className="detail-v c4 w5">{D.NO_ITEMS}</div>
                    </div>
                  ) : (
                    order.items.map((item) => (
                      <div
                        key={`${item.name}-${item.qty}-${item.price}`}
                        className="flex items-start justify-between gap-3 border-b border-[var(--border-xs)] py-2.5 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-[var(--t1)]">
                            {item.name}
                          </div>
                          {/* Spell the arithmetic out: a bare "$100.00" next to
                              "×3" reads as the line total when it's the unit price. */}
                          <div className="text-[11.5px] text-[var(--t4)] tabular-nums">
                            {D.LINE_MATH(item.qty, item.price)}
                          </div>
                        </div>
                        <div className="shrink-0 text-[13px] font-bold tabular-nums text-[var(--t1)]">
                          {item.lineTotal ?? item.price}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Money breakdown. Fee rows are hidden when zero so an unbilled
                      order shows a short, honest list rather than five zeros. */}
                  {order.pricing && (
                    <>
                      <div className="sec-label mt16">{D.PRICING}</div>
                      <PriceRow label={D.ITEMS_TOTAL} value={order.pricing.itemsTotal} />
                      <PriceRow label={D.SUBTOTAL} value={order.pricing.subtotal} />
                      <PriceRow label={D.SHIPPING_FEE} value={order.pricing.shippingFee} omitZero />
                      <PriceRow label={D.TAX} value={order.pricing.tax} omitZero />
                      <PriceRow label={D.PLATFORM_FEE} value={order.pricing.platformFee} omitZero />
                      <PriceRow
                        label={D.DISCOUNT}
                        value={order.pricing.discount}
                        omitZero
                        negative
                      />
                      <PriceRow
                        label={
                          order.pricing.loyaltyPoints > 0
                            ? D.LOYALTY_WITH_POINTS(order.pricing.loyaltyPoints)
                            : D.LOYALTY
                        }
                        value={order.pricing.loyaltyDiscount}
                        omitZero
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

                  {/* The single most confusing state: priced items under a zero
                      total. Say why instead of leaving the admin to guess. */}
                  {order.pricing && !order.pricing.isBilled && order.items.length > 0 && (
                    <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--amber-200)] bg-[var(--amber-50)] px-4 py-3">
                      <div className="text-[12.5px] font-bold text-[var(--amber-700)]">
                        {D.NOT_BILLED_TITLE}
                      </div>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--t3)]">
                        {D.NOT_BILLED_BODY}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── Fulfilment: progress and the feature-owned actions ── */}
              {tab === TAB_FULFILMENT && (
                <>
                  <div className="sec-label">{D.TIMELINE}</div>
                  <Timeline items={timeline} loading={timelineLoading} className="mb-5" />

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
