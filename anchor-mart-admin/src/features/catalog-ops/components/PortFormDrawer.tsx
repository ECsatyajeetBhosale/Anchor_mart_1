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
import { IconAnchor, IconCheck, IconInfoCircle } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreatePortMutation, useUpdatePortMutation } from "../api/portApi";
import { type PortFormData, portEditSchema, portSchema } from "../schemas/catalogOps.schema";
import type { DefaultAnchoragePayload, Port } from "../types/catalogOps.types";

const M = MESSAGES.PORTS;
const DA = M.DEFAULT_ANCHORAGE;

const DEFAULTS: PortFormData = {
  port_code: "",
  port_name: "",
  country: "",
  region: "",
  is_active: true,
  default_anchorage: {
    anchorage_name: "",
    anchorage_code: "",
    is_active: true,
  },
};

/**
 * Trim the nested anchorage down to what the API takes.
 *
 * An untouched code box is `""`, and an untouched hours box is `undefined`.
 * Both are dropped rather than sent: the API defaults them, and a literal `""`
 * would record an empty code as a deliberate choice instead of an omission.
 */
function toDefaultAnchorage(form: PortFormData["default_anchorage"]): DefaultAnchoragePayload {
  return {
    anchorage_name: form.anchorage_name,
    ...(form.anchorage_code ? { anchorage_code: form.anchorage_code } : {}),
    is_active: form.is_active,
  };
}

export interface PortFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** `null` → add mode. */
  port: Port | null;
}

/**
 * Add/edit drawer for a port.
 *
 * **Add and edit are no longer the same form.** Creating a port also creates its
 * default anchorage — `add-port/` requires a `default_anchorage` object and
 * writes both rows in one transaction — so the add form carries a second
 * section that the edit form has no equivalent for. Editing a port cannot
 * change its default; that happens by promoting one of its anchorages, in the
 * anchorage drawer.
 *
 * The two also validate differently: `country` and `region` are required on
 * create because the endpoint requires them, and optional on edit because ports
 * created before that rule can be missing either.
 */
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
    // Edit drops the `default_anchorage` branch and relaxes country/region. The
    // form type stays the add-shaped one so the fields can be registered
    // unconditionally; the extra branch is simply not rendered or read in edit
    // mode.
    resolver: zodResolver(isEdit ? portEditSchema : portSchema) as Resolver<PortFormData>,
    defaultValues: DEFAULTS,
  });

  // Reseed whenever the drawer opens, so switching rows can't show stale values.
  // A failed submit leaves it open (and untouched), preserving what was typed.
  useEffect(() => {
    if (!isOpen) return;
    reset(
      port
        ? {
            ...DEFAULTS,
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
    const { default_anchorage, ...portFields } = data;
    try {
      const response = port
        ? await updatePort({ id: port.id, body: portFields }).unwrap()
        : await createPort({
            ...portFields,
            // Sent whole: the endpoint validates it as a nested object and
            // reports failures the same way — `{ default_anchorage: {
            // anchorage_name: [...] } }` — which `getApiMessage` walks.
            default_anchorage: toDefaultAnchorage(default_anchorage),
          }).unwrap();
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
              {/* Required on create, optional on edit — the label follows the
                  schema so the star is never a lie in either direction. */}
              <FormField
                label={isEdit ? M.FIELDS.COUNTRY_OPTIONAL : M.FIELDS.COUNTRY}
                error={errors.country?.message}
              >
                <Input
                  placeholder={M.FIELDS.COUNTRY_PLACEHOLDER}
                  error={!!errors.country}
                  {...register("country")}
                />
              </FormField>
              <FormField
                label={isEdit ? M.FIELDS.REGION_OPTIONAL : M.FIELDS.REGION}
                error={errors.region?.message}
              >
                <Input
                  placeholder={M.FIELDS.REGION_PLACEHOLDER}
                  error={!!errors.region}
                  {...register("region")}
                />
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

          {/* Add only. A port is created together with its default anchorage —
              one transaction, and the backend refuses to invent the mooring —
              so this is part of creating a port rather than a follow-up step.
              An existing port's default is changed by promoting one of its
              anchorages, which lives in the anchorage drawer. */}
          {!isEdit && (
            <section className="prod-tab">
              <div className="mb-1 text-[12.5px] font-bold text-[var(--t2)]">{DA.TITLE}</div>
              <div className="mb-3 flex items-start gap-2 text-[11.5px] font-medium leading-relaxed text-[var(--t4)]">
                <IconInfoCircle size={15} className="mt-px shrink-0" />
                <span>{DA.NOTE}</span>
              </div>

              <FormRow>
                <FormField
                  label={DA.NAME}
                  error={errors.default_anchorage?.anchorage_name?.message}
                >
                  <Input
                    placeholder={DA.NAME_PLACEHOLDER}
                    error={!!errors.default_anchorage?.anchorage_name}
                    {...register("default_anchorage.anchorage_name")}
                  />
                </FormField>
                <FormField
                  label={DA.CODE}
                  error={errors.default_anchorage?.anchorage_code?.message}
                >
                  <Input
                    className="mono"
                    placeholder={DA.CODE_PLACEHOLDER}
                    error={!!errors.default_anchorage?.anchorage_code}
                    {...register("default_anchorage.anchorage_code")}
                  />
                </FormField>
              </FormRow>
            </section>
          )}
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
