import { MESSAGES } from "@/lib/messages";
import {
  countryCodeField,
  firstNameField,
  lastNameField,
  phoneNumberField,
} from "@/lib/validation";
import { z } from "zod";

const V = MESSAGES.PARTNERS.VALIDATION;

/**
 * Shared onboard/edit partner form schema — maps 1:1 to the create/update
 * payloads (first_name, last_name, email, country_code, whatsapp_number).
 *
 * The name and phone rules come from `lib/validation` so this form agrees with
 * every other one that collects them; only `email` is local, since nothing else
 * about it is shared yet.
 */
export const partnerFormSchema = z.object({
  first_name: firstNameField(),
  last_name: lastNameField(),
  email: z.string().trim().min(1, V.EMAIL_REQUIRED).email(V.EMAIL_INVALID),
  country_code: countryCodeField(),
  whatsapp_number: phoneNumberField(MESSAGES.VALIDATION.LABELS.WHATSAPP),
});

export type PartnerFormData = z.infer<typeof partnerFormSchema>;
