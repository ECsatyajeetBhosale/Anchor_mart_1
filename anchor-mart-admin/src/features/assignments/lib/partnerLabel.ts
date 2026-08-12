import { MESSAGES } from "@/lib/messages";
import type { AssignablePartner } from "../types/assignment.types";

const CAP = MESSAGES.PARTNERS.CAPABILITY;

/**
 * The partner's capability, always stated in full: `"Verify & Deliver"`,
 * `"Verify"`, or `"Deliver"`.
 *
 * Both flags are spelled out even for the common both-capable case. An earlier
 * version left "both" unlabelled on the theory that a badge every row shares is
 * noise — but the admin choosing a partner is choosing *for a specific job*, and
 * an unlabelled row read as "capability unknown" rather than "can do everything".
 * Saying it costs one word and removes the guess.
 */
export function capabilityLabel(partner: AssignablePartner): string {
  const { canVerify, canDeliver } = partner;
  if (canVerify && canDeliver) return CAP.BADGE_BOTH;
  if (canVerify) return CAP.BADGE_VERIFY;
  if (canDeliver) return CAP.BADGE_DELIVER;
  // Refused at create and update, so this should be unreachable — but a row that
  // reaches a picker with no capability cannot be assigned anything, and saying
  // so beats an unexplained 400 after the click.
  return CAP.NONE;
}

/**
 * One line for a partner picker: **email · capability**.
 *
 * Deliberately just those two. It previously read `name · code · port ·
 * capability`, but the names in this data are neither unique nor identifying
 * ("Partner Bhai" and "Abhishek Kuwar" each appear twice), the partner code is
 * an internal reference the admin does not recognise, and `port` is null on most
 * rows. The email is the one field that identifies a partner unambiguously, and
 * the capability is the only other thing that decides whether this partner can
 * take this job.
 */
export function partnerOptionLabel(partner: AssignablePartner): string {
  return [partner.email || partner.name, capabilityLabel(partner)].filter(Boolean).join(" · ");
}
