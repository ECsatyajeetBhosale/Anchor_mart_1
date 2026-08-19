import { Badge } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/messages";
import { IconMapPin } from "@tabler/icons-react";
import type { IntentLocationChange } from "../types/intent.types";

const M = MESSAGES.INTENTS.LOCATION_CHANGE;

/** `"450.00"` → `"$450.00"`; anything unparseable is shown as sent. */
function money(amount: string | null): string | null {
  if (!amount) return null;
  const n = Number(amount);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : amount;
}

/**
 * The row's delivery-move state — one badge, or nothing when the sailor has not
 * moved.
 *
 * Colour carries the only distinction that matters at a glance: **warning means
 * this desk owes an action** (a reported move to price or dismiss, or a
 * surcharge nobody has paid), while info and neutral are states to be aware of
 * and not act on. That is why `report_pending` and `delta_pending` share a
 * tone despite belonging to different halves of the flow.
 *
 * Deliberately not driven by the orders screen's `has_location_request`: that
 * is a bare boolean covering `report_pending` alone, so a badge built from it
 * could not tell "needs pricing" from "already priced, awaiting payment".
 */
export interface LocationChangeBadgeProps {
  change: IntentLocationChange | null;
  className?: string;
}

export function LocationChangeBadge({ change, className }: LocationChangeBadgeProps) {
  if (!change) return null;

  const amount = money(change.amount);
  const { label, variant } = (() => {
    switch (change.state) {
      case "report_pending":
        return { label: M.REPORT_PENDING, variant: "warning" as const };
      case "report_dismissed":
        return { label: M.REPORT_DISMISSED, variant: "neutral" as const };
      case "delta_pending":
        return {
          label: amount ? M.DELTA_PENDING(amount) : M.DELTA_NO_AMOUNT,
          variant: "warning" as const,
        };
      case "delta_initiated":
        return {
          label: amount ? M.DELTA_INITIATED(amount) : M.DELTA_NO_AMOUNT,
          variant: "info" as const,
        };
    }
  })();

  return (
    <Badge variant={variant} className={className ?? "h-[22px] text-[10px]"}>
      <IconMapPin size={12} />
      {label}
    </Badge>
  );
}

export default LocationChangeBadge;
