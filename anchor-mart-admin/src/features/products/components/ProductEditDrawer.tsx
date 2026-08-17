import { DropdownSelect } from "@/components/common/DropdownSelect";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { Thumbnail } from "@/components/common/Thumbnail";
import { Badge } from "@/components/ui/badge";
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
import { useGetCategoriesQuery } from "@/features/catalog";
import { FILE_LOCATIONS, ImageListField, toStoredPath } from "@/features/media";
import { allImageUrls, primaryImageUrl } from "@/features/variants";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconBoxSeam, IconCheck, IconPackage, IconPhoto } from "@tabler/icons-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useGetProductQuery, useUpdateProductMutation } from "../api/productApi";
import { CATALOG_BADGE_VARIANT, catalogTypeLabel } from "../lib/catalogTypeFilters";
import { type ProductUpdateFormData, productUpdateSchema } from "../schemas/product.schema";
import type {
  Product,
  ProductDetailVariant,
  ProductImage,
  UpdateProductPayload,
} from "../types/product.types";

export interface ProductEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

// Static option lists for the read-only/decorative selects (not part of the
// update contract — shown for UI consistency only).
const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "SGD", label: "SGD (S$)" },
  { value: "EUR", label: "EUR (€)" },
];
const TAX_CLASS_OPTIONS = [
  { value: "Standard", label: "Standard" },
  { value: "Reduced", label: "Reduced" },
  { value: "Zero-rated", label: "Zero-rated" },
];
const WEIGHT_UNIT_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "lb", label: "lb" },
];
const PACKAGE_TYPE_OPTIONS = [
  { value: "Box", label: "Box" },
  { value: "Envelope", label: "Envelope" },
  { value: "Custom", label: "Custom" },
];
const VT = MESSAGES.PRODUCTS.VARIANTS_TAB;
const PR = MESSAGES.PRODUCTS.RECORD;
const DASH = MESSAGES.PRODUCTS.DASH;

/** Extract the stored relative path (e.g. "product_images/x.png") from an image. */
function toImagePath(img: ProductImage | string): string {
  return toStoredPath(typeof img === "string" ? img : img.image || img.image_url || "");
}

