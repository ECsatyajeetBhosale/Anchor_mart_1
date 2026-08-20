import { IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FILE_LOCATIONS, ImageListField, toStoredPath } from "@/features/media";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useCreateVariantMutation, useUpdateVariantMutation } from "../api/variantApi";
import type { ProductVariant, UpdateVariantPayload } from "../types/variant.types";

const M = MESSAGES.VARIANTS;
/** Matches the serializer's `max_length` on both add and update. */
const SKU_MAX_LENGTH = 100;
const F = M.FORM;
const V = M.VALIDATION;

export interface VariantFormProps {
  /** Product the variant belongs to — required when creating. */
  productId: string;
  /** The variant being edited, or null to create a new one. */
  variant: ProductVariant | null;
  /**
   * The parent product's catalog. Express parents get an express price field —
   * on create it decides whether the SKU is born Express-ready or pending, and
   * on edit it re-prices an already-flagged one.
   */
  productCatalogType?: string;
  /** Called after a successful save, and when the user cancels. */
  onDone: () => void;
}

interface FieldErrors {
  sku?: string;
  price?: string;
  expressPrice?: string;
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
export function VariantForm({ productId, variant, productCatalogType, onDone }: VariantFormProps) {
  const isEdit = Boolean(variant);
  const isExpressParent = productCatalogType === "express";
  /**
   * On edit this field re-prices an **already-flagged** SKU — a price sent for
   * an unflagged one is a 400 pointing at `set-express/`, which is the only way
   * to enable express. So a pending SKU gets no field here; it gets the express
   * toggle instead.
   */
  const canPriceExpress = isExpressParent && (!isEdit || variant?.isExpress === true);

  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [expressPrice, setExpressPrice] = useState("");
  /**
   * Attributes as **rows**, matching the product form.
   *
   * This was a raw JSON textarea — defensible when the map has no fixed schema,
   * but it made a free-form field a typing exercise: a missing brace or a
   * trailing comma failed the whole save, and nothing about `{"size": "L"}`
   * needs an operator to know JSON. Rows are flattened to the same object on
   * submit.
   */
  const [attributeRows, setAttributeRows] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
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
    setExpressPrice(variant?.expressPrice != null ? String(variant.expressPrice) : "");
    // An existing map becomes one row per pair; a new SKU gets a single blank
    // row so the section reads as editable rather than absent.
    const entries = Object.entries(variant?.attributes ?? {});
    setAttributeRows(
      entries.length > 0
        ? entries.map(([key, value]) => ({ key, value: value == null ? "" : String(value) }))
        : [{ key: "", value: "" }],
    );
    setImages(variant?.images ?? []);
    setIsActive(variant?.isActive ?? true);
    setErrors({});
  }, [variant]);

  /**
   * Stored path → viewable URL, so the images already on the variant are shown
   * rather than listed as filenames.
   *
   * Keyed by path rather than zipped by index: `imageUrls` is ordered for
   * display (primary first) and `images` in the order the write payload takes,
   * so position tells you nothing. `toStoredPath` is the one thing both sides
   * agree on.
   */
  const imagePreviewUrls = useMemo(() => {
    const map: Record<string, string> = {};
    for (const url of variant?.imageUrls ?? []) {
      const path = toStoredPath(url);
      if (path && url !== path) map[path] = url;
    }
    return map;
  }, [variant?.imageUrls]);

  /** Validates every field and returns the parsed attributes when all pass. */
  const validate = (): { ok: false } | { ok: true; attributes: Record<string, unknown> } => {
    const next: FieldErrors = {};

    if (!sku.trim()) next.sku = V.SKU_REQUIRED;
    else if (sku.trim().length > SKU_MAX_LENGTH) next.sku = V.SKU_TOO_LONG(SKU_MAX_LENGTH);

    const priceValue = Number(price);
    // The serializer's floor is **0.01**, not 0 — identical to `base_price`
    // (`DecimalField(max_digits=12, decimal_places=2, min_value=0.01)`), so a
    // price of 0 was a guaranteed 400 that only surfaced on submit. More than
    // two decimal places is rejected the same way.
    const centsOff = Math.abs(priceValue * 100 - Math.round(priceValue * 100)) >= 1e-9;
    if (price.trim() === "" || !Number.isFinite(priceValue) || priceValue < 0.01 || centsOff) {
      next.price = V.PRICE_INVALID;
    }

    /**
     * Rows → the object the API takes. A row with a blank key is dropped rather
     * than sent under an empty name; duplicates are rejected, because they would
     * silently collapse with whichever row happened to be last.
     */
    const named = attributeRows.filter((row) => row.key.trim());
    const seen = new Set<string>();
    for (const row of named) {
      const k = row.key.trim().toLowerCase();
      if (seen.has(k)) next.attributes = V.ATTRIBUTES_DUPLICATE;
      seen.add(k);
    }
    const attributes: Record<string, unknown> = Object.fromEntries(
      named.map((row) => [row.key.trim(), row.value]),
    );

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
        /**
         * Audited like `price`, so only sent when it actually moved — an
         * unchanged re-send would write a phantom price-change row.
         */
        if (canPriceExpress) {
          const nextExpress = Number(expressPrice);
          if (expressPrice.trim() !== "" && nextExpress !== variant.expressPrice) {
            body.express_price = nextExpress;
          }
        }

        if (Object.keys(body).length === 0) {
          toast.info(M.TOAST.NO_CHANGES);
          onDone();
          return;
        }

        const updated = await updateVariant({ id: variant.id, body }).unwrap();
        /**
         * One field edit can move the **product**: deactivating the last
         * express-ready SKU takes it off the express shelf. Reported rather than
         * absorbed into "Variant updated", because the operator changed a switch
         * on this row and a different record moved.
         */
        if (updated?.cascades?.productCascaded) {
          toast.success(
            M.TOAST.UPDATED_CASCADED(nextSku, updated.cascades.productCatalogType ?? ""),
          );
        } else {
          toast.success(M.TOAST.UPDATED(nextSku));
        }
      } else {
        await createVariant({
          product: productId,
          sku: sku.trim(),
          price: Number(price),
          attributes: result.attributes,
          images: cleanImages,
          // Its presence is the decision: with it the SKU is born Express-ready,
          // without it, pending. Never sent under a non-express parent (400).
          ...(canPriceExpress && expressPrice.trim() !== ""
            ? { express_price: Number(expressPrice) }
            : {}),
        }).unwrap();
        toast.success(
          canPriceExpress && expressPrice.trim() === ""
            ? M.TOAST.CREATED_PENDING(sku.trim())
            : M.TOAST.CREATED(sku.trim()),
        );
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
              // The column is 100 chars. An over-long SKU used to reach it and
              // surface as a 500 rather than a validation error.
              maxLength={SKU_MAX_LENGTH}
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

        {/*
          Express is a second price list, so this is a separate charge — not a
          surcharge on the regular price above.

          On create, leaving it blank is a deliberate choice: the SKU is filed
          **pending**, on the shelf but refused by the express cart until someone
          quotes it. On edit it only appears for a SKU already flagged express;
          enabling express is `set-express/`, which takes the price with it.
        */}
        {canPriceExpress && (
          <FormField
            label={F.EXPRESS_PRICE}
            hint={isEdit ? F.EXPRESS_PRICE_HINT_EDIT : F.EXPRESS_PRICE_HINT_ADD}
            error={errors.expressPrice}
          >
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={expressPrice}
              placeholder={F.PRICE_PLACEHOLDER}
              error={!!errors.expressPrice}
              onChange={(e) => setExpressPrice(e.target.value)}
            />
          </FormField>
        )}

        <FormField label={F.ATTRIBUTES} hint={F.ATTRIBUTES_HINT} error={errors.attributes}>
          <div className="flex flex-col gap-2">
            {attributeRows.map((row, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: ordered editable rows, keys may repeat while typing
              <div key={index} className="flex items-start gap-2">
                <Input
                  className="flex-1"
                  placeholder={F.ATTRIBUTE_KEY_PLACEHOLDER}
                  value={row.key}
                  onChange={(e) =>
                    setAttributeRows((prev) =>
                      prev.map((r, i) => (i === index ? { ...r, key: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  className="flex-1"
                  placeholder={F.ATTRIBUTE_VALUE_PLACEHOLDER}
                  value={row.value}
                  onChange={(e) =>
                    setAttributeRows((prev) =>
                      prev.map((r, i) => (i === index ? { ...r, value: e.target.value } : r)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  title={F.ATTRIBUTE_REMOVE}
                  onClick={() => setAttributeRows((prev) => prev.filter((_, i) => i !== index))}
                >
                  <IconTrash size={15} />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="w-fit"
              onClick={() => setAttributeRows((prev) => [...prev, { key: "", value: "" }])}
            >
              <IconPlus size={15} className="mr-1" />
              {F.ATTRIBUTE_ADD}
            </Button>
          </div>
        </FormField>

        <FormField label={F.IMAGES}>
          <ImageListField
            values={images}
            onChange={setImages}
            fileLocation={FILE_LOCATIONS.VARIANT_IMAGES}
            placeholder={F.IMAGES_PLACEHOLDER}
            previewUrls={imagePreviewUrls}
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
