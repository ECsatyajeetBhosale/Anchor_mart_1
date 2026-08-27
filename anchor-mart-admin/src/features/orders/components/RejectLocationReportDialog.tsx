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
import { useEffect, useState } from "react";

const L = MESSAGES.ORDERS.LOCATION;
const D = MESSAGES.ORDERS.DELTA;

export interface RejectLocationReportDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  /** Called with the trimmed reason, or an empty string when none was given. */
  onConfirm: (reason: string) => void;
}

/**
 * Flow 11 §4 — reject a location report.
 *
 * Confirmed rather than fired on one click, because the consequence is invisible
 * on the screen that triggers it: the order keeps its old berth, and a partner
 * will be sent to a place the vessel has left. That is what the body text says,
 * in those terms.
 *
 * Its own dialog rather than `ConfirmDialog` only because the optional reason
 * field needs somewhere to live — the sailor is shown it, so it is worth asking
 * for even though the server does not insist.
 */
export function RejectLocationReportDialog({
  isOpen,
  isLoading,
  onClose,
  onConfirm,
}: RejectLocationReportDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setReason("");
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{L.REJECT_TITLE}</DialogTitle>
          <DialogDescription>{L.REJECT_BODY}</DialogDescription>
        </DialogHeader>

        <FormField label={L.DISMISS_REASON_LABEL}>
          <Textarea
            autoFocus
            value={reason}
            maxLength={255}
            placeholder={L.DISMISS_REASON_PLACEHOLDER}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[70px]"
          />
        </FormField>

        <DialogFooter className="mt-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            {D.CANCEL}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onConfirm(reason.trim())}
            disabled={isLoading}
          >
            {isLoading ? L.REJECTING : L.REJECT_CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RejectLocationReportDialog;
