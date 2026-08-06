import { MESSAGES } from "@/lib/messages";
import type { AssignablePartner } from "../types/assignment.types";

const CAP = MESSAGES.PARTNERS.CAPABILITY;

/**
 * Short capability suffix for a partner picker option, e.g. `"Verify"`,
 * `"Deliver"`, or `""` when the partner can do both.
 *
 * "Both" is the default and the common shape, so it is left unlabelled — every
 * option carrying the same badge is noise. The suffix appears precisely when a
 * partner is *narrower* than expected, which is the case worth reading.
 */
export function capabilitySuffix(partner: AssignablePartner): string {
  const { canVerify, canDeliver } = partner;
  if (canVerify && canDeliver) return "";
  if (canVerify) return CAP.BADGE_VERIFY;
  if (canDeliver) return CAP.BADGE_DELIVER;
  // Refused at create and update, so this should be unreachable — but a row that
  // reaches a picker with no capability cannot be assigned anything, and saying
  // so beats an unexplained 400 after the click.
  return CAP.NONE;
}

/** One line for a partner picker: name · code · port · capability. */
export function partnerOptionLabel(partner: AssignablePartner): string {
  return [partner.name, partner.code, partner.port, capabilitySuffix(partner)]
    .filter(Boolean)
    .join(" · ");
}
