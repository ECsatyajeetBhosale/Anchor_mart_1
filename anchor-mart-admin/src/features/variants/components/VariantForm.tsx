import { IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FILE_LOCATIONS, ImageListField } from "@/features/media";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useCreateVariantMutation, useUpdateVariantMutation } from "../api/variantApi";
import type { ProductVariant, UpdateVariantPayload } from "../types/variant.types";

const M = MESSAGES.VARIANTS;
const F = M.FORM;
const V = M.VALIDATION;

export interface VariantFormProps {
  /** Product the variant belongs to — required when creating. */
  productId: string;
  /** The variant being edited, or null to create a new one. */
  variant: ProductVariant | null;
  /** Called after a successful save, and when the user cancels. */
  onDone: () => void;
}

interface FieldErrors {
  sku?: string;
  price?: string;
  attributes?: string;
}

/**
 * Add / edit form for a product variant, rendered **inline** beneath the variant
 * list rather than in a drawer of its own.
 *
 * It used to be a second `Sheet` stacked on top of the variants drawer, which
 * buried the list the admin was working from — the SKUs you need to see to
 * avoid a duplicate are exactly what the overlay covered. Inline keeps both on
 * screen.
 *
 * `attributes` is a free-form key/value map with no fixed schema, so it is
 * edited as raw JSON and validated before submit — a typed form would have to
 * invent fields the API does not define.
 */
export function VariantForm({ productId, variant, onDone }: VariantFormProps) {
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

  // Reseed whenever the target changes, so switching from one row's Edit to
  // another (without closing in between) never shows the previous values.
  useEffect(() => {
    setSku(variant?.sku && variant.sku !== "-" ? variant.sku : "");
    setPrice(variant ? String(variant.price) : "");
    setAttributesText(JSON.stringify(variant?.attributes ?? {}, null, 2));
    setImages(variant?.images ?? []);
    setIsActive(variant?.isActive ?? true);
    setErrors({});
  }, [variant]);

  /** Validates every field and returns the parsed attributes when all pass. */
  const validate = (): { ok: false } | { ok: true; attributes: Record<string, unknown> } => {
    const next: FieldErrors = {};

    if (!sku.trim()) next.sku = V.SKU_REQUIRED;

    const priceValue = Number(price);
    // The serializer's floor is **0.01**, not 0 — identical to `base_price`
    // (`DecimalField(max_digits=12, decimal_places=2, min_value=0.01)`), so a
    // price of 0 was a guaranteed 400 that only surfaced on submit. More than
    // two decimal places is rejected the same way.
    const centsOff = Math.abs(priceValue * 100 - Math.round(priceValue * 100)) >= 1e-9;
    if (price.trim() === "" || !Number.isFinite(priceValue) || priceValue < 0.01 || centsOff) {
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
        /**
         * **Only the fields actually changed.**
         *
         * The endpoint is a true partial that silently drops unknown keys, so a
         * fixed body is both unnecessary and invisible when wrong — the same
         * reasoning as every other write in this sweep. It matters more here:
         * **price changes are audited**, recording both sides, so re-sending an
         * unchanged price writes a phantom `PRICE_CHANGED` row claiming an edit
         * that never happened.
         *
         * `product` is deliberately never sent. The serializer accepts it and
         * would reparent the variant to another product — with no catalog-type
         * check, so a regular SKU could land under a marine product. Far too
         * heavy to ride along with an ordinary field edit.
         */
        const body: UpdateVariantPayload = {};
        const nextSku = sku.trim();
        const nextPrice = Number(price);
        if (nextSku !== variant.sku) body.sku = nextSku;
        if (nextPrice !== variant.price) body.price = nextPrice;
        if (JSON.stringify(result.attributes) !== JSON.stringify(variant.attributes)) {
          body.attributes = result.attributes;
        }
        if (JSON.stringify(cleanImages) !== JSON.stringify(variant.images)) {
          body.images = cleanImages;
        }
        if (isActive !== variant.isActive) body.is_active = isActive;

        if (Object.keys(body).length === 0) {
          toast.info(M.TOAST.NO_CHANGES);
          onDone();
          return;
        }

        await updateVariant({ id: variant.id, body }).unwrap();
        toast.success(M.TOAST.UPDATED(nextSku));
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
      onDone();
    } catch (err) {
      // Stay open on failure so the entered values survive a retry.
      toast.error(getApiMessage(err) ?? (isEdit ? M.TOAST.UPDATE_ERROR : M.TOAST.CREATE_ERROR));
    }
  };

  return (
    <section className="mt-5 rounded-[var(--radius-lg)] border border-[var(--border-md)] bg-[var(--surface-alt)]">
      <header className="flex items-center justify-between border-b border-[var(--border-xs)] px-5 py-3">
        <h3 className="text-[13.5px] font-extrabold text-[var(--t1)]">
          {isEdit ? F.EDIT_TITLE : F.ADD_TITLE}
        </h3>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-icon"
          onClick={onDone}
          disabled={isSaving}
          aria-label={F.CANCEL}
        >
          <IconX size={16} />
        </button>
      </header>

      <div className="p-5">
        <div className="form-row">
          {/*
            SKUs are unique across every variant, and the uniqueness check does
            not exclude soft-deleted rows — so a deleted variant's SKU stays
            reserved forever. Without saying so, re-creating a SKU you just
            deleted returns a conflict against a row that appears nowhere.
          */}
          <FormField label={F.SKU} hint={F.SKU_HINT} error={errors.sku}>
            <Input
              className="mono"
              value={sku}
              placeholder={F.SKU_PLACEHOLDER}
              error={!!errors.sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </FormField>
          <FormField label={F.PRICE} error={errors.price}>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              placeholder={F.PRICE_PLACEHOLDER}
              error={!!errors.price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label={F.ATTRIBUTES} hint={F.ATTRIBUTES_HINT} error={errors.attributes}>
          <Textarea
            className="mono h-32 min-h-0"
            value={attributesText}
            placeholder={F.ATTRIBUTES_PLACEHOLDER}
            error={!!errors.attributes}
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

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onDone} disabled={isSaving}>
            {F.CANCEL}
          </Button>
          <Button variant="primary" size="sm" loading={isSaving} onClick={handleSubmit}>
            {F.SAVE}
          </Button>
        </div>
      </div>
    </section>
  );
}

export default VariantForm;
