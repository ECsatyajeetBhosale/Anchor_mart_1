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
import { IconBell, IconClock, IconPackage, IconTransfer, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";
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
  /** Live timeline; when provided it replaces the static fallback timeline. */
  timeline?: OrderTimelineItem[];
  /** True while the live timeline is being fetched. */
  timelineLoading?: boolean;
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

/** Static fallback timeline for callers that don't supply a live one. */
function fallbackTimeline(order: OrderDetail): OrderTimelineItem[] {
  const delivered = order.status.toLowerCase() === "delivered";
  return [
    {
      key: "intent_submitted",
      label: "Intent submitted",
      at: "22 Apr",
      detail: "#INT20260422-0047",
      is_done: true,
    },
    {
      key: "intent_confirmed",
      label: "Intent confirmed by admin",
      at: "22 Apr · 14:58",
      detail: null,
      is_done: true,
    },
    {
      key: "payment_confirmed",
      label: `Payment confirmed — ${order.total}`,
      at: "22 Apr · 15:24",
      detail: null,
      is_done: true,
    },
    {
      key: "assigned",
      label: `Assigned to ${order.partner}`,
      at: "22 Apr · 15:30",
      detail: null,
      is_done: true,
    },
    {
      key: "out_for_delivery",
      label: "Out for delivery",
      at: delivered ? "Delivered to ship" : "En route to Terminal",
      detail: null,
      is_done: delivered,
    },
    {
      key: "delivered",
      label: "Delivery confirmed",
      at: delivered ? "Completed · 16:12" : "Awaiting arrival",
      detail: null,
      is_done: delivered,
    },
  ];
}

/**
 * Order-details drawer built on the shared shadcn `Sheet` (the canonical drawer
 * pattern), reusing the `Timeline` component. Presentational only — a caller
 * may pass a live `timeline`; otherwise a static fallback is shown.
 */
export function OrderDetailDrawer({
  order,
  onClose,
  onReassign,
  timeline,
  timelineLoading,
}: OrderDetailDrawerProps) {
  // Cancel confirmation is a shadcn `ConfirmDialog` (matches the row-action
  // cancel on the Orders page), replacing the native window.confirm.
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const handleCancelConfirmed = () => {
    if (!order) return;
    setConfirmCancelOpen(false);
    toast.error(M.ORDER_CANCELLED(order.id));
    onClose();
  };

  const timelineItems = timeline ?? (order ? fallbackTimeline(order) : undefined);

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
              <Timeline items={timelineItems} loading={timelineLoading} className="mb-5" />

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

            {/* Footer actions */}
            <SheetFooter className="p-5 border-t border-[var(--border-md)] bg-[var(--surface-alt)]">
              <div className="flex gap-2 w-full">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    onReassign
                      ? onReassign(order.id)
                      : toast.success(`Assigning partner flow triggered for ${order.id}`)
                  }
                >
                  <IconTransfer size={15} />
                  Reassign
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toast.success(`Notification sent to Sailor ${order.sailor}`)}
                >
                  <IconBell size={15} />
                  Notify Sailor
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setConfirmCancelOpen(true)}
                >
                  <IconX size={15} />
                  Cancel Order
                </Button>
              </div>
            </SheetFooter>

            <ConfirmDialog
              isOpen={confirmCancelOpen}
              onClose={() => setConfirmCancelOpen(false)}
              onConfirm={handleCancelConfirmed}
              title={M.CANCEL_CONFIRM_TITLE}
              description={M.CANCEL_CONFIRM_MSG}
              confirmText={M.CANCEL_CONFIRM_CONFIRM}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
