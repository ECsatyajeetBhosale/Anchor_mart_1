import { z } from "zod";

/**
 * Validation schema for creating/updating a ship agent.
 * `name` is required; the backend requires at least one contact (mobile or
 * email), enforced here via `.refine` so the error surfaces before submit.
 * Add and Edit share this schema — the admin API accepts the same five fields.
 */
export const shipAgentSchema = z
  .object({
    name: z.string().trim().min(1, "Agent name is required"),
    company: z.string().trim().default(""),
    country_code: z.string().trim().default(""),
    mobile: z.string().trim().default(""),
    // Optional, but must be a valid email when provided.
    email: z
      .union([z.literal(""), z.string().trim().email("Enter a valid email address")])
      .default(""),
  })
  .refine((data) => Boolean(data.mobile.trim() || data.email.trim()), {
    message: "Provide at least a mobile number or an email.",
    path: ["mobile"],
  });

export type ShipAgentFormData = z.infer<typeof shipAgentSchema>;
