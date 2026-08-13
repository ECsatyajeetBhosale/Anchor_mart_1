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
 * User creation. Mirrors `create-user`'s documented contract: everything is
 * required except `last_name`.
 *
 * Moved here from `settings/schemas/settings.schema.ts` alongside the rest of
 * provisioning; the shared field builders keep it identical to every other
 * name/phone/email form in the app.
 */
export const createUserSchema = z.object({
  first_name: firstNameField(),
  last_name: lastNameField(),
  email: emailField(),
  role: z.enum(["customer", "seller", "admin", "super_admin", "delivery_partner"]),
  country_code: countryCodeField(),
  whatsapp_number: phoneNumberField(MESSAGES.VALIDATION.LABELS.WHATSAPP),
  // Partner-only fields. Optional in the schema because they are irrelevant to
  // every other role; the drawer renders and sends them only for
  // `delivery_partner`, and the "at least one capability" rule is enforced
  // there rather than here for the same reason.
  can_verify: z.boolean().optional(),
  can_deliver: z.boolean().optional(),
  assigned_port: z.string().optional(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
