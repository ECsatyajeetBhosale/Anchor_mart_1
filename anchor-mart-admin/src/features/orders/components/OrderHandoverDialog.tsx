import { IconArrowsExchange, IconUserOff, IconUserShare } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import {
  useGetAssignableAdminsQuery,
  useReassignOrderMutation,
  useReleaseOrderMutation,
} from "../api/orderOwnershipApi";
import { useOrderOwnership } from "../hooks/useOrderOwnership";
import type { AssignedAdmin } from "../types/ownership.types";

const M = MESSAGES.INTENTS.OWNERSHIP;
const H = M.HANDOVER;

/** One page of admins is plenty for a picker; search narrows beyond it. */
const PICKER_LIMIT = 50;

export interface OrderHandoverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  /** Display reference for the copy — order number, falling back to the id. */
  orderRef: string;
  /** The order's current owner; null when unassigned. */
  assignedAdmin: AssignedAdmin | null;
}

/**
 * Flow 27 — change who is accountable for an order.
 *
 * Two actions in one dialog because they answer the same question ("this
 * shouldn't be mine") with different destinations, and separating them into two
 * entry points made the owner cell carry three buttons.
 *
 * The two halves have **different gates**, so they are asked separately:
 *
 *  - **Reassign is Admin-only.** Choosing the next owner is an assignment, and
 *    assignment is a decision an Admin makes — for themselves or for an
 *    operator. It used to also pass the current owner, which let an Operator
 *    push an order onto a colleague who never agreed to take it.
 *  - **Release stays with the owner.** It names no recipient, so it grants
 *    nobody anything; without it an Operator handed an order in error would be
 *    stuck with it, now that self-claim is gone.
 *
 * An Operator therefore sees Release alone, and only on an order that is
 * already theirs. Neither half applies → a sentence, not a disabled form.
 *
 * With no current owner the wording changes throughout (assign, not hand over)
 * and Release is absent: it returns an order to the pool this one is already
 * in.
 */
