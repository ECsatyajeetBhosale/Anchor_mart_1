import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAssignOrderMutation, useGetAssignablePartnersQuery } from "@/features/assignments";
import { OwnerCell, type OwnershipState } from "@/features/orders";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconFileInvoice, IconPackage, IconSend, IconUserCheck, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGetSuggestedItemsQuery } from "../api/substitutionApi";
import { deriveIntentAction } from "../lib/intentAction";
import type { IntentAction, IntentData } from "../types/intent.types";
import { SuggestReplacementPanel } from "./SuggestReplacementPanel";

const M = MESSAGES.INTENTS;
const O = MESSAGES.INTENTS.OWNERSHIP;
const A = MESSAGES.INTENTS.ACTION;
const S = MESSAGES.INTENTS.SUBSTITUTION;
const T = MESSAGES.INTENTS.TOAST;

export interface IntentReviewDrawerProps {
  intent: IntentData | null;
  isOpen: boolean;
  onClose: () => void;
  /** Runs the primary action for the intent's derived state (assign/suggest→release/bill). */
  onPrimaryAction: (action: IntentAction) => void;
  onReject: () => void;
  /** Flow 27 ownership of the underlying order. */
  ownership: OwnershipState;
  /** May the signed-in admin perform gated writes on this order? */
  canManage: boolean;
  /** Should the claim action be offered (unassigned only)? */
  canClaim: boolean;
  isSuperAdmin: boolean;
  isClaiming: boolean;
  /** Release-suggestions mutation in flight. */
  isReleasing: boolean;
  onClaim: () => void;
}

/**
 * Right-side review drawer for an intent request — mirrors the Product/Order
 * drawer pattern (shadcn `Sheet`): header (icon + title + ref), scrollable body
 * with summary, requested items, and the admin-response form, and a sticky footer.
 */
