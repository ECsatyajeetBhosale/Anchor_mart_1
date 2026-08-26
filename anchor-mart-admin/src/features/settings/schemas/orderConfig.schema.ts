import { z } from "zod";

import { MESSAGES } from "@/lib/messages";

const V = MESSAGES.SETTINGS.ORDER_CONFIG.VALIDATION;

/**
 * One whole-number-of-hours field.
 *
 * An empty box is mapped to `NaN` rather than being coerced: `Number("")` is
 * `0`, which is a *valid* value for three of these six fields, so plain
 * coercion would silently turn a cleared input into a real setting of zero.
 *
 * Every rule here is also enforced server-side. This exists so a typo is caught
 * beside the input rather than after a round trip, not because the client is
 * trusted.
 */
function hours(min: number, max: number) {
  return z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? Number.NaN : Number(value)),
    z
      .number({ invalid_type_error: V.REQUIRED })
      .int(V.WHOLE)
      .min(min, V.RANGE(min, max))
      .max(max, V.RANGE(min, max)),
  );
}

/**
 * The six order-timing fields.
 *
 * The floors are **not uniform**: `0` is meaningful for the cancellation window,
 * the anchorage fallback and the estimate buffer — it means "no lead time", "no
 * default" and "an exact time rather than a range". The three delivery SLAs
 * start at 1, because a zero-hour deadline is not a deadline. A blanket `min(1)`
 * would reject three legitimate settings.
 */
export const orderConfigSchema = z.object({
  cancel_lead_hours: hours(0, 720),
  sla_express_hours: hours(1, 168),
  sla_fastest_hours: hours(1, 168),
  sla_emergency_hours: hours(1, 168),
  default_anchorage_hours: hours(0, 168),
  eta_range_buffer_hours: hours(0, 168),
});

export type OrderConfigFormData = z.infer<typeof orderConfigSchema>;
