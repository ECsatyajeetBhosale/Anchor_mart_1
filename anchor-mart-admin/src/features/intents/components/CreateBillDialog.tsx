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
import { IconFileInvoice } from "@tabler/icons-react";
import { useEffect, useState } from "react";

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
  onClose: () => void;
  onConfirm: (fees: BillFees) => void;
}

/** Trims a fee input; returns undefined when blank so the API receives 0. */
function fee(value: string): string | undefined {
  const t = value.trim();
  return t === "" ? undefined : t;
}

/**
 * Flow 07 API 1 — create-bill fee entry. Fees are optional (blank → omitted →
 * treated as 0 by the backend); the subtotal is computed server-side and is
 * intentionally not collected here.
 */
export function CreateBillDialog({
  isOpen,
  mode = "create",
  orderRef,
  isLoading,
  onClose,
  onConfirm,
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

  const handleConfirm = () => {
    onConfirm({
      shipping_fee: fee(shipping),
      tax_amount: fee(tax),
      platform_fee: fee(platform),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
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

        <DialogFooter className="mt-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            {B.CANCEL}
          </Button>
          <Button variant="primary" size="sm" onClick={handleConfirm} disabled={isLoading}>
            <IconFileInvoice size={15} className="mr-1" />
            {isLoading
              ? isUpdate
                ? B.UPDATING
                : B.CREATING
              : isUpdate
                ? B.UPDATE_CONFIRM
                : B.CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateBillDialog;
