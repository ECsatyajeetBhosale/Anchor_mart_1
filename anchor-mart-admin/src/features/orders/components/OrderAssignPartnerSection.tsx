import { DropdownSelect } from "@/components/common/DropdownSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  partnerOptionLabel,
  useAssignOrderMutation,
  useGetOrderAssignmentsQuery,
  useGetPartnersByCapabilityQuery,
} from "@/features/assignments";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { type PartnerRequirement, partnerRequirement } from "@/lib/partnerRequirement";
import { IconTruckDelivery } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
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

/** The outstanding requirement, in words. `none` says nothing — there is nothing to say. */
const REQUIREMENT_HINT: Record<PartnerRequirement, string | null> = {
  verify: M.NEEDS_VERIFIER,
  deliver: M.NEEDS_DELIVERY,
  none: null,
  unknown: M.REQUIREMENT_UNKNOWN,
};

export interface OrderAssignPartnerSectionProps {
  orderId: string;
  /** Raw order status (e.g. "order_confirmed") — drives the stage gate. */
  status: string;
  /** The order's live assignment, or null when no partner holds it. */
  activeAssignment?: OrderAssignment | null;
  /** Owning admin (Flow 27); undefined when the row didn't load it. */
  assignedAdmin?: AssignedAdmin | null;
  /**
   * The backend's `needs_verifier_partner` / `needs_delivery_partner`, passed
   * straight through. `null` means the response omitted the field — reported,
   * never read as "nothing outstanding".
   */
  needsVerifierPartner?: boolean | null;
  needsDeliveryPartner?: boolean | null;
}

/**
 * Flow 28 · APIs 11–12 — assign or reassign the delivery partner on an order.
 * Self-contained section injected into the shared `OrderDetailDrawer` via its
 * `detailSlot`, so the common drawer stays generic.
 *
 * Assignment is a governed order write: it runs through the Flow 27 gate, so an
 * Operator can only assign a partner on an order an Admin has put in their
 * hands — there is no self-claim step. Reassigning an order
 * that another partner already holds returns 409 `requires_confirmation`; the
 * next click re-sends with `confirm: true`.
 */
