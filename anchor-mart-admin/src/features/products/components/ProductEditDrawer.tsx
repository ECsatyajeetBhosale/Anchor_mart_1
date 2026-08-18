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
import { useGetEmergencyCategoriesQuery } from "@/features/emergency-categories";
import { FILE_LOCATIONS, ImageListField, toStoredPath } from "@/features/media";
import { useGetSpareProductQuery, useUpdateSpareProductMutation } from "@/features/spares";
import { allImageUrls, primaryImageUrl } from "@/features/variants";
import { getApiMessage, getFieldErrors } from "@/lib/apiError";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconBoxSeam, IconCheck, IconPackage } from "@tabler/icons-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useGetProductQuery, useUpdateProductMutation } from "../api/productApi";
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
const VT = MESSAGES.PRODUCTS.VARIANTS_TAB;

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
  /**
   * Marine spares are a **different endpoint**, not a different form.
   *
   * All three catalogs share one serializer, so the body and the editable list
   * are identical — but the marine routes are scope-partitioned: a marine id is
   * a **404** on the general detail/update routes and vice versa. So the drawer
   * switches which pair it talks to and changes nothing else, beyond hiding the
   * express price a marine product cannot have.
   */
  const isMarine = product.catalog_type === "marine_emergency";

  const [updateProduct, { isLoading: isUpdatingGeneral }] = useUpdateProductMutation();
  const [updateSpare, { isLoading: isUpdatingSpare }] = useUpdateSpareProductMutation();
  const isUpdating = isMarine ? isUpdatingSpare : isUpdatingGeneral;

  // The list serializer omits description/images, so load the full record.
  // Fall back to the row while the detail request is in flight.
  const { data: generalDetail, isFetching: isLoadingGeneral } = useGetProductQuery(product.id, {
    skip: !isOpen || isMarine,
  });
  const { data: marineDetail, isFetching: isLoadingMarine } = useGetSpareProductQuery(product.id, {
    skip: !isOpen || !isMarine,
  });
  /**
   * Both endpoints return `ProductDetailSerializer` — the marine one is
   * documented as "the same payload as create", `catalog_type` fixed and
   * `express_base_price: null`. `SpareProductDetail` is a looser hand-written
   * mirror of that same shape (nullable where this one is not), so it is read
   * through the general type rather than branching every field below.
   */
  const detail = (isMarine ? marineDetail : generalDetail) as Product | undefined;
  const isLoadingDetail = isMarine ? isLoadingMarine : isLoadingGeneral;
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
  /**
   * The category picker follows the product's catalog: a marine product must
   * keep a marine-scoped category, and a general one is a 400 on `category`.
   */
  const { data: generalCategories } = useGetCategoriesQuery(
    { limit: API_MAX_PAGE_SIZE },
    { skip: isMarine },
  );
  const { data: marineCategories } = useGetEmergencyCategoriesQuery(
    { limit: API_MAX_PAGE_SIZE },
    { skip: !isMarine },
  );
  const categoriesData = isMarine ? marineCategories : generalCategories;
  const categories = categoriesData?.results?.data ?? [];
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
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
      // The server's own name for it on read. 0 = none, which only a regular
      // product legitimately has.
      express_price: Number(source.express_base_price) || 0,
      images: rawImages.map(toImagePath).filter(Boolean),
      // The three writable flags. `is_express` and `on_deal` are not among them
      // — both are computed server-side and have no write path here.
      is_active: source.is_active ?? true,
      is_top_rated: source.is_top_rated ?? false,
      admin_sourceable: source.admin_sourceable ?? true,
    });
  }, [isOpen, source, categoriesData, reset]);

  /** The shelf decides whether Express Price applies; this endpoint cannot move it. */
  const isExpress = (source.catalog_type ?? "") === "express";

  /**
   * Stored path → viewable URL, so the images already on the product are shown
   * rather than listed as filenames.
   *
   * The detail response carries both halves — an absolute `image` URL per row,
   * which `toImagePath` reduces to the path the write side takes. Pairing them
   * here is what lets the field render a thumbnail for an image nobody has
   * re-uploaded this session.
   */
  const imagePreviewUrls = useMemo(() => {
    const rows = (source.images ?? []) as unknown as (ProductImage | string)[];
    const map: Record<string, string> = {};
    for (const row of rows) {
      const url = typeof row === "string" ? row : (row?.image ?? "");
      const path = toImagePath(row);
      if (url && path && url !== path) map[path] = url;
    }
    return map;
  }, [source.images]);

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
    /**
     * Express-only, and only when actually edited.
     *
     * Sending it on a regular product is a 400 pointing at `set-catalog-type/`,
     * and clearing it on an express one is a 400 the other way — so it is gated
     * on the product's current shelf, which this endpoint cannot change.
     */
    if (isExpress && dirtyFields.express_price) payload.express_price = formData.express_price;
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
      const response = await (isMarine
        ? updateSpare({ id: product.id, body: payload })
        : updateProduct({ id: product.id, body: payload })
      ).unwrap();
      // Success: close the drawer first, then notify.
      onClose();
      toast.success(getApiMessage(response) ?? MESSAGES.PRODUCTS.TOAST.UPDATE_SUCCESS);
    } catch (error) {
      /**
       * Pin field-keyed errors to their inputs. `express_base_price` is the
       * server's key for what this form calls `express_price` — it reports on
       * that name whichever the body used.
       */
      const fieldErrors = getFieldErrors(error);
      const known: Record<string, keyof ProductUpdateFormData> = {
        category: "category",
        name: "name",
        description: "description",
        base_price: "base_price",
        express_base_price: "express_price",
        express_price: "express_price",
        images: "images",
      };
      let pinned = false;
      for (const [key, field] of Object.entries(known)) {
        if (fieldErrors[key]) {
          setError(field, { type: "server", message: fieldErrors[key] });
          pinned = true;
        }
      }
      if (pinned) return;
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
                // Two tabs: what this endpoint writes, and what the variant
                // endpoints do. Media / Pricing / Shipping were panels of
                // read-only decoration over fields the contract has no place for.
                { label: MESSAGES.PRODUCTS.EDIT.TABS.BASIC, value: "pt-basic" },
                { label: MESSAGES.PRODUCTS.EDIT.TABS.VARIANTS, value: "pt-variants" },
              ]}
              value={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          {/* Basic Info — exactly the nine keys update-product accepts. */}
          {activeTab === "pt-basic" && (
            <div className="prod-tab mt-4">
              <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.DETAILS}</div>
              <FormRow>
                <FormField label="Product Name *" error={errors.name?.message}>
                  <Input
                    error={!!errors.name}
                    // 255 in the database, uncapped in the serializer.
                    maxLength={255}
                    {...register("name")}
                  />
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

              <FormField label="Description *" error={errors.description?.message}>
                <Textarea
                  className="h-28"
                  error={!!errors.description}
                  {...register("description")}
                />
              </FormField>

              <div className="sec-label mt-2">{MESSAGES.PRODUCTS.SECTIONS.PRICING}</div>
              <FormRow>
                <FormField
                  label="Base Price *"
                  hint="A display 'from' figure — it does not change any variant's price."
                  error={errors.base_price?.message}
                >
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    error={!!errors.base_price}
                    {...register("base_price")}
                  />
                </FormField>
                {/*
                  Express products only, and required while the product is one —
                  this endpoint cannot move it between shelves, so its current
                  type decides. Unlike Base Price it **cascades to the primary
                  variant**, which is what the sailor is actually charged.
                */}
                {isExpress && (
                  <FormField
                    label="Express Price *"
                    hint="Also updates the primary variant's express price."
                    error={errors.express_price?.message}
                  >
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      error={!!errors.express_price}
                      {...register("express_price")}
                    />
                  </FormField>
                )}
              </FormRow>

              <div className="sec-label mt-2">{MESSAGES.PRODUCTS.SECTIONS.MEDIA}</div>
              <FormField
                label="Product Images"
                hint="Sending images replaces the whole set — the first is the primary. Leave alone to keep them."
                error={errors.images?.message}
              >
                <ImageListField
                  values={images}
                  onChange={setImages}
                  fileLocation={FILE_LOCATIONS.PRODUCT_IMAGES}
                  previewUrls={imagePreviewUrls}
                />
              </FormField>

              <div className="sec-label mt-2">{MESSAGES.PRODUCTS.SECTIONS.FLAGS}</div>
              <div className="flex items-center gap-8 flex-wrap">
                <div className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name="is_active"
                    render={({ field }) => (
                      <Switch
                        id="edit-product-active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <label
                    htmlFor="edit-product-active"
                    className="text-[13px] font-semibold text-[var(--t2)]"
                  >
                    {MESSAGES.PRODUCTS.COLUMNS.STATUS}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name="admin_sourceable"
                    render={({ field }) => (
                      <Switch
                        id="edit-product-sourceable"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <label
                    htmlFor="edit-product-sourceable"
                    className="text-[13px] font-semibold text-[var(--t2)]"
                  >
                    {MESSAGES.PRODUCT_FLAGS.COLUMNS.SOURCEABLE}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name="is_top_rated"
                    render={({ field }) => (
                      <Switch
                        id="edit-product-top-rated"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <label
                    htmlFor="edit-product-top-rated"
                    className="text-[13px] font-semibold text-[var(--t2)]"
                  >
                    {MESSAGES.PRODUCT_FLAGS.COLUMNS.TOP_RATED}
                  </label>
                </div>
              </div>

              {/*
                Catalog type, SKU, variant prices and attributes are **not**
                editable here — the endpoint ignores them silently rather than
                rejecting them, so offering an input would have looked like it
                worked. Catalog moves go through set-catalog-type/, everything
                per-SKU through the Variants tab.
              */}
              <p className="fg-hint mt-4">{MESSAGES.PRODUCTS.EDIT.NOT_EDITABLE_HINT}</p>
            </div>
          )}

          {/* Read-only here: variants carry their own contract and are edited
              from the Products list (row menu → Manage variants). */}
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
