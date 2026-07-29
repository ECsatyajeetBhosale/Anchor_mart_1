import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DropdownSelect } from "@/components/common/DropdownSelect";
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
import { useGetCategoriesByCatalogTypeQuery } from "@/features/catalog";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useSetProductCatalogTypeMutation } from "../api/productApi";
import type { Product } from "../types/product.types";

const M = MESSAGES.PRODUCT_FLAGS.CATALOG_DIALOG;
const T = MESSAGES.PRODUCT_FLAGS.TOAST;

/** Catalog tokens the API accepts for `catalog_type`. */
const CATALOG_OPTIONS = [
  { value: "regular", label: M.OPTIONS.REGULAR },
  { value: "express", label: M.OPTIONS.EXPRESS },
  { value: "marine_emergency", label: M.OPTIONS.MARINE_EMERGENCY },
];

/** Only the emergency catalog requires a category alongside the move. */
const CATALOG_NEEDING_CATEGORY = "marine_emergency";

export interface SetCatalogTypeDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Moves a product between catalogs. A move into marine emergency additionally
 * requires a category from that catalog's own set, so the category picker is
 * loaded from `get-categories-by-catalog-type` and shown only for that target.
 */
export function SetCatalogTypeDialog({ product, isOpen, onClose }: SetCatalogTypeDialogProps) {
  const [catalogType, setCatalogType] = useState<string>("regular");
  const [category, setCategory] = useState<string>("");
  const [categoryError, setCategoryError] = useState<string>("");

  const [setCatalog, { isLoading }] = useSetProductCatalogTypeMutation();

  const needsCategory = catalogType === CATALOG_NEEDING_CATEGORY;

  // Categories are only fetched for the catalog that actually needs one.
  const { data: categories = [] } = useGetCategoriesByCatalogTypeQuery(
    { catalogType },
    { skip: !isOpen || !needsCategory },
  );

  useEffect(() => {
    if (!isOpen) return;
    setCatalogType(product?.catalog_type || "regular");
    setCategory("");
    setCategoryError("");
  }, [isOpen, product]);

  const handleConfirm = async () => {
    if (!product) return;
    if (needsCategory && !category) {
      setCategoryError(M.CATEGORY_REQUIRED);
      return;
    }
    try {
      await setCatalog({
        id: product.id,
        catalogType,
        // Sent only for marine emergency; the API rejects it for express.
        category: needsCategory ? category : undefined,
      }).unwrap();
      toast.success(T.CATALOG_UPDATED);
      onClose();
    } catch (err) {
      toast.error(getApiMessage(err) ?? T.CATALOG_ERROR);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{M.TITLE}</DialogTitle>
          <DialogDescription>{M.DESCRIPTION(product.name)}</DialogDescription>
        </DialogHeader>

        <div className="mt-3">
          <FormField label={M.CATALOG_LABEL}>
            <DropdownSelect
              value={catalogType}
              onValueChange={(val) => {
                setCatalogType(val);
                setCategory("");
                setCategoryError("");
              }}
              options={CATALOG_OPTIONS}
              width="100%"
            />
          </FormField>

          {needsCategory && (
            <FormField label={M.CATEGORY_LABEL} hint={M.CATEGORY_HINT} error={categoryError}>
              <DropdownSelect
                value={category}
                onValueChange={(val) => {
                  setCategory(val);
                  setCategoryError("");
                }}
                placeholder={M.CATEGORY_PLACEHOLDER}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                width="100%"
              />
            </FormField>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {M.CANCEL}
          </Button>
          <Button variant="primary" size="sm" loading={isLoading} onClick={handleConfirm}>
            {M.CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SetCatalogTypeDialog;
