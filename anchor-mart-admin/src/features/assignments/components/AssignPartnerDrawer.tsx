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
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { IconTransfer } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { AvailablePartner } from "../types/assignment.types";

const M = MESSAGES.ASSIGNMENTS.DRAWER;

export interface AssignPartnerDrawerProps {
  open: boolean;
  /** Order the partner is being assigned to. */
  orderId: string | null;
  /** Selectable partners. */
  partners: AvailablePartner[];
  onClose: () => void;
  onConfirm: (partnerName: string) => void;
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
  onClose,
  onConfirm,
}: AssignPartnerDrawerProps) {
  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (open) setSelected("");
  }, [open]);

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
          <div className="fg-label">{M.SELECT_PARTNER}</div>
          {partners.map((p) => {
            const isSelected = selected === p.name;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.name)}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-md)] border p-3 text-left transition-colors",
                  isSelected
                    ? "border-[var(--navy-300)] bg-[var(--navy-25)]"
                    : "border-[var(--border-sm)] bg-[var(--surface)] hover:bg-[var(--surface-alt)]",
                )}
              >
                <div className="av av-sm av-img">
                  <img src={getFallbackAvatar(p.name)} alt={p.name} loading="lazy" />
                </div>
                <div className="flex-1">
                  <div className="text-[12.5px] font-bold text-[var(--t1)]">{p.name}</div>
                  <div className="text-[10.5px] text-[var(--t4)]">
                    {p.id} · {p.location}
                  </div>
                </div>
                <Badge variant={p.status === "Free" ? "success" : "warning"}>{p.status}</Badge>
              </button>
            );
          })}
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" type="button" onClick={onClose}>
              {MESSAGES.COMMON.CANCEL}
            </Button>
            <Button variant="primary" onClick={() => onConfirm(selected)}>
              <IconTransfer size={15} className="mr-1" />
              {M.CONFIRM}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
