import { Badge } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/messages";
import { IconAlertTriangle, IconBolt } from "@tabler/icons-react";

const M = MESSAGES.ORDERS.TYPE_FILTER;

export interface OrderTypeBadgesProps {
  isExpress?: boolean;
  isEmergency?: boolean;
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
export function OrderTypeBadges({ isExpress, isEmergency }: OrderTypeBadgesProps) {
  if (!isExpress && !isEmergency) {
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
    </div>
  );
}

export default OrderTypeBadges;
