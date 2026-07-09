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
import { Textarea } from "@/components/ui/textarea";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCategory, IconCheck } from "@tabler/icons-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateCategoryMutation } from "../api/categoryApi";
import { type CategoryAddFormData, categoryAddSchema } from "../schemas/category.schema";
import type { AddCategoryPayload } from "../types/category.types";

export interface CategoryAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ADD_DEFAULTS: CategoryAddFormData = {
  name: "",
  description: "",
  image: "",
};

export function CategoryAddDrawer({ isOpen, onClose }: CategoryAddDrawerProps) {
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryAddFormData>({
    resolver: zodResolver(categoryAddSchema),
    defaultValues: ADD_DEFAULTS,
  });

  // Reset to a clean form each time the drawer opens. On a failed submit the
  // drawer stays open and isOpen doesn't change, so entered data is preserved.
  useEffect(() => {
    if (isOpen) reset(ADD_DEFAULTS);
  }, [isOpen, reset]);

  const onSubmit = async (formData: CategoryAddFormData) => {
    const payload: AddCategoryPayload = {
      name: formData.name,
      description: formData.description,
      image: formData.image,
    };

    try {
      const response = await createCategory(payload).unwrap();
      // Success: close the drawer first, then notify.
      onClose();
      toast.success(getApiMessage(response) ?? MESSAGES.CATEGORIES.TOAST.ADD_SUCCESS);
    } catch (error) {
      // Failure: keep the drawer open (data preserved) so the user can retry.
      toast.error(getApiMessage(error) ?? MESSAGES.CATEGORIES.TOAST.ADD_ERROR);
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
              <SheetTitle className="text-xl">{MESSAGES.CATEGORIES.ADD.TITLE}</SheetTitle>
              <SheetDescription>{MESSAGES.CATEGORIES.ADD.SUBTITLE}</SheetDescription>
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
              {isCreating ? MESSAGES.CATEGORIES.ADD.SAVING : MESSAGES.CATEGORIES.ADD.SUBMIT}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
