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
 * Add/edit sailor form schema.
 *
 * Both drawers collect the same five fields and both feed a `User` row, so they
 * share one schema built from `lib/validation` — the same rules the partner and
 * create-user forms use. Only the *endpoints* differ: add goes through
 * `admin/create-user/`, edit through `sailors/sailor/<id>/update/`.
 *
 * `country_code` is normalised to `+NN` here. Create-user wants that form
 * verbatim; the update endpoint wants it bare, so the edit drawer strips the
 * "+" on submit rather than validating a second shape.
 */
export const sailorFormSchema = z.object({
  first_name: firstNameField(),
  last_name: lastNameField(),
  country_code: countryCodeField(),
  whatsapp_number: phoneNumberField(MESSAGES.VALIDATION.LABELS.WHATSAPP),
  email: emailField(),
});

export type SailorFormData = z.infer<typeof sailorFormSchema>;

/** Blank add-form values. `+91` matches the default the drawers already used. */
export const EMPTY_SAILOR_FORM: SailorFormData = {
  first_name: "",
  last_name: "",
  country_code: "+91",
  whatsapp_number: "",
  email: "",
};
