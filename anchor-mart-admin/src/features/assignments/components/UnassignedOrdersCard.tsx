import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MESSAGES } from "@/lib/messages";
import type { UnassignedOrder } from "../types/assignment.types";

const M = MESSAGES.ASSIGNMENTS.UNASSIGNED;

export interface UnassignedOrdersCardProps {
  orders: UnassignedOrder[];
  onAssign: (orderId: string) => void;
}

export function UnassignedOrdersCard({ orders, onAssign }: UnassignedOrdersCardProps) {
  const urgentCount = orders.filter((o) => o.priority === "High").length;

  return (
    <SectionCard
      // No body padding + relative positioning: the scroll list is absolutely
      // positioned so its content never grows the grid row. The grid then
      // stretches this card to the assignments table's height, and the list
      // fills and scrolls inside it — so the two sections always match height.
      bodyPadding="none"
      bodyClassName="relative"
      title={M.TITLE}
      actions={urgentCount > 0 && <Badge variant="danger">{M.URGENT(urgentCount)}</Badge>}
    >
      {/* Absolutely fill the card body; padding lives here (pr trimmed for the scrollbar). */}
      <div className="absolute inset-0 flex flex-col gap-2.5 overflow-y-auto p-5 pr-4">
        {orders.length === 0 ? (
          <div className="text-[13px] text-[var(--t4)]">{M.EMPTY}</div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-xs)] border-l-[3.5px] border-l-[var(--danger-icon)] bg-[var(--surface-alt)] p-3"
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="mono font-extrabold text-[var(--teal-600)]">{order.id}</span>
                  <Badge variant={order.priority === "High" ? "danger" : "info"}>
                    {order.priority}
                  </Badge>
                </div>
                <div className="text-[13px] font-bold text-[var(--t1)]">{order.sailor}</div>
                <div className="text-[11px] text-[var(--t4)]">
                  {order.items} · {order.port}
                </div>
              </div>
              <Button variant="primary" size="sm" onClick={() => onAssign(order.id)}>
                {M.ASSIGN}
              </Button>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}