/** Renders an attribute map as `key: value · key: value`. */
function formatAttributes(attributes: Record<string, unknown>): string {
  const entries = Object.entries(attributes ?? {})
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${v}`);
  return entries.length ? entries.join(" · ") : "—";
}

/**
 * Whether a variant can actually be ordered, and why not when it can't.
 *
 * Flow 03/17: effective sourceability is the **AND** of the product master and
 * the variant flag, with both live. The detail payload omits `is_sourceable`,
 * so it is computed here — badging off the variant's own `admin_sourceable`
 * would call an unbuyable SKU orderable whenever the product switch is off.
 */
function orderableState(
  variant: ProductDetailVariant,
  product: Product,
): { orderable: boolean; reason?: string } {
  if (!variant.is_active) return { orderable: false, reason: VT.BLOCKED_INACTIVE };
  if (!variant.admin_sourceable) return { orderable: false, reason: VT.BLOCKED_BY_VARIANT };
  if (product.admin_sourceable === false || product.is_active === false) {
    return { orderable: false, reason: VT.BLOCKED_BY_PRODUCT };
  }
  return { orderable: true };
}

export function ProductEditDrawer({ isOpen, onClose, product }: ProductEditDrawerProps) {
  const [activeTab, setActiveTab] = useState("pt-basic");
  /** Which variant row is expanded; one at a time, null when none. */
  const [openVariantId, setOpenVariantId] = useState<string | null>(null);
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();

  // The list serializer omits description/images, so load the full record.
  // Fall back to the row while the detail request is in flight.
  const { data: detail, isFetching: isLoadingDetail } = useGetProductQuery(product.id, {
    skip: !isOpen,
  });
  /**
   * The list row and the detail merged, the detail winning on every key it
   * actually sends.
   *
   * `detail ?? product` looked equivalent and was not: `get-product/<id>/`
   * returns neither `on_deal` nor a product-level `is_express`, so the moment
   * the detail landed both reset to `false` — and both are on the update
   * contract. Saving a description therefore dropped the product out of the
   * deal carousel and out of the express catalog, silently, having never shown
   * the operator a flag they'd changed.
   *
   * Spreading keeps the row's value for any key the detail omits; a key the
   * detail does send still wins, `false` included. Memoised because the reset
   * effect below depends on this object's identity.
   */
  const source = useMemo(() => ({ ...product, ...detail }), [product, detail]);
  // Nested on the detail read, so the tab needs no request of its own; the list
  // row that seeds `product` never carries them.
  const variants: ProductDetailVariant[] = detail?.variants ?? [];

  // Category options for the editable category dropdown (value = UUID).
  const { data: categoriesData } = useGetCategoriesQuery({ limit: 100 });
  const categories = categoriesData?.results?.data ?? [];
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    // `dirtyFields` drives the PATCH body — see onSubmit.
    formState: { errors, dirtyFields },
  } = useForm<ProductUpdateFormData>({
    resolver: zodResolver(productUpdateSchema),
  });

  // Pre-populate the editable fields from the selected product whenever the
  // drawer opens (and once categories load, so we can resolve the category id).
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab("pt-basic");
    setOpenVariantId(null);
    const cats = categoriesData?.results?.data ?? [];
    const categoryId =
      source.category || cats.find((c) => c.name === source.category_name)?.id || "";
    const rawImages = (source.images ?? []) as unknown as (ProductImage | string)[];
    reset({
      category: categoryId,
      name: source.name ?? "",
      description: source.description ?? "",
      base_price: Number(source.base_price) || 0,
      images: rawImages.map(toImagePath).filter(Boolean),
      // The three writable flags. `is_express` and `on_deal` are not among them
      // — both are computed server-side and have no write path here.
      is_active: source.is_active ?? true,
      is_top_rated: source.is_top_rated ?? false,
      admin_sourceable: source.admin_sourceable ?? true,
    });
  }, [isOpen, source, categoriesData, reset]);

  const images = watch("images") ?? [];
  const setImages = (next: string[]) => setValue("images", next, { shouldDirty: true });

  const onSubmit = async (formData: ProductUpdateFormData) => {
    /**
     * **Only the fields the operator actually changed**, out of the eight this
     * endpoint accepts.
     *
     * update-product is a partial update whose reference body is two keys.
     * Sending a fixed body asserted values for fields nobody touched, and the
     * API drops unknown keys silently rather than 400ing — so neither the
     * over-sending nor the two unsupported flags it carried would ever have
     * surfaced as an error. Dirty-only keeps the request an accurate record of
     * the edit.
     */
    const payload: UpdateProductPayload = {};
    if (dirtyFields.category) payload.category = formData.category;
    if (dirtyFields.name) payload.name = formData.name;
    if (dirtyFields.description) payload.description = formData.description;
    if (dirtyFields.base_price) payload.base_price = formData.base_price;
    if (dirtyFields.images) payload.images = formData.images.filter(Boolean);
    if (dirtyFields.is_active) payload.is_active = formData.is_active;
    if (dirtyFields.is_top_rated) payload.is_top_rated = formData.is_top_rated;
    if (dirtyFields.admin_sourceable) payload.admin_sourceable = formData.admin_sourceable;

    // Nothing edited: an empty PATCH would be a round trip that says nothing
    // and a success toast for a change that never happened.
    if (Object.keys(payload).length === 0) {
      toast.info(MESSAGES.PRODUCTS.TOAST.NO_CHANGES);
      onClose();
      return;
    }

    try {
      const response = await updateProduct({ id: product.id, body: payload }).unwrap();
      // Success: close the drawer first, then notify.
      onClose();
      toast.success(getApiMessage(response) ?? MESSAGES.PRODUCTS.TOAST.UPDATE_SUCCESS);
    } catch (error) {
      // Failure: keep the drawer open so the user can fix and retry, then notify.
      toast.error(getApiMessage(error) ?? MESSAGES.PRODUCTS.TOAST.UPDATE_ERROR);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={800}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
              <IconBoxSeam size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">{MESSAGES.PRODUCTS.EDIT.TITLE}</SheetTitle>
              <SheetDescription>{MESSAGES.PRODUCTS.EDIT.SUBTITLE}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          <div className="sticky top-0 bg-[var(--surface)] z-10 mb-[18px] pt-[10px]">
            <DynamicTabs
              tabs={[
                { label: MESSAGES.PRODUCTS.EDIT.TABS.BASIC, value: "pt-basic" },
                { label: MESSAGES.PRODUCTS.EDIT.TABS.MEDIA, value: "pt-media" },
                { label: MESSAGES.PRODUCTS.EDIT.TABS.PRICING, value: "pt-pricing" },
                { label: MESSAGES.PRODUCTS.EDIT.TABS.SHIPPING, value: "pt-shipping" },
                { label: MESSAGES.PRODUCTS.EDIT.TABS.VARIANTS, value: "pt-variants" },
              ]}
              value={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          {/* Basic Info Tab */}
          {activeTab === "pt-basic" && (
            <div className="prod-tab mt-4">
              <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.DETAILS}</div>
              <FormRow>
                <FormField label="Product Title *" error={errors.name?.message}>
                  <Input
                    placeholder="Enter product name"
                    error={!!errors.name}
                    {...register("name")}
                  />
                </FormField>
                <FormField label="Product Subtitle" hint="Read-only — not sent on update">
                  <Input placeholder="Short product tagline" disabled />
                </FormField>
              </FormRow>
              <FormField label="Product Slug / URL Handle" hint="Read-only — not sent on update">
                <Input className="mono" placeholder="auto-generated-from-title" disabled />
              </FormField>
              <FormField label="Product Description *" error={errors.description?.message}>
                <Textarea
                  placeholder="Enter a detailed description for this product..."
                  className="h-[120px]"
                  error={!!errors.description}
                  {...register("description")}
                />
              </FormField>
              <FormField label="Short Description" hint="Read-only — not sent on update">
                <Textarea
                  maxLength={250}
                  placeholder="Brief summary (max 250 characters)"
                  className="h-16"
                  disabled
                />
              </FormField>
              <FormRow>
                <FormField label="Brand" hint="Read-only — not sent on update">
                  <Input placeholder="Search or add brand…" disabled />
                </FormField>
                <FormField label="Category *" error={errors.category?.message}>
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <DropdownSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={categoryOptions}
                        placeholder="Select category…"
                        width="100%"
                      />
                    )}
                  />
                </FormField>
              </FormRow>
              <div className="sec-label mt-2">{MESSAGES.PRODUCTS.SECTIONS.FLAGS}</div>
              <div className="grid grid-cols-2 gap-3">
                <Controller
                  control={control}
                  name="admin_sourceable"
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="pf-admin-sourceable"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <label
                        htmlFor="pf-admin-sourceable"
                        className="text-[13px] font-semibold text-[var(--t2)]"
                      >
                        {MESSAGES.PRODUCTS.TOGGLES.ADMIN_SOURCEABLE}
                      </label>
                    </div>
                  )}
                />
                {/*
                  `is_active` replaces the Express and On Deal switches that used
                  to sit here. Neither of those was writable — Express is a
                  serializer alias for the catalog type and On Deal is a live
                  annotation over the promotion module — and update-product drops
                  unknown keys without complaint, so both switches moved, saved,
                  reported success and changed nothing.

                  `is_active` is on the update contract and had no control at all,
                  which left deactivating a product impossible from the admin: the
                  only other route was delete, which is terminal.
                */}
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="pf-is-active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <label
                        htmlFor="pf-is-active"
                        className="text-[13px] font-semibold text-[var(--t2)]"
                      >
                        {MESSAGES.PRODUCTS.TOGGLES.ACTIVE}
                      </label>
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="is_top_rated"
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="pf-top-rated"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <label
                        htmlFor="pf-top-rated"
                        className="text-[13px] font-semibold text-[var(--t2)]"
                      >
                        {MESSAGES.PRODUCTS.TOGGLES.TOP_RATED}
                      </label>
                    </div>
                  )}
                />
              </div>

              {/*
                The system-set half of the record: everything `get-product/` sends
                that the update contract will not take back. Read-only by nature,
                not by omission — the hint says which, so a figure that cannot be
                typed over doesn't read as a broken field.

                It replaces a "Status" dropdown that was pinned to the literal
                "Active" for every product, inactive ones included, and offered
                Draft/Archived states this API has no concept of.
              */}
              <div className="sec-label mt-2">{PR.TITLE}</div>
              <div className="detail-kv">
                <div className="detail-k">{PR.CATALOG_TYPE}</div>
                <div className="detail-v">
                  <Badge
                    variant={CATALOG_BADGE_VARIANT[source.catalog_type ?? ""] ?? "neutral"}
                    className="text-[10px] h-[22px]"
                  >
                    {catalogTypeLabel(source.catalog_type) ?? DASH}
                  </Badge>
                </div>
              </div>
              {/*
                Deals are variant-level and live: this says whether any variant
                has a running one right now, which is why it can be true for a
                product whose other SKUs are at full price. Shown, never edited —
                a deal carries a price and a window that a switch cannot express.
              */}
              <div className="detail-kv">
                <div className="detail-k">{PR.ON_DEAL}</div>
                <div className="detail-v">
                  {source.on_deal ? (
                    <Badge variant="amber" className="text-[10px] h-[22px]">
                      {MESSAGES.PRODUCTS.DEAL_YES}
                    </Badge>
                  ) : (
                    PR.NO_DEAL
                  )}
                  <div className="fg-hint mt-1">{PR.DEAL_HINT}</div>
                </div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">{PR.RATING}</div>
                {/* 0 is "no ratings yet", not a score — saying so beats "0.0". */}
                <div className="detail-v">
                  {Number(source.average_rating) > 0
                    ? Number(source.average_rating).toFixed(1)
                    : PR.UNRATED}
                </div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">{PR.PURCHASES}</div>
                <div className="detail-v">{source.purchase_count ?? 0}</div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">{PR.VARIANTS}</div>
                {/* Count the nested array once the detail lands; until then the
                    row's own `variant_count` is the only figure available. */}
                <div className="detail-v">
                  {detail ? variants.length : (source.variant_count ?? 0)}
                </div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">{PR.INTERNAL}</div>
                <div className="detail-v">
                  {source.is_internal ? PR.INTERNAL_YES : PR.INTERNAL_NO}
                </div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">{PR.CREATED}</div>
                <div className="detail-v">{source.created_at ?? DASH}</div>
              </div>
              <div className="detail-kv">
                <div className="detail-k">{PR.UPDATED}</div>
                <div className="detail-v">{source.updated_at ?? DASH}</div>
              </div>
              <p className="fg-hint mt-2">{PR.HINT}</p>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === "pt-media" && (
            <div className="prod-tab mt-4">
              <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.MEDIA}</div>
              <FormField
                label="Product Images"
                hint="Upload files, or paste a stored path (e.g. product_images/example.png)."
              >
                <ImageListField
                  values={images}
                  onChange={setImages}
                  fileLocation={FILE_LOCATIONS.PRODUCT_IMAGES}
                />
              </FormField>

              <FormField label="Thumbnail Image" hint="Read-only — not sent on update">
                <div className="flex items-center gap-[14px]">
                  <button type="button" className="btn btn-secondary btn-sm" disabled>
                    <IconPhoto size={16} /> Pick Thumbnail
                  </button>
                </div>
              </FormField>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === "pt-pricing" && (
            <div className="prod-tab mt-4">
              <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.PRICING}</div>
              <FormRow>
                <FormField label="Base Price *" error={errors.base_price?.message}>
                  <Input
                    type="number"
                    step="0.01"
                    // The API's floor is 0.01, not 0 — a free product is a 400.
                    min="0.01"
                    placeholder="0.00"
                    error={!!errors.base_price}
                    {...register("base_price")}
                  />
                </FormField>
                <FormField label="Currency" hint="Read-only — not sent on update">
                  <DropdownSelect options={CURRENCY_OPTIONS} value="USD" width="100%" disabled />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Tax Class" hint="Read-only — not sent on update">
                  <DropdownSelect
                    options={TAX_CLASS_OPTIONS}
                    value="Standard"
                    width="100%"
                    disabled
                  />
                </FormField>
                <FormField label="Unit Price" hint="Read-only — not sent on update">
                  <Input placeholder="e.g. $2.00 / 100ml" disabled />
                </FormField>
              </FormRow>
              <FormRow className="mb-0">
                <div className="flex items-center gap-2">
                  <Switch id="sw-taxable" defaultChecked disabled />
                  <label
                    htmlFor="sw-taxable"
                    className="text-[13px] font-semibold text-[var(--t2)]"
                  >
                    {MESSAGES.PRODUCTS.TOGGLES.TAXABLE}
                  </label>
                </div>
              </FormRow>
            </div>
          )}

          {/* Shipping Tab — all read-only (not part of the update contract) */}
          {activeTab === "pt-shipping" && (
            <div className="prod-tab mt-4">
              <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.SHIPPING}</div>
              <FormRow className="mb-[14px]">
                <div className="flex items-center gap-2">
                  <Switch id="sw-physical" defaultChecked disabled />
                  <label
                    htmlFor="sw-physical"
                    className="text-[13px] font-semibold text-[var(--t2)]"
                  >
                    {MESSAGES.PRODUCTS.TOGGLES.PHYSICAL}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="sw-free-ship" disabled />
                  <label
                    htmlFor="sw-free-ship"
                    className="text-[13px] font-semibold text-[var(--t2)]"
                  >
                    {MESSAGES.PRODUCTS.TOGGLES.FREE_SHIPPING}
                  </label>
                </div>
              </FormRow>
              <FormRow columns={3}>
                <FormField label="Weight">
                  <Input type="number" placeholder="0" disabled />
                </FormField>
                <FormField label="Weight Unit">
                  <DropdownSelect options={WEIGHT_UNIT_OPTIONS} value="kg" width="100%" disabled />
                </FormField>
                <FormField label="Package Type">
                  <DropdownSelect
                    options={PACKAGE_TYPE_OPTIONS}
                    value="Box"
                    width="100%"
                    disabled
                  />
                </FormField>
              </FormRow>
            </div>
          )}

          {/* Variants Tab — read-only. Variants are not part of the
              update-product contract; they have their own endpoints and are
              edited from the Products list (row menu → Manage variants). */}
          {activeTab === "pt-variants" && (
            <div className="prod-tab mt-4">
              <div className="sec-label">
                {MESSAGES.PRODUCTS.SECTIONS.VARIANTS}
                <span className="td-m ml-2">{VT.COUNT(variants.length)}</span>
              </div>

              {variants.length === 0 ? (
                <p className="td-m">{VT.EMPTY}</p>
              ) : (
                <div className="var-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {/* The variant's own photo. `images[]` was on every row
                            of this payload and rendered nowhere, so two SKUs of
                            the same product were told apart by code alone. */}
                        <th className="w-14">{VT.COLUMNS.IMAGE}</th>
                        <th>{VT.COLUMNS.SKU}</th>
                        <th>{VT.COLUMNS.PRICE}</th>
                        <th>{VT.COLUMNS.ATTRIBUTES}</th>
                        <th>{VT.COLUMNS.EXPRESS}</th>
                        <th>{VT.COLUMNS.ORDERABLE}</th>
                        <th>{VT.COLUMNS.ADDED}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant) => {
                        const state = orderableState(variant, source);
                        const isOpen = openVariantId === variant.id;
                        const gallery = allImageUrls(variant.images);
                        return (
                          <Fragment key={variant.id}>
                            <tr
                              /**
                               * Expands in place rather than opening a drawer.
                               * This table already lives inside a `Sheet`, and a
                               * Dialog over a Sheet renders *behind* its overlay
                               * here — a defect the Orders and Intents screens
                               * both had to work around by closing the drawer
                               * first. Expanding keeps the product context and
                               * sidesteps the stacking problem entirely.
                               */
                              className="cursor-pointer hover:bg-[var(--surface-alt)]"
                              // Focusable and operable from the keyboard: the
                              // row is the only way to reach the images, so a
                              // mouse-only control would put them out of reach.
                              tabIndex={0}
                              aria-expanded={isOpen}
                              onClick={() => setOpenVariantId(isOpen ? null : variant.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setOpenVariantId(isOpen ? null : variant.id);
                                }
                              }}
                            >
                              <td>
                                <Thumbnail
                                  src={primaryImageUrl(variant.images)}
                                  alt={variant.sku}
                                  placeholder={<IconPackage size={14} />}
                                  className="h-9 w-9"
                                />
                              </td>
                              <td className="td-id">{variant.sku}</td>
                              <td className="td-p">${Number(variant.price).toFixed(2)}</td>
                              <td className="td-m">{formatAttributes(variant.attributes)}</td>
                              <td>
                                <Badge
                                  variant={variant.is_express ? "amber" : "neutral"}
                                  className="h-[20px] px-1.5 text-[9px]"
                                >
                                  {variant.is_express ? VT.YES : VT.NO}
                                </Badge>
                              </td>
                              <td>
                                {/* Computed, never read off `admin_sourceable`
                                  alone: a variant flagged sourceable is still
                                  unbuyable while the product master is off. */}
                                <Badge
                                  variant={state.orderable ? "success" : "warning"}
                                  className="h-[20px] px-1.5 text-[9px]"
                                  title={state.reason}
                                >
                                  {state.orderable ? VT.ORDERABLE_YES : VT.ORDERABLE_NO}
                                </Badge>
                              </td>
                              <td className="td-m">{variant.created_at ?? "—"}</td>
                            </tr>

                            {isOpen && (
                              <tr>
                                <td colSpan={7} className="!bg-[var(--surface-alt)]">
                                  <div className="px-2 py-3">
                                    <div className="sec-label">
                                      {VT.DETAIL.GALLERY(gallery.length)}
                                    </div>
                                    {gallery.length === 0 ? (
                                      <p className="td-m">{VT.DETAIL.NO_IMAGES}</p>
                                    ) : (
                                      <div className="flex flex-wrap gap-2">
                                        {gallery.map((url, i) => (
                                          <Thumbnail
                                            key={url}
                                            src={url}
                                            alt={VT.DETAIL.IMAGE_ALT(variant.sku, i + 1)}
                                            placeholder={<IconPackage size={18} />}
                                            className="h-24 w-24"
                                          />
                                        ))}
                                      </div>
                                    )}

                                    {/* The fields the row has no column for. */}
                                    <div className="sec-label mt16">{VT.DETAIL.DETAILS}</div>
                                    <div className="detail-kv">
                                      <div className="detail-k">{VT.DETAIL.CATALOG_TYPE}</div>
                                      <div className="detail-v">{variant.catalog_type ?? "—"}</div>
                                    </div>
                                    <div className="detail-kv">
                                      <div className="detail-k">{VT.DETAIL.ACTIVE}</div>
                                      <div className="detail-v">
                                        {variant.is_active ? VT.YES : VT.NO}
                                        {/*
                                          Deactivating a product does not cascade
                                          to its variants — they keep their own
                                          `is_active`. Ordering is still blocked
                                          (the Orderable badge above is the AND of
                                          both), but an Active child under an
                                          Inactive parent reads as a bug unless
                                          the inheritance is stated.
                                        */}
                                        {variant.is_active && source.is_active === false && (
                                          <div className="fg-hint mt-1">
                                            {VT.DETAIL.INHERITED_INACTIVE}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="detail-kv">
                                      {/* Only half the orderable rule — the badge
                                        above is the effective answer. */}
                                      <div className="detail-k">{VT.DETAIL.VARIANT_SOURCEABLE}</div>
                                      <div className="detail-v">
                                        {variant.admin_sourceable ? VT.YES : VT.NO}
                                      </div>
                                    </div>
                                    <div className="detail-kv">
                                      <div className="detail-k">{VT.DETAIL.ABOUT}</div>
                                      <div className="detail-v">{variant.about_product || "—"}</div>
                                    </div>
                                    <div className="detail-kv">
                                      <div className="detail-k">{VT.DETAIL.UPDATED}</div>
                                      <div className="detail-v">{variant.updated_at ?? "—"}</div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="fg-hint mt-3">{VT.READ_ONLY}</p>
            </div>
          )}
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end gap-3 w-full">
            <button
              type="button"
              className="btn btn-ghost btn-cancel"
              onClick={onClose}
              disabled={isUpdating}
            >
              {MESSAGES.COMMON.CANCEL}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={isUpdating || isLoadingDetail}
            >
              <IconCheck size={16} />
              {isUpdating ? MESSAGES.PRODUCTS.EDIT.SAVING : MESSAGES.PRODUCTS.EDIT.SUBMIT}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