export function OrderAssignPartnerSection({
  orderId,
  status,
  activeAssignment,
  assignedAdmin,
  needsVerifierPartner,
  needsDeliveryPartner,
}: OrderAssignPartnerSectionProps) {
  const { isSuperAdmin, stateOf } = useOrderOwnership();
  const [assignOrder, { isLoading: assigning }] = useAssignOrderMutation();

  const current = activeAssignment?.is_active ? activeAssignment : null;
  // Verbatim partner report + when it was made; "" when nothing failed.
  const failure = [activeAssignment?.failure_reason, activeAssignment?.failed_at]
    .filter(Boolean)
    .join(" · ");

  // All local state is per-order. The caller keys this component on the order
  // id, so switching orders in the drawer remounts it and resets the picker —
  // no reset effect needed.
  const [selectedId, setSelectedId] = useState("");
  // Flipped by a 409 `requires_confirmation`, so the next click reassigns.
  const [forceReassign, setForceReassign] = useState(false);

  /**
   * What the order is short of, from the backend's flags alone.
   *
   * This replaces the old reading of "is there an active assignment?" — which
   * answered *yes* for a paid order whose only assignment was a finished
   * verification, and so labelled the very first delivery assignment a
   * "reassignment". `partner_allocated`, `partner_name` and
   * `active_assignment.status` are not consulted for this.
   */
  const requirement = partnerRequirement(needsVerifierPartner, needsDeliveryPartner);

  // Gate, mirroring the backend's evaluation order: status → ownership.
  const normalised = status.trim().toLowerCase();
  const closed = CLOSED_STATUSES.has(normalised);
  const unpaid = normalised === UNPAID_STATUS;
  const ownState = stateOf(assignedAdmin);
  const ownershipKnown = assignedAdmin !== undefined;
  // Another admin owns it and we're not super — a hard block.
  const blockedByOther = ownershipKnown && !isSuperAdmin && ownState === "other";
  // Super admin always; otherwise the owner. There is no self-claim step here
  // any more — an Operator cannot assign an order to themselves, so the way out
  // of this gate is an Admin assigning it to them, which is a sentence rather
  // than a button. Ownership still loading reads as "not yours" and blocks,
  // which is the recoverable direction to be briefly wrong in.
  const canWrite = isSuperAdmin || ownState === "mine";
  const notAssigned = !closed && !unpaid && !blockedByOther && !canWrite;

  const stageBlocked = closed || unpaid;
  const writeDisabled = assigning || stageBlocked || blockedByOther || notAssigned;

  // `order_id` is deliberately omitted: scoping the picker to the order filters
  // by port + required capability, which returns an empty list while partner
  // capability data is incomplete. API 12 enforces the rule regardless.
  // Fulfilment phase: only partners who can DELIVER. Filtered server-side by
  // `partner/list/?can_deliver=true`, which includes both-capable partners.
  // `stageBlocked` already covers the statuses that take no partner at all
  // (closed, and `payment_pending` — verification is done but the order is unpaid).
  // When the backend names a requirement, the picker fetches exactly that
  // capability. With nothing outstanding this is a reassignment on the
  // fulfilment screen, which is a delivery surface — the screen's own standing
  // rule, not a phase re-derived from the status.
  const { data: partners = [], isLoading: partnersLoading } = useGetPartnersByCapabilityQuery(
    { capability: requirement === "verify" ? "verify" : "deliver" },
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
    // Includes the capability suffix, so a verify-only partner is visibly
    // narrower than the "both" default rather than looking identical.
    label: partnerOptionLabel(p),
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
        : notAssigned
          ? M.NOT_ASSIGNED
          : // With the gate clear, the line states the outstanding requirement in
            // words — including when the API didn't send it, which is reported
            // rather than quietly treated as "nothing needed".
            (REQUIREMENT_HINT[requirement] ?? null);

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
    // request and the raw failure makes those rejections diagnosable — dev only,
    // so the trace never reaches a production console.
    if (import.meta.env.DEV)
      console.log("[assign-order] POST /superadmin/partner/assign-order/", {
        body,
        partner: { id: selectedId, label: partnerName },
        order: { id: orderId, status },
        currentAssignment: current
          ? { partner: current.partner_name, status: current.status }
          : null,
      });
    try {
      const res = await assignOrder(body).unwrap();
      if (import.meta.env.DEV) console.log("[assign-order] success", res);
      // A 200 carrying `already_assigned` created no assignment and moved no
      // order (see `AssignOrderResponse`). It is the reply a both-capable
      // partner's *completed verification* provokes when they are then picked
      // to deliver — announcing it as a reassignment is precisely how an order
      // kept its "Needs delivery partner" chip after a successful-looking
      // assign. Say so, and leave the picker loaded so another name is one
      // click away.
      if (res?.already_assigned) {
        toast.warning(MESSAGES.COMMON.ASSIGN_ORDER_NO_CHANGE);
        return;
      }
      toast.success(isReassign ? M.REASSIGNED(partnerName) : M.ASSIGNED(partnerName));
      setSelectedId("");
      setForceReassign(false);
    } catch (err) {
      const e = err as { status?: unknown; data?: { requires_confirmation?: boolean } };
      // Field errors here are about the partner the admin just picked (e.g. no
      // delivery capability), so the backend's sentence stands on its own —
      // `labelFields: false` drops the `delivery_partner_id:` prefix.
      const reason = getApiMessage(err, { labelFields: false });
      if (import.meta.env.DEV)
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
      // A 403 here is the model-level capability guard (Flow 28 GL1): the
      // serializer's friendlier 400 fires first, so reaching this means a write
      // path skipped it. Retrying is pointless and confirming nothing — say the
      // partner cannot do this kind of work and let the admin pick another.
      if (e?.status === 403) {
        toast.error(reason ?? M.WRONG_CAPABILITY);
        return;
      }
      toast.error(reason ?? M.FAILED);
    }
  };

  /**
   * The button says what the order actually needs.
   *
   * It used to say "Reassign" whenever an assignment existed, which is how a
   * paid order carrying a completed verifier presented its **first** delivery
   * assignment as a hand-over. When the backend reports an outstanding
   * requirement, that requirement names the action; only with nothing
   * outstanding does this fall back to the plain reassign wording.
   */
  const actionLabel = assigning
    ? current && requirement === "none"
      ? M.REASSIGNING
      : M.ASSIGNING
    : requirement === "deliver"
      ? M.ASSIGN_DELIVERY
      : requirement === "verify"
        ? M.ASSIGN_VERIFICATION
        : current
          ? M.REASSIGN
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

      {/* What the partner reported when the delivery failed — the answer the
          reassign-or-refund decision turns on. Read off the assignment, which
          is where the backend keeps it: the status-history note carrying the
          same words is free text and is pruned 180 days after the order
          settles. Rendered from `activeAssignment` rather than `current`
          because a failure deliberately leaves the assignment active, so the
          record survives even when the picker below is gone. */}
      {failure && (
        <div className="detail-kv">
          <div className="detail-k">{M.FAILURE_REASON}</div>
          <div className="detail-v text-[var(--danger-text)]">{failure}</div>
        </div>
      )}

      {/* The assign controls exist only while the order can actually take a
          partner. On a closed order (delivered / cancelled / refunded) there is
          nothing to assign, so the picker is omitted entirely rather than shown
          disabled — only the record of who delivered it remains. */}
      {!stageBlocked && (
        <>
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
                // A fleet is long enough that scrolling it to find one name is
                // the whole interaction.
                searchable
                searchPlaceholder={M.PARTNER_SEARCH}
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
