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