export function OrderHandoverDialog({
  isOpen,
  onClose,
  orderId,
  orderRef,
  assignedAdmin,
}: OrderHandoverDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [confirmingRelease, setConfirmingRelease] = useState(false);

  const { canReassign, canRelease } = useOrderOwnership();
  const [reassignOrder, { isLoading: isReassigning }] = useReassignOrderMutation();
  const [releaseOrder, { isLoading: isReleasing }] = useReleaseOrderMutation();

  // Only fetched while open — the picker is small and short-lived, and a stale
  // roster would offer an admin who has since been deactivated.
  const { data, isFetching } = useGetAssignableAdminsQuery(
    { page: 1, limit: PICKER_LIMIT, search },
    { skip: !isOpen },
  );

  /**
   * True when the roster is longer than one page of the shared paginator, whose
   * ceiling is 50. Eleven admins today, so this is quiet — but it turns a silent
   * truncation into a visible one the day it stops being.
   */
  const isTruncated = !!data && data.admins.length < data.count;

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedId("");
      setConfirmingRelease(false);
    }
  }, [isOpen]);

  const admins = data?.admins ?? [];
  // The current owner cannot receive their own order — reassigning to them is a
  // no-op 200, which reads as success while nothing happened.
  const options = admins
    .filter((a) => a.id !== assignedAdmin?.id)
    .map((a) => ({
      value: a.id,
      label: a.email && a.email !== a.name ? `${a.name} · ${a.email}` : a.name,
    }));

  const isUnassigned = !assignedAdmin;
  // Admin-only: picking who an order goes to.
  const showReassign = canReassign(assignedAdmin);
  // Owner-or-admin, and only where there is something to give up.
  const showRelease = !isUnassigned && canRelease(assignedAdmin);
  const allowed = showReassign || showRelease;
  const busy = isReassigning || isReleasing;

  const handleReassign = async () => {
    const target = admins.find((a) => a.id === selectedId);
    if (!target) return;
    try {
      await reassignOrder({ orderId, admin_id: selectedId }).unwrap();
      onClose();
      toast.success(isUnassigned ? H.ASSIGNED(target.name) : H.REASSIGNED(target.name));
    } catch (error) {
      // Two shapes here: `{detail}` for the authorisation/order errors, and a
      // field body for `admin_id` — including the "no active admin" case, which
      // is a 404 carrying the field shape rather than a 400.
      toast.error(getApiMessage(error) ?? (isUnassigned ? H.ASSIGN_FAILED : H.REASSIGN_FAILED));
    }
  };

  const handleRelease = async () => {
    try {
      await releaseOrder(orderId).unwrap();
      setConfirmingRelease(false);
      onClose();
      toast.success(H.RELEASED);
    } catch (error) {
      toast.error(getApiMessage(error) ?? H.RELEASE_FAILED);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUnassigned ? (
              <IconUserShare size={18} className="text-[var(--navy-600)]" />
            ) : (
              <IconArrowsExchange size={18} className="text-[var(--navy-600)]" />
            )}
            {isUnassigned ? H.ASSIGN_DIALOG_TITLE : H.TITLE}
          </DialogTitle>
          <DialogDescription>
            {isUnassigned ? H.ASSIGN_SUBTITLE(orderRef) : H.SUBTITLE(orderRef)}
          </DialogDescription>
        </DialogHeader>

        {/*
          Nothing to offer: an Operator looking at an order that is not theirs,
          or at an unassigned one. The unassigned flag picks which refusal to
          explain — both now end at "an admin decides", because claiming it for
          yourself is no longer a route out of either.
        */}
        {!allowed ? (
          <p className="fg-hint mt-2">{isUnassigned ? H.UNASSIGNED_NOTICE : H.NOT_OWNER}</p>
        ) : (
          <div className="mt-2 flex flex-col gap-5">
            {/* Reassign — or, with no current owner, assign. Admin only. */}
            {showReassign && (
              <section>
                <div className="sec-label">
                  {isUnassigned ? H.ASSIGN_SECTION : H.REASSIGN_SECTION}
                </div>
                <p className="fg-hint mb-3">{isUnassigned ? H.ASSIGN_HINT : H.REASSIGN_HINT}</p>

                {/*
                One control, not a search box stacked above a picker. Separated,
                the two read as independent filters — and the box appeared to
                narrow the *dialog* rather than the list inside the field it sat
                above. The search belongs to the picker, so it opens with it.

                Not disabled on an empty list, either: the list is empty
                *because of* the query, and disabling the field would take away
                the only control that could clear it.
              */}
                <FormField label={isUnassigned ? H.ASSIGN_PICKER_LABEL : H.PICKER_LABEL}>
                  <DropdownSelect
                    options={options}
                    value={selectedId}
                    onValueChange={setSelectedId}
                    width="100%"
                    placeholder={isFetching && !search ? H.LOADING_ADMINS : H.PICKER_PLACEHOLDER}
                    disabled={busy}
                    searchable
                    searchPlaceholder={H.SEARCH_PLACEHOLDER}
                    // Server-side: the roster is paginated at 50, so a local
                    // filter could only ever search the page in hand.
                    onSearchChange={setSearch}
                    searchLoading={isFetching}
                    emptyMessage={H.NO_ADMINS}
                  />
                </FormField>
                {/*
                The picker asks for the paginator's ceiling (50) and DRF clamps
                silently above it, so a larger roster would truncate with nothing
                to show for it. `count` is the true total, so the two disagreeing
                is the signal — and the answer is the search box above, which
                filters server-side across the whole roster rather than this page.
              */}
                {isTruncated && (
                  <p className="fg-hint">{H.PICKER_TRUNCATED(options.length, data?.count ?? 0)}</p>
                )}

                <div className="mt-3 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={isReassigning}
                    disabled={busy || !selectedId}
                    onClick={handleReassign}
                  >
                    <IconUserShare size={15} className="mr-1" />
                    {isUnassigned
                      ? isReassigning
                        ? H.ASSIGNING
                        : H.ASSIGN
                      : isReassigning
                        ? H.REASSIGNING
                        : H.REASSIGN}
                  </Button>
                </div>
              </section>
            )}

            {/*
              Release — the other way out, and the one that needs no target.
              Absent when unassigned: it returns an order to the pool, and this
              one never left it. For an Operator this is the whole dialog, so
              the divider above it only appears when there is a section above.
            */}
            {showRelease && (
              <section
                className={showReassign ? "border-t border-[var(--border-sm)] pt-4" : undefined}
              >
                <div className="sec-label">{H.RELEASE_SECTION}</div>
                <p className="fg-hint mb-3">{H.RELEASE_HINT}</p>
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={isReleasing}
                    disabled={busy}
                    onClick={() => setConfirmingRelease(true)}
                  >
                    <IconUserOff size={15} className="mr-1" />
                    {isReleasing ? H.RELEASING : H.RELEASE}
                  </Button>
                </div>
              </section>
            )}
          </div>
        )}
      </DialogContent>

      <ConfirmDialog
        isOpen={confirmingRelease}
        onClose={() => setConfirmingRelease(false)}
        onConfirm={handleRelease}
        isLoading={isReleasing}
        title={H.CONFIRM_RELEASE_TITLE}
        description={H.CONFIRM_RELEASE_MESSAGE}
        confirmText={H.RELEASE}
        loadingText={H.RELEASING}
      />
    </Dialog>
  );
}

export default OrderHandoverDialog;
