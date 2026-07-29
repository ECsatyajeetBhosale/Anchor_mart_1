import type { SailorData } from "../types/sailor.types";
import { SailorAddDrawer } from "./SailorAddDrawer";
import { SailorEditDrawer } from "./SailorEditDrawer";

export interface SailorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  sailor?: SailorData | null;
}

/**
 * Entry point used by the sailors table. Add and Edit hit different endpoints
 * and carry different field sets — create-user takes no account status, while
 * edit drives both the profile update and the separate status toggle — so each
 * is its own self-contained drawer and this thin switch keeps the table's API
 * unchanged (one component for both flows).
 *
 * It intentionally holds no hooks: each child owns its own form state, which
 * keeps hook order stable when switching between the add and edit drawers.
 */
export function SailorFormModal({ isOpen, onClose, sailor }: SailorFormModalProps) {
  if (sailor) {
    return <SailorEditDrawer isOpen={isOpen} onClose={onClose} sailor={sailor} />;
  }
  return <SailorAddDrawer isOpen={isOpen} onClose={onClose} />;
}

export default SailorFormModal;
