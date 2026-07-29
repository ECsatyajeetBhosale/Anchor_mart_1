import { SpareProductAddDrawer } from "./SpareProductAddDrawer";
import { SpareProductEditDrawer } from "./SpareProductEditDrawer";

export interface SpareProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Id of the spare to edit; omit (or null) for the add flow. */
  productId?: string | null;
}

/**
 * Entry point used by the spares table. Add and Edit have different payloads,
 * schemas and field sets, so each is its own self-contained drawer; this thin
 * switch keeps the table's API unchanged (one component for both flows).
 *
 * It intentionally holds no hooks — each child owns its own form state, which
 * keeps hook order stable when switching between the add and edit drawers.
 */
export function SpareProductFormModal({ isOpen, onClose, productId }: SpareProductFormModalProps) {
  if (productId) {
    return <SpareProductEditDrawer isOpen={isOpen} onClose={onClose} productId={productId} />;
  }
  return <SpareProductAddDrawer isOpen={isOpen} onClose={onClose} />;
}

export default SpareProductFormModal;
