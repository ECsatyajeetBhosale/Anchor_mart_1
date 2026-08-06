import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MESSAGES } from "@/lib/messages";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { CapabilityChange } from "../types/partner.types";

const M = MESSAGES.PARTNERS.CAPABILITY_CHANGE;
const CAP = MESSAGES.PARTNERS.CAPABILITY;

/** Human label for a revoked capability field name. */
function revokedLabel(field: string): string {
  if (field === "can_verify") return CAP.BADGE_VERIFY;
  if (field === "can_deliver") return CAP.BADGE_DELIVER;
  return field;
}

export interface CapabilityChangeDialogProps {
  change: CapabilityChange | null;
  onClose: () => void;
  /** Opens the assignment screen for one order, so the revoke can be made real. */
  onReassign?: (orderId: string) => void;
}

/**
 * What a capability revoke did **not** stop (Flow 28 API 5, added 2026-08-03).
 *
 * Removing `can_deliver` (or `can_verify`) means "stop sending this kind of
 * work". It does **not** stop work already in hand: a partner at the berth
 * holding the sailor's goods still completes the handover, because stopping them
 * strands cargo and the vessel sails without it.
 *
 * This dialog exists so an admin is never left believing the revoke stopped
 * something. It is deliberately a dialog rather than a toast — the list of
 * still-running orders is the actionable part, and a toast would take it away
 * before it could be read.
 *
 * Shown **only** when the update actually revoked something; granting a
 * capability returns no such block.
 */
export function CapabilityChangeDialog({
  change,
  onClose,
  onReassign,
}: CapabilityChangeDialogProps) {
  if (!change) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconAlertTriangle size={18} className="text-[var(--amber-600)]" />
            {M.TITLE}
          </DialogTitle>
          {/* The server's own copy — it is written to be displayed, and it
              carries the exact count, so it is shown verbatim rather than
              paraphrased into something that could drift from the numbers. */}
          <DialogDescription>{change.message}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] font-bold text-[var(--t4)]">{M.REVOKED}</span>
            {change.revoked.map((field) => (
              <Badge key={field} variant="danger">
                {revokedLabel(field)}
              </Badge>
            ))}
          </div>

          <div className="sec-label">
            {M.IN_FLIGHT} ({change.inFlightCount})
          </div>

          {change.orders.length === 0 ? (
            // `count: 0` is a real answer, not an omission — say so rather than
            // rendering an empty box that reads as a failed load.
            <p className="text-[12.5px] text-[var(--t4)]">{M.NONE_IN_FLIGHT}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {change.orders.map((order) => (
                <li
                  key={order.orderId}
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-xs)] px-3 py-2"
                >
                  <span className="mono text-[12px] font-bold text-[var(--t1)]">
                    {order.orderNumber}
                  </span>
                  <Badge variant="neutral">{order.statusDisplay || order.status}</Badge>
                  {onReassign && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="ml-auto"
                      onClick={() => onReassign(order.orderId)}
                    >
                      {M.REASSIGN}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* `truncated` caps the rows at 20 while `count` stays exact, so the
              list must admit it is partial or the two numbers look inconsistent. */}
          {change.truncated && (
            <p className="text-[11.5px] text-[var(--t4)]">{M.TRUNCATED(change.inFlightCount)}</p>
          )}

          <p className="text-[12px] font-semibold text-[var(--t3)]">{M.HINT}</p>
        </div>

        <DialogFooter>
          <Button variant="primary" onClick={onClose}>
            {M.CLOSE}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CapabilityChangeDialog;
