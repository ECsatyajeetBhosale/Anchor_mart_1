import { z } from "zod";

/**
 * Optional whole hours — the `estimated_delivery_hours` box.
 *
 * An empty box means "not set" (`undefined`), not `0`: the API distinguishes
 * the two, and `0` on a delivery estimate is a promise of immediate arrival.
 * `z.coerce` cannot express that — `Number("")` is `0` — so the empty cases are
 * mapped before the number schema ever sees them.
 */
const optionalHours = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z
    .number({ invalid_type_error: "Enter a whole number of hours" })
    .int("Enter a whole number of hours")
    .min(0, "Hours cannot be negative")
    .optional(),
);

/**
 * The default anchorage, collected **on the port add form**.
 *
 * `add-port/` requires it: a port and its primary mooring are created in one
 * transaction, so these fields are part of creating a port rather than a
 * follow-up step. Edit mode does not use this — see `portEditSchema`.
 */
export const defaultAnchorageSchema = z.object({
  anchorage_name: z.string().trim().min(1, "Anchorage name is required").max(100, "Max 100 chars"),
  anchorage_code: z.string().trim().max(20, "Max 20 chars").default(""),
  estimated_delivery_hours: optionalHours,
  is_active: z.boolean().default(true),
});

/**
 * Add form for a port.
 *
 * `country` and `region` are required here because `add-port/` requires them.
 * They are *not* required by {@link portEditSchema}: ports created before that
 * rule existed can be missing either, and an admin toggling such a port's
 * status should not be made to invent a region first.
 */
export const portSchema = z.object({
  port_code: z.string().trim().min(1, "Port code is required"),
  port_name: z.string().trim().min(1, "Port name is required"),
  country: z.string().trim().min(1, "Country is required"),
  region: z.string().trim().min(1, "Region is required"),
  is_active: z.boolean().default(true),
  default_anchorage: defaultAnchorageSchema,
});

export type PortFormData = z.infer<typeof portSchema>;

/** Edit form for a port — the port fields alone, and no default anchorage. */
export const portEditSchema = portSchema.omit({ default_anchorage: true }).extend({
  country: z.string().trim().default(""),
  region: z.string().trim().default(""),
});

export type PortEditFormData = z.infer<typeof portEditSchema>;

/**
 * Add/edit form for an anchorage.
 *
 * `port` is not here: it is fixed by the port the drawer was opened from, never
 * typed. Letting it be edited would let an admin file a mooring under a port
 * they are not looking at — and update refuses a `port` outright, since an
 * anchorage cannot be moved.
 *
 * `is_default` is not here either. It is not a value the operator sets on this
 * form: promotion is a row action, and demotion does not exist.
 */
export const anchorageSchema = z.object({
  anchorage_name: z.string().trim().min(1, "Anchorage name is required").max(100, "Max 100 chars"),
  /**
   * Optional, matching the API — codes are not generated, and a blank one is
   * ordinary data rather than an incomplete row.
   */
  anchorage_code: z.string().trim().max(20, "Max 20 chars").default(""),
  estimated_delivery_hours: optionalHours,
  is_active: z.boolean().default(true),
});

export type AnchorageFormData = z.infer<typeof anchorageSchema>;
