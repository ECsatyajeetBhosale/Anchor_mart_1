import { IconPlus } from "@tabler/icons-react";
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
import { Input } from "@/components/ui/input";
import { MESSAGES } from "@/lib/messages";
import { allowChangesSchema } from "../schemas/specialRequest.schema";

const A = MESSAGES.SPECIAL_REQUESTS.ALLOW_CHANGES_DIALOG;

export interface AllowChangesDialogProps {
  isOpen: boolean;
  /** Display reference shown in the prompt. */
  requestRef: string;
  /** Current rebill usage, shown so the admin knows what they're raising. */
  used: number;
  cap: number;
  isLoading: boolean;
  onClose: () => void;
  /** Called with a validated 1–10 integer. */
  onConfirm: (additional: number) => void;
}

/**
 * Flow 13 API 12 — raise the rebill cap.
 *
 * `additional` is added to the existing cap (not a new total) and is bounded
 * 1–10 server-side, so the same bounds are enforced here via the shared schema.
 */
export function AllowChangesDialog({
  isOpen,
  requestRef,
  used,
  cap,
  isLoading,
  onClose,
  onConfirm,
}: AllowChangesDialogProps) {
  const [value, setValue] = useState("1");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setValue("1");
      setError("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const parsed = allowChangesSchema.safeParse({ additional: value });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? A.ADDITIONAL_HINT);
      return;
    }
    onConfirm(parsed.data.additional);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{A.TITLE}</DialogTitle>
          <DialogDescription>{A.DESCRIPTION(requestRef)}</DialogDescription>
        </DialogHeader>

        <FormField
          label={A.ADDITIONAL}
          hint={`${A.CURRENT(used, cap)} · ${A.ADDITIONAL_HINT}`}
          error={error || undefined}
        >
          <Input
            type="number"
            min="1"
            max="10"
            step="1"
            value={value}
            error={!!error}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError("");
            }}
          />
        </FormField>

        <DialogFooter className="mt-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            {A.CANCEL}
          </Button>
          <Button variant="primary" size="sm" onClick={handleConfirm} disabled={isLoading}>
            <IconPlus size={15} className="mr-1" />
            {isLoading ? A.SAVING : A.CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AllowChangesDialog;
