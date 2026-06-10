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
import { getApiMessage } from "@/lib/apiError";
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

// API-specified defaults for the create payload.
const ADD_DEFAULTS: ProductAddFormData = {
  category: "",
  name: "",
  description: "",
  images: [],
  base_price: 0,
  sku: "",
  admin_sourceable: true,
  is_express_item: false,
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

  const { data: categoriesData } = useGetCategoriesQuery({ limit: 100 });
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
      admin_sourceable: formData.admin_sourceable,
      sku: formData.sku,
      is_express_item: formData.is_express_item,
      attributes: {
        ...formData.attributes,
        pockets: formData.attributes.pockets.filter(Boolean),
      },
    };

    try {
      const response = await createProduct(payload).unwrap();
      // Success: close the drawer first, then notify.
      onClose();
      toast.success(getApiMessage(response) ?? "Product created successfully");
    } catch (error) {
      // Failure: keep the drawer open (data preserved) so the user can retry.
      console.error("add-product failed:", error);
      toast.error(getApiMessage(error) ?? "Failed to create product. Please try again.");
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
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg"
              style={{ background: "var(--teal-50)", color: "var(--teal-600)" }}
            >
              <IconBoxSeam size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">Add New Product</SheetTitle>
              <SheetDescription>Create a new product for your catalog</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-6">
          {/* Basic Information */}
          <section className="prod-tab">
            <div className="sec-label">Basic Information</div>
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
                style={{ height: 96 }}
                error={!!errors.description}
                {...register("description")}
              />
            </FormField>
          </section>

          {/* Product Media */}
          <section className="prod-tab">
            <div className="sec-label">Product Media</div>
            <FormField
              label="Image Paths"
              hint="Add one or more stored image paths (e.g. product_images/example.png)."
            >
              <Controller
                control={control}
                name="images"
                render={({ field }) => (
                  <StringListField
                    values={field.value}
                    onChange={field.onChange}
                    placeholder="product_images/example.png"
                    addLabel="Add Image Path"
                    emptyHint="No images yet — add one below."
                    mono
                  />
                )}
              />
            </FormField>
          </section>

          {/* Inventory & Pricing */}
          <section className="prod-tab">
            <div className="sec-label">Inventory &amp; Pricing</div>
            <FormRow>
              <FormField label="SKU *" error={errors.sku?.message}>
                <Input
                  className="mono"
                  placeholder="e.g. PANT10"
                  error={!!errors.sku}
                  {...register("sku")}
                />
              </FormField>
              <FormField label="Base Price *" error={errors.base_price?.message}>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  error={!!errors.base_price}
                  {...register("base_price")}
                />
              </FormField>
            </FormRow>
          </section>

          {/* Product Attributes */}
          <section className="prod-tab">
            <div className="sec-label">Product Attributes</div>
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
                style={{ height: 64 }}
                {...register("attributes.care_instructions")}
              />
            </FormField>
          </section>

          {/* Material Details */}
          <section className="prod-tab">
            <div className="sec-label">Material Details</div>
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
            <div className="sec-label">Price Details</div>
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
                    On discount
                  </label>
                </div>
              </FormField>
            </FormRow>
          </section>

          {/* Additional Settings */}
          <section className="prod-tab">
            <div className="sec-label">Additional Settings</div>
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
                  Admin sourceable
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="is_express_item"
                  render={({ field }) => (
                    <Switch
                      id="express-item"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <label
                  htmlFor="express-item"
                  className="text-[13px] font-semibold text-[var(--t2)]"
                >
                  Express item
                </label>
              </div>
            </FormRow>
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
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={isCreating}
            >
              <IconCheck size={16} />
              {isCreating ? "Saving…" : "Add Product"}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
