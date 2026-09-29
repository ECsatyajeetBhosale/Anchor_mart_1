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
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSetVariantExpressMutation } from "../api/variantApi";

const M = MESSAGES.VARIANTS.EXPRESS_DIALOG;

export interface SetVariantExpressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** The SKU being flagged or un-flagged; `null` closes the dialog. */
  variant: {
    id: string;
    sku: string;
    isExpress: boolean;
    expressPrice: number | null;
    /** Lets a catalog cascade refresh the product's own cache entry. */
    productId?: string | null;
  } | null;
  /**
   * Called when the write moved the **product** between catalogs.
   *
   * Flagging the last non-express SKU makes it an express product; un-flagging
   * one SKU of an all-express product returns it to its home shelf. Either way
   * the product has changed catalog under the caller, so whatever is open on top
   * of that list is now describing a row that has moved.
   */
  onCascade?: () => void;
}

/**
 * Flags a SKU as express-deliverable, **with its price**, or un-flags it.
 *
 * `set-express/` is the only way to make a SKU sellable as express: express is a
 * second price list, so the flag alone leaves the SKU *pending* — on the shelf
 * and refused by the express cart and again at the till. The price therefore
 * travels with the flag, which is why this is a form and not a ConfirmDialog.
 *
 * Un-flagging is the mirror: it **clears** the price (a price sent alongside
 * `false` is its own 400) and returns the SKU to its product's home shelf —
 * an express SKU is sold only on the express shelf (BUG-050). Both are stated
 * before the click, not reported after it.
 */
export function SetVariantExpressDialog({
  isOpen,
  onClose,
  variant,
  onCascade,
}: SetVariantExpressDialogProps) {
  const [setExpress, { isLoading }] = useSetVariantExpressMutation();
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");

  // Turning it ON when it is currently off; otherwise this is the un-flag path.
  const turningOn = !variant?.isExpress;

  useEffect(() => {
    if (!isOpen) return;
    // Seeded with the existing price when re-pricing a ready SKU — re-sending it
    // is how the price is changed through this endpoint.
    setPrice(variant?.expressPrice != null ? String(variant.expressPrice) : "");
    setError("");
  }, [isOpen, variant]);

  const handleConfirm = async () => {
    if (!variant) return;
    /**
     * A price is required unless the SKU already carries one — the endpoint
     * accepts a bare `true` in that case and keeps the existing figure. Checked
     * here so the operator is not told by a round-trip.
     */
    if (turningOn && variant.expressPrice == null && !(Number(price) > 0)) {
      setError(M.PRICE_REQUIRED);
      return;
    }
    try {
      const res = await setExpress({
        id: variant.id,
        isExpress: turningOn,
        // Never sent when un-flagging: that is a 400.
        expressPrice: turningOn ? price : undefined,
        productId: variant.productId,
      }).unwrap();

      /**
       * The product may have moved catalogs as a result — when this made every
       * SKU express, or un-flagged one of an all-express product. Reported
       * rather than assumed, because one click changed two records.
       */
      if (res.productCascaded) {
        toast.success(M.DONE_CASCADED(variant.sku, res.isExpress, res.productCatalogType ?? ""));
      } else {
        toast.success(M.DONE(variant.sku, res.isExpress));
      }
      onClose();
      // The product changed shelf, so the surface underneath is stale — the
      // caller decides what that means (the variants drawer closes itself).
      if (res.productCascaded) onCascade?.();
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.FAILED);
    }
  };

  if (!variant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{turningOn ? M.ON_TITLE : M.OFF_TITLE}</DialogTitle>
          <DialogDescription>
            {turningOn ? M.ON_DESCRIPTION(variant.sku) : M.OFF_DESCRIPTION(variant.sku)}
          </DialogDescription>
        </DialogHeader>

        {turningOn ? (
          <div className="mt-3">
            <FormField label={M.PRICE_LABEL} hint={M.PRICE_HINT} error={error}>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder={M.PRICE_PLACEHOLDER}
                value={price}
                error={!!error}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setError("");
                }}
              />
            </FormField>
          </div>
        ) : (
          <p className="fg-hint mt-3 text-[var(--amber-700)]!">{M.OFF_WARNING}</p>
        )}

        <DialogFooter className="mt-4">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {M.CANCEL}
          </Button>
          <Button variant="primary" size="sm" loading={isLoading} onClick={handleConfirm}>
            {turningOn ? M.ON_CONFIRM : M.OFF_CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SetVariantExpressDialog;
