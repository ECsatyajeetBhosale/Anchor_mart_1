import { cn } from "@/lib/utils";

/**
 * The muted "why" line under a list row's status badge.
 *
 * Renders the backend's own explanation verbatim — a cancelled order's
 * `cancellation_reason`, a failed delivery's `failure_reason`, a rejected
 * intent's `rejection_reason`. It exists so `?status=delivery_failed` reads as
 * a worklist: the reassign-or-refund decision turns on *why* it failed, and
 * that answer now sits on the row instead of one drawer-open away.
 *
 * Renders **nothing** when there is no reason. A row the backend recorded no
 * explanation for shows its badge alone rather than an empty line — the absence
 * is the honest signal, and a placeholder would read as a rendering fault.
 *
 * The text is clipped to two lines *visually only*; the full string is on the
 * element's `title`, and nothing is sliced. A 255-character partner note would
 * otherwise set the height of every row in the table.
 */
export function RowReason({
  text,
  at,
  className,
}: {
  text: string;
  at?: string;
  className?: string;
}) {
  if (!text && !at) return null;
  const full = [text, at].filter(Boolean).join(" · ");
  return (
    <div
      title={full}
      className={cn(
        "line-clamp-2 max-w-[190px] text-[11px] font-medium leading-[1.35] text-[var(--t4)]",
        className,
      )}
    >
      {full}
    </div>
  );
}

export default RowReason;
