import { FormField } from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MESSAGES } from "@/lib/messages";
import { IconCopy, IconExternalLink, IconFileInvoice, IconLink } from "@tabler/icons-react";
import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { GeneratePaymentLinkResponse } from "../types/intent.types";

const B = MESSAGES.INTENTS.BILL_DIALOG;

/** The optional fee fields the caller submits (empty ones are omitted). */
export interface BillFees {
  shipping_fee?: string;
  tax_amount?: string;
  platform_fee?: string;
}

export interface CreateBillDialogProps {
  isOpen: boolean;
  /**
   * `create` → Flow 07 API 1 (first bill). `update` → API 2, for an order
   * already at `payment_pending`: create-bill refuses a second call, so a fee
   * correction has to go through update-bill.
   */
  mode?: "create" | "update";
  orderRef: string;
  isLoading: boolean;
  /** Flow 07 API 3 in flight — scopes the spinner to the link button. */
  isGeneratingLink?: boolean;
  /**
   * Set once generate-link has succeeded; the fee form is replaced by the
   * checkout URL. Cleared by the owner when the dialog closes.
   */
  linkResult?: GeneratePaymentLinkResponse | null;
  onClose: () => void;
  onConfirm: (fees: BillFees) => void;
  /** Flow 07 API 3 — same fees, but also mints/reuses a Stripe Checkout link. */
  onGenerateLink: (fees: BillFees) => void;
}

/** Trims a fee input; returns undefined when blank so the API receives 0. */
function fee(value: string): string | undefined {
  const t = value.trim();
  return t === "" ? undefined : t;
}

/** `expires_at` is ISO; fall back to the raw string if it doesn't parse. */
function expiryLabel(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM yyyy, h:mm a");
  } catch {
    return iso;
  }
}

/**
 * Flow 07 fee entry, shared by all three billing calls: create-bill (API 1),
 * update-bill (API 2), and generate-link (API 3) — they take the same body, so
 * splitting them across dialogs would have meant three copies of one form.
 *
 * Once a link comes back the form is replaced by the URL panel, because the
 * checkout URL is the whole point of that call and is not recoverable from
 * anywhere else in the admin UI.
 */
export function CreateBillDialog({
  isOpen,
  mode = "create",
  orderRef,
  isLoading,
  isGeneratingLink = false,
  linkResult = null,
  onClose,
  onConfirm,
  onGenerateLink,
}: CreateBillDialogProps) {
  const isUpdate = mode === "update";
  const [shipping, setShipping] = useState("");
  const [tax, setTax] = useState("");
  const [platform, setPlatform] = useState("");

  useEffect(() => {
    if (isOpen) {
      setShipping("");
      setTax("");
      setPlatform("");
    }
  }, [isOpen]);

  const fees = (): BillFees => ({
    shipping_fee: fee(shipping),
    tax_amount: fee(tax),
    platform_fee: fee(platform),
  });

  const busy = isLoading || isGeneratingLink;

  const copyLink = () => {
    if (!linkResult) return;
    navigator.clipboard?.writeText(linkResult.checkout_url).then(
      () => toast.success(B.LINK_COPIED),
      () => undefined,
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {linkResult ? (
          <>
            <DialogHeader>
              <DialogTitle>{B.LINK_READY_TITLE}</DialogTitle>
              <DialogDescription>
                {B.LINK_READY_DESCRIPTION(
                  linkResult.order_number || orderRef,
                  linkResult.amount ?? "",
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-1">
              {/* Reuse is a normal, deliberate outcome — say so, so the admin
                  doesn't read the unchanged URL as a failed regeneration. */}
              {linkResult.reused && (
                <p className="mb-2 text-[12px] text-[var(--t2)]">{B.LINK_REUSED_NOTE}</p>
              )}

              <FormField
                label={B.LINK_URL_LABEL}
                hint={
                  linkResult.expires_at
                    ? B.LINK_EXPIRES(expiryLabel(linkResult.expires_at))
                    : undefined
                }
              >
                <Input
                  readOnly
                  value={linkResult.checkout_url}
                  onFocus={(e) => e.target.select()}
                />
              </FormField>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="ghost" size="sm" onClick={copyLink}>
                <IconCopy size={15} />
                {B.LINK_COPY}
              </Button>
              {/* An anchor, not a Button — Button has no `asChild`, and a real
                  link is what gives target/rel their meaning. The classes
                  mirror `Button variant="ghost" size="sm"` rather than using
                  the `.btn` CSS, whose gap and radius differ just enough to
                  read as misaligned beside the two real buttons. */}
              <a
                className="inline-flex h-[32px] cursor-pointer select-none items-center justify-center gap-2 rounded-[var(--radius-sm)] border-[1.5px] border-transparent bg-transparent px-3 font-body text-[12.5px] font-bold text-[var(--t2)] transition-all duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--t1)]"
                href={linkResult.checkout_url}
                target="_blank"
                rel="noreferrer noopener"
              >
                <IconExternalLink size={15} />
                {B.LINK_OPEN}
              </a>
              <Button variant="primary" size="sm" onClick={onClose}>
                {B.LINK_DONE}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{isUpdate ? B.UPDATE_TITLE : B.TITLE}</DialogTitle>
              <DialogDescription>
                {isUpdate ? B.UPDATE_DESCRIPTION(orderRef) : B.DESCRIPTION(orderRef)}
              </DialogDescription>
            </DialogHeader>

            <div className="form-row !mb-0">
              <FormField label={B.SHIPPING_FEE} hint={isUpdate ? B.UPDATE_HINT : B.HINT}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={B.FEE_PLACEHOLDER}
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                />
              </FormField>
              <FormField label={B.TAX_AMOUNT}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={B.FEE_PLACEHOLDER}
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                />
              </FormField>
              <FormField label={B.PLATFORM_FEE}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={B.FEE_PLACEHOLDER}
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                />
              </FormField>
            </div>

            <p className="mt-2 text-[12px] text-[var(--t2)]">{B.LINK_HINT}</p>

            <DialogFooter className="mt-4">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
                {B.CANCEL}
              </Button>
              {/* API 3 — a peer of create/update rather than a follow-up: it
                  sets the same fees itself, so it works from either mode.
                  Styled `secondary`, not `teal`: two saturated buttons side by
                  side give the footer no primary action to land on, and
                  create-bill is the default path (the sailor applies a coupon
                  or points, then pays in-app). */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onGenerateLink(fees())}
                disabled={busy}
              >
                <IconLink size={15} />
                {isGeneratingLink ? B.LINK_GENERATING : B.LINK_CONFIRM}
              </Button>
              <Button variant="primary" size="sm" onClick={() => onConfirm(fees())} disabled={busy}>
                <IconFileInvoice size={15} />
                {isLoading
                  ? isUpdate
                    ? B.UPDATING
                    : B.CREATING
                  : isUpdate
                    ? B.UPDATE_CONFIRM
                    : B.CONFIRM}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CreateBillDialog;
