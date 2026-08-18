import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
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
import { useGetCategoriesQuery } from "@/features/catalog";
import { useGetEmergencyCategoriesQuery } from "@/features/emergency-categories";
import { FILE_LOCATIONS, ImageListField } from "@/features/media";
import { useCreateSpareProductMutation } from "@/features/spares";
import { getApiMessage, getFieldErrors } from "@/lib/apiError";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconBoxSeam, IconCheck, IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateProductMutation } from "../api/productApi";
import { type ProductAddFormData, productAddSchema } from "../schemas/product.schema";
import type { AddProductPayload } from "../types/product.types";

export interface ProductAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Which shelf this product is created onto — **fixed by the screen you opened
   * from**, not chosen in the form.
   *
   * There is no catalog picker: Products creates regular, Express Products
   * creates express, Marine Emergency Spares creates marine. A picker only
   * offered a way to land the product on a screen you were not looking at.
   *
   * `marine_emergency` also switches the **endpoint** — that catalog has its own
   * create route, its own category set, and no express price. The body is
   * otherwise identical, because all three share one serializer.
   */
  catalogType?: ProductAddFormData["catalog_type"];
}

/**
 * Defaults for the create payload — **exactly the create contract, nothing
 * more.**
 *
 * The form used to carry an apparel schema underneath `attributes`: gender, fit,
 * rise, closure type, a pockets list, a nested material block and a second price
 * with its own currency and discount switch. None of it is in the body
 * `add-product/` accepts, and none of it describes ship chandlery — `attributes`
 * is free-form key/value for the first variant, so it is edited as such.
 */
const ADD_DEFAULTS: ProductAddFormData = {
  category: "",
  name: "",
  description: "",
  images: [],
  base_price: 0,
  // 0 = not provided. Only sent when the product is express (see onSubmit).
  express_price: 0,
  sku: "",
  catalog_type: "regular",
  admin_sourceable: true,
  is_top_rated: false,
  /**
   * One empty row so the section reads as editable rather than absent. It is
   * dropped on submit while its key is blank, so an operator who has no
   * attributes to record simply leaves it alone.
   */
  attributes: [{ key: "", value: "" }],
};

