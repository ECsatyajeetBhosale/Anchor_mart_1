import {
  optionalCountryCodeField,
  optionalEmailField,
  optionalPhoneNumberField,
} from "@/lib/validation";
import { z } from "zod";

/**
 * Validation schema for creating/updating a ship agent.
 *
 * `name` is required; the backend requires at least one contact (mobile or
 * email), enforced here via `.refine` so the error surfaces before submit.
 * Add and Edit share this schema — the admin API accepts the same five fields.
 *
 * The contact fields use the *optional* `lib/validation` builders: blank is
 * allowed (that's the point of the either/or rule), but anything typed has to
 * satisfy the same rules as every other phone/email field in the app.
 */
export const shipAgentSchema = z
  .object({
    // Left as a plain required string, NOT `personNameField`: an agent here is
    // often a desk or an office ("Marine Services 24/7"), so the no-digits rule
    // that suits a person's name would reject real values.
    name: z.string().trim().min(1, "Agent name is required"),
    company: z.string().trim().default(""),
    country_code: optionalCountryCodeField().default(""),
    mobile: optionalPhoneNumberField().default(""),
    email: optionalEmailField().default(""),
  })
  .refine((data) => Boolean(data.mobile.trim() || data.email.trim()), {
    message: "Provide at least a mobile number or an email.",
    path: ["mobile"],
  });

export type ShipAgentFormData = z.infer<typeof shipAgentSchema>;
