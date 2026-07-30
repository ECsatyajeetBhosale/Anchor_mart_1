import { IconStack2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FILE_LOCATIONS, ImageListField } from "@/features/media";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useCreateVariantMutation, useUpdateVariantMutation } from "../api/variantApi";
import type { ProductVariant } from "../types/variant.types";

const M = MESSAGES.VARIANTS;
const F = M.FORM;
const V = M.VALIDATION;

export interface VariantFormDrawerProps {
  /** Product the variant belongs to — required when creating. */
  productId: string;
  /** The variant being edited, or null to create a new one. */
  variant: ProductVariant | null;
  isOpen: boolean;
  onClose: () => void;
}

interface FieldErrors {
  sku?: string;
  price?: string;
  attributes?: string;
}

/**
 * Add / edit drawer for a product variant.
 *
 * `attributes` is a free-form key/value map with no fixed schema, so it is
 * edited as raw JSON and validated before submit — a typed form would have to
 * invent fields the API does not define.
 */
export function VariantFormDrawer({ productId, variant, isOpen, onClose }: VariantFormDrawerProps) {
  const isEdit = Boolean(variant);

  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [attributesText, setAttributesText] = useState("{}");
  const [images, setImages] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [createVariant, { isLoading: isCreating }] = useCreateVariantMutation();
  const [updateVariant, { isLoading: isUpdating }] = useUpdateVariantMutation();
  const isSaving = isCreating || isUpdating;

  // Reset from the selected variant each time the drawer opens, so a reopened
  // form never shows the previous row's values.
  useEffect(() => {
    if (!isOpen) return;
    setSku(variant?.sku && variant.sku !== "-" ? variant.sku : "");
    setPrice(variant ? String(variant.price) : "");
    setAttributesText(JSON.stringify(variant?.attributes ?? {}, null, 2));
    setImages(variant?.images ?? []);
    setIsActive(variant?.isActive ?? true);
    setErrors({});
  }, [isOpen, variant]);

  /** Validates every field and returns the parsed attributes when all pass. */
  const validate = (): { ok: false } | { ok: true; attributes: Record<string, unknown> } => {
    const next: FieldErrors = {};

    if (!sku.trim()) next.sku = V.SKU_REQUIRED;

    const priceValue = Number(price);
    if (price.trim() === "" || !Number.isFinite(priceValue) || priceValue < 0) {
      next.price = V.PRICE_INVALID;
    }

    let attributes: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(attributesText || "{}");
      // Arrays and primitives are valid JSON but not a valid attribute map.
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        next.attributes = V.ATTRIBUTES_INVALID;
      } else {
        attributes = parsed as Record<string, unknown>;
      }
    } catch {
      next.attributes = V.ATTRIBUTES_INVALID;
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return { ok: false };
    return { ok: true, attributes };
  };

  const handleSubmit = async () => {
    const result = validate();
    if (!result.ok) return;

    // Blank rows are an artefact of the editable list, not intent.
    const cleanImages = images.map((i) => i.trim()).filter(Boolean);

    try {
      if (isEdit && variant) {
        await updateVariant({
          id: variant.id,
          body: {
            sku: sku.trim(),
            price: Number(price),
            attributes: result.attributes,
            images: cleanImages,
            is_active: isActive,
          },
        }).unwrap();
        toast.success(M.TOAST.UPDATED(sku.trim()));
      } else {
        await createVariant({
          product: productId,
          sku: sku.trim(),
          price: Number(price),
          attributes: result.attributes,
          images: cleanImages,
        }).unwrap();
        toast.success(M.TOAST.CREATED(sku.trim()));
      }
      onClose();
    } catch (err) {
      toast.error(getApiMessage(err) ?? (isEdit ? M.TOAST.UPDATE_ERROR : M.TOAST.CREATE_ERROR));
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={620}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconStack2 size={22} />
            </div>
            <div>
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {isEdit ? F.EDIT_TITLE : F.ADD_TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {M.SOURCEABLE_HINT}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="form-row">
            <FormField label={F.SKU} error={errors.sku}>
              <Input
                value={sku}
                placeholder={F.SKU_PLACEHOLDER}
                onChange={(e) => setSku(e.target.value)}
              />
            </FormField>
            <FormField label={F.PRICE} error={errors.price}>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={price}
                placeholder={F.PRICE_PLACEHOLDER}
                onChange={(e) => setPrice(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label={F.ATTRIBUTES} hint={F.ATTRIBUTES_HINT} error={errors.attributes}>
            <Textarea
              className="mono h-32 min-h-0"
              value={attributesText}
              placeholder={F.ATTRIBUTES_PLACEHOLDER}
              onChange={(e) => setAttributesText(e.target.value)}
            />
          </FormField>

          <FormField label={F.IMAGES}>
            <ImageListField
              values={images}
              onChange={setImages}
              fileLocation={FILE_LOCATIONS.VARIANT_IMAGES}
              placeholder={F.IMAGES_PLACEHOLDER}
            />
          </FormField>

          {/* Only the update contract carries is_active; creation defaults to true. */}
          {isEdit && (
            <FormField label={F.ACTIVE}>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </FormField>
          )}
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
              {F.CANCEL}
            </Button>
            <Button variant="primary" size="sm" loading={isSaving} onClick={handleSubmit}>
              {F.SAVE}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default VariantFormDrawer;
