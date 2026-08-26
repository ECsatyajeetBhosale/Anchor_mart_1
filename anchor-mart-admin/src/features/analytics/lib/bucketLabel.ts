import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

/**
 * Axis labelling for the time-series analytics charts.
 *
 * The buckets the backend returns change shape with the window — 7d and 30d are
 * daily, longer windows come back weekly or monthly — so one label format can't
 * serve them all. A weekday reads perfectly across 7 bars and becomes noise
 * across 30, where "Mon" appears four times and identifies nothing.
 */

/** The bucket widths the analytics endpoints emit. */
export type BucketGranularity = "day" | "week" | "month";

/** Beyond this many daily bars, weekday names repeat and stop identifying a bar. */
const MAX_WEEKDAY_BARS = 7;

/** A raw time bucket as returned by sales-trend / product-sales. */
export interface TimeBucket {
  label: string;
  from: string;
  to: string;
  /**
   * Optional: the platform trend only sends a weekday on a daily window, where
   * the other series always carry one. Every read below already falls back to
   * formatting `from`, so absence is handled rather than guarded against.
   */
  weekday?: string;
}

/** Parses an API date (`YYYY-MM-DD` or ISO datetime); null when unusable. */
function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/**
 * Works out how wide a bucket is.
 *
 * The response's `granularity` string is preferred, but it is not covered by any
 * flow document, so an unrecognised value falls back to measuring the bucket's
 * own `from`→`to` span. That keeps the axis correct even if the backend renames
 * a granularity or adds one.
 */
export function resolveGranularity(
  granularity: string | undefined,
  sample?: TimeBucket,
): BucketGranularity {
  const declared = granularity?.trim().toLowerCase();
  if (declared?.startsWith("day") || declared === "daily") return "day";
  if (declared?.startsWith("week") || declared === "weekly") return "week";
  if (declared?.startsWith("month") || declared === "monthly") return "month";

  const from = toDate(sample?.from);
  const to = toDate(sample?.to);
  if (!from || !to) return "day";

  // Inclusive spans: a one-day bucket has from === to.
  const span = differenceInCalendarDays(to, from) + 1;
  if (span >= 28) return "month";
  if (span >= 5) return "week";
  return "day";
}

/** What a chart needs to render one bucket: a terse tick and a precise tooltip. */
export interface BucketLabels {
  /** Short axis tick, e.g. "Mon" · "12 Aug" · "Aug". */
  label: string;
  /** Unabbreviated bucket identity for the tooltip, always shown in full. */
  fullLabel: string;
}

/**
 * Derives the axis tick and tooltip heading for one bucket.
 *
 * `barCount` decides the daily case: a week of bars keeps the weekday names that
 * read well today, anything longer switches to a date. The tooltip is never
 * abbreviated — with ticks thinned out on a long window, hovering is how a user
 * identifies a specific bar, so it has to name it completely.
 */
export function bucketLabels(
  bucket: TimeBucket,
  granularity: BucketGranularity,
  barCount: number,
): BucketLabels {
  const from = toDate(bucket.from);
  const to = toDate(bucket.to);

  // Without a parseable date there is nothing to format — use the API's own
  // label rather than inventing one.
  if (!from) {
    const fallback = bucket.weekday || bucket.label;
    return { label: fallback, fullLabel: bucket.label || fallback };
  }

  if (granularity === "month") {
    return { label: format(from, "MMM"), fullLabel: format(from, "MMMM yyyy") };
  }

  if (granularity === "week") {
    const start = format(from, "d MMM");
    return {
      label: start,
      fullLabel: to ? `${start} – ${format(to, "d MMM yyyy")}` : format(from, "d MMM yyyy"),
    };
  }

  return {
    label:
      barCount <= MAX_WEEKDAY_BARS ? bucket.weekday || format(from, "EEE") : format(from, "d MMM"),
    fullLabel: format(from, "EEE, d MMM yyyy"),
  };
}
