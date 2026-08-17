import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useEffect, useId, useState } from "react";

// Provide a basic reusable Button if needed, or use project's button classes directly
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  /**
   * Label while the action runs. Defaults to "Deleting…" because that is what
   * most call sites confirm — override it for anything else (sending, revoking)
   * so the button doesn't announce the wrong verb.
   */
  loadingText?: string;
  /**
   * Require the operator to type this exact phrase before confirming.
   *
   * For actions with no undo on either side of the wire — where the cost of a
   * misclick is a database edit rather than a second click. Typing the phrase
   * makes the confirmation an act of reading rather than of muscle memory.
   * Omit it and the dialog behaves exactly as it always has.
   */
  confirmPhrase?: string;
  /** Prompt above the phrase input. `{phrase}` is substituted. */
  confirmPhraseLabel?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you absolutely sure?",
  description = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  isLoading = false,
  loadingText = "Deleting…",
  confirmPhrase,
  confirmPhraseLabel = "Type {phrase} to confirm",
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const inputId = useId();

  // Clear between openings: a phrase left in the box from the last product
  // would arm the button before the operator had read anything.
  useEffect(() => {
    if (!isOpen) setTyped("");
  }, [isOpen]);

  // Compared case-insensitively and trimmed — this is a speed bump to force a
  // read, not a spelling test, and a capital letter is not the risk.
  const phraseSatisfied =
    !confirmPhrase || typed.trim().toLowerCase() === confirmPhrase.trim().toLowerCase();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {confirmPhrase && (
          <div className="mt-3">
            <label
              htmlFor={inputId}
              className="mb-1.5 block text-[12.5px] font-semibold text-[var(--t3)]"
            >
              {confirmPhraseLabel.replace("{phrase}", confirmPhrase)}
            </label>
            <Input
              id={inputId}
              value={typed}
              autoComplete="off"
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmPhrase}
              disabled={isLoading}
            />
          </div>
        )}

        <DialogFooter className="mt-4">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isLoading || !phraseSatisfied}
          >
            {isLoading ? loadingText : confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
