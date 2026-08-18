import type { Product } from "../types/product.types";
import { ProductAddDrawer } from "./ProductAddDrawer";
import { ProductEditDrawer } from "./ProductEditDrawer";

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  /**
   * Catalog the **add** form creates onto — fixed by the screen it was opened
   * from, not chosen in the form. Ignored on edit, where the product has one.
   */
  catalogType?: string;
}

/**
 * Entry point used by the products table. Add and Edit have different payloads,
 * schemas, and field sets, so each is its own self-contained drawer; this thin
 * switch keeps the table's API unchanged (one component for both flows).
 *
 * It intentionally holds no hooks — each child owns its own form state, which
 * keeps hook order stable when switching between the add and edit drawers.
 */
export function ProductFormModal({ isOpen, onClose, product, catalogType }: ProductFormModalProps) {
  if (product) {
    return <ProductEditDrawer isOpen={isOpen} onClose={onClose} product={product} />;
  }
  return <ProductAddDrawer isOpen={isOpen} onClose={onClose} catalogType={catalogType} />;
}
