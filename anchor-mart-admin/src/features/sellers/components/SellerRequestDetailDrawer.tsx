import { IconBuildingStore, IconCheck, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { getApiMessage } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import {
  useGetSellerRequestDetailQuery,
  useSetSellerStatusMutation,
} from "../api/sellerRequestApi";
import type { SellerRequest } from "../types/sellerRequest.types";

const M = MESSAGES.SELLERS;

const REJECT_REASON_OPTIONS = M.REJECT_REASONS.map((r) => ({ value: r, label: r }));

export interface SellerRequestDetailDrawerProps {
  /** The selected application row; null when none is selected. */
  seller: SellerRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Right-side review drawer for a seller application — mirrors the special-request
 * review drawer (shadcn `Sheet`). Renders the applicant/business summary from the
 * selected row and exposes the approve / reject decision actions (server-backed
 * mutations that refresh the list + stats on success).
 */
export function SellerRequestDetailDrawer({
  seller,
  isOpen,
  onClose,
}: SellerRequestDetailDrawerProps) {
  const [reason, setReason] = useState<string>(M.REJECT_REASONS[0]);
  const [message, setMessage] = useState<string>("");
  // Tracks which decision is in flight so only that button shows a spinner —
  // both share one mutation hook, so `isLoading` alone can't tell them apart.
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);

  const [setStatus, { isLoading: isSaving }] = useSetSellerStatusMutation();

  // Detail is keyed on the applicant's user id; skipped until a row is selected.
  const { data: detail } = useGetSellerRequestDetailQuery(seller?.userId ?? "", {
    skip: !isOpen || !seller?.userId,
  });

  // Reset the decision fields whenever a new application is opened.
  useEffect(() => {
    if (isOpen) {
      setReason(M.REJECT_REASONS[0]);
      setMessage("");
      setPending(null);
    }
  }, [isOpen]);

  if (!seller) return null;

  const avatarSrc = getFallbackAvatar(seller.n);

  const handleApprove = async () => {
    setPending("approve");
    try {
      await setStatus({
        userId: seller.userId,
        status: "approved",
        // Optional on an approval — send it only when the admin typed something.
        adminNote: message.trim() || undefined,
      }).unwrap();
      onClose();
      toast.success(M.TOAST.APPROVED);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.APPROVE_ERROR);
    } finally {
      setPending(null);
    }
  };

  const handleReject = async () => {
    // The API 400s on a rejection with a blank note — catch it here so the
    // admin gets a field-level nudge instead of a server error toast.
    const note = message.trim();
    if (!note) {
      toast.error(M.DETAIL.NOTE_REQUIRED);
      return;
    }
    setPending("reject");
    try {
      await setStatus({
        userId: seller.userId,
        status: "rejected",
        // The dropdown reason is the headline; the free-text message is detail.
        adminNote: `${reason} — ${note}`,
      }).unwrap();
      onClose();
      toast.error(M.TOAST.REJECTED);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.REJECT_ERROR);
    } finally {
      setPending(null);
    }
  };

  const isBusy = isSaving;

  /**
   * Already approved, so there is nothing left to approve.
   *
   * Read from the detail response first and the list row only as a fallback:
   * the row is whatever the last list fetch returned, which can lag a decision
   * another admin recorded a moment ago, while the detail query is refetched on
   * open. Both are lowercased because the status token's casing comes from the
   * API and is not something this screen should depend on.
   *
   * **Approve only.** Reject stays available on an approved application — the
   * endpoint accepts it, and withdrawing an approval that turns out to be wrong
   * is a real thing an admin needs to do.
   */
  const isApproved = (detail?.status ?? seller.status ?? "").toLowerCase() === "approved";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconBuildingStore size={22} />
            </div>
            <div>
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {M.DETAIL.TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {seller.b}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Applicant */}
          <div className="sec-label">{M.DETAIL.APPLICANT}</div>
          <div className="mb-5 rounded-[var(--radius-md)] bg-[var(--navy-25)] p-4">
            <div className="mb-3.5 flex items-center gap-3">
              <div className="av av-img">
                <img src={avatarSrc} alt={seller.n} />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-bold text-[var(--t1)]">{seller.n}</div>
                <div className="text-[11px] text-[var(--t4)]">{seller.e}</div>
              </div>
              <Badge variant={seller.sc}>{seller.st}</Badge>
            </div>
            <div className="form-row !mb-0">
              <div className="mini-stat">
                <div className="mini-stat-val !text-[16px]">{seller.dt}</div>
                <div className="mini-stat-lbl">{M.DETAIL.SUBMITTED}</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-val !text-[16px]">
                  {seller.docsOk === null ? (
                    seller.docs
                  ) : (
                    <Badge variant={seller.docsOk ? "success" : "danger"}>{seller.docs}</Badge>
                  )}
                </div>
                <div className="mini-stat-lbl">{M.DETAIL.DOCUMENTS}</div>
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="sec-label">{M.DETAIL.BUSINESS_INFO}</div>
          <div className="form-row">
            <FormField label={M.DETAIL.BUSINESS_NAME}>
              <div className="ecard">{detail?.business_name || seller.b}</div>
            </FormField>
            <FormField label={M.DETAIL.EMAIL}>
              <div className="ecard">{seller.e}</div>
            </FormField>
          </div>
          <div className="form-row">
            <FormField label={M.DETAIL.PHONE_NUMBER}>
              <div className="ecard">{detail?.whatsapp_number || M.DETAIL.FALLBACK}</div>
            </FormField>
            <FormField label={M.DETAIL.GST_NUMBER}>
              <div className="ecard">{detail?.gst_number || M.DETAIL.FALLBACK}</div>
            </FormField>
          </div>
          <FormField label={M.DETAIL.BUSINESS_ADDRESS}>
            <div className="ecard leading-relaxed">
              {detail?.business_address || M.DETAIL.FALLBACK}
            </div>
          </FormField>
          <FormField label={M.DETAIL.PRODUCTS}>
            <div className="ecard leading-relaxed">{seller.prod}</div>
          </FormField>
          {/* Only rendered once a decision has already been recorded. */}
          {detail?.admin_note ? (
            <FormField label={M.DETAIL.ADMIN_NOTE}>
              <div className="ecard leading-relaxed">{detail.admin_note}</div>
            </FormField>
          ) : null}

          {/* Decision */}
          <div className="sec-label mt-4">{M.DETAIL.DECISION}</div>
          <div className="form-row">
            <FormField label={M.DETAIL.REJECTION_REASON}>
              <DropdownSelect
                value={reason}
                onValueChange={setReason}
                options={REJECT_REASON_OPTIONS}
                width="100%"
              />
            </FormField>
            <div className="fg" />
          </div>
          <FormField label={M.DETAIL.MESSAGE}>
            <Textarea
              className="h-16 min-h-0 py-[10px]"
              placeholder={M.DETAIL.MESSAGE_PLACEHOLDER}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </FormField>
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end gap-3 w-full">
            <Button
              variant="danger"
              size="sm"
              loading={pending === "reject"}
              disabled={isBusy}
              onClick={handleReject}
            >
              <IconX size={15} className="mr-1" />
              {M.DETAIL.REJECT}
            </Button>
            {/* Hidden rather than disabled: a greyed Approve on an already-
                approved application reads as "blocked for some reason" and
                invites someone to work out how to enable it. The status badge
                at the top of the drawer already says why it is gone. */}
            {!isApproved && (
              <Button
                variant="primary"
                size="sm"
                loading={pending === "approve"}
                disabled={isBusy}
                onClick={handleApprove}
              >
                <IconCheck size={15} className="mr-1" />
                {M.DETAIL.APPROVE}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default SellerRequestDetailDrawer;
