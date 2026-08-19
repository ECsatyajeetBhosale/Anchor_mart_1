import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MESSAGES } from "@/lib/messages";
import { ORDER_STATUSES, ORDER_STATUS_BY_KEY } from "@/lib/orderStatuses";
import { INTENT_SITUATIONS } from "../lib/intentSituation";

const L = MESSAGES.INTENTS.STATUS_LEGEND;

export interface StatusLegendDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Reference popup explaining every order/intent lifecycle status in canonical
 * order. Opened from the info icon beside the status filter so admins can look
 * up unfamiliar terminology without leaving the page. Content is driven by the
 * canonical `ORDER_STATUSES` list (mirrors docs/ORDER_STATUSES.md).
 */
export function StatusLegendDialog({ isOpen, onClose }: StatusLegendDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{L.TITLE}</DialogTitle>
          <DialogDescription>{L.DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto pr-1 -mr-1">
          <ul className="flex flex-col gap-3">
            {ORDER_STATUSES.map((s) => (
              <li
                key={s.key}
                className="flex gap-3 border-b border-[var(--border-xs)] pb-3 last:border-0 last:pb-0"
              >
                <span className="mono mt-0.5 w-5 shrink-0 text-right text-[12px] font-bold text-[var(--t4)]">
                  {s.order}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--t4)]">
                      {L.ACTOR}: {s.actor}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-[var(--t3)]">{s.meaning}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* The situations sit apart because they are not statuses — they are
            read-time splits of two of the above, and the badge shows their
            label where the status's would otherwise go. Without this group an
            admin who sees "Ready to Bill" finds nothing here that explains it. */}
        <div className="mt-4 border-t border-[var(--border-sm)] pt-4">
          <div className="text-[12px] font-bold text-[var(--t2)]">{L.SITUATIONS_TITLE}</div>
          <p className="mt-1 text-[12px] leading-snug text-[var(--t4)]">
            {L.SITUATIONS_DESCRIPTION}
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {INTENT_SITUATIONS.map((s) => (
              <li key={s.key} className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--t4)]">
                      {L.SPLIT_OF(ORDER_STATUS_BY_KEY[s.status]?.label ?? s.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-[var(--t3)]">{s.meaning}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end pt-1">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {L.CLOSE}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
