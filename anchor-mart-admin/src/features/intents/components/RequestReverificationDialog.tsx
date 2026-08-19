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
import { IconRefresh } from "@tabler/icons-react";
import { useEffect, useState } from "react";

const R = MESSAGES.INTENTS.REVERIFY_DIALOG;

export interface RequestReverificationDialogProps {
  isOpen: boolean;
  /** Display reference (order number) shown in the prompt. */
  orderRef: string;
  isLoading: boolean;
  onClose: () => void;
  /** Called with the trimmed, non-empty reason. */
  onConfirm: (reason: string) => void;
}

/**
 * §4.3b — send a submitted report back to the partner.
 *
 * For when the desk does not trust what came back: the partner checked the
 * wrong shelf, or stock has arrived since. The new report supersedes the old
 * one, so nothing is cleared first and the action is safe to repeat.
 *
 * `reason` is required (400 otherwise) and it reaches the **partner**, not the
 * sailor — the copy asks what to re-check rather than why the order failed.
 * Validated here so the round trip is not spent discovering a blank field.
 */
export function RequestReverificationDialog({
  isOpen,
  orderRef,
  isLoading,
  onClose,
  onConfirm,
}: RequestReverificationDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  // Clear on open, not on close: the popup animates out, and wiping the field
  // mid-animation shows the admin their text disappearing.
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
          <Button variant="primary" size="sm" onClick={handleConfirm} disabled={isLoading}>
            <IconRefresh size={15} className="mr-1" />
            {isLoading ? R.SENDING : R.CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RequestReverificationDialog;
