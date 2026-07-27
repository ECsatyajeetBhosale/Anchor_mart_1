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
import type { ReactNode } from "react";
import { Timeline } from "./Timeline";

const M = MESSAGES.ORDERS;

export interface OrderItem {
  name: string;
  qty: number;
  price: string;
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
            {/* Header */}
            <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
                  <IconPackage size={22} />
                </div>
                <div>
                  <SheetTitle className="text-[15px] font-extrabold">Order {order.id}</SheetTitle>
                  <SheetDescription>{order.terminal}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Status badges */}
              <div className="flex gap-2 mb-5">
                <Badge
                  variant={getStatusVariant(order.status)}
                  className="h-auto text-[12px] px-3 py-[5px]"
                >
                  {order.status}
                </Badge>
                <Badge variant="teal" className="h-auto text-[12px] px-3 py-[5px]">
                  <IconClock size={13} className="mr-1 inline" />
                  Live Tracking
                </Badge>
              </div>

              {/* Timeline */}
              <Timeline items={timeline} loading={timelineLoading} className="mb-5" />

              {/* Order Information */}
              <div className="sec-label">Order Information</div>
              <div className="detail-kv">
                <div className="detail-k">Sailor</div>
                <div className="detail-v">{order.sailor}</div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">Order Source</div>
                <div className="detail-v">{order.source || "—"}</div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">Intent Ref</div>
                <div className="detail-v mono">{order.intent || "—"}</div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">Ship / IMO</div>
                <div className="detail-v mono cteal">{order.ship}</div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">Terminal</div>
                <div className="detail-v">{order.terminal}</div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">Anchorage Change</div>
                <div className="detail-v">{order.anchorageChange || "—"}</div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">Delivery Partner</div>
                <div className="detail-v">{order.partner}</div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">Payment</div>
                <div className="detail-v csuccess">{order.payment}</div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">Coupon</div>
                <div className="detail-v">{order.coupon || "None"}</div>
              </div>

              {/* Feature-owned section (Orders passes partner assignment) */}
              {detailSlot}

              {/* Items */}
              <div className="sec-label mt16">Items</div>
              {order.items.length === 0 ? (
                <div className="detail-kv">
                  <div className="detail-v c4 w5">No items</div>
                </div>
              ) : (
                order.items.map((item) => (
                  <div key={`${item.name}-${item.qty}-${item.price}`} className="detail-kv">
                    <div className="detail-k w5 c4">
                      {item.name} &times;{item.qty}
                    </div>
                    <div className="detail-v">{item.price}</div>
                  </div>
                ))
              )}

              {/* Total */}
              <div className="mt16 rounded-[var(--radius-md)] bg-[var(--navy-25)] px-4 py-3.5">
                <div className="flex jb aic">
                  <span className="sm c3 w6">Order Total</span>
                  <span className="lg w8">{order.total}</span>
                </div>
              </div>
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
