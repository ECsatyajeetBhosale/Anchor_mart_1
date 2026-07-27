import { DropdownSelect } from "@/components/common/DropdownSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useAssignOrderMutation,
  useGetAssignablePartnersQuery,
  useGetOrderAssignmentsQuery,
} from "@/features/assignments";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconShieldCheck, IconTruckDelivery } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { useClaimOrderMutation } from "../api/orderOwnershipApi";
import { useOrderOwnership } from "../hooks/useOrderOwnership";
import type { OrderAssignment } from "../types/order.types";
import type { AssignedAdmin } from "../types/ownership.types";

const M = MESSAGES.ORDERS.ASSIGN_PARTNER;

/** Terminal statuses — no partner can be assigned once the order is closed. */
const CLOSED_STATUSES = new Set(["delivered", "cancelled", "refunded", "intent_rejected"]);

/**
 * Awaiting payment: verification is done and delivery waits for the money, so
 * the order needs neither a verifier nor a deliverer (Flow 28 —
 * `required_capability` returns nothing for this status).
 */
const UNPAID_STATUS = "payment_pending";

export interface OrderAssignPartnerSectionProps {
  orderId: string;
  /** Raw order status (e.g. "order_confirmed") — drives the stage gate. */
  status: string;
  /** The order's live assignment, or null when no partner holds it. */
  activeAssignment?: OrderAssignment | null;
  /** Owning admin (Flow 27); undefined when the row didn't load it. */
  assignedAdmin?: AssignedAdmin | null;
}

/**
 * Flow 28 · APIs 11–12 — assign or reassign the delivery partner on an order.
 * Self-contained section injected into the shared `OrderDetailDrawer` via its
 * `detailSlot`, so the common drawer stays generic.
 *
 * Assignment is a governed order write: it runs through the Flow 27 gate, so a
 * sub-admin must claim the order first (offered inline). Reassigning an order
 * that another partner already holds returns 409 `requires_confirmation`; the
 * next click re-sends with `confirm: true`.
 */
