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
import { useGetSpareProductQuery, useUpdateSpareProductMutation } from "../api/spareApi";
import { type SpareUpdateFormData, spareUpdateSchema } from "../schemas/spare.schema";
import type { UpdateSpareProductPayload } from "../types/spare.types";

const M = MESSAGES.SPARES;
const F = M.FORM;

export interface SpareProductEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Id of the spare being edited; the form prefills from its detail. */
  productId: string;
}

/**
 * Edits a marine-emergency spare.
 *
 * Prefills from the **detail** endpoint rather than the table row: the list row
 * carries neither the description nor the category id (only its display name),
 * so editing from the row alone would silently blank them.
 */
export function SpareProductEditDrawer({
  isOpen,
  onClose,
  productId,
}: SpareProductEditDrawerProps) {
  const [updateSpare, { isLoading: isUpdating }] = useUpdateSpareProductMutation();

  const { data: detail, isFetching } = useGetSpareProductQuery(productId, {
    skip: !isOpen || !productId,
  });

  // Capped at the server's own `page_size` ceiling — asking for more is
  // silently clamped, so a larger number would misstate what we fetched.
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
    // `dirtyFields` drives the PATCH body — see onSubmit.
    formState: { errors, dirtyFields },
  } = useForm<SpareUpdateFormData>({
    resolver: zodResolver(spareUpdateSchema),
    defaultValues: {
      category: "",
      name: "",
      description: "",
      base_price: 0,
      images: [],
      admin_sourceable: true,
      is_top_rated: false,
      is_active: true,
    },
  });

  // Load the spare's own values once the detail resolves. `images` arrives as
  // objects here (the add payload takes plain paths), so map to the URL.
  useEffect(() => {
    if (isOpen && detail) {
      reset({
        category: detail.category ?? "",
        name: detail.name ?? "",
        description: detail.description ?? "",
        base_price: detail.base_price ? Number(detail.base_price) : 0,
        images: (detail.images ?? []).map((img) => img.image),
        admin_sourceable: detail.admin_sourceable ?? true,
        is_top_rated: detail.is_top_rated ?? false,
        is_active: detail.is_active ?? true,
      });
    }
  }, [isOpen, detail, reset]);

  const onSubmit = async (formData: SpareUpdateFormData) => {
    /**
     * **Only the fields actually changed.**
     *
     * This endpoint is literally `UpdateProductSerializer`, so it inherits the
     * general catalog's semantics exactly: a true partial write, a full-row
     * `save()` underneath, and unknown keys dropped without an error. A fixed
     * body therefore asserted values for fields nobody touched, and nothing
     * about the response would ever have revealed it.
     */
    const payload: UpdateSpareProductPayload = {};
    if (dirtyFields.category) payload.category = formData.category;
    if (dirtyFields.name) payload.name = formData.name;
    if (dirtyFields.description) payload.description = formData.description;
    if (dirtyFields.base_price) payload.base_price = formData.base_price;
    if (dirtyFields.images) payload.images = formData.images.filter((p) => p.trim() !== "");
    if (dirtyFields.admin_sourceable) payload.admin_sourceable = formData.admin_sourceable;
    if (dirtyFields.is_top_rated) payload.is_top_rated = formData.is_top_rated;
    if (dirtyFields.is_active) payload.is_active = formData.is_active;

    // Nothing edited: an empty PATCH is a round trip that says nothing, and a
    // success toast for a change that never happened.
    if (Object.keys(payload).length === 0) {
      toast.info(M.TOAST.NO_CHANGES);
      onClose();
      return;
    }

    try {
      const response = await updateSpare({ id: productId, body: payload }).unwrap();
      onClose();
      toast.success(getApiMessage(response) ?? M.TOAST.UPDATED);
    } catch (error) {
      toast.error(getApiMessage(error) ?? M.TOAST.UPDATE_ERROR);
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
              <SheetTitle className="text-xl">{F.EDIT_TITLE}</SheetTitle>
              <SheetDescription>{detail?.name ?? F.EDIT_SUBTITLE}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-6">
          {isFetching && !detail ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--border-md)] border-t-[var(--teal-500)]" />
              <span className="text-[13px] font-semibold text-[var(--t4)]">{M.DETAIL.LOADING}</span>
            </div>
          ) : (
            <>
              <section className="prod-tab">
                <div className="sec-label">{F.SECTION_BASIC}</div>
                <FormField label={F.NAME} error={errors.name?.message}>
                  <Input
                    placeholder={F.NAME_PLACEHOLDER}
                    error={!!errors.name}
                    {...register("name")}
                  />
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
                  <FormField
                    label={F.CATEGORY}
                    hint={F.CATEGORY_HINT}
                    error={errors.category?.message}
                  >
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
                      min="0"
                      placeholder={F.BASE_PRICE_PLACEHOLDER}
                      error={!!errors.base_price}
                      {...register("base_price")}
                    />
                  </FormField>
                </div>
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
                <div className="form-row triple">
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
                  <FormField label={F.IS_ACTIVE} hint={F.IS_ACTIVE_HINT}>
                    <Controller
                      name="is_active"
                      control={control}
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </FormField>
                </div>
              </section>
            </>
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
              disabled={isUpdating || !detail}
            >
              <IconCheck size={16} />
              {isUpdating ? F.UPDATING : F.UPDATE}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default SpareProductEditDrawer;
