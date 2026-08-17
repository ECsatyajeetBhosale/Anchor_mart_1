import { zodResolver } from "@hookform/resolvers/zod";
import { IconCheck, IconLifebuoy } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
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
import { useGetEmergencyCategoriesQuery } from "@/features/emergency-categories";
import { getApiMessage } from "@/lib/apiError";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { useCreateSpareProductMutation } from "../api/spareApi";
import { type SpareAddFormData, spareAddSchema } from "../schemas/spare.schema";
import type { AddSpareProductPayload } from "../types/spare.types";

const M = MESSAGES.SPARES;
const F = M.FORM;

export interface SpareProductAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ADD_DEFAULTS: SpareAddFormData = {
  category: "",
  name: "",
  description: "",
  base_price: 0,
  images: [],
  admin_sourceable: true,
  is_top_rated: false,
  sku: "",
};

/**
 * Creates a marine-emergency spare. The category picker is restricted to
 * marine_emergency categories — the backend rejects anything else outright
 * ("This category belongs to 'general', but a 'marine_emergency' product must
 * use a 'marine_emergency' category."), so offering a general one would only
 * produce a guaranteed 400.
 */
export function SpareProductAddDrawer({ isOpen, onClose }: SpareProductAddDrawerProps) {
  const [createSpare, { isLoading: isCreating }] = useCreateSpareProductMutation();

  // Capped at the server's own `page_size` ceiling — a larger number is
  // silently clamped, so asking for one would only misstate what we fetched.
  const { data: categoriesData } = useGetEmergencyCategoriesQuery(
    { limit: API_MAX_PAGE_SIZE },
    { skip: !isOpen },
  );
  const categoryOptions = (categoriesData?.results?.data ?? [])
    .filter((c) => c.is_active)
    .map((c) => ({ value: c.id, label: c.name }));

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SpareAddFormData>({
    resolver: zodResolver(spareAddSchema),
    defaultValues: ADD_DEFAULTS,
  });

  // Reset to a clean form each time the drawer opens. On a failed submit the
  // drawer stays open and isOpen doesn't change, so entered data is preserved.
  useEffect(() => {
    if (isOpen) reset(ADD_DEFAULTS);
  }, [isOpen, reset]);

  const onSubmit = async (formData: SpareAddFormData) => {
    // Built field-by-field to match the API contract exactly.
    const payload: AddSpareProductPayload = {
      category: formData.category,
      name: formData.name,
      description: formData.description,
      base_price: formData.base_price,
      images: formData.images.filter((p) => p.trim() !== ""),
      admin_sourceable: formData.admin_sourceable,
      is_top_rated: formData.is_top_rated,
      // Creates the spare's first variant in the same transaction. Omitting it
      // produced a spare no sailor could ever see — see the schema.
      sku: formData.sku,
    };

    try {
      const response = await createSpare(payload).unwrap();
      onClose();
      toast.success(getApiMessage(response) ?? M.TOAST.ADDED);
    } catch (error) {
      // Keep the drawer open so the entered data isn't lost.
      toast.error(getApiMessage(error) ?? M.TOAST.ADD_ERROR);
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
              <IconLifebuoy size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">{F.ADD_TITLE}</SheetTitle>
              <SheetDescription>{F.ADD_SUBTITLE}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-6">
          <section className="prod-tab">
            <div className="sec-label">{F.SECTION_BASIC}</div>
            <FormField label={F.NAME} error={errors.name?.message}>
              <Input placeholder={F.NAME_PLACEHOLDER} error={!!errors.name} {...register("name")} />
            </FormField>
            <FormField label={F.DESCRIPTION} error={errors.description?.message}>
              <Textarea
                placeholder={F.DESCRIPTION_PLACEHOLDER}
                className="h-24"
                error={!!errors.description}
                {...register("description")}
              />
            </FormField>
            <div className="form-row">
              <FormField label={F.CATEGORY} hint={F.CATEGORY_HINT} error={errors.category?.message}>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <DropdownSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={categoryOptions}
                      placeholder={
                        categoryOptions.length ? F.CATEGORY_PLACEHOLDER : F.CATEGORY_EMPTY
                      }
                      width="100%"
                    />
                  )}
                />
              </FormField>
              <FormField label={F.BASE_PRICE} error={errors.base_price?.message}>
                <Input
                  type="number"
                  step="0.01"
                  // The shared serializer's floor is 0.01, not 0 — a free spare
                  // is a 400.
                  min="0.01"
                  placeholder={F.BASE_PRICE_PLACEHOLDER}
                  error={!!errors.base_price}
                  {...register("base_price")}
                />
              </FormField>
            </div>
            {/*
              Sending a SKU is what makes the spare exist for sailors: it creates
              the first variant inline, and a spare with no variants is filtered
              out of every customer-facing list.
            */}
            <FormField label={F.SKU} hint={F.SKU_HINT} error={errors.sku?.message}>
              <Input
                className="mono"
                placeholder={F.SKU_PLACEHOLDER}
                error={!!errors.sku}
                {...register("sku")}
              />
            </FormField>
          </section>

          <section className="prod-tab">
            <div className="sec-label">{F.SECTION_MEDIA}</div>
            <FormField label={F.IMAGES} hint={F.IMAGES_HINT}>
              <Controller
                name="images"
                control={control}
                render={({ field }) => (
                  <StringListField
                    values={field.value}
                    onChange={field.onChange}
                    placeholder={F.IMAGE_PLACEHOLDER}
                    addLabel={F.IMAGE_ADD}
                    emptyHint={F.IMAGE_EMPTY}
                    mono
                  />
                )}
              />
            </FormField>
          </section>

          <section className="prod-tab">
            <div className="sec-label">{F.SECTION_FLAGS}</div>
            <div className="form-row">
              <FormField label={F.ADMIN_SOURCEABLE} hint={F.ADMIN_SOURCEABLE_HINT}>
                <Controller
                  name="admin_sourceable"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </FormField>
              <FormField label={F.TOP_RATED} hint={F.TOP_RATED_HINT}>
                <Controller
                  name="is_top_rated"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </FormField>
            </div>
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
              {isCreating ? F.SAVING : F.SAVE}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default SpareProductAddDrawer;