export function IntentReviewDrawer({
  intent,
  isOpen,
  onClose,
  onPrimaryAction,
  onReject,
  ownership,
  canManage,
  canClaim,
  isSuperAdmin,
  isClaiming,
  isReleasing,
  onClaim,
}: IntentReviewDrawerProps) {
  // Assign-partner form — reset each time the drawer opens. `forceReassign`
  // flips to true after a 409 requires_confirmation, so the next click reassigns.
  const [assignPartner, setAssignPartner] = useState("");
  const [forceReassign, setForceReassign] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAssignPartner("");
    setForceReassign(false);
  }, [isOpen]);

  // Derived next-action + whether the substitution panel applies. Hooks must
  // run before the early return, so read fields defensively off a nullable intent.
  const status = intent?.status ?? "";
  const orderId = intent?.id ?? "";
  const action = deriveIntentAction(status, intent?.substitutionNeeded ?? false);
  // First assignment at the intent stage; reassignment while a partner verifies.
  const showAssign = action === "assign";
  const showReassign = status === "partner_verifying";
  const showPartnerPicker = showAssign || showReassign;
  const showSubstitution =
    status === "verification_submitted" || status === "pending_customer_response";

  // Flow 28 API 11 — all available partners (order_id omitted for now, so the
  // list isn't port/capability-scoped while backend test data is set up).
  // API 12 still assigns using this order's id.
  const { data: assignablePartners = [], isLoading: partnersLoading } =
    useGetAssignablePartnersQuery({}, { skip: !isOpen || !showPartnerPicker });
  const [assignOrder, { isLoading: assigning }] = useAssignOrderMutation();

  const partnerOptions = assignablePartners.map((p) => ({
    value: p.deliveryPartnerId,
    label: `${p.name}${p.code ? ` · ${p.code}` : ""}${p.port ? ` · ${p.port}` : ""}`,
  }));
  const partnerPlaceholder = partnersLoading
    ? M.REVIEW.PARTNER_LOADING
    : partnerOptions.length === 0
      ? M.REVIEW.PARTNER_EMPTY
      : M.REVIEW.PARTNER_PLACEHOLDER;

  // Staged suggestions — gates the Release button (shared cache with the panel).
  const { data: staged = [] } = useGetSuggestedItemsQuery(orderId, {
    skip: !isOpen || !showSubstitution || !orderId,
  });
  const hasUnreleased = staged.some((s) => !s.released);

  /**
   * Flow 28 API 12 — assign (`reassign=false`) or reassign (`reassign=true`) the
   * selected partner. First assignment moves the order to `partner_verifying`;
   * reassignment closes the current partner's assignment and opens a new one.
   *
   * `confirm` is true for an explicit reassign, or once a prior 409
   * `requires_confirmation` flipped `forceReassign`. Gate errors (409 unclaimed
   * / 403 wrong owner) surface via the message.
   */
  const handleAssign = async (reassign: boolean) => {
    if (!assignPartner) {
      toast.error(T.ASSIGN_SELECT_PARTNER);
      return;
    }
    try {
      await assignOrder({
        order_id: orderId,
        delivery_partner_id: assignPartner,
        confirm: reassign || forceReassign,
      }).unwrap();
      toast.success(reassign ? T.REASSIGNED(intent?.r ?? "") : T.ASSIGNED(intent?.r ?? ""));
      onClose();
    } catch (err) {
      const e = err as { status?: unknown; data?: { requires_confirmation?: boolean } };
      if (e?.status === 409 && e?.data?.requires_confirmation) {
        setForceReassign(true);
        toast.error(T.REASSIGN_CONFIRM);
        return;
      }
      toast.error(getApiMessage(err) ?? T.ASSIGN_FAILED);
    }
  };

  if (!intent) return null;

  const owner = intent.assignedAdmin;
  // One line explaining the footer's state. A super admin writes regardless of
  // ownership, so they never see a blocking hint.
  const actionHint = showReassign ? M.REVIEW.REASSIGN_HINT : A[action];
  const gateHint = canManage
    ? isSuperAdmin && ownership !== "mine"
      ? O.SUPER_ADMIN_OVERRIDE
      : actionHint
    : ownership === "other" && owner
      ? O.OWNED_BY_OTHER(owner.name)
      : O.CLAIM_FIRST;

  // Primary footer action, driven by the derived state.
  const primary = showAssign
    ? { label: assigning ? M.REVIEW.ASSIGNING : M.REVIEW.ASSIGN, disabled: !canManage || assigning }
    : showReassign
      ? {
          label: assigning ? M.REVIEW.REASSIGNING : M.REVIEW.REASSIGN,
          disabled: !canManage || assigning,
        }
      : action === "suggest"
        ? { label: isReleasing ? S.RELEASING : S.RELEASE, disabled: !canManage || !hasUnreleased }
        : action === "bill"
          ? { label: M.REVIEW.BILL, disabled: !canManage }
          : null;

  // Assign/reassign are handled here (the partner selection lives in this
  // drawer); release/bill are dispatched to the page (mutation/dialog owner).
  const handlePrimary = () => {
    if (showAssign) return handleAssign(false);
    if (showReassign) return handleAssign(true);
    return onPrimaryAction(action);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={800}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconFileInvoice size={22} />
            </div>
            <div>
              {/* Match the Orders drawer header typography (17px / 800). */}
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {M.REVIEW.TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {intent.r}
              </SheetDescription>
            </div>
            {/* Ownership at a glance — who, if anyone, is accountable for this order. */}
            <div className="ml-auto">
              <OwnerCell assignedAdmin={owner} state={ownership} />
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary mini-stats */}
          <div className="bg-[var(--navy-25)] rounded-[var(--radius-md)] p-4 mb-5">
            <div className="form-row !mb-0">
              <div className="mini-stat">
                <div className="mini-stat-val !text-[16px]">{intent.s}</div>
                <div className="mini-stat-lbl">{M.REVIEW.SAILOR}</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-val mono cteal !text-[16px]">{intent.imo}</div>
                <div className="mini-stat-lbl">{M.REVIEW.IMO}</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-val !text-[16px]">{intent.terminal}</div>
                <div className="mini-stat-lbl">{M.REVIEW.TERMINAL}</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-val !text-[16px]">{intent.ar}</div>
                <div className="mini-stat-lbl">{M.REVIEW.ARRIVAL}</div>
              </div>
            </div>
          </div>

          {/* Requested Items */}
          <div className="sec-label">{M.REVIEW.REQUESTED_ITEMS}</div>
          {intent.reqItems.length === 0 ? (
            <div className="td-m mb-5">{M.EMPTY_ITEMS}</div>
          ) : (
            <div className="flex flex-col gap-2.5 mb-5">
              {intent.reqItems.map((item) => (
                <div className="flex aic g12 ecard" key={item.id}>
                  <div className="prod-thumb h-10 w-10">
                    <IconPackage size={18} />
                  </div>
                  <div className="f1">
                    <div className="sm w7 c1">{item.name}</div>
                    <div className="xs c4">{M.REVIEW.QTY(item.qty)}</div>
                  </div>
                  {item.available === true ? (
                    <Badge variant="success">{M.REVIEW.AVAILABLE}</Badge>
                  ) : item.available === false ? (
                    <Badge variant="danger">{M.REVIEW.UNAVAILABLE}</Badge>
                  ) : (
                    <Badge variant="neutral">{M.REVIEW.CHECKING}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Assign (intent stage) or reassign (while a partner verifies) — Flow 28. */}
          {showPartnerPicker && (
            <>
              <div className="sec-label mt16">
                {showReassign ? M.REVIEW.REASSIGN_SECTION : M.REVIEW.ASSIGN_SECTION}
              </div>
              <FormField label={M.REVIEW.PARTNER_LABEL}>
                <DropdownSelect
                  value={assignPartner}
                  onValueChange={setAssignPartner}
                  placeholder={partnerPlaceholder}
                  options={partnerOptions}
                  width="100%"
                />
              </FormField>
            </>
          )}

          {/* Stock verification & substitution (Flow 06) — the report lines,
              staging a replacement per short/unavailable line, and staged list. */}
          {showSubstitution && (
            <>
              <div className="sec-label mt16">{S.SECTION}</div>
              <SuggestReplacementPanel
                orderId={intent.id}
                portId={intent.portId}
                canManage={canManage}
              />
            </>
          )}
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex w-full items-center justify-between gap-3">
            {/* Why the actions are (or aren't) available — Flow 27 ownership gate. */}
            <span className="trunc text-[12px] font-semibold text-[var(--t4)]">{gateHint}</span>

            <div className="flex shrink-0 gap-3">
              {canClaim && (
                <Button variant="teal" size="sm" disabled={isClaiming} onClick={onClaim}>
                  <IconUserCheck size={15} className="mr-1" />
                  {isClaiming ? O.CLAIMING : O.MANAGE}
                </Button>
              )}
              {action !== "rejected" && (
                <Button variant="danger" size="sm" onClick={onReject} disabled={!canManage}>
                  <IconX size={15} className="mr-1" />
                  {M.REVIEW.REJECT}
                </Button>
              )}
              {primary && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePrimary}
                  disabled={primary.disabled}
                >
                  <IconSend size={15} className="mr-1" />
                  {primary.label}
                </Button>
              )}
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default IntentReviewDrawer;
