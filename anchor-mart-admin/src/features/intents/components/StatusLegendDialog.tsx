import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MESSAGES } from "@/lib/messages";
import { ORDER_STATUSES } from "@/lib/orderStatuses";

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
 *
 * The situations group that used to sit below the list — the read-time splits
 * such as "Ready to Bill" — was removed, so only canonical statuses are
 * explained here now. The splits themselves still exist and still reach the
 * page: `situationVariant` colours the row badges from `intentApi`. Only their
 * explanation is gone, and the data behind it (`INTENT_SITUATIONS`, the
 * `STATUS_LEGEND.SITUATIONS_*` strings) is untouched, so restoring the group
 * means rendering it again rather than rebuilding it.
 *
 * The shell is height-capped and laid out as a flex column, which is load
 * bearing rather than cosmetic. `DialogContent` is `fixed top-1/2` with a -50%
 * translate and, by default, no maximum height, so a list long enough to push
 * the shell past the viewport put everything above the fold — title,
 * description, on a short window the whole header — out of reach: a fixed
 * element does not scroll with the page, and the page's own scrollbar is locked
 * while a modal is open. Capping the shell and giving the list its own interior
 * scroller keeps the header and the close button on screen at every height, and
 * keeps doing so as `ORDER_STATUSES` grows.
 */
export function StatusLegendDialog({ isOpen, onClose }: StatusLegendDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* `max-h` bounds the shell; `min-h-0` on the scrolling child is what
          lets it actually shrink, since a flex item defaults to
          `min-height: auto` and would otherwise refuse to be smaller than its
          content and re-create the overflow. Width drops to `calc(100% - 2rem)`
          below `sm` so the dialog keeps a margin on a phone instead of running
          edge to edge, and `rounded-xl` is no longer gated behind `sm:` now
          that there are corners to see at every width. */}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl flex-col rounded-xl sm:w-full">
        <DialogHeader className="shrink-0">
          <DialogTitle>{L.TITLE}</DialogTitle>
          <DialogDescription>{L.DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <div className="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
          <ul className="flex flex-col gap-3">
            {ORDER_STATUSES.map((s) => (
              <li
                key={s.key}
                className="flex gap-3 border-b border-[var(--border-xs)] pb-3 last:border-0 last:pb-0"
              >
                <span className="font-mono mt-0.5 w-5 shrink-0 text-right text-[12px] font-bold text-[var(--t4)]">
                  {s.order}
                </span>
                <div className="min-w-0 flex-1">
                  {/* `flex-wrap` so the actor caption drops to its own line
                      instead of pushing the badge out of the card on a narrow
                      window. */}
                  <div className="flex flex-wrap items-center gap-2">
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

        <div className="flex shrink-0 justify-end pt-1">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {L.CLOSE}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
