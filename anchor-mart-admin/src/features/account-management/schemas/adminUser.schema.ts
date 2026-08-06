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
 * Editing an existing admin user.
 *
 * Deliberately narrower than {@link createUserSchema}: `role` is absent because
 * the tier is fixed at creation, and the update endpoint has no reason to be
 * more permissive than its sailor equivalent (which 400s on a role change).
 *
 * The same shared field builders keep this identical to every other
 * name/email/phone form in the app, so an admin's contact details validate the
 * way a sailor's do.
 */
export const adminUserSchema = z.object({
  first_name: firstNameField(),
  last_name: lastNameField(),
  email: emailField(),
  country_code: countryCodeField(),
  whatsapp_number: phoneNumberField(MESSAGES.VALIDATION.LABELS.WHATSAPP),
});

export type AdminUserFormData = z.infer<typeof adminUserSchema>;
