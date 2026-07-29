import { IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";

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

const R = MESSAGES.SPECIAL_REQUESTS.REJECT_DIALOG;

export interface RejectSpecialRequestDialogProps {
  isOpen: boolean;
  /** Display reference (e.g. "SR202607140003") shown in the prompt. */
  requestRef: string;
  isLoading: boolean;
  onClose: () => void;
  /** Called with the trimmed, non-empty reason. */
  onConfirm: (reason: string) => void;
}

/**
 * Flow 13 API 11 — admin reject, before quoting only.
 *
 * The backend requires a non-blank `admin_response` (400 otherwise) and keeps
 * it as the reason shown to the sailor, so it is validated here before
 * submitting. The caller owns the mutation.
 */
export function RejectSpecialRequestDialog({
  isOpen,
  requestRef,
  isLoading,
  onClose,
  onConfirm,
}: RejectSpecialRequestDialogProps) {
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
          <DialogDescription>{R.DESCRIPTION(requestRef)}</DialogDescription>
        </DialogHeader>

        <FormField label={R.REASON} hint={R.REASON_HINT} error={error || undefined}>
          <Textarea
            className="h-20 min-h-0 py-[10px]"
            placeholder={R.REASON_PLACEHOLDER}
            value={reason}
            error={!!error}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
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

export default RejectSpecialRequestDialog;
