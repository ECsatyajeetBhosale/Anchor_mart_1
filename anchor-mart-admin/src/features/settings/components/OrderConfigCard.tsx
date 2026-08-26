import { zodResolver } from "@hookform/resolvers/zod";
import { IconClockHour4 } from "@tabler/icons-react";
import { addHours, format, nextFriday, setHours, setMinutes, startOfDay } from "date-fns";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiMessage, getFieldErrors } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";

import { useGetOrderConfigQuery, useUpdateOrderConfigMutation } from "../api/orderConfigApi";
import { type OrderConfigFormData, orderConfigSchema } from "../schemas/orderConfig.schema";
import type {
  OrderConfig,
  OrderConfigField,
  UpdateOrderConfigPayload,
} from "../types/settings.types";

const M = MESSAGES.SETTINGS.ORDER_CONFIG;
const F = M.FIELDS;

/** The six editable fields, in the order they appear on the form. */
const EDITABLE_FIELDS: OrderConfigField[] = [
  "cancel_lead_hours",
  "sla_express_hours",
  "sla_fastest_hours",
  "sla_emergency_hours",
  "default_anchorage_hours",
  "eta_range_buffer_hours",
];

/** Strips the record down to just what the form edits. */
function toFormValues(config: OrderConfig): OrderConfigFormData {
  return {
    cancel_lead_hours: config.cancel_lead_hours,
    sla_express_hours: config.sla_express_hours,
    sla_fastest_hours: config.sla_fastest_hours,
    sla_emergency_hours: config.sla_emergency_hours,
    default_anchorage_hours: config.default_anchorage_hours,
    eta_range_buffer_hours: config.eta_range_buffer_hours,
  };
}

/**
 * What actually changed, against the record the server last gave us.
 *
 * Sending the whole form is accepted, but the backend logs which fields moved
 * and who moved them — a full-form write records one real change surrounded by
 * five no-ops, and an audit trail that says everything changed says nothing.
 * An empty diff is also a 400, which is why Save is disabled when nothing moved.
 */
function diffAgainst(
  baseline: OrderConfig | undefined,
  values: OrderConfigFormData,
): UpdateOrderConfigPayload {
  if (!baseline) return {};
  const payload: UpdateOrderConfigPayload = {};
  for (const field of EDITABLE_FIELDS) {
    // Already numbers: the schema parses the input's string before this runs, so
    // the payload carries `8` rather than `"8"` — the API rejects the string.
    if (values[field] !== baseline[field]) payload[field] = values[field];
  }
  return payload;
}

/**
 * A worked example for the cancellation window.
 *
 * The field is counted **backwards from the ship's arrival**, and nearly
 * everyone meeting it for the first time reads it forwards — as "the sailor has
 * this long to cancel". A label alone does not fix that; showing the resulting
 * moment does. This is the one setting on the screen that decides who gets a
 * refund, so it is worth the extra line.
 */
function cancellationExample(hours: number): string {
  // A fixed, arbitrary anchor — Friday 6pm — so the sentence reads the same
  // every time and the only thing that moves is the answer.
  const arrival = setMinutes(setHours(startOfDay(nextFriday(new Date())), 18), 0);
  return format(addHours(arrival, -hours), "EEEE h aaa");
}

/**
 * Order Configuration — the one editable settings form on this screen.
 *
 * There is exactly one configuration record and it always exists, so this is a
 * form and not a list: no create, no delete, no selection, no empty state.
 *
 * A sub-admin sees the same form, disabled. Hiding it would be worse: an
 * operator needs to know the cancellation window they are working inside even
 * though they cannot move it, and a visible-but-disabled Save is honest where an
 * enabled one that 403s is not.
 */