export function ProductAddDrawer({
  isOpen,
  onClose,
  catalogType = "regular",
}: ProductAddDrawerProps) {
  const isExpress = catalogType === "express";
  const isMarine = catalogType === "marine_emergency";

  const [createProduct, { isLoading: isCreatingGeneral }] = useCreateProductMutation();
  const [createSpare, { isLoading: isCreatingSpare }] = useCreateSpareProductMutation();
  const isCreating = isMarine ? isCreatingSpare : isCreatingGeneral;

  /**
   * Active, general-scope categories only.
   *
   * The endpoint requires all three (exists, `is_active`, `scope: "general"`) and
   * reports an inactive one as `{"category": ["Category not found"]}` — a
   * confusing 400 for a category just picked off a list. The list endpoint is
   * general-scope by construction; `isActive` is the part that had to be asked
   * for. Express products use this same set — there is no express bucket.
   */
  const { data: generalCategories } = useGetCategoriesQuery(
    { limit: API_MAX_PAGE_SIZE, isActive: true },
    { skip: isMarine },
  );
  /**
   * Marine products need a **marine-scoped** category — a general one is a 400
   * on `category`. The two sets are separate tables' worth of rows behind one
   * model, so the picker switches source rather than filtering.
   */
  const { data: marineCategories } = useGetEmergencyCategoriesQuery(
    { limit: API_MAX_PAGE_SIZE, isActive: true },
    { skip: !isMarine },
  );
  const categoryOptions = (
    (isMarine ? marineCategories : generalCategories)?.results?.data ?? []
  ).map((c) => ({ value: c.id, label: c.name }));

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProductAddFormData>({
    resolver: zodResolver(productAddSchema),
    defaultValues: { ...ADD_DEFAULTS, catalog_type: catalogType },
  });

  const attributeRows = useFieldArray({ control, name: "attributes" });

  // Reset to a clean form each time the drawer opens. On a failed submit the
  // drawer stays open and isOpen doesn't change, so entered data is preserved.
  useEffect(() => {
    if (isOpen) reset({ ...ADD_DEFAULTS, catalog_type: catalogType });
  }, [isOpen, reset, catalogType]);

  const onSubmit = async (formData: ProductAddFormData) => {
    const payload: AddProductPayload = {
      category: formData.category,
      name: formData.name,
      description: formData.description,
      images: formData.images.filter(Boolean),
      base_price: formData.base_price,
      catalog_type: formData.catalog_type,
      /**
       * Sent **only** for an express product: the endpoint 400s a regular
       * product that carries one. The schema blocks the other half of the rule
       * (an express product without one), so by here it is present.
       */
      ...(isExpress ? { express_price: formData.express_price } : {}),
      admin_sourceable: formData.admin_sourceable,
      is_top_rated: formData.is_top_rated,
      sku: formData.sku,
      // Rows → the object the API takes. Unnamed rows are dropped rather than
      // sent as an empty key.
      attributes: Object.fromEntries(
        formData.attributes.filter((row) => row.key).map((row) => [row.key, row.value]),
      ),
    };

    try {
      /**
       * Marine has its own create route. `catalog_type` is forced server-side
       * there and ignored if sent, so the payload above needs no special case —
       * only the endpoint changes.
       */
      const response = await (isMarine ? createSpare(payload) : createProduct(payload)).unwrap();
      // Success: close the drawer first, then notify.
      onClose();
      toast.success(getApiMessage(response) ?? MESSAGES.PRODUCTS.TOAST.ADD_SUCCESS);
    } catch (error) {
      /**
       * Pin field-keyed errors to their inputs. add-product validates in groups
       * and reports one group at a time, so an operator can face several rounds
       * — a toast naming no field makes each round a hunt.
       *
       * `express_base_price` is the server's key for what this form calls
       * `express_price`; it reports on that name even when the body used the
       * other, so it is mapped rather than dropped.
       */
      const fieldErrors = getFieldErrors(error);
      const known: Record<string, keyof ProductAddFormData> = {
        category: "category",
        name: "name",
        description: "description",
        base_price: "base_price",
        express_base_price: "express_price",
        express_price: "express_price",
        sku: "sku",
        images: "images",
        catalog_type: "catalog_type",
      };
      let pinned = false;
      for (const [key, field] of Object.entries(known)) {
        if (fieldErrors[key]) {
          setError(field, { type: "server", message: fieldErrors[key] });
          pinned = true;
        }
      }
      // Failure: keep the drawer open (data preserved) so the user can retry.
      if (!pinned) {
        toast.error(getApiMessage(error) ?? MESSAGES.PRODUCTS.TOAST.ADD_ERROR);
      }
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
              <SheetTitle className="text-xl">
                {isExpress
                  ? MESSAGES.PRODUCTS.ADD.TITLE_EXPRESS
                  : isMarine
                    ? MESSAGES.PRODUCTS.ADD.TITLE_MARINE
                    : MESSAGES.PRODUCTS.ADD.TITLE}
              </SheetTitle>
              <SheetDescription>
                {isExpress
                  ? MESSAGES.PRODUCTS.ADD.SUBTITLE_EXPRESS
                  : isMarine
                    ? MESSAGES.PRODUCTS.ADD.SUBTITLE_MARINE
                    : MESSAGES.PRODUCTS.ADD.SUBTITLE}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-6">
          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.BASIC}</div>
            <FormRow>
              <FormField label="Product Name *" error={errors.name?.message}>
                <Input
                  placeholder="e.g. Mooring Rope 24mm"
                  error={!!errors.name}
                  // Column is 255 and the serializer does not cap it — an
                  // over-long name reaches Postgres as a 500, not a 400.
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
                placeholder="What it is, and anything the crew needs to know."
                className="h-24"
                error={!!errors.description}
                {...register("description")}
              />
            </FormField>
          </section>

          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.INVENTORY_PRICING}</div>
            <FormRow>
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
              {/*
                Express-only, and required there — the express shelf is its own
                price list. A regular product that carries this value is a 400,
                so there is no state in which the field is both shown and safely
                ignorable.
              */}
              {isExpress && (
                <FormField
                  label="Express Price *"
                  hint="What the express shelf charges."
                  error={errors.express_price?.message}
                >
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    error={!!errors.express_price}
                    {...register("express_price")}
                  />
                </FormField>
              )}
            </FormRow>
            {/* Sending a SKU is what makes the product orderable: add-product
                creates the first variant from it in the same transaction. */}
            <FormField
              label="SKU *"
              hint="Creates the product's first variant. Unique across every variant, including deleted ones."
              error={errors.sku?.message}
            >
              <Input
                className="mono"
                placeholder="e.g. SKU-ROPE-24MM-220"
                error={!!errors.sku}
                maxLength={100}
                {...register("sku")}
              />
            </FormField>
          </section>

          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.ATTRIBUTES}</div>
            <p className="fg-hint mb-3">{MESSAGES.PRODUCTS.ATTRIBUTES_HINT}</p>
            <div className="flex flex-col gap-2">
              {attributeRows.fields.map((row, index) => (
                <div key={row.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Name — e.g. diameter"
                      error={!!errors.attributes?.[index]?.key}
                      {...register(`attributes.${index}.key` as const)}
                    />
                    {errors.attributes?.[index]?.key && (
                      <div className="fg-err mt-1">{errors.attributes[index]?.key?.message}</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Value — e.g. 24mm"
                      {...register(`attributes.${index}.value` as const)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="mt-1"
                    title={MESSAGES.PRODUCTS.ATTRIBUTE_REMOVE}
                    onClick={() => attributeRows.remove(index)}
                  >
                    <IconTrash size={15} />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="mt-2"
              onClick={() => attributeRows.append({ key: "", value: "" })}
            >
              <IconPlus size={15} className="mr-1" />
              {MESSAGES.PRODUCTS.ATTRIBUTE_ADD}
            </Button>
          </section>

          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.MEDIA}</div>
            <FormField
              label="Product Images"
              hint="Upload files, or paste a stored path (e.g. product_images/example.png). The first is the primary image."
              error={errors.images?.message}
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

          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.PRODUCTS.SECTIONS.ADDITIONAL}</div>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="admin_sourceable"
                  render={({ field }) => (
                    <Switch
                      id="add-product-sourceable"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <label
                  htmlFor="add-product-sourceable"
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
                      id="add-product-top-rated"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <label
                  htmlFor="add-product-top-rated"
                  className="text-[13px] font-semibold text-[var(--t2)]"
                >
                  {MESSAGES.PRODUCT_FLAGS.COLUMNS.TOP_RATED}
                </label>
              </div>
            </div>
          </section>
        </div>

        <SheetFooter className="p-6 pt-4 border-t border-[var(--border-md)]">
          <Button variant="ghost" onClick={onClose}>
            {MESSAGES.PRODUCTS.ADD.CANCEL}
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={isCreating}>
            <IconCheck size={16} className="mr-1" />
            {isCreating ? MESSAGES.PRODUCTS.ADD.SAVING : MESSAGES.PRODUCTS.ADD.SUBMIT}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default ProductAddDrawer;
