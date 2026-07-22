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
import { Textarea } from "@/components/ui/textarea";
import { MESSAGES } from "@/lib/messages";
import { IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";

const R = MESSAGES.INTENTS.REJECT_DIALOG;

export interface RejectIntentDialogProps {
  isOpen: boolean;
  /** Display reference (order number) shown in the prompt. */
  orderRef: string;
  isLoading: boolean;
  onClose: () => void;
  /** Called with the trimmed, non-empty reason. */
  onConfirm: (reason: string) => void;
}

/**
 * Flow 05 API 6 — reject-intent reason popup. The backend requires a non-blank
 * `reason` (400 otherwise), so we validate it client-side before submitting and
 * pass the trimmed value up to the caller, which owns the mutation.
 */
export function RejectIntentDialog({
  isOpen,
  orderRef,
  isLoading,
  onClose,
  onConfirm,
}: RejectIntentDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  // Reset the field each time the dialog opens.
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(R.REASON_REQUIRED);
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{R.TITLE}</DialogTitle>
          <DialogDescription>{R.DESCRIPTION(orderRef)}</DialogDescription>
        </DialogHeader>

        <FormField label={R.REASON_LABEL} error={error}>
          <Textarea
            autoFocus
            value={reason}
            error={!!error}
            placeholder={R.REASON_PLACEHOLDER}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            className="min-h-[90px]"
          />
        </FormField>

        <DialogFooter className="mt-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            {R.CANCEL}
          </Button>
          <Button variant="danger" size="sm" onClick={handleConfirm} disabled={isLoading}>
            <IconX size={15} className="mr-1" />
            {isLoading ? R.REJECTING : R.CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RejectIntentDialog;
