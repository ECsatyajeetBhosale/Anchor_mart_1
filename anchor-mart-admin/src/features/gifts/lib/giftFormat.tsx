import { Badge } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/messages";

import { dayText, sgtDaysUntil } from "@/lib/dates";
import type { GiftHandoverStatus } from "../types/gift.types";

const M = MESSAGES.GIFTS;
const D = M.DETAIL;

/**
 * Badge per handover state.
 *
 * `revoked` and `void` are here for completeness only — the API nulls them and
 * `toGift` drops them a second time, so a gift in either state never reaches
 * this component. A lookup covering every member of the union is still what
 * keeps the next added state from silently reading as one of these.
 */
export const HANDOVER_BADGE: Record<
  GiftHandoverStatus,
  { variant: "amber" | "info" | "success" | "neutral"; label: string }
> = {
  pending: { variant: "amber", label: D.HANDOVER_PENDING },
  collected: { variant: "info", label: D.HANDOVER_COLLECTED },
  delivered: { variant: "success", label: D.HANDOVER_DELIVERED },
  revoked: { variant: "neutral", label: D.HANDOVER_REVOKED },
  void: { variant: "neutral", label: D.HANDOVER_VOID },
};

/** A departure this close makes the decision urgent. */
const URGENT_DAYS = 2;

/**
 * Short readable day, e.g. "Aug 12, 2026". Blank stays a dash. Accepts the SGT
 * display string (`"… 07:33 PM SGT"`, which `new Date` rejects) or ISO.
 */
export function shortDate(value: string | null): string {
  return value ? dayText(value) : M.DASH;
}

/**
 * Whole Singapore days from today until `value`; null when it isn't a usable
 * date. Read with `toInstant`, so the SGT suffix no longer blanks the chip.
 */
export function daysUntil(value: string | null): number | null {
  return sgtDaysUntil(value);
}

/**
 * Departure urgency chip.
 *
 * The port-call window is the load-bearing input for this whole screen — Flow 20
 * hands timing judgment to the admin rather than encoding a rule, so the window
 * has to be visible and a vessel about to sail has to stand out. A gift rides an
 * order that must still be delivered, so "sails in 1d" is a different decision
 * from "sails in 9d".
 */
export function DepartureChip({ departure }: { departure: string | null }) {
  const days = daysUntil(departure);
  if (days === null) return null;

  if (days < 0) {
    return (
      <Badge variant="neutral" className="h-[20px] text-[12px]">
        {M.SAILED}
      </Badge>
    );
  }

  const urgent = days <= URGENT_DAYS;
  return (
    <Badge
      variant={urgent ? "danger" : "neutral"}
      className="h-[20px] text-[12px]"
      title={urgent ? M.SAILS_SOON_TITLE : undefined}
    >
      {days === 0 ? M.SAILS_TODAY : M.SAILS_IN(days)}
    </Badge>
  );
}

/**
 * Gift progress for one vessel: a bar plus its ratio.
 *
 * Reads faster than a number alone when scanning a list — the admin is looking
 * for vessels with headroom left, and a part-filled bar says that at a glance.
 */
export function GiftProgress({
  gifted,
  total,
  label,
}: {
  gifted: number;
  total: number;
  /** Optional caption. Without one the bar is a bare ratio the reader must decode. */
  label?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((gifted / total) * 100)) : 0;
  const complete = total > 0 && gifted >= total;
  return (
    <div className="min-w-[110px]">
      {label && <div className="info-lbl mb-1">{label}</div>}
      <div className="mb-1.5 text-[12px] font-extrabold text-[var(--t2)] tabular-nums">
        {M.GIFTED_RATIO(gifted, total)}
      </div>
      <div className="progress sm">
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            background: complete ? "var(--success-icon)" : "var(--amber-500)",
          }}
        />
      </div>
    </div>
  );
}

/**
 * Departure as a labelled column value: the date normally, and a red countdown
 * only once it is close enough to change the decision. A permanent chip on
 * every row reads as decoration; one that appears only when it matters reads as
 * a warning.
 */
export function DepartureValue({ departure }: { departure: string | null }) {
  const days = daysUntil(departure);
  if (days !== null && days <= URGENT_DAYS) {
    return <DepartureChip departure={departure} />;
  }
  return <span className="td-m">{shortDate(departure)}</span>;
}
