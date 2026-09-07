import { countryForDialCode } from "@/lib/countries";
import { MESSAGES } from "@/lib/messages";
import { Metadata, getExampleNumber, isValidPhoneNumber } from "libphonenumber-js/mobile";
import examples from "libphonenumber-js/mobile/examples";
import { z } from "zod";

/**
 * Shared field validators.
 *
 * These exist because the same three concepts were being validated three
 * different ways: the partner form demanded a `+NN` country code and a 7–15
 * digit number, user creation accepted *any* non-empty country code and 6–15
 * digits, and the ship-agent form took either as free text. The same phone
 * number could therefore be accepted on one screen and rejected on another.
 *
 * Build form schemas from these rather than hand-rolling the rules again.
 */

const V = MESSAGES.VALIDATION;

/** Django's `User.first_name` / `last_name` are `max_length=150`. */
export const NAME_MAX = 150;

/** RFC 5321's cap on a full address. Django's `EmailField` defaults to 254 too. */
export const EMAIL_MAX = 254;

/**
 * E.164 caps a full international number at 15 digits. The floor is deliberately
 * loose: national numbers are short in some countries, and rejecting a real
 * number is a worse failure than accepting a typo the backend will catch.
 */
export const PHONE_MIN_DIGITS = 6;
export const PHONE_MAX_DIGITS = 15;

/** Any Unicode letter — so O'Brien, Anne-Marie, José and 山田 all pass. */
const HAS_LETTER = /\p{L}/u;
const HAS_DIGIT = /\d/;

/** Formatting humans type into phone fields, stripped before validating. */
const PHONE_SEPARATORS = /[\s()\-.]/g;

/** Digits-only, once separators are stripped. */
const PHONE_DIGITS = new RegExp(`^\\d{${PHONE_MIN_DIGITS},${PHONE_MAX_DIGITS}}$`);

/** A dialling prefix in its normalised `+NN` form. */
const COUNTRY_CODE = /^\+\d{1,4}$/;

/**
 * A person's name.
 *
 * Deliberately permissive about characters: the only hard rules are "contains a
 * letter" and "contains no digits". A stricter allow-list is the classic way to
 * lock out real people — apostrophes, hyphens, spaces and non-Latin scripts are
 * all normal in names.
 */
export function personNameField(label: string, { required = true } = {}) {
  return (
    z
      .string()
      .trim()
      .max(NAME_MAX, V.TOO_LONG(label, NAME_MAX))
      .refine((value) => !required || value.length > 0, V.REQUIRED(label))
      // The empty-string escape keeps these from firing on an optional blank.
      .refine((value) => value === "" || !HAS_DIGIT.test(value), V.NAME_NO_DIGITS(label))
      .refine((value) => value === "" || HAS_LETTER.test(value), V.NAME_NEEDS_LETTER(label))
  );
}

/** First name — required by every form that collects one. */
export const firstNameField = () => personNameField(V.LABELS.FIRST_NAME);

/**
 * Last name — optional. Mononyms are real, and the backend treats it as
 * optional on both create-user and partner-create.
 */
export const lastNameField = () => personNameField(V.LABELS.LAST_NAME, { required: false });

/**
 * A national phone number, digits only on the wire.
 *
 * Separators are stripped rather than rejected, so "98765 43210" and
 * "(555) 010-1234" submit cleanly instead of bouncing the form for a formatting
 * habit the API doesn't care about.
 */
export function phoneNumberField(label: string = V.LABELS.PHONE) {
  return z
    .string()
    .trim()
    .transform((value) => value.replace(PHONE_SEPARATORS, ""))
    .pipe(
      z
        .string()
        .min(1, V.REQUIRED(label))
        .regex(PHONE_DIGITS, V.PHONE_DIGITS(PHONE_MIN_DIGITS, PHONE_MAX_DIGITS)),
    );
}

/**
 * A phone number that may be left blank — same digit rules once something is
 * typed. For forms where the contact itself is optional (ship agents, where the
 * backend only requires *one* of mobile/email).
 */
export function optionalPhoneNumberField() {
  return z
    .string()
    .trim()
    .transform((value) => value.replace(PHONE_SEPARATORS, ""))
    .refine(
      (value) => value === "" || PHONE_DIGITS.test(value),
      V.PHONE_DIGITS(PHONE_MIN_DIGITS, PHONE_MAX_DIGITS),
    );
}

/**
 * An international dialling prefix.
 *
 * A bare "91" is normalised to "+91" rather than rejected — the leading plus is
 * a notation the user shouldn't have to remember. ITU-T assigns codes of 1–3
 * digits; a fourth is allowed as slack rather than as a claim that four-digit
 * codes exist.
 */
