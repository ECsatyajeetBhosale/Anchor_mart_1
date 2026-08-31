import { z } from "zod";

/** Add and edit share one schema — the write contract takes the same fields. */
export const portSchema = z.object({
  port_code: z.string().trim().min(1, "Port code is required"),
  port_name: z.string().trim().min(1, "Port name is required"),
  country: z.string().trim().default(""),
  region: z.string().trim().default(""),
  is_active: z.boolean().default(true),
});

export type PortFormData = z.infer<typeof portSchema>;

/**
 * Add form for an anchorage.
 *
 * `port_code` is not here: it is fixed by the port the drawer was opened from,
 * never typed. Letting it be edited would let an admin file a mooring under a
 * port they are not looking at, and the field the API keys on is the one thing
 * on this form with no user-facing meaning.
 */
export const anchorageSchema = z.object({
  anchorage_name: z.string().trim().min(1, "Anchorage name is required"),
  anchorage_code: z.string().trim().min(1, "Anchorage code is required"),
  is_active: z.boolean().default(true),
});

export type AnchorageFormData = z.infer<typeof anchorageSchema>;
