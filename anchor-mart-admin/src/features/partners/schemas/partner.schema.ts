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
 * The fields the onboard form and the edit form both collect.
 *
 * Kept as a bare object so both schemas below can build on it: the two forms
 * agree on everything here and differ only in the flags `partner_detail_update`
 * accepts and `partner/create/` has no concept of.
 *
 * Every text rule comes from `lib/validation` so this form agrees with every
 * other one that collects the same fields.
 */
const partnerFields = z.object({
  first_name: firstNameField(),
  last_name: lastNameField(),
  email: emailField(),
  country_code: countryCodeField(),
  whatsapp_number: phoneNumberField(MESSAGES.VALIDATION.LABELS.WHATSAPP),
  // Both default to true — "Both" is the documented default and the common
  // shape. See the capability rule below for the one combination the backend
  // refuses.
  can_verify: z.boolean(),
  can_deliver: z.boolean(),
  /**
   * Home port. `required=False, allow_null=True` on the API, and left that way
   * here so an existing partner without one can still be edited — see the
   * onboarding override below. `""` is sent as `null`.
   */
  assigned_port: z.string(),
});

/**
 * Flow 28 API 1/5: "at least one must be true". A partner with neither is
 * rejected with a 400, and would in any case be unassignable — so the form says
 * so before the round trip rather than after it.
 */
const hasCapability = (form: { can_verify: boolean; can_deliver: boolean }) =>
  form.can_verify || form.can_deliver;

const CAPABILITY_ERROR = {
  message: MESSAGES.PARTNERS.CAPABILITY.REQUIRED,
  // Pinned to `can_verify` so the message renders beside the first checkbox; a
  // form-level error would have nowhere to land in this layout.
  path: ["can_verify"],
};

const phoneMatchesCountry = phoneCountryRule({
  codeKey: "country_code",
  numberKey: "whatsapp_number",
});

/**
 * Onboarding — maps 1:1 to `POST /superadmin/partner/create/`.
 *
 * The port is **required here, and only here**, which is stricter than the API.
 * It is what makes a partner reachable by port-scoped assignment: without one
 * they are capability-matched only, and `assignable-partners/?order_id=`
 * returns nothing for them. Letting a new partner in without a port is how the
 * roster fills up with people no order can find, so the moment of creation —
 * the one moment someone is definitely looking at this record — is where to
 * insist.
 *
 * Deliberately not applied to editing. Partners created before anything
 * collected a port have `assigned_port = null`, and requiring it there would
 * block every unrelated edit to those records until someone guessed a port for
 * them.
 */
export const partnerFormSchema = partnerFields
  .extend({
    assigned_port: z.string().trim().min(1, MESSAGES.PARTNERS.DETAIL.PORT_REQUIRED),
  })
  .refine(hasCapability, CAPABILITY_ERROR)
  // The number is checked against the country the code belongs to, not just for
  // a plausible length. Runs last, once both fields are individually well-formed.
  .superRefine(phoneMatchesCountry);

/**
 * Editing — `PATCH /superadmin/partner/partner_detail_update/`, plus the
 * account flag creation does not have.
 *
 * A separate schema rather than one with optionals because the two endpoints
 * genuinely differ: an onboard form carrying `is_active` would be collecting a
 * value it has nowhere to send, and a shared optional would let the edit form
 * submit without it and reset a partner's account state to whatever the server
 * defaults to.
 *
 * `is_available` is **deliberately absent**, though the endpoint accepts it.
 * It is the partner's own on-duty state, asserted from their app, not something
 * an admin sets from here — and the form is submittable before the detail
 * response has landed, so carrying it would mean an edit made in that window
 * writes a stale value over whatever the partner had just chosen. Omitting it
 * is the only version of this form that cannot do that.
 */
export const partnerUpdateSchema = partnerFields
  .extend({
    /** Account enabled. Off blocks the partner outright. */
    is_active: z.boolean(),
  })
  .refine(hasCapability, CAPABILITY_ERROR)
  .superRefine(phoneMatchesCountry);

export type PartnerFormData = z.infer<typeof partnerFormSchema>;
export type PartnerUpdateFormData = z.infer<typeof partnerUpdateSchema>;