export function countryCodeField(label: string = V.LABELS.COUNTRY_CODE) {
  return z
    .string()
    .trim()
    .transform(normaliseDiallingPrefix)
    .pipe(z.string().min(1, V.REQUIRED(label)).regex(COUNTRY_CODE, V.COUNTRY_CODE_INVALID));
}

/** Country code that may be left blank; still normalised and checked when given. */
export function optionalCountryCodeField() {
  return z
    .string()
    .trim()
    .transform(normaliseDiallingPrefix)
    .refine((value) => value === "" || COUNTRY_CODE.test(value), V.COUNTRY_CODE_INVALID);
}

/** Adds the leading "+" the user shouldn't have to remember. */
function normaliseDiallingPrefix(value: string): string {
  const compact = value.replace(/\s/g, "");
  if (!compact) return "";
  return compact.startsWith("+") ? compact : `+${compact}`;
}

/**
 * Is this number a real mobile number in the country that owns this code?
 *
 * The digit-count rules above are the same everywhere, which is what let a
 * seven-digit "Indian" number and a fifteen-digit "Singaporean" one through: a
 * length that is legal *somewhere* was treated as legal *here*. This asks the
 * real question — the two fields are joined back into an E.164 number and
 * checked against that country's actual numbering plan.
 *
 * Deliberately the `mobile` metadata, not `max`. Every field wired to this
 * collects a WhatsApp number, and WhatsApp needs a line that can receive an SMS,
 * so accepting a valid *landline* would be accepting a number the product
 * cannot use. The trade is that a genuinely new mobile range is rejected until
 * the metadata catches up; switching this import to `libphonenumber-js/max`
 * loosens it back to "valid number of any kind" in one line.
 *
 * The territory is resolved from the number itself rather than from the picked
 * flag, so a Canadian number entered under `+1` is checked against Canada.
 */
export function isPhoneValidForCountry(dialCode: string, nationalNumber: string): boolean {
  const prefix = normaliseDiallingPrefix(dialCode.replace(PHONE_SEPARATORS, ""));
  const digits = nationalNumber.replace(PHONE_SEPARATORS, "");
  if (!prefix || !digits) return false;
  try {
    return isValidPhoneNumber(`${prefix}${digits}`);
  } catch {
    // A prefix belonging to no country throws rather than returning false.
    // `countryCodeField` has already rejected the malformed ones, so anything
    // reaching here is well-formed but unassigned — not a valid number either.
    return false;
  }
}

/**
 * How many digits a mobile number has in a given country.
 *
 * `possibleLengths()` on the numbering plan is the *whole* plan — India comes
 * back as 8–13 digits once landlines and service numbers are counted, which is
 * useless as advice for a WhatsApp field. The `MOBILE` type narrows it to the
 * 10 that an operator actually has to type.
 *
 * That narrowing is not in libphonenumber's published typings, hence the local
 * shape and the guards. Everything here degrades to `null`, and a `null` shows
 * no advice at all — a hint that has gone quiet is survivable, a hint that
 * confidently states the wrong length is not. `phoneCountryRule` still enforces
 * the real rule either way; this only ever explains it.
 */
interface MobileLengths {
  type(name: string): { possibleLengths(): number[] } | undefined;
}

const phoneMetadata = new Metadata();
const digitCountCache = new Map<string, number[] | null>();

function mobileDigitCounts(iso: string): number[] | null {
  const cached = digitCountCache.get(iso);
  if (cached !== undefined) return cached;
  let lengths: number[] | null = null;
  try {
    phoneMetadata.selectNumberingPlan(iso as Parameters<Metadata["selectNumberingPlan"]>[0]);
    const plan = phoneMetadata.numberingPlan as unknown as MobileLengths | undefined;
    const possible = plan?.type("MOBILE")?.possibleLengths();
    if (Array.isArray(possible) && possible.length > 0) lengths = possible;
  } catch {
    lengths = null;
  }
  digitCountCache.set(iso, lengths);
  return lengths;
}

/** "10 digits" for `+91`, or nothing when the metadata has no answer. */
function digitCountText(dialCode: string): string | undefined {
  const country = countryForDialCode(dialCode);
  if (!country) return undefined;
  const lengths = mobileDigitCounts(country.iso);
  return lengths ? V.PHONE_DIGIT_COUNT(lengths) : undefined;
}

