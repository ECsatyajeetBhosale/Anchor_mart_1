import { DropdownSelect } from "@/components/common/DropdownSelect";
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
import { IconCheck, IconHelpCircle } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateFaqMutation, useGetFaqTypesQuery } from "../api/faqApi";
import { type FaqFormData, faqSchema } from "../schemas/settings.schema";

export interface FaqAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FaqAddDrawer({ isOpen, onClose }: FaqAddDrawerProps) {
  const [createFaq, { isLoading }] = useCreateFaqMutation();
  const { data: typesData } = useGetFaqTypesQuery();
  // The API stores and returns the type *name*, so the option value is the name.
  const typeOptions = (typesData?.results ?? []).map((t) => ({ value: t.name, label: t.name }));

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FaqFormData>({
    resolver: zodResolver(faqSchema),
    defaultValues: { faq_type: "", question: "", answer: "" },
  });

  useEffect(() => {
    if (isOpen) reset({ faq_type: "", question: "", answer: "" });
  }, [isOpen, reset]);

  const onSubmit = async (formData: FaqFormData) => {
    try {
      const response = await createFaq({
        faq_type: formData.faq_type,
        question: formData.question,
        answer: formData.answer,
      }).unwrap();
      onClose();
      toast.success(getApiMessage(response) ?? MESSAGES.SETTINGS.FAQ.TOAST.CREATE_SUCCESS);
    } catch (error) {
      toast.error(getApiMessage(error) ?? MESSAGES.SETTINGS.FAQ.TOAST.CREATE_ERROR);
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
              <IconHelpCircle size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">{MESSAGES.SETTINGS.FAQ.ADD.TITLE}</SheetTitle>
              <SheetDescription>{MESSAGES.SETTINGS.FAQ.ADD.SUBTITLE}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-6">
          <section>
            <div className="sec-label">{MESSAGES.SETTINGS.FAQ.SECTIONS.CONTENT}</div>
            <FormField label="Category *" error={errors.faq_type?.message}>
              <Controller
                control={control}
                name="faq_type"
                render={({ field }) => (
                  <DropdownSelect
                    options={typeOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select a category"
                    width="100%"
                  />
                )}
              />
            </FormField>
            <FormField label="Question *" error={errors.question?.message}>
              <Input
                placeholder="e.g. Can I change my location after ordering?"
                error={!!errors.question}
                {...register("question")}
              />
            </FormField>
            <FormField label="Answer *" error={errors.answer?.message}>
              <Textarea
                placeholder="Write the answer sailors will see…"
                className="h-40"
                error={!!errors.answer}
                {...register("answer")}
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
              disabled={isLoading}
            >
              {MESSAGES.COMMON.CANCEL}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              <IconCheck size={16} />
              {isLoading ? MESSAGES.SETTINGS.FAQ.ADD.SAVING : MESSAGES.SETTINGS.FAQ.ADD.SUBMIT}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
