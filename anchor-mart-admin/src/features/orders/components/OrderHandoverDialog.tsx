import { IconArrowsExchange, IconUserOff, IconUserShare } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { Search } from "@/components/common/Search";
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
 * **Reassign is the owner-or-super-admin rule, not the write gate.** A
 * sub-admin cannot hand over an order they do not own, and nobody can hand over
 * an unassigned one — there is no current owner to match against, so the server
 * 403s. Both cases render as a sentence rather than a disabled form.
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

  const { canReassign } = useOrderOwnership();
  const [reassignOrder, { isLoading: isReassigning }] = useReassignOrderMutation();
  const [releaseOrder, { isLoading: isReleasing }] = useReleaseOrderMutation();

  // Only fetched while open — the picker is small and short-lived, and a stale
  // roster would offer an admin who has since been deactivated.
  const { data, isFetching } = useGetAssignableAdminsQuery(
    { page: 1, limit: PICKER_LIMIT, search },
    { skip: !isOpen },
  );

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
  const allowed = canReassign(assignedAdmin);
  const busy = isReassigning || isReleasing;

  const handleReassign = async () => {
    const target = admins.find((a) => a.id === selectedId);
    if (!target) return;
    try {
      await reassignOrder({ orderId, admin_id: selectedId }).unwrap();
      onClose();
      toast.success(H.REASSIGNED(target.name));
    } catch (error) {
      // Two shapes here: `{detail}` for the authorisation/order errors, and a
      // field body for `admin_id` — including the "no active admin" case, which
      // is a 404 carrying the field shape rather than a 400.
      toast.error(getApiMessage(error) ?? H.REASSIGN_FAILED);
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
            <IconArrowsExchange size={18} className="text-[var(--navy-600)]" />
            {H.TITLE}
          </DialogTitle>
          <DialogDescription>{H.SUBTITLE(orderRef)}</DialogDescription>
        </DialogHeader>

        {isUnassigned ? (
          <p className="fg-hint mt-2">{H.UNASSIGNED_NOTICE}</p>
        ) : !allowed ? (
          <p className="fg-hint mt-2">{H.NOT_OWNER}</p>
        ) : (
          <div className="mt-2 flex flex-col gap-5">
            {/* Reassign */}
            <section>
              <div className="sec-label">{H.REASSIGN_SECTION}</div>
              <p className="fg-hint mb-3">{H.REASSIGN_HINT}</p>

              <div className="mb-3">
                <Search
                  value={search}
                  onSearch={setSearch}
                  placeholder={H.SEARCH_PLACEHOLDER}
                  debounceMs={300}
                  loading={isFetching}
                  className="w-full"
                  style={{ width: "100%" }}
                />
              </div>

              <FormField label={H.PICKER_LABEL}>
                <DropdownSelect
                  options={options}
                  value={selectedId}
                  onValueChange={setSelectedId}
                  width="100%"
                  placeholder={isFetching ? H.LOADING_ADMINS : H.PICKER_PLACEHOLDER}
                  disabled={busy || (!isFetching && options.length === 0)}
                />
              </FormField>
              {!isFetching && options.length === 0 && <p className="fg-hint">{H.NO_ADMINS}</p>}

              <div className="mt-3 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  loading={isReassigning}
                  disabled={busy || !selectedId}
                  onClick={handleReassign}
                >
                  <IconUserShare size={15} className="mr-1" />
                  {isReassigning ? H.REASSIGNING : H.REASSIGN}
                </Button>
              </div>
            </section>

            {/* Release — the other way out, and the one that needs no target. */}
            <section className="border-t border-[var(--border-sm)] pt-4">
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
