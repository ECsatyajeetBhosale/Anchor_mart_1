import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { StringListField } from "@/components/common/StringListField";
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
import { FILE_LOCATIONS, ImageListField } from "@/features/media";
import { getApiMessage } from "@/lib/apiError";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconBoxSeam, IconCheck } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateProductMutation } from "../api/productApi";
import { type ProductAddFormData, productAddSchema } from "../schemas/product.schema";
import type { AddProductPayload } from "../types/product.types";

export interface ProductAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CURRENCY_OPTIONS = [
  { value: "INR", label: "INR (₹)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "SGD", label: "SGD (S$)" },
];
const GENDER_OPTIONS = [
  { value: "Men", label: "Men" },
  { value: "Women", label: "Women" },
  { value: "Unisex", label: "Unisex" },
  { value: "Kids", label: "Kids" },
];
const SEASON_OPTIONS = [
  { value: "All-Season", label: "All-Season" },
  { value: "Summer", label: "Summer" },
  { value: "Winter", label: "Winter" },
  { value: "Spring", label: "Spring" },
  { value: "Autumn", label: "Autumn" },
];

/**
 * The catalogs a product can be **created** into. Marine emergency is not one:
 * it keeps its own category set, and this drawer's category picker lists the
 * general ones. It is reached afterwards via the catalog dialog, which asks for
 * a category from the right set.
 */
const ADD_CATALOG_OPTIONS = [
  { value: "regular", label: MESSAGES.COMMON.PRODUCT_PICKER.CATALOG_TYPE.regular },
  { value: "express", label: MESSAGES.COMMON.PRODUCT_PICKER.CATALOG_TYPE.express },
];

// API-specified defaults for the create payload.
const ADD_DEFAULTS: ProductAddFormData = {
  category: "",
  name: "",
  description: "",
  images: [],
  base_price: 0,
  sku: "",
  catalog_type: "regular",
  admin_sourceable: true,
  is_top_rated: false,
  attributes: {
    id: "",
    product_name: "",
    category: "",
    subcategory: "",
    gender: "",
    brand: "",
    color: "",
    material: { primary: "", secondary: "", elastane: "" },
    fit: "",
    rise: "",
    length: "",
    closure_type: "",
    pockets: [],
    care_instructions: "",
    season: "",
    price: { amount: 0, currency: "INR", discounted: false },
  },
};

export function ProductAddDrawer({ isOpen, onClose }: ProductAddDrawerProps) {
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();

  const { data: categoriesData } = useGetCategoriesQuery({ limit: API_MAX_PAGE_SIZE });
  const categoryOptions = (categoriesData?.results?.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductAddFormData>({
    resolver: zodResolver(productAddSchema),
    defaultValues: ADD_DEFAULTS,
  });

  // Selecting a category submits its id as the top-level `category`, and mirrors
  // the readable name into `attributes.category` (which the API expects by name).
  const handleCategorySelect = (id: string) => {
    setValue("category", id, { shouldDirty: true, shouldValidate: true });
    const name = categoryOptions.find((opt) => opt.value === id)?.label ?? "";
    setValue("attributes.category", name, { shouldDirty: true });
  };

  // Reset to a clean form each time the drawer opens. On a failed submit the
  // drawer stays open and isOpen doesn't change, so entered data is preserved.
  useEffect(() => {
    if (isOpen) reset(ADD_DEFAULTS);
  }, [isOpen, reset]);

  const onSubmit = async (formData: ProductAddFormData) => {
    const payload: AddProductPayload = {
      category: formData.category,
      name: formData.name,
      description: formData.description,
      images: formData.images.filter(Boolean),
      base_price: formData.base_price,
      catalog_type: formData.catalog_type,
      admin_sourceable: formData.admin_sourceable,
      is_top_rated: formData.is_top_rated,
      sku: formData.sku,
      attributes: {
        ...formData.attributes,
        pockets: formData.attributes.pockets.filter(Boolean),
      },
    };

    try {
      const response = await createProduct(payload).unwrap();
      // Success: close the drawer first, then notify.
      onClose();
      toast.success(getApiMessage(response) ?? MESSAGES.PRODUCTS.TOAST.ADD_SUCCESS);
    } catch (error) {
      // Failure: keep the drawer open (data preserved) so the user can retry.
      console.error("add-product failed:", error);
      toast.error(getApiMessage(error) ?? MESSAGES.PRODUCTS.TOAST.ADD_ERROR);
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
              <SheetTitle className="text-xl">{MESSAGES.PRODUCTS.ADD.TITLE}</SheetTitle>
              <SheetDescription>{MESSAGES.PRODUCTS.ADD.SUBTITLE}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-6">
          {/* Basic Information */}
          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.BASIC}</div>
            <FormRow>
              <FormField label="Product Name *" error={errors.name?.message}>
                <Input placeholder="e.g. Pant2" error={!!errors.name} {...register("name")} />
              </FormField>
              <FormField label="Category *" error={errors.category?.message}>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <DropdownSelect
                      value={field.value}
                      onValueChange={handleCategorySelect}
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
                placeholder="Describe the product…"
                className="h-24"
                error={!!errors.description}
                {...register("description")}
              />
            </FormField>
          </section>

          {/* Product Media */}
          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.MEDIA}</div>
            <FormField
              label="Product Images"
              hint="Upload files, or paste a stored path (e.g. product_images/example.png)."
            >
              <Controller
                control={control}
                name="images"
                render={({ field }) => (
                  <ImageListField
                    values={field.value}
                    onChange={field.onChange}
                    fileLocation={FILE_LOCATIONS.PRODUCT_IMAGES}
                  />
                )}
              />
            </FormField>
          </section>

          {/* Inventory & Pricing */}
          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.INVENTORY_PRICING}</div>
            <FormRow>
              {/* Sending a SKU is what makes the product orderable: add-product
                  creates the first variant from it in the same transaction. */}
              <FormField
                label="SKU *"
                hint={MESSAGES.PRODUCTS.SKU_HINT}
                error={errors.sku?.message}
              >
                <Input
                  className="mono"
                  placeholder="e.g. PANT10"
                  error={!!errors.sku}
                  maxLength={100}
                  {...register("sku")}
                />
              </FormField>
              <FormField label="Base Price *" error={errors.base_price?.message}>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  error={!!errors.base_price}
                  {...register("base_price")}
                />
              </FormField>
            </FormRow>
          </section>

          {/* Product Attributes */}
          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.ATTRIBUTES}</div>
            <FormRow>
              <FormField label="Attribute ID">
                <Input
                  className="mono"
                  placeholder="e.g. pant-12345"
                  {...register("attributes.id")}
                />
              </FormField>
              <FormField label="Display Name">
                <Input
                  placeholder="e.g. Slim Fit Tailored Trousers"
                  {...register("attributes.product_name")}
                />
              </FormField>
            </FormRow>
            <FormRow columns={3}>
              <FormField label="Category" hint="Auto-filled from the selected category above">
                <Input placeholder="e.g. Apparel" readOnly {...register("attributes.category")} />
              </FormField>
              <FormField label="Subcategory">
                <Input placeholder="e.g. Bottoms" {...register("attributes.subcategory")} />
              </FormField>
              <FormField label="Gender">
                <Controller
                  control={control}
                  name="attributes.gender"
                  render={({ field }) => (
                    <DropdownSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={GENDER_OPTIONS}
                      placeholder="Select…"
                      width="100%"
                    />
                  )}
                />
              </FormField>
            </FormRow>
            <FormRow columns={3}>
              <FormField label="Brand">
                <Input placeholder="e.g. Versatile Apparel" {...register("attributes.brand")} />
              </FormField>
              <FormField label="Color">
                <Input placeholder="e.g. Charcoal Grey" {...register("attributes.color")} />
              </FormField>
              <FormField label="Season">
                <Controller
                  control={control}
                  name="attributes.season"
                  render={({ field }) => (
                    <DropdownSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={SEASON_OPTIONS}
                      placeholder="Select…"
                      width="100%"
                    />
                  )}
                />
              </FormField>
            </FormRow>
            <FormRow columns={3}>
              <FormField label="Fit">
                <Input placeholder="e.g. Slim Fit" {...register("attributes.fit")} />
              </FormField>
              <FormField label="Rise">
                <Input placeholder="e.g. Mid-Rise" {...register("attributes.rise")} />
              </FormField>
              <FormField label="Length">
                <Input placeholder="e.g. Regular" {...register("attributes.length")} />
              </FormField>
            </FormRow>
            <FormField label="Closure Type">
              <Input
                placeholder="e.g. Zip Fly with Button"
                {...register("attributes.closure_type")}
              />
            </FormField>
            <FormField label="Pockets">
              <Controller
                control={control}
                name="attributes.pockets"
                render={({ field }) => (
                  <StringListField
                    values={field.value}
                    onChange={field.onChange}
                    placeholder="e.g. Slant Pocket"
                    addLabel="Add Pocket"
                    emptyHint="No pockets added."
                  />
                )}
              />
            </FormField>
            <FormField label="Care Instructions">
              <Textarea
                placeholder="e.g. Machine wash cold, tumble dry low"
                className="h-16"
                {...register("attributes.care_instructions")}
              />
            </FormField>
          </section>

          {/* Material Details */}
          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.MATERIAL}</div>
            <FormRow columns={3}>
              <FormField label="Primary Material">
                <Input placeholder="e.g. Polyester" {...register("attributes.material.primary")} />
              </FormField>
              <FormField label="Secondary Material">
                <Input placeholder="e.g. Viscose" {...register("attributes.material.secondary")} />
              </FormField>
              <FormField label="Elastane">
                <Input placeholder="e.g. 2%" {...register("attributes.material.elastane")} />
              </FormField>
            </FormRow>
          </section>

          {/* Price Details */}
          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.PRICE}</div>
            <FormRow columns={3}>
              <FormField label="Amount" error={errors.attributes?.price?.amount?.message}>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register("attributes.price.amount")}
                />
              </FormField>
              <FormField label="Currency">
                <Controller
                  control={control}
                  name="attributes.price.currency"
                  render={({ field }) => (
                    <DropdownSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={CURRENCY_OPTIONS}
                      placeholder="Select…"
                      width="100%"
                    />
                  )}
                />
              </FormField>
              <FormField label="Discounted">
                <div className="flex items-center gap-2 h-[38px]">
                  <Controller
                    control={control}
                    name="attributes.price.discounted"
                    render={({ field }) => (
                      <Switch
                        id="price-discounted"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <label
                    htmlFor="price-discounted"
                    className="text-[13px] font-semibold text-[var(--t2)]"
                  >
                    {MESSAGES.PRODUCTS.TOGGLES.ON_DISCOUNT}
                  </label>
                </div>
              </FormField>
            </FormRow>
          </section>

          {/* Additional Settings */}
          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.ADDITIONAL}</div>
            <FormRow>
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="admin_sourceable"
                  render={({ field }) => (
                    <Switch
                      id="admin-sourceable"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <label
                  htmlFor="admin-sourceable"
                  className="text-[13px] font-semibold text-[var(--t2)]"
                >
                  {MESSAGES.PRODUCTS.TOGGLES.ADMIN_SOURCEABLE}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="is_top_rated"
                  render={({ field }) => (
                    <Switch
                      id="add-top-rated"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <label
                  htmlFor="add-top-rated"
                  className="text-[13px] font-semibold text-[var(--t2)]"
                >
                  {MESSAGES.PRODUCTS.TOGGLES.TOP_RATED}
                </label>
              </div>
            </FormRow>
            {/*
              The catalog the product is created into, replacing an
              `is_express_item` switch that add-product does not accept — a new
              product's catalog is chosen by name here.

              Marine emergency is deliberately absent: that catalog keeps its own
              category set, and the picker above lists the general ones, so
              offering it here would file a product under a category its catalog
              does not have. Move a product there afterwards with the row menu's
              catalog dialog, which asks for the right category.
            */}
            <FormField
              label={MESSAGES.PRODUCT_FLAGS.CATALOG_DIALOG.CATALOG_LABEL}
              error={errors.catalog_type?.message}
            >
              <Controller
                control={control}
                name="catalog_type"
                render={({ field }) => (
                  <DropdownSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={ADD_CATALOG_OPTIONS}
                    width="100%"
                  />
                )}
              />
            </FormField>
          </section>
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end gap-3 w-full">
            <button
              type="button"
              className="btn btn-ghost btn-cancel"
              onClick={onClose}
              disabled={isCreating}
            >
              {MESSAGES.COMMON.CANCEL}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={isCreating}
            >
              <IconCheck size={16} />
              {isCreating ? MESSAGES.PRODUCTS.ADD.SAVING : MESSAGES.PRODUCTS.ADD.SUBMIT}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
