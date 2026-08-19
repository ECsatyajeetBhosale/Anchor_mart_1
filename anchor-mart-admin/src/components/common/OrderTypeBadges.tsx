import { Badge } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/messages";
import { IconAlertTriangle, IconBolt, IconClockBolt } from "@tabler/icons-react";

const M = MESSAGES.ORDERS.TYPE_FILTER;

export interface OrderTypeBadgesProps {
  isExpress?: boolean;
  isEmergency?: boolean;
  /**
   * The sailor's fastest-delivery opt-in — a **third independent flag**, not a
   * type. Express (12h) is a checkout tier and emergency (24h) is a cargo
   * kind; this is a 24h deadline the sailor can add to any order, including a
   * regular one that would otherwise have no hard deadline at all.
   *
   * Opt-in: callers that omit it render exactly as before, badge for badge.
   */
  isFastest?: boolean;
}

/**
 * What kind of order this row is — Express, Marine Emergency, both, or Regular.
 *
 * **Both is a real state, not an edge case.** `is_express` and `is_emergency`
 * are independent booleans and 9 of the current 715 orders carry both, which is
 * why this renders two badges rather than resolving to a single "type". Picking
 * one would make the column disagree with the filter chips above it, where the
 * same order legitimately appears under Express *and* Marine Emergency.
 *
 * Regular — neither flag — is labelled rather than left blank. It is the large
 * majority (546 of 715), so an empty cell would be ambiguous between "regular"
 * and "not loaded", on a column whose whole purpose is to state the type.
 */
export function OrderTypeBadges({ isExpress, isEmergency, isFastest }: OrderTypeBadgesProps) {
  if (!isExpress && !isEmergency && !isFastest) {
    return <Badge variant="neutral">{M.REGULAR}</Badge>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isExpress && (
        <Badge variant="teal">
          <IconBolt size={12} />
          {M.EXPRESS}
        </Badge>
      )}
      {isEmergency && (
        <Badge variant="danger">
          <IconAlertTriangle size={12} />
          {M.EMERGENCY}
        </Badge>
      )}
      {/* Still labelled Regular when it is one — the deadline is added to the
          type, it does not replace it. Dropping the label here would leave a
          fastest-delivery regular order looking like a type the filter chips
          have no option for. */}
      {!isExpress && !isEmergency && <Badge variant="neutral">{M.REGULAR}</Badge>}
      {isFastest && (
        <Badge variant="amber">
          <IconClockBolt size={12} />
          {M.FASTEST}
        </Badge>
      )}
    </div>
  );
}

export default OrderTypeBadges;
