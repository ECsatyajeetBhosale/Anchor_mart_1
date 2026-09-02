import { IconDiscount2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DatePicker } from "@/components/common/DatePicker";
import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { SearchableSelect } from "@/components/common/SearchableSelect";
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
import { Textarea } from "@/components/ui/textarea";
import { CATALOG_TYPE_FILTERS, catalogTypeLabel, useProductPicker } from "@/features/products";
import { useGetVariantsQuery } from "@/features/variants";
import { getApiMessage } from "@/lib/apiError";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { formatCurrency } from "@/lib/utils";
import { useCreateDealMutation, useUpdateDealMutation } from "../api/promotionApi";
import type { Deal } from "../types/reward.types";

const M = MESSAGES.PROMOTION.DEALS;
const F = M.FORM;
const V = M.VALIDATION;

export interface DealFormDrawerProps {
  /** The deal being edited, or null to create a new one. */
  deal: Deal | null;
  isOpen: boolean;
  onClose: () => void;
}

interface FieldErrors {
  product?: string;
  variant?: string;
  price?: string;
  start?: string;
  end?: string;
}

export function DealFormDrawer({ deal, isOpen, onClose }: DealFormDrawerProps) {
  const isEdit = Boolean(deal);

  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [price, setPrice] = useState("");
  const [terms, setTerms] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const [createDeal, { isLoading: isCreating }] = useCreateDealMutation();
  const [updateDeal, { isLoading: isUpdating }] = useUpdateDealMutation();
  const isSaving = isCreating || isUpdating;

  /**
   * The same whole-catalog picker Analytics uses — server-side search, catalog
   * type chips and paged loading, shared through `useProductPicker`.
   *
   * It replaces a `get-products/` call, which serves the **general catalog
   * only**: the 14 marine-emergency products were absent from this dropdown
   * entirely, so no deal could ever be scheduled on a marine-emergency spare.
   * The same defect was fixed on the Analytics picker; sharing the hook is what
   * stops it recurring on the next screen that needs a product.
   */
  const picker = useProductPicker(isOpen);

  // Variants are scoped to the chosen product — a deal must price a SKU that
  // actually belongs to it. One page is ample: a product carries a handful of
  // SKUs, nowhere near the 50-row cap.
  const { data: variantsData } = useGetVariantsQuery(
    { productId, limit: API_MAX_PAGE_SIZE },
    { skip: !isOpen || !productId },
  );
  const variants = variantsData?.variants ?? [];
  /** The chosen SKU, for the price ceiling shown under the deal-price field. */
  const selectedVariant = variants.find((v) => v.id === variantId);

  useEffect(() => {
    if (!isOpen) return;
    setProductId(deal?.productId ?? "");
    setVariantId(deal?.variantId ?? "");
    setPrice(deal ? String(deal.dealPriceValue) : "");
    setTerms(deal?.termsAndConditions ?? "");
    setStart(deal?.startTime ?? "");
    setEnd(deal?.endTime ?? "");
    setErrors({});
  }, [isOpen, deal]);

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!productId) next.product = V.PRODUCT_REQUIRED;
    if (!variantId) next.variant = V.VARIANT_REQUIRED;

    const priceValue = Number(price);
    if (!price.trim() || !Number.isFinite(priceValue) || priceValue <= 0) {
      next.price = V.PRICE_INVALID;
    }

    if (!start) next.start = V.START_REQUIRED;
    if (!end) next.end = V.END_REQUIRED;
    // Only meaningful once both dates exist; string compare is safe on ISO dates.
    if (start && end && end < start) next.end = V.END_BEFORE_START;

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const body = {
      product: productId,
      variant: variantId,
      // The API takes the price as a decimal string, not a number.
      deal_price: Number(price).toFixed(2),
      terms_and_conditions: terms.trim() || undefined,
      start_time: start,
      end_time: end,
    };

    try {
      if (isEdit && deal) {
        await updateDeal({ id: deal.id, body }).unwrap();
        toast.success(M.TOAST.UPDATED);
      } else {
        await createDeal(body).unwrap();
        toast.success(M.TOAST.CREATED);
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
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconDiscount2 size={22} />
            </div>
            <div>
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {isEdit ? F.EDIT_TITLE : F.ADD_TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {F.VARIANT_HINT}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <FormField label={F.PRODUCT} error={errors.product}>
            {/* Search, type chips and "Load more" are all inside the control —
                the same one the Analytics product picker uses. */}
            <SearchableSelect
              value={productId}
              onValueChange={(val) => {
                setProductId(val);
                // The old variant belongs to the previous product — clear it.
                setVariantId("");
              }}
              // Each row carries its catalog type, so a marine-emergency spare
              // is distinguishable from a regular product before it is picked.
              options={picker.options.map((o) => ({
                value: o.value,
                label: o.label,
                meta: catalogTypeLabel(o.catalogType),
              }))}
              filters={CATALOG_TYPE_FILTERS}
              activeFilter={picker.catalogType}
              onFilterChange={picker.setCatalogType}
              search={picker.search}
              onSearchChange={picker.setSearch}
              hasMore={picker.hasMore}
              onLoadMore={picker.loadMore}
              isLoading={picker.isFetching}
              placeholder={F.PRODUCT_PLACEHOLDER}
              width="100%"
            />
          </FormField>

          <FormField label={F.VARIANT} hint={F.VARIANT_HINT} error={errors.variant}>
            {/* The SKU alone was not enough to price against. The backend
                rejects any `deal_price` that is not **below** `variant.price`,
                and that price was nowhere on this form — so the admin picked a
                SKU, guessed a figure and learned the ceiling from a 400. */}
            <DropdownSelect
              value={variantId}
              onValueChange={setVariantId}
              placeholder={F.VARIANT_PLACEHOLDER}
              options={variants.map((v) => ({
                value: v.id,
                label: `${v.sku} · ${formatCurrency(v.price)}`,
              }))}
              width="100%"
              disabled={!productId}
            />
          </FormField>

          {/* The ceiling, stated rather than discovered: the API refuses a deal
              price that is not below the variant's. Shown as a hint, not a
              blocking rule — the server owns the rule, this just stops the
              admin having to find it by being rejected. */}
          <FormField
            label={F.PRICE}
            hint={
              selectedVariant ? F.PRICE_CEILING(formatCurrency(selectedVariant.price)) : undefined
            }
            error={errors.price}
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              placeholder={F.PRICE_PLACEHOLDER}
              onChange={(e) => setPrice(e.target.value)}
            />
          </FormField>

          <div className="form-row">
            <FormField label={F.START} error={errors.start}>
              <DatePicker
                value={start}
                onChange={setStart}
                placeholder={MESSAGES.COMMON.PICK_DATE}
              />
            </FormField>
            <FormField label={F.END} error={errors.end}>
              <DatePicker value={end} onChange={setEnd} placeholder={MESSAGES.COMMON.PICK_DATE} />
            </FormField>
          </div>

          <FormField label={F.TERMS}>
            <Textarea
              className="h-20 min-h-0"
              value={terms}
              placeholder={F.TERMS_PLACEHOLDER}
              onChange={(e) => setTerms(e.target.value)}
            />
          </FormField>
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

export default DealFormDrawer;
