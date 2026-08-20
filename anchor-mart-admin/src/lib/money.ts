/**
 * The one place a monetary amount becomes a string.
 *
 * Eight private `money()` helpers had grown across the features, and they
 * disagreed on every question that matters: what a missing amount looks like,
 * whether thousands are grouped, and — worst — what to do with input that isn't
 * a number. Three of them printed **`$0.00` for an absent value**, because
 * `Number("")` and `Number(null)` are `0`, not `NaN`, and `Number.isFinite(0)`
 * is `true`. Two others printed the literal **`$NaN`**. Both are a formatter
 * inventing a fact the API never sent, on a screen where the fact is money.
 *
 * The rule here: **a value we cannot read is never rendered as zero.** Callers
 * choose the fallback (`—`, `-`, `null`) because their surrounding copy differs;
 * they do not choose the arithmetic.
 */

/** What `formatMoney` was given, before it decides whether it can read it. */
export type MoneyInput = string | number | null | undefined;

export interface FormatMoneyOptions {
  /** Rendered when the amount is absent or unreadable. Defaults to an em dash. */
  fallback?: string;
  /** Symbol placed before the digits. Defaults to `$`. */
  symbol?: string;
}

/**
 * Is this a value we can actually read as an amount?
 *
 * Blank and whitespace-only strings are rejected **before** `Number` sees them,
 * which is the whole of the `$0.00` bug: they coerce to a perfectly finite zero.
 */
function readAmount(value: MoneyInput): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * `"1250.5"` → `"$1,250.50"`, `""` → `"—"`.
 *
 * Grouped and fixed at two decimals via `Intl`, so every screen agrees on what
 * a thousand looks like — Rewards used to be the only place that grouped.
 */
export function formatMoney(value: MoneyInput, options: FormatMoneyOptions = {}): string {
  const { fallback = "—", symbol = "$" } = options;
  const amount = readAmount(value);
  if (amount === null) return fallback;
  // Sign outside the symbol: "-$12.50", not "$-12.50". Every one of the eight
  // helpers this replaces prefixed the symbol first and produced the latter.
  const sign = amount < 0 ? "-" : "";
  return `${sign}${symbol}${Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * True when there is a readable amount to show.
 *
 * For the callers that need to branch on presence rather than print a fallback
 * — offered here so nobody re-derives it with a truthiness check, under which
 * the string `"0.00"` is present but the number `0` is not.
 */
export function hasAmount(value: MoneyInput): boolean {
  return readAmount(value) !== null;
}
