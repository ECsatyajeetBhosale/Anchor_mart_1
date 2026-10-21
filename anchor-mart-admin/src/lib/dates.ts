/**
 * Display helpers for the admin list screens' datetimes.
 *
 * **The four list APIs send display strings, not ISO.** Since 2026-08-19 every
 * datetime on `intents/`, `orders/`, `express/orders/` and
 * `get-all-special-requests/` is rendered server-side as `"%B %d, %Y, %I:%M %p"`
 * — `"August 22, 2026, 11:47 AM"` — in one format across all four, pinned by a
 * backend test. Since 2026-09-29 every display timestamp is Singapore time and
 * carries a trailing zone: `"September 10, 2026, 07:33 PM SGT"`. A date-only ship
 * departure (`expected_departure_is_date_only`) is sent as the date alone.
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
 * ISO values still exist on the *detail* reads and on the `*_iso` machine
 * fields. {@link dayText} / {@link stampText} accept either contract and render
 * ISO in Singapore time, so a screen reading both shows one clock.
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

/** Every display timestamp the API sends is Singapore time (UTC+8, no DST). */
const SGT_ZONE = "Asia/Singapore";
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
const MS_PER_DAY = 86_400_000;

/** An ISO 8601 value (`2026-09-10` or `2026-09-10T11:33:00Z`) rather than a display string. */
const ISO_PREFIX = /^\d{4}-\d{2}-\d{2}/;
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const SGT_DAY = new Intl.DateTimeFormat("en-US", {
  timeZone: SGT_ZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
});

const SGT_STAMP = new Intl.DateTimeFormat("en-US", {
  timeZone: SGT_ZONE,
  year: "numeric",
  month: "long",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/**
 * The day, whichever contract the field is on: a display string is shortened by
 * {@link shortDate} (read, not parsed); an ISO value is rendered in SGT.
 * `"September 10, 2026, 07:33 PM SGT"` and `"2026-09-10T11:33:00Z"` both → `"Sep 10, 2026"`.
 */
export function dayText(value: string | null | undefined): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return DASH;
  if (!ISO_PREFIX.test(text)) return shortDate(text);
  // A bare `YYYY-MM-DD` is a calendar day, not an instant: never shift it.
  const date = new Date(ISO_DATE_ONLY.test(text) ? `${text}T00:00:00+08:00` : text);
  return Number.isNaN(date.getTime()) ? text : SGT_DAY.format(date);
}

/**
 * The full timestamp: a display string exactly as sent (see {@link dateTimeText});
 * an ISO instant rendered to the same `"September 10, 2026, 07:33 PM SGT"` shape.
 */
export function stampText(value: string | null | undefined): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return DASH;
  if (!ISO_PREFIX.test(text)) return text;
  if (ISO_DATE_ONLY.test(text)) return dayText(text);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    SGT_STAMP.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  return `${part("month")} ${part("day")}, ${part("year")}, ${part("hour")}:${part("minute")} ${part("dayPeriod")} SGT`;
}

/** `Month D, YYYY[, HH:MM AM|PM][ SGT]` — the display contract, captured for {@link toInstant}. */
const DISPLAY_STAMP =
  /^([A-Z][a-z]+)\s+(\d{1,2}),\s*(\d{4})(?:,\s*(\d{1,2}):(\d{2})\s*(AM|PM))?(?:\s+SGT)?$/i;
const MONTH_INDEX = Object.keys(MONTH_ABBREVIATION);

/**
 * An instant for **logic only** (countdowns, sorting) when a screen has no
 * `*_iso` field to read. ISO parses as ISO; a display string is read field by
 * field as Singapore wall-clock — never handed to `new Date(string)`, which
 * returns Invalid Date for the `SGT` suffix. `null` for anything else.
 */
export function toInstant(value: string | null | undefined): Date | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  if (ISO_PREFIX.test(text)) {
    const date = new Date(ISO_DATE_ONLY.test(text) ? `${text}T00:00:00+08:00` : text);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const match = DISPLAY_STAMP.exec(text);
  if (!match) return null;
  const [, monthName, day, year, hour, minute, period] = match;
  const month = MONTH_INDEX.findIndex((m) => m.toLowerCase() === monthName.toLowerCase());
  if (month < 0) return null;
  let h = hour ? Number(hour) % 12 : 0;
  if (period?.toUpperCase() === "PM") h += 12;
  const utc = Date.UTC(Number(year), month, Number(day), h, minute ? Number(minute) : 0);
  return new Date(utc - SGT_OFFSET_MS);
}

/** Whole Singapore calendar days from today until `value`; null when it isn't a usable date. */
export function sgtDaysUntil(
  value: string | null | undefined,
  now: Date = new Date(),
): number | null {
  const instant = toInstant(value);
  if (!instant) return null;
  const sgtDay = (d: Date) => Math.floor((d.getTime() + SGT_OFFSET_MS) / MS_PER_DAY);
  return sgtDay(instant) - sgtDay(now);
}

const SGT_DATE_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: SGT_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * The Singapore calendar day of a machine value, as `YYYY-MM-DD` — what a
 * date-picker is seeded with. Slicing the ISO string instead would give the
 * previous day for a UTC instant before 08:00 SGT. `""` when unreadable.
 */
export function sgtDateKey(value: string | null | undefined): string {
  const instant = toInstant(value);
  return instant ? SGT_DATE_KEY.format(instant) : "";
}

const SGT_TIME = new Intl.DateTimeFormat("en-US", {
  timeZone: SGT_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

const SGT_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  timeZone: SGT_ZONE,
  month: "short",
  day: "numeric",
});

/**
 * Just the Singapore wall-clock time, zone named: `"3:54 PM SGT"` — for a line
 * whose day is already shown elsewhere (a chat bubble under its day divider).
 * Chat used the browser's zone with no label while every other admin time read
 * SGT (BUG-044). `""` when unreadable.
 */
export function sgtTimeText(value: string | null | undefined): string {
  const instant = toInstant(value);
  return instant ? `${SGT_TIME.format(instant)} SGT` : "";
}

/** The Singapore day without a year, `"Oct 12"` — for narrow columns. `""` when unreadable. */
export function sgtMonthDay(value: string | null | undefined): string {
  const instant = toInstant(value);
  return instant ? SGT_MONTH_DAY.format(instant) : "";
}

const SHORT_MONTH = Object.values(MONTH_ABBREVIATION);

/**
 * A picked range as people read it (BUG-024): `Sep 1 – Sep 25, 2026`, or
 * `Dec 30, 2025 – Jan 2, 2026` across a year. Calendar dates, not instants —
 * read with local getters, as the picker produced them.
 */
export function formatDateRange(from: Date, to: Date): string {
  const day = (d: Date) => `${SHORT_MONTH[d.getMonth()]} ${d.getDate()}`;
  return from.getFullYear() === to.getFullYear()
    ? `${day(from)} – ${day(to)}, ${to.getFullYear()}`
    : `${day(from)}, ${from.getFullYear()} – ${day(to)}, ${to.getFullYear()}`;
}
