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
import { IconCheck } from "@tabler/icons-react";
import { useEffect, useState } from "react";

const L = MESSAGES.ORDERS.LOCATION;
const D = MESSAGES.ORDERS.DELTA;

export interface AcceptLocationReportDialogProps {
  isOpen: boolean;
  /** Display reference shown in the prompt. */
  orderRef: string;
  isLoading: boolean;
  /**
   * The 409 surcharge conflict, verbatim from `detail`. When set, the dialog
   * stops asking for a reason and explains the contradiction instead — the
   * admin cannot proceed until the open delta is resolved.
   */
  conflict?: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  /** Offered inline on a conflict; omitted when there is nothing to withdraw. */
  onWithdraw?: () => void;
}

/**
 * §4.2 — accept a location report **without** charging.
 *
 * The reason is mandatory and the server rejects a lone space, so it is trimmed
 * and validated here rather than sent and bounced. It is a labelled field, not a
 * placeholder, because a placeholder disappears the moment someone types and
 * this text has to answer "why did this move ship free?" long after everyone
 * involved has forgotten.
 */
export function AcceptLocationReportDialog({
  isOpen,
  orderRef,
  isLoading,
  conflict,
  onClose,
  onConfirm,
  onWithdraw,
}: AcceptLocationReportDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!isOpen) return;
    setReason("");
    setError(undefined);
  }, [isOpen]);

  const handleConfirm = () => {
    const trimmed = reason.trim();
    // Matches the server rule exactly: non-blank after trimming, so a lone
    // space fails here rather than costing a round trip.
    if (!trimmed) {
      setError(L.ACCEPT_REASON_REQUIRED);
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{conflict ? L.CONFLICT_TITLE : L.ACCEPT_TITLE}</DialogTitle>
          <DialogDescription>
            {conflict ? conflict : L.ACCEPT_DESCRIPTION(orderRef)}
          </DialogDescription>
        </DialogHeader>

        {/* On a conflict the reason field is pointless — the decision is blocked
            until the open surcharge is withdrawn, paid or expires, and the way
            out is the server's own wording above rather than copy of ours that
            would drift from it. */}
        {!conflict && (
          <FormField label={L.ACCEPT_REASON_LABEL} hint={L.ACCEPT_REASON_HINT} error={error}>
            <Textarea
              autoFocus
              value={reason}
              error={!!error}
              maxLength={255}
              placeholder={L.ACCEPT_REASON_PLACEHOLDER}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(undefined);
              }}
              className="min-h-[80px]"
            />
          </FormField>
        )}

        <DialogFooter className="mt-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            {D.CANCEL}
          </Button>
          {conflict ? (
            onWithdraw && (
              <Button variant="primary" size="sm" onClick={onWithdraw} disabled={isLoading}>
                {L.CONFLICT_WITHDRAW}
              </Button>
            )
          ) : (
            <Button variant="primary" size="sm" onClick={handleConfirm} disabled={isLoading}>
              <IconCheck size={15} className="mr-1" />
              {isLoading ? L.ACCEPTING : L.ACCEPT_CONFIRM}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AcceptLocationReportDialog;
