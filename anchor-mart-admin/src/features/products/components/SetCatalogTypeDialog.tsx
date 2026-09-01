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
import { Input } from "@/components/ui/input";
import { useGetCategoriesByCatalogTypeQuery } from "@/features/catalog";
import { useGetVariantsQuery } from "@/features/variants";
import { getApiMessage, getFieldErrors } from "@/lib/apiError";
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
  /** The product-level express figure — required moving TO express. */
  const [expressPrice, setExpressPrice] = useState<string>("");
  const [expressPriceError, setExpressPriceError] = useState<string>("");
  /** Per-SKU express prices, keyed by variant id. Blank = leave it pending. */
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>({});

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

  const movingToExpress = catalogType === "express" && product?.catalog_type !== "express";
  const leavingExpress = product?.catalog_type === "express" && catalogType !== "express";

  /**
   * The picker is offered whenever the destination has its own category set —
   * but it is only **required** when the category demonstrably cannot carry
   * over.
   *
   * Leaving express is the case that is not: express is an overlay, so the
   * product already holds a category from one of the two real scopes, and in the
   * usual case (a general category returning to regular) it stays valid. Forcing
   * a re-pick there made a no-op field mandatory.
   *
   * It is offered rather than hidden because the exception exists: a product put
   * on the express shelf while holding a *marine* category cannot return to
   * regular with it. That case is a 400 on `category`, pinned to this field —
   * the server knows the current category's scope and the dialog does not, so
   * this is one to let the API decide rather than guess at.
   */
  const showCategory = !!categoryScope && !isSameCatalog;
  const requiresCategory = showCategory && !leavingExpress;

  /**
   * Every live SKU, so the move can price them in one pass.
   *
   * The product-level figure only reaches the **primary** variant; anything else
   * left unpriced lands *pending* — on the express shelf and refused by the
   * express cart and the order. So the dialog asks for the whole list rather
   * than leaving an operator to discover the gap on another screen.
   *
   * **Every live SKU is listed, ready ones included** (confirmed 2026-08-18):
   * `express_prices` re-prices whatever it names. The precedence is
   * *named here* → *else a ready SKU is left untouched* → *else the primary
   * takes the product-level figure* → *else pending*. So "untouched" describes
   * only the SKUs nobody names, which makes a blank row meaningful rather than
   * a gap in the form.
   */
  const { data: variantData } = useGetVariantsQuery(
    { productId: product?.id ?? "", limit: 50 },
    { skip: !isOpen || !product?.id || catalogType !== "express" },
  );
  const variants = variantData?.variants ?? [];

  /**
   * Whether the move takes the product off the screen it is being moved from.
   *
   * The general catalog (regular + express) and the marine catalog are served by
   * different endpoints and different screens, so crossing that boundary makes
   * the row vanish from the table underneath this dialog. Moving between regular
   * and express does not — both live on the Products list.
   */
  const isMarine = (type?: string) => type === "marine_emergency";
  const movesScreen = isMarine(catalogType) !== isMarine(product?.catalog_type);
  const destinationScreen = isMarine(catalogType) ? M.SCREEN_SPARES : M.SCREEN_PRODUCTS;

  // Fetched from the target's own scope, so the picker never offers a category
  // the move would reject.
  const { data: categories = [] } = useGetCategoriesByCatalogTypeQuery(
    { catalogType: categoryScope ?? "" },
    { skip: !isOpen || !showCategory },
  );

  useEffect(() => {
    if (!isOpen) return;
    setCatalogType(product?.catalog_type || "regular");
    setCategory("");
    setCategoryError("");
    setExpressPrice("");
    setExpressPriceError("");
    setVariantPrices({});
  }, [isOpen, product]);

  const handleConfirm = async () => {
    if (!product) return;
    if (requiresCategory && !category) {
      setCategoryError(M.CATEGORY_REQUIRED);
      return;
    }
    /**
     * Required only when the product is *arriving* on the express shelf.
     * Re-saving one that is already express may omit it and keeps every per-SKU
     * price as it is; sending one while leaving express is a 400.
     */
    if (movingToExpress && !(Number(expressPrice) > 0)) {
      setExpressPriceError(M.EXPRESS_PRICE_REQUIRED);
      return;
    }
    try {
      const res = await setCatalog({
        id: product.id,
        catalogType,
        // Sent whenever the target's scope differs from where the product sits;
        // omitted for express, which is valid alongside either scope.
        // Omitted when left blank — the product keeps the category it has.
        category: showCategory && category ? category : undefined,
        expressPrice: movingToExpress ? expressPrice : undefined,
        // Only the SKUs actually quoted. A blank row is a deliberate "leave it
        // pending", not a zero.
        expressPrices: Object.fromEntries(
          Object.entries(variantPrices).filter(([, value]) => Number(value) > 0),
        ),
      }).unwrap();

      /**
       * The express invariant is maintained asymmetrically, so the outcome is
       * reported rather than assumed (C3).
       *
       * **Leaving** express clears `is_express` on every live variant, which
       * also prevents the old resurrection bug where moving a product back
       * brought its stale flags with it — worth saying, because the operator
       * changed one field and N variants moved.
       *
       * **Entering** express flags nothing, since no machine can know which SKUs
       * are genuinely express-deliverable. A product that lands on the express
       * shelf with `flagged: 0` is stranded — present in the admin, invisible to
       * sailors — so that is warned about here, at the moment of the decision,
       * instead of being discovered later on the Express screen.
       */
      const ev = res?.express_variants;
      if (ev && ev.unflagged_by_this_call > 0) {
        toast.success(T.CATALOG_UPDATED_UNFLAGGED(ev.unflagged_by_this_call));
      } else if (ev && catalogType === "express" && ev.pending_price > 0) {
        // Not a success: those SKUs are on the shelf and cannot be bought.
        toast.warning(T.CATALOG_UPDATED_PENDING(ev.ready, ev.live_total, ev.pending_price));
      } else {
        toast.success(getApiMessage(res) ?? T.CATALOG_UPDATED);
      }
      onClose();
    } catch (err) {
      /**
       * The one case the dialog cannot predict: an express product holding a
       * marine category cannot return to regular with it. The server knows the
       * current category's scope, so its sentence goes on the field the operator
       * has to act in rather than into a toast that names no input.
       */
      const fieldErrors = getFieldErrors(err);
      if (fieldErrors.category) {
        setCategoryError(fieldErrors.category);
        return;
      }
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
          {/*
            C5: a catalog move relocates the row to a **different screen**, and
            the dialog used to close on a table the product had just left — which
            reads as a failed save rather than a successful move. Only shown when
            the destination actually changes screens: express and regular share
            the Products list, so moving between them is invisible in this sense.
          */}
          {isSameCatalog ? null : movesScreen ? (
            <p className="fg-hint mb-3">{M.MOVES_SCREEN(destinationScreen)}</p>
          ) : null}
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

          {/*
            Required on arrival at the express shelf. It reaches the **primary**
            variant only — the per-SKU list below is what keeps the rest
            sellable.
          */}
          {movingToExpress && (
            <FormField
              label={M.EXPRESS_PRICE_LABEL}
              hint={M.EXPRESS_PRICE_HINT}
              error={expressPriceError}
            >
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder={MESSAGES.PRODUCTS.FIELDS.PRICE_PLACEHOLDER}
                value={expressPrice}
                error={!!expressPriceError}
                onChange={(e) => {
                  setExpressPrice(e.target.value);
                  setExpressPriceError("");
                }}
              />
            </FormField>
          )}

          {/*
            Every other SKU, priced in the same call.

            A blank row is a deliberate "leave it pending", not a zero — but
            pending now means the SKU is refused by the express cart and at the
            till, so the consequence is stated rather than left to be found.

            `regular_price` is shown as **context for quoting**, never seeded
            into the input: one product's SKUs can be a 20 L drum and a 208 L
            barrel, and copying one figure across sells the barrel at the drum's
            price.
          */}
          {catalogType === "express" && variants.length > 0 && (
            <div className="mt-3">
              <div className="sec-label">{M.EXPRESS_SKUS_LABEL}</div>
              <p className="fg-hint mb-2">{M.EXPRESS_SKUS_HINT}</p>
              <div className="flex flex-col gap-2">
                {variants.map((v) => {
                  // Ready = flagged AND priced. Naming one here re-prices it;
                  // leaving it blank leaves it alone, per the precedence rule.
                  const isReady = v.isExpress && v.expressPrice !== null;
                  return (
                    <div key={v.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="mono text-[12px] trunc">{v.sku}</div>
                        <div className="fg-hint">
                          {isReady ? M.SKU_READY(v.expressPrice ?? 0) : M.REGULAR_PRICE(v.price)}
                        </div>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder={isReady ? M.EXPRESS_PRICE_KEEP : M.EXPRESS_PRICE_PLACEHOLDER}
                        className="w-32"
                        value={variantPrices[v.id] ?? ""}
                        onChange={(e) =>
                          setVariantPrices((prev) => ({ ...prev, [v.id]: e.target.value }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Irreversible in one direction: leaving clears every express price. */}
          {leavingExpress && (
            <p className="fg-hint mt-3 text-[var(--amber-700)]!">{M.LEAVING_EXPRESS}</p>
          )}

          {showCategory && (
            <FormField
              label={requiresCategory ? M.CATEGORY_LABEL : M.CATEGORY_LABEL_OPTIONAL}
              hint={requiresCategory ? M.CATEGORY_HINT : M.CATEGORY_HINT_OPTIONAL}
              error={categoryError}
            >
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
