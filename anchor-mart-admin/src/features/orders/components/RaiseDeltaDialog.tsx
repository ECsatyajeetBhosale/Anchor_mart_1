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
import { Textarea } from "@/components/ui/textarea";
import { MESSAGES } from "@/lib/messages";
import { IconCurrencyDollar } from "@tabler/icons-react";
import { useEffect, useState } from "react";

const D = MESSAGES.ORDERS.DELTA;

export interface RaiseDeltaDialogProps {
  isOpen: boolean;
  /** Display reference shown in the prompt. */
  orderRef: string;
  isLoading: boolean;
  onClose: () => void;
  /** Called with the validated surcharge and note. */
  onConfirm: (deltaAmount: string, note: string) => void;
}

/**
 * Flow 11 §3 — price a pending `delta` location report.
 *
 * The admin enters the **surcharge**, not a new shipping total: the baseline
 * (base shipping + every completed delta) is computed server-side. The note is
 * required because the sailor sees it next to the charge.
 */
export function RaiseDeltaDialog({
  isOpen,
  orderRef,
  isLoading,
  onClose,
  onConfirm,
}: RaiseDeltaDialogProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; note?: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    setAmount("");
    setNote("");
    setErrors({});
  }, [isOpen]);

  const handleConfirm = () => {
    const trimmedAmount = amount.trim();
    const trimmedNote = note.trim();
    const next: { amount?: string; note?: string } = {};
    // The endpoint's own rule: strictly greater than zero (min 0.01).
    if (!trimmedAmount || Number(trimmedAmount) <= 0) next.amount = D.AMOUNT_REQUIRED;
    if (!trimmedNote) next.note = D.NOTE_REQUIRED;
    if (next.amount || next.note) {
      setErrors(next);
      return;
    }
    onConfirm(trimmedAmount, trimmedNote);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{D.RAISE_TITLE}</DialogTitle>
          <DialogDescription>{D.RAISE_DESCRIPTION(orderRef)}</DialogDescription>
        </DialogHeader>

        <FormField label={D.AMOUNT_LABEL} hint={D.AMOUNT_HINT} error={errors.amount}>
          <Input
            autoFocus
            type="number"
            step="0.01"
            min="0"
            placeholder={D.AMOUNT_PLACEHOLDER}
            value={amount}
            error={!!errors.amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (errors.amount) setErrors((p) => ({ ...p, amount: undefined }));
            }}
          />
        </FormField>

        <FormField label={D.NOTE_LABEL} error={errors.note}>
          <Textarea
            value={note}
            error={!!errors.note}
            placeholder={D.NOTE_PLACEHOLDER}
            onChange={(e) => {
              setNote(e.target.value);
              if (errors.note) setErrors((p) => ({ ...p, note: undefined }));
            }}
            className="min-h-[80px]"
          />
        </FormField>

        <DialogFooter className="mt-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            {D.CANCEL}
          </Button>
          <Button variant="primary" size="sm" onClick={handleConfirm} disabled={isLoading}>
            <IconCurrencyDollar size={15} className="mr-1" />
            {isLoading ? D.RAISING : D.RAISE_CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RaiseDeltaDialog;
