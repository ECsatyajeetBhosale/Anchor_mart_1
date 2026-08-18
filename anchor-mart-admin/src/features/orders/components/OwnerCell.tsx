import { Badge } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/messages";
import {
  IconArrowsExchange,
  IconUserCheck,
  IconUserQuestion,
  IconUserShare,
} from "@tabler/icons-react";
import type { OwnershipState } from "../hooks/useOrderOwnership";
import type { AssignedAdmin } from "../types/ownership.types";

const M = MESSAGES.INTENTS.OWNERSHIP;

/**
 * Compact owner indicator for a table row — the three states Flow 27 expects a
 * client to distinguish: unassigned, held by you, held by someone else.
 *
 * When `onHandover` is supplied the cell becomes the entry point for reassign /
 * release. That lives here rather than as a third button in the actions column
 * for two reasons: the column is already at its width with Manage + View, and
 * handover is a change *to what this cell shows* — putting the control on the
 * value it edits is the shorter path to it.
 */
export function OwnerCell({
  assignedAdmin,
  state,
  onHandover,
}: {
  assignedAdmin: AssignedAdmin | null;
  state: OwnershipState;
  /** Offered only when the signed-in admin may actually hand the order over. */
  onHandover?: () => void;
}) {
  if (state === "unassigned" || !assignedAdmin) {
    const chip = (
      <Badge variant="neutral">
        <IconUserQuestion size={12} className="mr-1" />
        {M.UNASSIGNED}
      </Badge>
    );
    /**
     * Unassigned is a **hand-over target**, not just a state.
     *
     * `canReassign` already returns true for an admin on an unassigned order —
     * there is no current owner to match, so only the admin tier passes — but
     * this branch returned early and dropped the callback, so the one control
     * that could put a row into someone's hands was unreachable on exactly the
     * rows that needed it. Claiming it for yourself was the only route, which is
     * a different intent: "I will handle this" rather than "you will".
     */
    if (!onHandover) return chip;
    return (
      <button
        type="button"
        title={M.HANDOVER.ASSIGN_TITLE}
        aria-label={M.HANDOVER.ASSIGN_TITLE}
        /*
         * The whole chip is the target, not a small icon beside it as in the
         * assigned state below. There the name is the information and the icon
         * is the action; here the chip *is* the empty slot being filled, so it
         * is the thing to click.
         */
        className="flex items-center gap-1 rounded p-0.5 text-[var(--t4)] transition-colors hover:bg-[var(--surface-alt)] hover:text-[var(--navy-600)]"
        onClick={(e) => {
          // The row opens the detail drawer; assigning must not do both.
          e.stopPropagation();
          onHandover();
        }}
      >
        {chip}
        {/* Share, not the exchange arrows: nothing is being swapped out. */}
        <IconUserShare size={14} className="shrink-0" />
      </button>
    );
  }

  const isMine = state === "mine";
  const label = isMine ? (
    <Badge variant="success">
      <IconUserCheck size={12} className="mr-1" />
      {M.YOU}
    </Badge>
  ) : (
    <span className="text-[var(--t4)]">{assignedAdmin.name}</span>
  );

  if (!onHandover) {
    return (
      <span
        className="trunc block max-w-[150px] text-[12.5px] font-semibold"
        title={`${assignedAdmin.name} · ${assignedAdmin.email}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className="flex max-w-[170px] items-center gap-1.5 text-[12.5px] font-semibold"
      title={`${assignedAdmin.name} · ${assignedAdmin.email}`}
    >
      <span className="trunc">{label}</span>
      <button
        type="button"
        title={M.HANDOVER.TITLE}
        aria-label={M.HANDOVER.TITLE}
        className="shrink-0 rounded p-0.5 text-[var(--t4)] transition-colors hover:bg-[var(--surface-alt)] hover:text-[var(--navy-600)]"
        onClick={(e) => {
          // The row itself opens the detail drawer — a handover click must not
          // do both.
          e.stopPropagation();
          onHandover();
        }}
      >
        <IconArrowsExchange size={14} />
      </button>
    </span>
  );
}
