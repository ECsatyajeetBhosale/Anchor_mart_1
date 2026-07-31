import { MESSAGES } from "@/lib/messages";
import {
  countryCodeField,
  emailField,
  firstNameField,
  lastNameField,
  phoneNumberField,
} from "@/lib/validation";
import { z } from "zod";

/**
 * Shared onboard/edit partner form schema — maps 1:1 to the create/update
 * payloads (first_name, last_name, email, country_code, whatsapp_number).
 *
 * Every rule comes from `lib/validation` so this form agrees with every other
 * one that collects the same fields.
 */
export const partnerFormSchema = z.object({
  first_name: firstNameField(),
  last_name: lastNameField(),
  email: emailField(),
  country_code: countryCodeField(),
  whatsapp_number: phoneNumberField(MESSAGES.VALIDATION.LABELS.WHATSAPP),
});

export type PartnerFormData = z.infer<typeof partnerFormSchema>;
