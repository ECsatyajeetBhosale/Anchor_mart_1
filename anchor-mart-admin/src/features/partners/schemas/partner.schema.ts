import { MESSAGES } from "@/lib/messages";
import { z } from "zod";

const V = MESSAGES.PARTNERS.VALIDATION;

/**
 * Shared onboard/edit partner form schema — maps 1:1 to the create/update
 * payloads (first_name, last_name, email, country_code, whatsapp_number).
 */
export const partnerFormSchema = z.object({
  first_name: z.string().trim().min(1, V.FIRST_NAME_REQUIRED),
  last_name: z.string().trim(),
  email: z.string().trim().min(1, V.EMAIL_REQUIRED).email(V.EMAIL_INVALID),
  country_code: z
    .string()
    .trim()
    .min(1, V.COUNTRY_CODE_REQUIRED)
    // "+" followed by 1–4 digits, e.g. +91
    .regex(/^\+\d{1,4}$/, V.COUNTRY_CODE_INVALID),
  whatsapp_number: z
    .string()
    .trim()
    .min(1, V.WHATSAPP_REQUIRED)
    // Digits only, 7–15 chars (international range)
    .regex(/^\d{7,15}$/, V.WHATSAPP_INVALID),
});

export type PartnerFormData = z.infer<typeof partnerFormSchema>;