/**
 * The digit rule for the picked country, for the line under the number field.
 *
 * Returns nothing until a country is picked, so a blank code shows a blank hint
 * rather than a generic range the operator would have to translate themselves.
 */
export function phoneDigitsHint(dialCode: string | null | undefined): string | undefined {
  const country = countryForDialCode(dialCode ?? "");
  if (!country) return undefined;
  const digits = digitCountText(country.dialCode);
  return digits ? V.PHONE_DIGITS_FOR_COUNTRY(country.name, digits) : undefined;
}

const digitsOnly = (value: string) => value.replace(/\D/g, "");

/**
 * A real, typeable example number for the picked country — the placeholder for
 * the number field.
 *
 * Built from libphonenumber's example number rather than a string in the
 * catalogue, because a static one is wrong the moment the country changes: the
 * Indian-shaped number this used to show stayed on screen while an operator
 * picked Singapore.
 *
 * The national *format* can't be used as-is. `formatNational()` writes the
 * number as it would be dialled inside the country, which includes the trunk
 * prefix — `081234 56789` for India, `07400 123456` for the UK — and this field
 * takes the subscriber number without it. A placeholder carrying that leading
 * zero teaches the operator to type eleven digits into a ten-digit field.
 *
 * So the prefix is dropped by peeling characters off the front until what's
 * left holds exactly the national number's digits, keeping the grouping. The
 * result is verified against those digits and falls back to the bare number if
 * it ever fails to line up, which is what stops a formatting quirk in one
 * country's plan from putting an unenterable example on screen.
 */
export function phoneExamplePlaceholder(dialCode: string | null | undefined): string | undefined {
  const country = countryForDialCode(dialCode ?? "");
  if (!country) return undefined;
  try {
    const example = getExampleNumber(country.iso, examples);
    if (!example) return undefined;
    const national = example.nationalNumber;
    const formatted = example.formatNational();
    // No trunk prefix in this plan — the US writes "(201) 555-0123" already.
    if (digitsOnly(formatted) === national) return formatted;
    let rest = formatted;
    while (rest.length > 0 && digitsOnly(rest) !== national) rest = rest.slice(1);
    // Drop the separator the prefix left behind, but never an opening bracket
    // that belongs to the number itself.
    rest = rest.replace(/^[^\d(]+/, "");
    return rest && digitsOnly(rest) === national ? rest : national;
  } catch {
    return undefined;
  }
}

/**
 * The cross-field rule, as a `superRefine` callback the form schemas share.
 *
 * It has to live at the object level because neither field can answer the
 * question alone. Attach it with `.superRefine(...)`, which runs only after
 * every field-level rule has passed — so an operator sees "enter 6–15 digits"
 * for an empty box and this sharper message only once the shape is right.
 *
 * The issue is pinned to the *number*, not the code: the code is almost always
 * the correct one and the number is what has to change.
 */
export function phoneCountryRule(options: {
  codeKey: string;
  numberKey: string;
  /** For forms where the whole contact is optional — blanks pass through. */
  optional?: boolean;
}) {
  return (form: Record<string, unknown>, ctx: z.RefinementCtx) => {
    const dialCode = String(form[options.codeKey] ?? "");
    const nationalNumber = String(form[options.numberKey] ?? "");
    // Whether these may be blank is the field builders' business, not ours.
    if (!nationalNumber || (options.optional && !dialCode)) return;
    if (isPhoneValidForCountry(dialCode, nationalNumber)) return;
    const country = countryForDialCode(dialCode);
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [options.numberKey],
      // Repeats the digit count the hint under the field was showing, because
      // `FormField` swaps the hint out for the error — so without it the one
      // piece of advice disappears exactly when it is being asked for.
      message: V.PHONE_FOR_COUNTRY(
        country ? `${country.name} (${country.dialCode})` : dialCode,
        digitCountText(dialCode),
      ),
    });
  };
}

/**
 * An email address.
 *
 * Zod's `.email()` is the whole rule — no extra regex. Hand-rolled email
 * patterns reject valid addresses (plus-addressing, new TLDs, long subdomains)
 * far more often than they catch anything the backend wouldn't.
 */
export function emailField(label: string = V.LABELS.EMAIL) {
  return z
    .string()
    .trim()
    .min(1, V.REQUIRED(label))
    .max(EMAIL_MAX, V.TOO_LONG(label, EMAIL_MAX))
    .email(V.EMAIL_INVALID);
}

/** Email that may be left blank — must still be a valid address when given. */
export function optionalEmailField(label: string = V.LABELS.EMAIL) {
  return z.union([z.literal(""), emailField(label)]);
}
