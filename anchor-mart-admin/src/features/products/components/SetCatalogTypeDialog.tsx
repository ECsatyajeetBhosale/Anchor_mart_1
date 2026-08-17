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

/**
 * Which catalog a category must come from for a given target — and therefore
 * which `?catalog_type=` the category list is fetched with.
 *
 * `express` is deliberately absent, and that is not the same as "no category
 * needed": express is an **operational overlay valid for both scopes**, so a
 * product moving there keeps whatever category it has. Sending `express` to
 * `get-categories-by-catalog-type/` is a 400 — there are two category buckets,
 * not three.
 */
const CATEGORY_SCOPE_FOR_TARGET: Record<string, string> = {
  regular: "regular",
  marine_emergency: "marine_emergency",
};

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

  /**
   * A category is required whenever the product's current category cannot
   * legally hold it after the move — which is **both directions**, not just into
   * marine emergency.
   *
   * Moving marine → regular with no category is a 400: the record keeps its
   * marine category, which is not valid for a general product. The dialog used
   * to ask only when moving *into* marine, so that move failed with a raw server
   * error and no field to fix it in.
   *
   * Moving to express asks for nothing, deliberately — express spans both
   * scopes, so the existing category stays valid either way. (It does have a
   * browse consequence for marine-category products; see C10 in the conflicts
   * log.)
   */
  const categoryScope = CATEGORY_SCOPE_FOR_TARGET[catalogType];
  const isSameCatalog = catalogType === product?.catalog_type;
  const needsCategory = !!categoryScope && !isSameCatalog;

  // Fetched from the target's own scope, so the picker never offers a category
  // the move would reject.
  const { data: categories = [] } = useGetCategoriesByCatalogTypeQuery(
    { catalogType: categoryScope ?? "" },
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
        // Sent whenever the target's scope differs from where the product sits;
        // omitted for express, which is valid alongside either scope.
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
