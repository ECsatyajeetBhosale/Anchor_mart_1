import type { Product } from "../types/product.types";
import { ProductAddDrawer } from "./ProductAddDrawer";
import { ProductEditDrawer } from "./ProductEditDrawer";

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
}

/**
 * Entry point used by the products table. Add and Edit have different payloads,
 * schemas, and field sets, so each is its own self-contained drawer; this thin
 * switch keeps the table's API unchanged (one component for both flows).
 *
 * It intentionally holds no hooks — each child owns its own form state, which
 * keeps hook order stable when switching between the add and edit drawers.
 */
export function ProductFormModal({ isOpen, onClose, product }: ProductFormModalProps) {
  if (product) {
    return <ProductEditDrawer isOpen={isOpen} onClose={onClose} product={product} />;
  }
  return <ProductAddDrawer isOpen={isOpen} onClose={onClose} />;
}
