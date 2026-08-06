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
 * payloads (first_name, last_name, email, country_code, whatsapp_number,
 * can_verify, can_deliver).
 *
 * Every text rule comes from `lib/validation` so this form agrees with every
 * other one that collects the same fields.
 */
export const partnerFormSchema = z
  .object({
    first_name: firstNameField(),
    last_name: lastNameField(),
    email: emailField(),
    country_code: countryCodeField(),
    whatsapp_number: phoneNumberField(MESSAGES.VALIDATION.LABELS.WHATSAPP),
    // Both default to true — "Both" is the documented default and the common
    // shape. See the refine below for the one combination the backend refuses.
    can_verify: z.boolean(),
    can_deliver: z.boolean(),
  })
  // Flow 28 API 1/5: "at least one must be true". A partner with neither is
  // rejected with a 400, and would in any case be unassignable — so the form
  // says so before the round trip rather than after it.
  .refine((form) => form.can_verify || form.can_deliver, {
    message: MESSAGES.PARTNERS.CAPABILITY.REQUIRED,
    // Pinned to `can_verify` so the message renders beside the first checkbox;
    // a form-level error would have nowhere to land in this layout.
    path: ["can_verify"],
  });

export type PartnerFormData = z.infer<typeof partnerFormSchema>;
