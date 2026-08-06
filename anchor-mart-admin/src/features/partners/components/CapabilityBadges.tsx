import { Badge } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/messages";

const M = MESSAGES.PARTNERS.CAPABILITY;

export interface CapabilityBadgesProps {
  canVerify: boolean;
  canDeliver: boolean;
  /** Collapses "Verify" + "Deliver" into one "Verify & Deliver" pill where space is tight. */
  compact?: boolean;
}

/**
 * A partner's capability as badges (Flow 28 · `can_verify` / `can_deliver`).
 *
 * Two independent flags with three valid shapes — verify-only, deliver-only, and
 * both. "Both" is the default and the common case, so it is rendered as two
 * ordinary pills rather than flagged as special.
 *
 * Neither flag set is **impossible** — the backend refuses it at create and
 * update with a 400 — but it is still rendered, and rendered as a warning: if
 * such a row ever reaches the screen it means data the assignment engine cannot
 * use, and silently drawing nothing would hide it.
 */
export function CapabilityBadges({ canVerify, canDeliver, compact }: CapabilityBadgesProps) {
  if (!canVerify && !canDeliver) {
    return <Badge variant="danger">{M.NONE}</Badge>;
  }

  if (compact && canVerify && canDeliver) {
    return <Badge variant="teal">{M.BADGE_BOTH}</Badge>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {canVerify && <Badge variant="teal">{M.BADGE_VERIFY}</Badge>}
      {canDeliver && <Badge variant="navy">{M.BADGE_DELIVER}</Badge>}
    </div>
  );
}

export default CapabilityBadges;
