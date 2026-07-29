import type { Faq } from "../types/settings.types";
import { FaqAddDrawer } from "./FaqAddDrawer";
import { FaqEditDrawer } from "./FaqEditDrawer";

export interface FaqFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Present = edit, absent = add. */
  faq?: Faq | null;
}

/**
 * Thin, hook-free switch between the Add and Edit drawers so each stays a
 * self-contained component and hook order never changes between modes.
 */
export function FaqFormModal({ isOpen, onClose, faq }: FaqFormModalProps) {
  if (faq) {
    return <FaqEditDrawer isOpen={isOpen} onClose={onClose} faq={faq} />;
  }
  return <FaqAddDrawer isOpen={isOpen} onClose={onClose} />;
}
