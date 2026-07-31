import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCheck, IconUser } from "@tabler/icons-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateSailorMutation } from "../api/sailorApi";
import { EMPTY_SAILOR_FORM, type SailorFormData, sailorFormSchema } from "../schemas/sailor.schema";

const F = MESSAGES.SAILORS.FORM;

export interface SailorAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Create a sailor via the shared `admin/create-user/` endpoint.
 *
 * Deliberately has **no account-status control**: create-user takes no
 * `is_active`, so a toggle here would be a field the API silently ignores.
 * Blocking happens after the fact, from the edit drawer.
 */
export function SailorAddDrawer({ isOpen, onClose }: SailorAddDrawerProps) {
  const [createSailor, { isLoading: isCreating }] = useCreateSailorMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SailorFormData>({
    resolver: zodResolver(sailorFormSchema),
    defaultValues: EMPTY_SAILOR_FORM,
  });

  // Blank the form each time the drawer opens.
  useEffect(() => {
    if (isOpen) reset(EMPTY_SAILOR_FORM);
  }, [isOpen, reset]);

  // The schema has already trimmed every field and normalised the country code
  // to create-user's documented `+NN` form, so this just maps and sends.
  const onSubmit = async (form: SailorFormData) => {
    try {
      const response = await createSailor({
        email: form.email,
        // A sailor is created as a `customer` — there is no "sailor" role.
        role: "customer",
        first_name: form.first_name,
        last_name: form.last_name,
        country_code: form.country_code,
        whatsapp_number: form.whatsapp_number,
      }).unwrap();
      onClose();
      toast.success(getApiMessage(response) ?? F.ADD_SUCCESS);
    } catch (error) {
      // Keep the drawer open so the entered data survives, then explain why.
      toast.error(getApiMessage(error) ?? F.SAVE_ERROR);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={560}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconUser size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">{F.ADD_TITLE}</SheetTitle>
              <SheetDescription>{F.ADD_SUBTITLE}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            <FormRow>
              <FormField label={F.FIRST_NAME} error={errors.first_name?.message}>
                <Input
                  placeholder={F.FIRST_NAME_PLACEHOLDER}
                  error={!!errors.first_name}
                  {...register("first_name")}
                />
              </FormField>
              <FormField label={F.LAST_NAME} error={errors.last_name?.message}>
                <Input
                  placeholder={F.LAST_NAME_PLACEHOLDER}
                  error={!!errors.last_name}
                  {...register("last_name")}
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label={F.COUNTRY_CODE} error={errors.country_code?.message}>
                <Input
                  placeholder={F.COUNTRY_CODE_PLACEHOLDER}
                  error={!!errors.country_code}
                  {...register("country_code")}
                />
              </FormField>
              <FormField label={F.WHATSAPP} error={errors.whatsapp_number?.message}>
                <Input
                  placeholder={F.WHATSAPP_PLACEHOLDER}
                  error={!!errors.whatsapp_number}
                  {...register("whatsapp_number")}
                />
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField label={F.EMAIL} error={errors.email?.message}>
                <Input
                  type="email"
                  placeholder={F.EMAIL_PLACEHOLDER}
                  error={!!errors.email}
                  {...register("email")}
                />
              </FormField>
            </FormRow>
          </div>

          <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
            <div className="flex justify-end gap-3 w-full">
              <button
                type="button"
                className="btn btn-ghost btn-cancel"
                onClick={onClose}
                disabled={isCreating}
              >
                {F.CANCEL}
              </button>
              <button type="submit" className="btn btn-primary" disabled={isCreating}>
                <IconCheck size={16} />
                {isCreating ? F.ADDING : F.ADD_SUBMIT}
              </button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default SailorAddDrawer;
