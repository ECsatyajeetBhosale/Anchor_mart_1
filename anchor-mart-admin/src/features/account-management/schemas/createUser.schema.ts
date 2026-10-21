import { MESSAGES } from "@/lib/messages";
import {
  countryCodeField,
  emailField,
  firstNameField,
  lastNameField,
  phoneCountryRule,
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
export const createUserSchema = z
  .object({
    first_name: firstNameField(),
    last_name: lastNameField(),
    email: emailField(),
    role: z.enum(["customer", "seller", "admin", "super_admin", "delivery_partner"]),
    country_code: countryCodeField(),
    whatsapp_number: phoneNumberField(MESSAGES.VALIDATION.LABELS.WHATSAPP),
    // Partner-only fields. Optional in the schema because they are irrelevant to
    // every other role; the drawer renders and sends them only for
    // `delivery_partner`, and the rules below apply only to that role.
    can_verify: z.boolean().optional(),
    can_deliver: z.boolean().optional(),
    assigned_port: z.string().optional(),
  })
  // The number is checked against the country the code belongs to, not just for
  // a plausible length. Runs last, once both fields are individually well-formed.
  .superRefine(phoneCountryRule({ codeKey: "country_code", numberKey: "whatsapp_number" }))
  // The same two onboarding rules as the Delivery Partners screen
  // (`partnerFormSchema`) — it posts to the same `partner/create/`.
  .superRefine((form, ctx) => {
    if (form.role !== "delivery_partner") return;
    // Unset reads as on: the drawer defaults both toggles to true.
    if (form.can_verify === false && form.can_deliver === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MESSAGES.PARTNERS.CAPABILITY.REQUIRED,
        path: ["can_verify"],
      });
    }
    // Without a port, port-scoped assignment can never find the partner.
    if (!form.assigned_port?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MESSAGES.PARTNERS.DETAIL.PORT_REQUIRED,
        path: ["assigned_port"],
      });
    }
  });

export type CreateUserFormData = z.infer<typeof createUserSchema>;
