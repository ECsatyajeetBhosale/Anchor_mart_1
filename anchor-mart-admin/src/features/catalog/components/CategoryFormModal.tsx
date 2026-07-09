import type { Category } from "../types/category.types";
import { CategoryAddDrawer } from "./CategoryAddDrawer";
import { CategoryEditDrawer } from "./CategoryEditDrawer";

export interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null;
}

/**
 * Entry point used by the categories table. Add and Edit have different payloads
 * and field sets, so each is its own self-contained drawer; this thin switch
 * keeps the table's API unchanged (one component for both flows).
 *
 * It intentionally holds no hooks — each child owns its own form state, which
 * keeps hook order stable when switching between the add and edit drawers.
 */
export function CategoryFormModal({ isOpen, onClose, category }: CategoryFormModalProps) {
  if (category) {
    return <CategoryEditDrawer isOpen={isOpen} onClose={onClose} category={category} />;
  }
  return <CategoryAddDrawer isOpen={isOpen} onClose={onClose} />;
}
