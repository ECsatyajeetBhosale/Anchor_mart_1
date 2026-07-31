import { MESSAGES } from "@/lib/messages";
import {
  countryCodeField,
  emailField,
  firstNameField,
  lastNameField,
  phoneNumberField,
} from "@/lib/validation";
import { z } from "zod";

/** FAQ create/update — the API accepts exactly these three fields. */
export const faqSchema = z.object({
  faq_type: z.string().min(1, "Select a FAQ category"),
  question: z.string().trim().min(1, "Question is required"),
  answer: z.string().trim().min(1, "Answer is required"),
});

export type FaqFormData = z.infer<typeof faqSchema>;

/**
 * User creation. Mirrors create-user's documented contract: everything is
 * required except `last_name`.
 */
export const createUserSchema = z.object({
  first_name: firstNameField(),
  last_name: lastNameField(),
  email: emailField(),
  role: z.enum(["customer", "seller", "admin", "super_admin", "delivery_partner"]),
  country_code: countryCodeField(),
  whatsapp_number: phoneNumberField(MESSAGES.VALIDATION.LABELS.WHATSAPP),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

/**
 * Loyalty configuration — the only part of Platform Configuration with a real
 * endpoint (`promotion/loyalty/config/update/`). `point_value` is a decimal
 * string on the wire, so it is validated as a number and serialised back.
 */
export const loyaltyConfigSchema = z.object({
  points_per_delivery: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Must be 0 or more"),
  points_per_referral: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Must be 0 or more"),
  point_value: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .min(0, "Must be 0 or more"),
});

export type LoyaltyConfigFormData = z.infer<typeof loyaltyConfigSchema>;
