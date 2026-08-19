/**
 * Display helpers for the admin list screens' datetimes.
 *
 * **The four list APIs send display strings, not ISO.** Since 2026-08-19 every
 * datetime on `intents/`, `orders/`, `express/orders/` and
 * `get-all-special-requests/` is rendered server-side as `"%B %d, %Y, %I:%M %p"`
 * — `"August 22, 2026, 11:47 AM"` — in one format across all four, pinned by a
 * backend test.
 *
 * Two rules follow, and both are the reason this module exists:
 *
 * 1. **Never `new Date()` these values.** Parsing anything other than ISO 8601
 *    is implementation-defined; V8 accepts this format, but a browser that does
 *    not would hand back `Invalid Date` and blank a whole column silently. So
 *    `shortDate` reads the string, it does not parse it.
 * 2. **Never do timezone arithmetic on them.** The backend renders a UTC
 *    instant as wall-clock with no offset marker, so any parse reads it as
 *    local time. Shortening a date is safe because the day is taken from the
 *    text; converting zones is not, because the offset was never sent.
 *
 * ISO values still exist on the *detail* reads, which are a different contract.
 * Those are not this module's business.
 */

import { MESSAGES } from "./messages";

/** Shown for a null/absent datetime — the backend sends `null`, not `""`. */
const DASH = MESSAGES.COMMON.STATS.DASH;

/**
 * `"August 22, 2026, 11:47 AM"` → `"Aug 22, 2026"`.
 *
 * A string read, not a date parse: the month name is matched against the twelve
 * it can be and the day/year are taken verbatim. Anything that does not match
 * the contract is passed through **unchanged** rather than replaced by a dash —
 * an unexpected format is worth seeing, and a value the operator can read beats
 * one the parser rejected.
 */
const MONTH_ABBREVIATION: Record<string, string> = {
  January: "Jan",
  February: "Feb",
  March: "Mar",
  April: "Apr",
  May: "May",
  June: "Jun",
  July: "Jul",
  August: "Aug",
  September: "Sep",
  October: "Oct",
  November: "Nov",
  December: "Dec",
};

/** `Month D, YYYY` at the head of the string; the time tail is ignored. */
const DISPLAY_DATE = /^([A-Z][a-z]+)\s+(\d{1,2}),\s*(\d{4})\b/;

export function shortDate(value: string | null | undefined): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return DASH;
  const match = DISPLAY_DATE.exec(text);
  if (!match) return text;
  const [, month, day, year] = match;
  const abbreviation = MONTH_ABBREVIATION[month];
  if (!abbreviation) return text;
  // The backend zero-pads the day (`%d` → "August 03"); the previous
  // `toLocaleDateString` rendering did not. Stripped so the column reads the
  // same as it did before the dates stopped being ISO.
  return `${abbreviation} ${Number(day)}, ${year}`;
}

/**
 * The full timestamp as sent, with a dash for an absent one.
 *
 * Deliberately a passthrough: the string is already the presentation the
 * backend committed to, and re-deriving it here would be a second opinion about
 * a format only one side controls.
 */
export function dateTimeText(value: string | null | undefined): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || DASH;
}
