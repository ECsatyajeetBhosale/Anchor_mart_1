import { Badge } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/messages";
import { type PartnerRequirement, partnerRequirement } from "@/lib/partnerRequirement";

const M = MESSAGES.COMMON.PARTNER_REQUIREMENT;

/**
 * The outstanding partner requirement on a list row, from
 * `needs_verifier_partner` / `needs_delivery_partner` alone.
 *
 * It exists because the PARTNER column could not answer the question it looked
 * like it was answering. A paid order whose only active assignment was a
 * finished verification rendered the verifier's name — reading as "a delivery
 * partner is on this" while nobody was taking the goods to the vessel.
 *
 * Nothing is rendered when nothing is outstanding: `none` is the common case
 * and a chip on every row would drown the two that need one. `unknown` **is**
 * rendered — the backend documents these as booleans that are never absent, so
 * a missing one is surfaced rather than read as "nothing needed".
 */
export function PartnerRequirementBadge({
  needsVerifierPartner,
  needsDeliveryPartner,
  className,
}: {
  needsVerifierPartner: boolean | null;
  needsDeliveryPartner: boolean | null;
  className?: string;
}) {
  const requirement: PartnerRequirement = partnerRequirement(
    needsVerifierPartner,
    needsDeliveryPartner,
  );
  if (requirement === "none") return null;

  const label =
    requirement === "verify"
      ? M.NEEDS_VERIFIER
      : requirement === "deliver"
        ? M.NEEDS_DELIVERY
        : M.UNKNOWN;

  return (
    <Badge
      variant={requirement === "unknown" ? "neutral" : "warning"}
      className={className ?? "mt-1 h-[22px] text-[10px]"}
      title={requirement === "unknown" ? M.UNKNOWN_HINT : undefined}
    >
      {label}
    </Badge>
  );
}

export default PartnerRequirementBadge;
