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

const C = MESSAGES.ORDERS.CANCEL_DIALOG;

export interface CancelOrderDialogProps {
  isOpen: boolean;
  /** Display reference (order number) shown in the prompt. */
  orderRef: string;
  isLoading: boolean;
  onClose: () => void;
  /** Called with the trimmed, non-empty reason. */
  onConfirm: (reason: string) => void;
}

/**
 * Flow 12 §2 — cancel-order reason popup. The backend requires a non-blank
 * `reason` (400 otherwise) and stores it truncated to 50 characters, so it is
 * validated here before submitting and the caller owns the mutation.
 */
export function CancelOrderDialog({
  isOpen,
  orderRef,
  isLoading,
  onClose,
  onConfirm,
}: CancelOrderDialogProps) {
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
      setError(C.REASON_REQUIRED);
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{C.TITLE}</DialogTitle>
          <DialogDescription>{C.DESCRIPTION(orderRef)}</DialogDescription>
        </DialogHeader>

        <FormField label={C.REASON_LABEL} hint={C.REASON_HINT} error={error}>
          <Textarea
            autoFocus
            value={reason}
            error={!!error}
            placeholder={C.REASON_PLACEHOLDER}
            // The API accepts a longer string, stores the first 50 and returns
            // 200 — so without this the admin writes a sentence and the sailor
            // receives half of one, with nothing to say it was cut.
            maxLength={50}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            className="min-h-[90px]"
          />
        </FormField>

        <DialogFooter className="mt-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            {C.KEEP}
          </Button>
          <Button variant="danger" size="sm" onClick={handleConfirm} disabled={isLoading}>
            <IconX size={15} className="mr-1" />
            {isLoading ? C.CANCELLING : C.CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CancelOrderDialog;
