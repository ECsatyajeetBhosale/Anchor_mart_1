import type { EmergencyCategory } from "../types/emergencyCategory.types";
import { EmergencyCategoryAddDrawer } from "./EmergencyCategoryAddDrawer";
import { EmergencyCategoryEditDrawer } from "./EmergencyCategoryEditDrawer";

export interface EmergencyCategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: EmergencyCategory | null;
}

/**
 * Entry point used by the emergency categories table. Add and Edit have
 * different payloads and field sets, so each is its own self-contained drawer;
 * this thin switch keeps the table's API unchanged (one component for both flows).
 *
 * It intentionally holds no hooks — each child owns its own form state, which
 * keeps hook order stable when switching between the add and edit drawers.
 */
export function EmergencyCategoryFormModal({
  isOpen,
  onClose,
  category,
}: EmergencyCategoryFormModalProps) {
  if (category) {
    return <EmergencyCategoryEditDrawer isOpen={isOpen} onClose={onClose} category={category} />;
  }
  return <EmergencyCategoryAddDrawer isOpen={isOpen} onClose={onClose} />;
}
