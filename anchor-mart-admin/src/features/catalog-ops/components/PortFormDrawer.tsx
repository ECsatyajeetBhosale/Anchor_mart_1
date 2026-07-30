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
import { Switch } from "@/components/ui/switch";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconAnchor, IconCheck } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreatePortMutation, useUpdatePortMutation } from "../api/portApi";
import { type PortFormData, portSchema } from "../schemas/catalogOps.schema";
import type { Port } from "../types/catalogOps.types";

const M = MESSAGES.PORTS;

const DEFAULTS: PortFormData = {
  port_code: "",
  port_name: "",
  country: "",
  region: "",
  is_active: true,
};

export interface PortFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** `null` → add mode. */
  port: Port | null;
}

/** Add/edit drawer for a port. One form serves both — the write body is identical. */
export function PortFormDrawer({ isOpen, onClose, port }: PortFormDrawerProps) {
  const isEdit = Boolean(port);
  const [createPort, { isLoading: isCreating }] = useCreatePortMutation();
  const [updatePort, { isLoading: isUpdating }] = useUpdatePortMutation();
  const isSaving = isCreating || isUpdating;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PortFormData>({
    resolver: zodResolver(portSchema),
    defaultValues: DEFAULTS,
  });

  // Reseed whenever the drawer opens, so switching rows can't show stale values.
  // A failed submit leaves it open (and untouched), preserving what was typed.
  useEffect(() => {
    if (!isOpen) return;
    reset(
      port
        ? {
            port_code: port.port_code,
            port_name: port.port_name,
            country: port.country ?? "",
            region: port.region ?? "",
            is_active: port.is_active,
          }
        : DEFAULTS,
    );
  }, [isOpen, port, reset]);

  const onSubmit = async (data: PortFormData) => {
    try {
      const response = port
        ? await updatePort({ id: port.id, body: data }).unwrap()
        : await createPort(data).unwrap();
      onClose();
      toast.success(
        getApiMessage(response) ?? (isEdit ? M.TOAST.UPDATE_SUCCESS : M.TOAST.ADD_SUCCESS),
      );
    } catch (error) {
      toast.error(getApiMessage(error) ?? (isEdit ? M.TOAST.UPDATE_ERROR : M.TOAST.ADD_ERROR));
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={620}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
              <IconAnchor size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">
                {isEdit ? M.FORM.EDIT_TITLE : M.FORM.ADD_TITLE}
              </SheetTitle>
              <SheetDescription>
                {isEdit ? M.FORM.EDIT_SUBTITLE : M.FORM.ADD_SUBTITLE}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 pt-4">
          <section className="prod-tab">
            <FormRow>
              <FormField label={M.FIELDS.CODE} error={errors.port_code?.message}>
                <Input
                  className="mono"
                  placeholder={M.FIELDS.CODE_PLACEHOLDER}
                  error={!!errors.port_code}
                  {...register("port_code")}
                />
              </FormField>
              <FormField label={M.FIELDS.NAME} error={errors.port_name?.message}>
                <Input
                  placeholder={M.FIELDS.NAME_PLACEHOLDER}
                  error={!!errors.port_name}
                  {...register("port_name")}
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label={M.FIELDS.COUNTRY} error={errors.country?.message}>
                <Input placeholder={M.FIELDS.COUNTRY_PLACEHOLDER} {...register("country")} />
              </FormField>
              <FormField label={M.FIELDS.REGION} error={errors.region?.message}>
                <Input placeholder={M.FIELDS.REGION_PLACEHOLDER} {...register("region")} />
              </FormField>
            </FormRow>

            <FormField label={M.FIELDS.ACTIVE}>
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </FormField>
          </section>
        </div>

        <SheetFooter className="border-t border-[var(--border-md)] bg-[var(--surface)] p-6">
          <div className="flex w-full justify-end gap-3">
            <button
              type="button"
              className="btn btn-ghost btn-cancel"
              onClick={onClose}
              disabled={isSaving}
            >
              {MESSAGES.COMMON.CANCEL}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
            >
              <IconCheck size={16} />
              {isSaving ? M.FORM.SAVING : M.FORM.SUBMIT}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default PortFormDrawer;
