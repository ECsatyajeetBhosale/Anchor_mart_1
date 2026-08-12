import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { StatusBadge } from "@/components/common/StatusBadge";
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
import {
  partnerOptionLabel,
  useAssignOrderMutation,
  useGetPartnersByCapabilityQuery,
} from "@/features/assignments";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconBolt, IconTransfer } from "@tabler/icons-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ExpressOrder } from "../types/expressItem.types";

const M = MESSAGES.EXPRESS;
const A = MESSAGES.EXPRESS.ASSIGN;

export interface ExpressItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: ExpressOrder | null;
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="fg-label">{label}</span>
      <span className="text-[13.5px] font-medium text-[var(--t1)]">{value || M.DASH}</span>
    </div>
  );
}

export function ExpressItemDrawer({ isOpen, onClose, item }: ExpressItemDrawerProps) {
  // Reset per open so a previous order's pick can't carry over onto this one.
  const [partnerId, setPartnerId] = useState("");
  /** Set by a 409 `requires_confirmation`, so the next click reassigns. */
  const [forceReassign, setForceReassign] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPartnerId("");
      setForceReassign(false);
    }
  }, [isOpen]);

  // Flow 28 API 11. `order_id` is deliberately not sent: scoping by it filters
  // to the order's port and required capability, which returns an empty picker
  // while partner port/capability data is incomplete. API 12 enforces the rule
  // regardless, so a mismatched pick is rejected server-side.
  // Express orders skip the intent funnel and are billed up front, so this is
  // always a fulfilment assignment: only partners who can DELIVER.
  const { data: partners = [], isLoading: partnersLoading } = useGetPartnersByCapabilityQuery(
    { capability: "deliver" },
    { skip: !isOpen },
  );
  const [assignOrder, { isLoading: assigning }] = useAssignOrderMutation();

  const partnerOptions = partners.map((p) => ({
    value: p.deliveryPartnerId,
    // Includes the capability suffix, so a verify-only partner is visibly
    // narrower than the "both" default rather than looking identical.
    label: partnerOptionLabel(p),
  }));
  const placeholder = partnersLoading
    ? A.PARTNER_LOADING
    : partnerOptions.length === 0
      ? A.PARTNER_EMPTY
      : A.PARTNER_PLACEHOLDER;

  // An order that already holds a partner is a reassignment, which the API only
  // performs with an explicit `confirm`.
  const isReassign = !!item?.partner_allocated;

  /**
   * Flow 28 API 12. On a 409 `requires_confirmation` the drawer stays open and
   * flips `forceReassign`, so the next click goes through rather than making
   * the admin start over.
   */
  const handleAssign = async () => {
    if (!item || !partnerId) {
      toast.error(A.SELECT_PARTNER);
      return;
    }
    const ref = item.order_number || item.id;
    const partnerName = partnerOptions.find((o) => o.value === partnerId)?.label ?? "";
    try {
      await assignOrder({
        order_id: item.id,
        delivery_partner_id: partnerId,
        confirm: isReassign || forceReassign,
      }).unwrap();
      toast.success(
        isReassign || forceReassign ? A.REASSIGNED(partnerName, ref) : A.ASSIGNED(partnerName, ref),
      );
      onClose();
    } catch (err) {
      const e = err as { status?: unknown; data?: { requires_confirmation?: boolean } };
      if (e?.status === 409 && e?.data?.requires_confirmation) {
        setForceReassign(true);
        toast.error(getApiMessage(err) ?? A.NEEDS_CONFIRM);
        return;
      }
      toast.error(getApiMessage(err) ?? A.FAILED);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={640}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
              <IconBolt size={20} />
            </div>
            <div>
              <SheetTitle className="text-xl mono">
                {item?.order_number ?? M.DRAWER.TITLE_FALLBACK}
              </SheetTitle>
              <SheetDescription>{item?.customer_name}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-6">
          {item && (
            <>
              <section>
                <div className="sec-label">{M.DRAWER.SECTIONS.OVERVIEW}</div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <StatusBadge status={item.status_display || item.status} />
                  {item.is_express && <Badge variant="teal">{M.FLAGS.EXPRESS}</Badge>}
                  {item.is_emergency && <Badge variant="danger">{M.FLAGS.EMERGENCY}</Badge>}
                  {item.is_fastest_delivery && <Badge variant="amber">{M.FLAGS.FASTEST}</Badge>}
                  {item.has_location_request && (
                    <Badge variant="warning">{M.FLAGS.LOCATION_REQ}</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow
                    label={M.COLUMNS.AMOUNT}
                    value={`$${Number(item.total_amount).toFixed(2)}`}
                  />
                  <DetailRow
                    label={M.COLUMNS.ITEMS}
                    value={M.DRAWER.ITEM_COUNT(item.item_count ?? 0)}
                  />
                </div>
              </section>

              <section>
                <div className="sec-label">{M.DRAWER.SECTIONS.CUSTOMER}</div>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label={M.COLUMNS.CUSTOMER} value={item.customer_name} />
                  <DetailRow label="Email" value={item.customer_email} />
                </div>
              </section>

              <section>
                <div className="sec-label">{M.DRAWER.SECTIONS.DELIVERY}</div>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="Port" value={item.port_name} />
                  <DetailRow label="Anchorage" value={item.anchorage_name} />
                  <DetailRow
                    label={M.COLUMNS.PARTNER}
                    value={item.partner_allocated ? item.partner_name : M.UNALLOCATED}
                  />
                  <DetailRow label={M.COLUMNS.ARRIVAL} value={item.ship_arrival_date} />
                </div>
              </section>

              <section>
                <div className="sec-label">{M.DRAWER.SECTIONS.TIMELINE}</div>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="Payment Completed" value={item.payment_completed_at} />
                  <DetailRow label="Created" value={item.created_at} />
                </div>
              </section>

              {/* Flow 28 API 12 — assignment lives here rather than as a row
                  icon, matching the intents queue. */}
              <section>
                <div className="sec-label">{isReassign ? A.SECTION_REASSIGN : A.SECTION}</div>
                <FormField
                  label={A.PARTNER_LABEL}
                  hint={isReassign ? A.REASSIGN_HINT(item.partner_name ?? "") : undefined}
                >
                  <DropdownSelect
                    value={partnerId}
                    onValueChange={setPartnerId}
                    placeholder={placeholder}
                    options={partnerOptions}
                    width="100%"
                  />
                </FormField>
              </section>
            </>
          )}
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={assigning}>
              {M.DRAWER.CLOSE}
            </Button>
            <Button variant="primary" size="sm" onClick={handleAssign} disabled={assigning}>
              <IconTransfer size={15} className="mr-1" />
              {assigning
                ? A.ASSIGNING
                : isReassign || forceReassign
                  ? A.CONFIRM_REASSIGN
                  : A.CONFIRM}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
