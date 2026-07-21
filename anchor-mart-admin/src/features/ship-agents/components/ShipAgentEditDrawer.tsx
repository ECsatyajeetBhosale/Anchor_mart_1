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
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconAnchor, IconCheck } from "@tabler/icons-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateShipAgentMutation } from "../api/shipAgentApi";
import { type ShipAgentFormData, shipAgentSchema } from "../schemas/shipAgent.schema";
import type { ShipAgent, ShipAgentPayload } from "../types/shipAgent.types";

const M = MESSAGES.SHIP_AGENTS;

export interface ShipAgentEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  agent: ShipAgent;
}

export function ShipAgentEditDrawer({ isOpen, onClose, agent }: ShipAgentEditDrawerProps) {
  const [updateShipAgent, { isLoading: isUpdating }] = useUpdateShipAgentMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShipAgentFormData>({
    resolver: zodResolver(shipAgentSchema),
  });

  // Pre-populate the editable fields from the selected agent each time the
  // drawer opens.
  useEffect(() => {
    if (!isOpen) return;
    reset({
      name: agent.name ?? "",
      company: agent.company ?? "",
      country_code: agent.country_code ?? "",
      mobile: agent.mobile ?? "",
      email: agent.email ?? "",
    });
  }, [isOpen, agent, reset]);

  const onSubmit = async (formData: ShipAgentFormData) => {
    const payload: ShipAgentPayload = {
      name: formData.name,
      company: formData.company,
      country_code: formData.country_code,
      mobile: formData.mobile,
      email: formData.email,
    };

    try {
      const response = await updateShipAgent({ id: agent.id, body: payload }).unwrap();
      // Success: close the drawer first, then notify.
      onClose();
      toast.success(getApiMessage(response) ?? M.TOAST.UPDATE_SUCCESS);
    } catch (error) {
      // Failure: keep the drawer open so the user can fix and retry, then notify.
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
              <IconAnchor size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">{M.EDIT.TITLE}</SheetTitle>
              <SheetDescription>{M.EDIT.SUBTITLE}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-6">
          <section className="prod-tab">
            <div className="sec-label">{M.SECTIONS.BASIC}</div>
            <FormField label={M.FIELDS.NAME} error={errors.name?.message}>
              <Input
                placeholder={M.FIELDS.NAME_PLACEHOLDER}
                error={!!errors.name}
                {...register("name")}
              />
            </FormField>
            <FormField label={M.FIELDS.COMPANY} error={errors.company?.message}>
              <Input placeholder={M.FIELDS.COMPANY_PLACEHOLDER} {...register("company")} />
            </FormField>
          </section>

          <section className="prod-tab">
            <div className="sec-label">{M.SECTIONS.CONTACT}</div>
            <div className="grid grid-cols-[120px_1fr] gap-3">
              <FormField label={M.FIELDS.COUNTRY_CODE} error={errors.country_code?.message}>
                <Input
                  placeholder={M.FIELDS.COUNTRY_CODE_PLACEHOLDER}
                  {...register("country_code")}
                />
              </FormField>
              <FormField label={M.FIELDS.MOBILE} error={errors.mobile?.message}>
                <Input
                  placeholder={M.FIELDS.MOBILE_PLACEHOLDER}
                  error={!!errors.mobile}
                  {...register("mobile")}
                />
              </FormField>
            </div>
            <FormField
              label={M.FIELDS.EMAIL}
              hint={M.FIELDS.CONTACT_HINT}
              error={errors.email?.message}
            >
              <Input
                type="email"
                placeholder={M.FIELDS.EMAIL_PLACEHOLDER}
                error={!!errors.email}
                {...register("email")}
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
              {isUpdating ? M.EDIT.SAVING : M.EDIT.SUBMIT}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