export function OrderConfigCard() {
  const { can } = useAdminAccess();
  const canEdit = can("platform.order_config");

  const { data: config, isLoading, isError } = useGetOrderConfigQuery();
  const [updateConfig, { isLoading: isSaving }] = useUpdateOrderConfigMutation();

  // Held back until the retroactivity warning is acknowledged. Null means no
  // save is waiting on a decision.
  const [pending, setPending] = useState<UpdateOrderConfigPayload | null>(null);
  // Form-level failures — an empty diff, an unknown field, a permission the
  // server disagrees with. Field-level ones go inline instead.
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm<OrderConfigFormData>({
    resolver: zodResolver(orderConfigSchema),
  });

  // Seed from the record, and reseed whenever the server hands back a new one.
  useEffect(() => {
    if (config) reset(toFormValues(config));
  }, [config, reset]);

  const cancelLeadHours = watch("cancel_lead_hours");

  const save = async (payload: UpdateOrderConfigPayload) => {
    setFormError(null);
    try {
      // The response is the full updated record — the form reseeds from it
      // rather than assuming local state is now what the server holds.
      const updated = await updateConfig(payload).unwrap();
      reset(toFormValues(updated));
      toast.success(M.SAVED);
    } catch (error) {
      // The form is deliberately not cleared: the numbers in it are still what
      // the operator meant, and a 400 is a correction, not a reset.
      const fieldErrors = getFieldErrors(error);
      for (const [field, message] of Object.entries(fieldErrors)) {
        if (EDITABLE_FIELDS.includes(field as OrderConfigField)) {
          setError(field as OrderConfigField, { type: "server", message });
        }
      }
      // Every bad field arrives in one body, so all of them are shown at once —
      // fixing them one round trip at a time is the failure this avoids.
      const banner = getApiMessage(error, { labelFields: false });
      if (banner && Object.keys(fieldErrors).length === 0) setFormError(banner);
      else if (Object.keys(fieldErrors).length === 0) setFormError(M.LOAD_ERROR);
    }
  };

  const onSubmit = (values: OrderConfigFormData) => {
    const payload = diffAgainst(config, values);
    if (Object.keys(payload).length === 0) return;
    // Only the cancellation window reaches orders already placed. The four
    // delivery targets are fixed at assignment time, so warning about them
    // would train the operator to click through the warning that matters.
    if ("cancel_lead_hours" in payload) {
      setPending(payload);
      return;
    }
    void save(payload);
  };

  const disabled = !canEdit || isLoading || isSaving;

  return (
    <SectionCard
      icon={<IconClockHour4 size={17} className="text-[var(--t4)]" />}
      title={M.TITLE}
      actions={
        config?.updated_at && (
          // Preformatted by the server — rendered, never parsed.
          <span className="w6 c4 text-[12px]">
            {M.UPDATED_PREFIX} {config.updated_at}
          </span>
        )
      }
    >
      {isError ? (
        <p className="td-m text-[var(--danger-text)]">{M.LOAD_ERROR}</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <p className="fg-hint mb-3">{M.SUBTITLE}</p>

          {!canEdit && (
            <p className="fg-hint mb-4 rounded-[var(--radius-sm)] bg-[var(--surface-alt)] px-3 py-2">
              {M.READ_ONLY}
            </p>
          )}

          {formError && (
            <p className="mb-4 rounded-[var(--radius-sm)] bg-[var(--danger-bg)] px-3 py-2 font-semibold text-[12.5px] text-[var(--danger-text)]">
              {formError}
            </p>
          )}

          <div className="sec-label">{M.SECTIONS.CANCELLATION}</div>
          <FormRow>
            <FormField
              label={F.CANCEL_LEAD.LABEL}
              hint={F.CANCEL_LEAD.HINT}
              error={errors.cancel_lead_hours?.message}
            >
              <Input
                type="number"
                min={0}
                max={720}
                step={1}
                disabled={disabled}
                {...register("cancel_lead_hours")}
              />
              {/* The resulting moment, spelled out. The label says "before ship
                  arrival"; this proves it. */}
              {Number.isFinite(cancelLeadHours) && (
                <p className="fg-hint mt-1">
                  {F.CANCEL_LEAD.EXAMPLE(cancelLeadHours, cancellationExample(cancelLeadHours))}
                </p>
              )}
            </FormField>
          </FormRow>

          <div className="sec-label">{M.SECTIONS.DELIVERY}</div>
          <FormRow>
            <FormField
              label={F.SLA_EXPRESS.LABEL}
              hint={F.SLA_EXPRESS.HINT}
              error={errors.sla_express_hours?.message}
            >
              {/* Minimum 1, not 0 — a zero-hour deadline is not a deadline. The
                  three fields above and below that accept 0 are not the same. */}
              <Input
                type="number"
                min={1}
                max={168}
                step={1}
                disabled={disabled}
                {...register("sla_express_hours")}
              />
            </FormField>
            <FormField
              label={F.SLA_FASTEST.LABEL}
              hint={F.SLA_FASTEST.HINT}
              error={errors.sla_fastest_hours?.message}
            >
              <Input
                type="number"
                min={1}
                max={168}
                step={1}
                disabled={disabled}
                {...register("sla_fastest_hours")}
              />
            </FormField>
          </FormRow>
          <FormRow>
            <FormField
              label={F.SLA_EMERGENCY.LABEL}
              hint={F.SLA_EMERGENCY.HINT}
              error={errors.sla_emergency_hours?.message}
            >
              <Input
                type="number"
                min={1}
                max={168}
                step={1}
                disabled={disabled}
                {...register("sla_emergency_hours")}
              />
            </FormField>
            <FormField
              label={F.DEFAULT_ANCHORAGE.LABEL}
              hint={F.DEFAULT_ANCHORAGE.HINT}
              error={errors.default_anchorage_hours?.message}
            >
              <Input
                type="number"
                min={0}
                max={168}
                step={1}
                disabled={disabled}
                {...register("default_anchorage_hours")}
              />
            </FormField>
          </FormRow>

          <div className="sec-label">{M.SECTIONS.ESTIMATES}</div>
          <FormRow>
            <FormField
              label={F.ETA_BUFFER.LABEL}
              hint={F.ETA_BUFFER.HINT}
              error={errors.eta_range_buffer_hours?.message}
            >
              <Input
                type="number"
                min={0}
                max={168}
                step={1}
                disabled={disabled}
                {...register("eta_range_buffer_hours")}
              />
            </FormField>
          </FormRow>

          {/* No Save at all for a sub-admin. A disabled one still reads as
              "you could do this if you tried harder"; absence does not. */}
          {canEdit && (
            <div className="mt-4 flex justify-end">
              {/* An empty diff is a 400, so an unmodified form cannot be sent. */}
              <Button type="submit" variant="primary" disabled={disabled || !isDirty}>
                {isSaving ? M.SAVING : M.SAVE}
              </Button>
            </div>
          )}
        </form>
      )}

      <ConfirmDialog
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => {
          const payload = pending;
          setPending(null);
          if (payload) void save(payload);
        }}
        title={M.RETROACTIVE.TITLE}
        description={M.RETROACTIVE.BODY}
        confirmText={M.RETROACTIVE.CONFIRM}
        isLoading={isSaving}
        loadingText={M.SAVING}
      />
    </SectionCard>
  );
}

export default OrderConfigCard;
