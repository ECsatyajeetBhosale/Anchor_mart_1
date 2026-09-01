import { FormField } from "@/components/common/FormField";
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
import { FILE_LOCATIONS, ImageUploadField } from "@/features/media";
import { getApiMessage, getFieldErrors } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCategory, IconCheck } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useGetCategoryQuery, useUpdateCategoryMutation } from "../api/categoryApi";
import { type CategoryUpdateFormData, categoryUpdateSchema } from "../schemas/category.schema";
import type { Category, UpdateCategoryPayload } from "../types/category.types";

export interface CategoryEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category;
}

/** Extract the stored relative path (e.g. "category_images/x.jpg") from a media URL. */
function toImagePath(image: string | null): string {
  if (!image) return "";
  const marker = "/media/";
  const idx = image.lastIndexOf(marker);
  return idx >= 0 ? image.slice(idx + marker.length) : image;
}

export function CategoryEditDrawer({ isOpen, onClose, category }: CategoryEditDrawerProps) {
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();

  // Load the record by id so the form edits current values — the table row can
  // be stale by the time someone opens it. Fall back to the row while in flight
  // (the detail returns the same field set, so nothing is missing meanwhile).
  const { data: detail } = useGetCategoryQuery(category.id, { skip: !isOpen });
  const source = detail ?? category;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, dirtyFields },
  } = useForm<CategoryUpdateFormData>({
    resolver: zodResolver(categoryUpdateSchema),
  });

  // Pre-populate the editable fields from the selected category each time the
  // drawer opens.
  useEffect(() => {
    if (!isOpen) return;
    reset({
      name: source.name ?? "",
      description: source.description ?? "",
      image: toImagePath(source.image),
      is_active: source.is_active ?? true,
    });
  }, [isOpen, source, reset]);

  const onSubmit = async (formData: CategoryUpdateFormData) => {
    /**
     * Only the fields actually changed. `update()` writes just the keys present,
     * the underlying `save()` is a full-row write, and unknown keys are dropped
     * without an error — so over-sending is both unnecessary and invisible when
     * wrong. Same reasoning as `update-product`.
     */
    const payload: UpdateCategoryPayload = {};
    if (dirtyFields.name) payload.name = formData.name;
    if (dirtyFields.description) payload.description = formData.description;
    // "" clears the image server-side, which is the intended way to remove one.
    if (dirtyFields.image) payload.image = formData.image;
    if (dirtyFields.is_active) payload.is_active = formData.is_active;

    if (Object.keys(payload).length === 0) {
      toast.info(MESSAGES.CATEGORIES.TOAST.NO_CHANGES);
      onClose();
      return;
    }

    try {
      const response = await updateCategory({ id: category.id, body: payload }).unwrap();
      // Success: close the drawer first, then notify.
      onClose();
      toast.success(getApiMessage(response) ?? MESSAGES.CATEGORIES.TOAST.UPDATE_SUCCESS);
    } catch (error) {
      /**
       * Pin field-keyed errors to their inputs. The two that land here are a
       * duplicate `(name, scope)` and a bad `category_images/` prefix — both come
       * back field-keyed, so putting them on the input beats a toast that makes
       * the operator hunt for which field the server meant.
       */
      const fieldErrors = getFieldErrors(error);
      const known = ["name", "description", "image"] as const;
      let pinned = false;
      for (const field of known) {
        if (fieldErrors[field]) {
          setError(field, { type: "server", message: fieldErrors[field] });
          pinned = true;
        }
      }
      // Failure: keep the drawer open so the user can fix and retry, then notify.
      if (!pinned) {
        toast.error(getApiMessage(error) ?? MESSAGES.CATEGORIES.TOAST.UPDATE_ERROR);
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
              <IconCategory size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">{MESSAGES.CATEGORIES.EDIT.TITLE}</SheetTitle>
              <SheetDescription>{MESSAGES.CATEGORIES.EDIT.SUBTITLE}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-6">
          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.CATEGORIES.SECTIONS.BASIC}</div>
            <FormField label={MESSAGES.CATEGORIES.FIELDS.NAME} error={errors.name?.message}>
              <Input
                placeholder={MESSAGES.CATEGORIES.FIELDS.NAME_PLACEHOLDER}
                error={!!errors.name}
                {...register("name")}
              />
            </FormField>
            <FormField
              label={MESSAGES.CATEGORIES.FIELDS.DESCRIPTION}
              error={errors.description?.message}
            >
              <Textarea
                placeholder={MESSAGES.CATEGORIES.FIELDS.DESCRIPTION_PLACEHOLDER}
                className="h-24"
                error={!!errors.description}
                {...register("description")}
              />
            </FormField>
          </section>

          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.CATEGORIES.SECTIONS.MEDIA}</div>
            <FormField
              label={MESSAGES.CATEGORIES.FIELDS.IMAGE}
              hint={MESSAGES.CATEGORIES.FIELDS.IMAGE_HINT}
            >
              <Controller
                control={control}
                name="image"
                render={({ field }) => (
                  <ImageUploadField
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    fileLocation={FILE_LOCATIONS.CATEGORY_IMAGES}
                    // The form holds the stored path (that is what submits);
                    // this is the same image's read URL, so the box shows the
                    // picture instead of an empty frame.
                    previewUrl={source.image ?? ""}
                  />
                )}
              />
            </FormField>
          </section>

          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.CATEGORIES.SECTIONS.ADDITIONAL}</div>
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <Switch
                    id="category-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <label
                htmlFor="category-active"
                className="text-[13px] font-semibold text-[var(--t2)]"
              >
                {MESSAGES.CATEGORIES.TOGGLES.ACTIVE}
              </label>
            </div>
            {/* Says what deactivating actually does — the sailor's product list
                does not join category liveness, so the products stay buyable. */}
            <p className="fg-hint mt-2">{MESSAGES.CATEGORIES.ACTIVE_HINT}</p>
          </section>
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
              disabled={isUpdating}
            >
              <IconCheck size={16} />
              {isUpdating ? MESSAGES.CATEGORIES.EDIT.SAVING : MESSAGES.CATEGORIES.EDIT.SUBMIT}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
