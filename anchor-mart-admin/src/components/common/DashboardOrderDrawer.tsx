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
import { IconBell, IconClock, IconPackage, IconTransfer, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import type { OrderDetail, OrderTimelineItem } from "./OrderDetailDrawer";
import { Timeline } from "./Timeline";

/** Map an order status to a `Badge` variant. */
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

export interface DashboardOrderDrawerProps {
  order: OrderDetail | null;
  onClose: () => void;
  /** Live timeline from the details API; loading/empty handled inline. */
  timeline?: OrderTimelineItem[];
  timelineLoading?: boolean;
  onReassign?: (orderId: string) => void;
}

/**
 * Live-order details drawer built on the shared shadcn `Sheet` (the canonical
 * drawer pattern). Presentational only — the parent fetches the timeline and
 * passes it in, mirroring the Products drawers.
 */
export function DashboardOrderDrawer({
  order,
  onClose,
  timeline,
  timelineLoading,
  onReassign,
}: DashboardOrderDrawerProps) {
  const handleCancel = () => {
    if (!order) return;
    const confirmCancel = window.confirm(
      `This will cancel order ${order.id} and trigger refund processing. This cannot be undone. Are you sure?`,
    );
    if (confirmCancel) {
      toast.error(`Order ${order.id} has been cancelled`);
      onClose();
    }
  };

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
              <div className="flex g8 mb20">
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
                <div className="detail-k">Ship / IMO</div>
                <div className="detail-v mono cteal">{order.ship}</div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">Terminal</div>
                <div className="detail-v">{order.terminal}</div>
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
              <div className="flex g8 w-full">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    onReassign
                      ? onReassign(order.id)
                      : toast.success(`Partner reassigned for ${order.id}`)
                  }
                >
                  <IconTransfer size={15} />
                  Reassign Partner
                </Button>
                <Button
                  variant="teal"
                  size="sm"
                  onClick={() => toast.success(`Notification sent to Sailor ${order.sailor}`)}
                >
                  <IconBell size={15} />
                  Notify Sailor
                </Button>
                <Button variant="danger" size="sm" className="ml-auto" onClick={handleCancel}>
                  <IconX size={15} />
                  Cancel
                </Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default DashboardOrderDrawer;
