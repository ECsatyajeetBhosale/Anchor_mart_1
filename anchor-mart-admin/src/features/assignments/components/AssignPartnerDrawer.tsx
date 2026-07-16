import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PartnerData } from "@/features/partners";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { IconTransfer } from "@tabler/icons-react";
import { useEffect, useState } from "react";

const M = MESSAGES.ASSIGNMENTS.DRAWER;

/** Today as `YYYY-MM-DD`, the default delivery date. */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Maps a partner's status label to a badge colour. */
function statusVariant(status: string): "success" | "warning" | "danger" {
  if (status === "Inactive") return "danger";
  if (status === "On Duty") return "warning";
  return "success";
}

export interface AssignPartnerDrawerProps {
  open: boolean;
  /** Order the partner is being assigned to (display label). */
  orderId: string | null;
  /** Selectable delivery partners (live data, mapped like the Partners page). */
  partners: PartnerData[];
  /** True while the assign request is in flight. */
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (partner: PartnerData, deliverBy: string) => void;
}

/**
 * Right-side drawer for (re)assigning a delivery partner to an order. Owns its
 * transient selection and reseeds each time it opens; the parent handles the
 * side effect via `onConfirm`.
 */
export function AssignPartnerDrawer({
  open,
  orderId,
  partners,
  isSubmitting = false,
  onClose,
  onConfirm,
}: AssignPartnerDrawerProps) {
  const [selectedId, setSelectedId] = useState("");
  const [deliverBy, setDeliverBy] = useState(todayISO);

  useEffect(() => {
    if (open) {
      setSelectedId("");
      setDeliverBy(todayISO());
    }
  }, [open]);

  const handleConfirm = () => {
    const partner = partners.find((p) => p.deliveryPartnerId === selectedId);
    if (partner) onConfirm(partner, deliverBy);
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={460}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
              <IconTransfer size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">{M.TITLE}</SheetTitle>
              <SheetDescription>{M.SUBTITLE(orderId ?? "—")}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
          <div>
            <div className="fg-label">{M.DELIVERY_DATE}</div>
            <Input type="date" value={deliverBy} onChange={(e) => setDeliverBy(e.target.value)} />
          </div>

          <div className="fg-label">{M.SELECT_PARTNER}</div>
          {partners.length === 0 ? (
            <div className="text-[13px] text-[var(--t4)]">{M.PARTNERS_EMPTY}</div>
          ) : (
            partners.map((p) => {
              const isSelected = selectedId === p.deliveryPartnerId;
              return (
                <button
                  key={p.deliveryPartnerId || p.id}
                  type="button"
                  onClick={() => setSelectedId(p.deliveryPartnerId)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[var(--radius-md)] border p-3 text-left transition-colors",
                    isSelected
                      ? "border-[var(--navy-300)] bg-[var(--navy-25)]"
                      : "border-[var(--border-sm)] bg-[var(--surface)] hover:bg-[var(--surface-alt)]",
                  )}
                >
                  <div className="av av-sm av-img">
                    <img src={getFallbackAvatar(p.n)} alt={p.n} loading="lazy" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[12.5px] font-bold text-[var(--t1)]">{p.n}</div>
                    <div className="text-[10.5px] text-[var(--t4)]">
                      {p.id} · {p.p}
                    </div>
                  </div>
                  <Badge variant={statusVariant(p.s)}>{p.s}</Badge>
                </button>
              );
            })
          )}
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              {MESSAGES.COMMON.CANCEL}
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={isSubmitting || !selectedId}
            >
              <IconTransfer size={15} className="mr-1" />
              {isSubmitting ? M.ASSIGNING : M.CONFIRM}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
