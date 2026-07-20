import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { OwnerCell, type OwnershipState } from "@/features/orders";
import { MESSAGES } from "@/lib/messages";
import { IconFileInvoice, IconPackage, IconSend, IconUserCheck, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { IntentData } from "../types/intent.types";

const M = MESSAGES.INTENTS;
const O = MESSAGES.INTENTS.OWNERSHIP;

// Delivery partners available to assign an intent to.
const PARTNER_OPTIONS = [
  "Rahul Singh · DP-00124 · On Duty",
  "Pita Havili · DP-00087 · On Duty",
  "Marco Reyes · DP-00201 · On Duty",
  "Aisha Karimi · DP-00056 · Available",
  "David Lim · DP-00098 · Available",
];

export interface IntentReviewDrawerProps {
  intent: IntentData | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onReject: () => void;
  /** Flow 27 ownership of the underlying order. */
  ownership: OwnershipState;
  /** May the signed-in admin perform gated writes on this order? */
  canManage: boolean;
  /** Should the claim action be offered (unassigned only)? */
  canClaim: boolean;
  isSuperAdmin: boolean;
  isClaiming: boolean;
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
  onConfirm,
  onReject,
  ownership,
  canManage,
  canClaim,
  isSuperAdmin,
  isClaiming,
  onClaim,
}: IntentReviewDrawerProps) {
  // Admin response fields — reset each time the drawer opens.
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [assignPartner, setAssignPartner] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setEstimatedPrice("");
    setAssignPartner("");
    setAdminNotes("");
  }, [isOpen]);

  if (!intent) return null;

  const owner = intent.assignedAdmin;
  // One line explaining the footer's state. A super admin writes regardless of
  // ownership, so they never see a blocking hint.
  const gateHint = canManage
    ? isSuperAdmin && ownership !== "mine"
      ? O.SUPER_ADMIN_OVERRIDE
      : ""
    : ownership === "other" && owner
      ? O.OWNED_BY_OTHER(owner.name)
      : O.CLAIM_FIRST;

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

          {/* Admin Response Fields */}
          <div className="sec-label mt16">{M.REVIEW.ADMIN_RESPONSE}</div>
          <FormField label={M.REVIEW.PRICE_LABEL}>
            <Input
              type="number"
              step="0.01"
              placeholder={M.REVIEW.PRICE_PLACEHOLDER}
              value={estimatedPrice}
              onChange={(e) => setEstimatedPrice(e.target.value)}
            />
          </FormField>
          <FormField label={M.REVIEW.PARTNER_LABEL}>
            <DropdownSelect
              value={assignPartner}
              onValueChange={setAssignPartner}
              placeholder={M.REVIEW.PARTNER_PLACEHOLDER}
              options={PARTNER_OPTIONS.map((p) => ({ value: p, label: p }))}
              width="100%"
            />
          </FormField>
          <FormField label={M.REVIEW.NOTES_LABEL}>
            <Textarea
              placeholder={M.REVIEW.NOTES_PLACEHOLDER}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="min-h-[70px] h-[70px]"
            />
          </FormField>
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
              <Button variant="danger" size="sm" onClick={onReject} disabled={!canManage}>
                <IconX size={15} className="mr-1" />
                {M.REVIEW.REJECT}
              </Button>
              <Button variant="primary" size="sm" onClick={onConfirm} disabled={!canManage}>
                <IconSend size={15} className="mr-1" />
                {M.REVIEW.CONFIRM}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default IntentReviewDrawer;
