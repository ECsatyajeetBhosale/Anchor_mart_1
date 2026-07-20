import { Badge } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/messages";
import { IconUserCheck, IconUserQuestion } from "@tabler/icons-react";
import type { OwnershipState } from "../hooks/useOrderOwnership";
import type { AssignedAdmin } from "../types/ownership.types";

const M = MESSAGES.INTENTS.OWNERSHIP;

/**
 * Compact owner indicator for a table row — the three states Flow 27 expects a
 * client to distinguish: unassigned, held by you, held by someone else.
 */
export function OwnerCell({
  assignedAdmin,
  state,
}: {
  assignedAdmin: AssignedAdmin | null;
  state: OwnershipState;
}) {
  if (state === "unassigned" || !assignedAdmin) {
    return (
      <Badge variant="neutral">
        <IconUserQuestion size={12} className="mr-1" />
        {M.UNASSIGNED}
      </Badge>
    );
  }

  const isMine = state === "mine";
  return (
    <span
      className="trunc block max-w-[150px] text-[12.5px] font-semibold"
      title={`${assignedAdmin.name} · ${assignedAdmin.email}`}
    >
      {isMine ? (
        <Badge variant="success">
          <IconUserCheck size={12} className="mr-1" />
          {M.YOU}
        </Badge>
      ) : (
        <span className="text-[var(--t4)]">{assignedAdmin.name}</span>
      )}
    </span>
  );
}
