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
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCategory, IconCheck } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateCategoryMutation } from "../api/categoryApi";
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

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryUpdateFormData>({
    resolver: zodResolver(categoryUpdateSchema),
  });

  // Pre-populate the editable fields from the selected category each time the
  // drawer opens.
  useEffect(() => {
    if (!isOpen) return;
    reset({
      name: category.name ?? "",
      description: category.description ?? "",
      image: toImagePath(category.image),
      is_active: category.is_active ?? true,
    });
  }, [isOpen, category, reset]);

  const onSubmit = async (formData: CategoryUpdateFormData) => {
    const payload: UpdateCategoryPayload = {
      name: formData.name,
      description: formData.description,
      image: formData.image,
      is_active: formData.is_active,
    };

    try {
      const response = await updateCategory({ id: category.id, body: payload }).unwrap();
      // Success: close the drawer first, then notify.
      onClose();
      toast.success(getApiMessage(response) ?? MESSAGES.CATEGORIES.TOAST.UPDATE_SUCCESS);
    } catch (error) {
      // Failure: keep the drawer open so the user can fix and retry, then notify.
      toast.error(getApiMessage(error) ?? MESSAGES.CATEGORIES.TOAST.UPDATE_ERROR);
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
            <FormField label="Category Name *" error={errors.name?.message}>
              <Input placeholder="e.g. Apparel" error={!!errors.name} {...register("name")} />
            </FormField>
            <FormField label="Description" error={errors.description?.message}>
              <Textarea
                placeholder="Describe the category…"
                className="h-24"
                error={!!errors.description}
                {...register("description")}
              />
            </FormField>
          </section>

          <section className="prod-tab">
            <div className="sec-label">{MESSAGES.CATEGORIES.SECTIONS.MEDIA}</div>
            <FormField
              label="Image Path"
              hint="Stored image path/key (e.g. category_images/example.jpg) — not a file upload."
            >
              <Input
                className="mono"
                placeholder="category_images/example.jpg"
                {...register("image")}
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