export function OrderAssignPartnerSection({
  orderId,
  status,
  activeAssignment,
  assignedAdmin,
}: OrderAssignPartnerSectionProps) {
  const { isSuperAdmin, stateOf } = useOrderOwnership();
  const [assignOrder, { isLoading: assigning }] = useAssignOrderMutation();
  const [claimOrder, { isLoading: claiming }] = useClaimOrderMutation();

  const current = activeAssignment?.is_active ? activeAssignment : null;

  // All local state is per-order. The caller keys this component on the order
  // id, so switching orders in the drawer remounts it and resets the picker —
  // no reset effect needed.
  const [selectedId, setSelectedId] = useState("");
  // Flipped by a 409 `requires_confirmation`, so the next click reassigns.
  const [forceReassign, setForceReassign] = useState(false);
  // Claimed in-session — list rows rarely carry `assigned_admin`, so a
  // successful claim here grants write access locally.
  const [claimedLocal, setClaimedLocal] = useState(false);

  // Gate, mirroring the backend's evaluation order: status → ownership.
  const normalised = status.trim().toLowerCase();
  const closed = CLOSED_STATUSES.has(normalised);
  const unpaid = normalised === UNPAID_STATUS;
  const ownState = stateOf(assignedAdmin);
  const ownershipKnown = assignedAdmin !== undefined;
  // Another admin owns it and we're not super — a hard block; claiming would 409.
  const blockedByOther = ownershipKnown && !isSuperAdmin && ownState === "other";
  const canWrite = isSuperAdmin || ownState === "mine" || claimedLocal;
  const showClaim = !closed && !unpaid && !blockedByOther && !canWrite;

  const stageBlocked = closed || unpaid;
  const writeDisabled = assigning || claiming || stageBlocked || blockedByOther || showClaim;

  // `order_id` is deliberately omitted: scoping the picker to the order filters
  // by port + required capability, which returns an empty list while partner
  // capability data is incomplete. API 12 enforces the rule regardless.
  const { data: partners = [], isLoading: partnersLoading } = useGetAssignablePartnersQuery(
    {},
    { skip: stageBlocked },
  );

  // Flow 28 API 13 — the full trail, including assignments closed as
  // `reassigned`. The order's `active_assignment` alone can't explain a
  // hand-over, and on a delivered order this is the only record left.
  const { data: history = [], isFetching: historyLoading } = useGetOrderAssignmentsQuery(orderId, {
    skip: !orderId,
  });
  // The active row is already shown above as "current" — don't repeat it.
  const pastAssignments = history.filter((h) => !h.isActive);

  const options = partners.map((p) => ({
    value: p.deliveryPartnerId,
    label: `${p.name}${p.code ? ` · ${p.code}` : ""}${p.port ? ` · ${p.port}` : ""}`,
  }));
  const placeholder = partnersLoading
    ? M.PICK_LOADING
    : options.length === 0
      ? M.PICK_EMPTY
      : M.PICK_PLACEHOLDER;

  // A closed order shows no hint: there are no controls to explain, and the
  // status badge already says the order is done. `payment_pending` does keep
  // its hint — assignment becomes possible there once the sailor pays.
  const hint = closed
    ? null
    : unpaid
      ? M.UNPAID
      : blockedByOther
        ? M.OTHER_ADMIN
        : showClaim
          ? M.CLAIM_FIRST
          : null;

  const handleClaim = async () => {
    try {
      const res = await claimOrder(orderId).unwrap();
      console.log("[assign-order] claim succeeded", res);
      setClaimedLocal(true);
      toast.success(res.message ?? M.CLAIM_SUCCESS);
    } catch (error) {
      // Claiming is the precondition for assigning, so a failure here explains
      // a later 409 from assign-order.
      const reason = getApiMessage(error, { labelFields: false });
      console.error("[assign-order] claim failed", {
        status: (error as { status?: unknown })?.status,
        data: (error as { data?: unknown })?.data,
        message: reason,
        orderId,
        error,
      });
      toast.error(reason ?? M.OTHER_ADMIN);
    }
  };

  /**
   * Flow 28 API 12. `confirm` is true for an explicit reassign, or once a prior
   * 409 flipped `forceReassign`. `deliver_by` is omitted so the SLA policy
   * computes the deadline.
   */
  const handleAssign = async () => {
    if (!selectedId) {
      toast.error(M.SELECT_FIRST);
      return;
    }
    const partnerName = options.find((o) => o.value === selectedId)?.label ?? "";
    const isReassign = !!current;
    const body = {
      order_id: orderId,
      delivery_partner_id: selectedId,
      confirm: isReassign || forceReassign,
    };
    // Traced end-to-end: the picker's capability/port scoping is relaxed, so an
    // assignment can legitimately be rejected server-side. Logging the exact
    // request and the raw failure makes those rejections diagnosable.
    console.log("[assign-order] POST /superadmin/partner/assign-order/", {
      body,
      partner: { id: selectedId, label: partnerName },
      order: { id: orderId, status },
      currentAssignment: current ? { partner: current.partner_name, status: current.status } : null,
    });
    try {
      const res = await assignOrder(body).unwrap();
      console.log("[assign-order] success", res);
      toast.success(isReassign ? M.REASSIGNED(partnerName) : M.ASSIGNED(partnerName));
      setSelectedId("");
      setForceReassign(false);
    } catch (err) {
      const e = err as { status?: unknown; data?: { requires_confirmation?: boolean } };
      // Field errors here are about the partner the admin just picked (e.g. no
      // delivery capability), so the backend's sentence stands on its own —
      // `labelFields: false` drops the `delivery_partner_id:` prefix.
      const reason = getApiMessage(err, { labelFields: false });
      console.error("[assign-order] failed", {
        status: e?.status,
        data: e?.data,
        message: reason,
        body,
        error: err,
      });
      if (e?.status === 409 && e?.data?.requires_confirmation) {
        setForceReassign(true);
        toast.error(M.CONFIRM_REASSIGN);
        return;
      }
      toast.error(reason ?? M.FAILED);
    }
  };

  const actionLabel = current
    ? assigning
      ? M.REASSIGNING
      : M.REASSIGN
    : assigning
      ? M.ASSIGNING
      : M.ASSIGN;

  return (
    <div className="mt16">
      <div className="sec-label flex items-center gap-1.5">
        <IconTruckDelivery size={13} className="inline" />
        {M.SECTION}
      </div>

      {/* Who currently holds the order */}
      <div className="detail-kv">
        <div className="detail-k">{M.SECTION}</div>
        <div className="detail-v">
          {current ? (
            <div>
              <div className="td-p">{current.partner_name}</div>
              <div className="td-m">
                {[current.partner_code, current.status_display].filter(Boolean).join(" · ")}
              </div>
            </div>
          ) : (
            <span className="c4">{M.NONE}</span>
          )}
        </div>
      </div>

      {/* The assign controls exist only while the order can actually take a
          partner. On a closed order (delivered / cancelled / refunded) there is
          nothing to assign, so the picker is omitted entirely rather than shown
          disabled — only the record of who delivered it remains. */}
      {!stageBlocked && (
        <>
          {/* Claim gate — a sub-admin must own the order before assigning. */}
          {showClaim && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={handleClaim}
              disabled={claiming}
            >
              <IconShieldCheck size={15} />
              {claiming ? M.CLAIMING : M.MANAGE_ORDER}
            </Button>
          )}

          {/* Picker + action */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1">
              <DropdownSelect
                value={selectedId}
                onValueChange={setSelectedId}
                placeholder={placeholder}
                options={options}
                width="100%"
                disabled={writeDisabled || partnersLoading}
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAssign}
              disabled={writeDisabled || !selectedId}
            >
              {actionLabel}
            </Button>
          </div>
        </>
      )}

      {hint && <div className="fg-hint mt-1.5">{hint}</div>}

      {/* Assignment history — only when there is something the current
          assignment doesn't already say. */}
      {(historyLoading || pastAssignments.length > 0) && (
        <div className="mt-3">
          <div className="fg-label mb-1.5">{MESSAGES.ORDERS.ASSIGNMENT_HISTORY}</div>
          {historyLoading ? (
            <div className="td-m">{MESSAGES.ORDERS.ASSIGNMENT_HISTORY_LOADING}</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {pastAssignments.map((row) => (
                <div className="flex items-center gap-2" key={row.id}>
                  <div className="min-w-0 flex-1">
                    <div className="trunc text-[12.5px] font-semibold text-[var(--t2)]">
                      {row.partnerName}
                      {row.partnerCode ? ` · ${row.partnerCode}` : ""}
                    </div>
                    {row.assignedAt && <div className="xs c4">{row.assignedAt}</div>}
                  </div>
                  <Badge variant="neutral">{row.statusDisplay || row.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OrderAssignPartnerSection;
