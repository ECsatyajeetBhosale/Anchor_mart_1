import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MESSAGES } from "@/lib/messages";
import { IconBolt } from "@tabler/icons-react";
import type React from "react";
import type { ExpressOrder } from "../types/expressItem.types";

const M = MESSAGES.EXPRESS;

export interface ExpressItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: ExpressOrder | null;
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="fg-label">{label}</span>
      <span className="text-[13.5px] font-medium text-[var(--t1)]">{value || M.DASH}</span>
    </div>
  );
}

export function ExpressItemDrawer({ isOpen, onClose, item }: ExpressItemDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={640}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
              <IconBolt size={20} />
            </div>
            <div>
              <SheetTitle className="text-xl mono">
                {item?.order_number ?? M.DRAWER.TITLE_FALLBACK}
              </SheetTitle>
              <SheetDescription>{item?.customer_name}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-6">
          {item && (
            <>
              <section>
                <div className="sec-label">{M.DRAWER.SECTIONS.OVERVIEW}</div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <StatusBadge status={item.status_display || item.status} />
                  {item.is_express && <Badge variant="teal">{M.FLAGS.EXPRESS}</Badge>}
                  {item.is_emergency && <Badge variant="danger">{M.FLAGS.EMERGENCY}</Badge>}
                  {item.is_fastest_delivery && <Badge variant="amber">{M.FLAGS.FASTEST}</Badge>}
                  {item.has_location_request && (
                    <Badge variant="warning">{M.FLAGS.LOCATION_REQ}</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label={M.COLUMNS.AMOUNT} value={`$${Number(item.total_amount).toFixed(2)}`} />
                  <DetailRow label={M.COLUMNS.ITEMS} value={M.DRAWER.ITEM_COUNT(item.item_count ?? 0)} />
                </div>
              </section>

              <section>
                <div className="sec-label">{M.DRAWER.SECTIONS.CUSTOMER}</div>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label={M.COLUMNS.CUSTOMER} value={item.customer_name} />
                  <DetailRow label="Email" value={item.customer_email} />
                </div>
              </section>

              <section>
                <div className="sec-label">{M.DRAWER.SECTIONS.DELIVERY}</div>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="Port" value={item.port_name} />
                  <DetailRow label="Anchorage" value={item.anchorage_name} />
                  <DetailRow
                    label={M.COLUMNS.PARTNER}
                    value={item.partner_allocated ? item.partner_name : M.UNALLOCATED}
                  />
                  <DetailRow label={M.COLUMNS.ARRIVAL} value={item.ship_arrival_date} />
                </div>
              </section>

              <section>
                <div className="sec-label">{M.DRAWER.SECTIONS.TIMELINE}</div>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="Payment Completed" value={item.payment_completed_at} />
                  <DetailRow label="Created" value={item.created_at} />
                </div>
              </section>
            </>
          )}
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end w-full">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <IconBolt size={16} />
              {M.DRAWER.CLOSE}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
