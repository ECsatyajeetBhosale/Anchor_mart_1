import { MESSAGES } from "@/lib/messages";
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
