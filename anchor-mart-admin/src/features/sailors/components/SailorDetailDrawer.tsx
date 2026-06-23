import { IconEdit, IconMessage, IconUser } from "@tabler/icons-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getFallbackAvatar } from "@/lib/avatar";

import type { SailorData } from "../types/sailor.types";

export interface SailorDetailDrawerProps {
  isOpen: boolean;
  sailor: SailorData | null;
  /** True while the detail request is in flight (data still shown from the row). */
  isLoading?: boolean;
  onClose: () => void;
  onEdit: (sailor: SailorData) => void;
}

/** One label/value row in the contact section. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--border-xs)] last:border-0">
      <span className="text-[13px] font-medium text-[var(--t3)]">{label}</span>
      <span className="text-[13px] font-semibold text-[var(--t1)] text-right break-all">
        {value}
      </span>
    </div>
  );
}

/** One metric tile in the activity grid. */
function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-sm)] bg-[var(--surface-alt)] p-3 text-center">
      <div className="text-[20px] font-extrabold text-[var(--t1)] tabular-nums">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--t4)]">
        {label}
      </div>
    </div>
  );
}

/**
 * Read-only sailor detail view, built on the shared right-side `Sheet` drawer —
 * the same pattern the Products page uses (icon-tile header, scrollable body,
 * sticky footer). Opens instantly with the clicked row's data and refines once
 * the detail request resolves.
 */
export function SailorDetailDrawer({
  isOpen,
  sailor,
  isLoading,
  onClose,
  onEdit,
}: SailorDetailDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={480}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconUser size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">Sailor Details</SheetTitle>
              <SheetDescription>
                {isLoading ? "Loading latest details…" : "Profile, contact & activity overview"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {sailor && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {/* Identity */}
            <div className="flex flex-col items-center text-center pb-2">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-[var(--border-xs)] bg-[var(--surface-alt)]">
                <img
                  src={getFallbackAvatar(sailor.id || sailor.n)}
                  alt={sailor.n}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-3 text-[17px] font-extrabold text-[var(--t1)]">{sailor.n}</div>
              <div className="mt-1 text-[13px] font-medium text-[var(--t4)]">{sailor.e}</div>
              <div className="mt-3">
                <Badge variant={sailor.sc}>{sailor.st}</Badge>
              </div>
            </div>

            {/* Contact details */}
            <div>
              <div className="sec-label">Contact Details</div>
              <DetailRow label="Email" value={sailor.e} />
              <DetailRow label="Contact" value={sailor.w} />
              <DetailRow label="Joined" value={sailor.j} />
              <DetailRow label="Ship / IMO" value={sailor.sh} />
            </div>

            {/* Activity */}
            <div>
              <div className="sec-label">Activity</div>
              <div className="grid grid-cols-2 gap-3">
                <MetricTile label="Orders" value={sailor.o} />
                <MetricTile label="Loyalty Pts" value={sailor.p.toLocaleString()} />
                <MetricTile label="Cart Items" value={sailor.ca} />
                <MetricTile label="Wishlist" value={sailor.wi} />
              </div>
            </div>
          </div>
        )}

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex items-center gap-3 w-full">
            <button type="button" className="btn btn-ghost btn-cancel mr-auto" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => sailor && toast.success(`Opening WhatsApp chat to ${sailor.w}`)}
            >
              <IconMessage size={16} />
              Message
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => sailor && onEdit(sailor)}
            >
              <IconEdit size={16} />
              Edit
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
