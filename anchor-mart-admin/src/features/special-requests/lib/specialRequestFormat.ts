import { MESSAGES } from "@/lib/messages";
import { formatMoney } from "@/lib/money";

const D = MESSAGES.SPECIAL_REQUESTS.DETAIL;

/**
 * Display formatters for the special-request detail view. Kept out of the
 * drawer so the component stays presentational and the money/date rules live in
 * one place — the quote dialog previews the same total the drawer renders.
 */

/** Returns a trimmed string, or the em-dash fallback when null/undefined/blank. */
export function dash(value: unknown): string {
  if (value === null || value === undefined) return D.FALLBACK;
  const s = String(value).trim();
  return s === "" ? D.FALLBACK : s;
}

/** Currency-code → symbol map for the budget/price display. */
const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  SGD: "S$",
  AED: "AED ",
};

/** Symbol for a currency code, falling back to the code itself ("AED 12.00"). */
export function symbolFor(currency?: string | null): string {
  if (!currency) return "";
  return CURRENCY_SYMBOL[currency] ?? `${currency} `;
}

/**
 * Formats a string/number money amount with its currency symbol, e.g.
 * `("34.00", "USD") → "$34.00"`. Returns the fallback for a null/blank amount.
 *
 * This is the one helper that reads a currency code rather than assuming
 * dollars, so the symbol stays local; only the digits are handed off. It also
 * used to interpolate the raw value — `"34.5"` rendered as `"$34.5"` and
 * `"34.000"` as `"$34.000"` — which is why it now goes through `formatMoney`.
 */
export function money(amount: unknown, currency?: string | null): string {
  return formatMoney(amount as string | number | null | undefined, {
    fallback: D.FALLBACK,
    symbol: symbolFor(currency),
  });
}

/**
 * Formats an ISO timestamp (e.g. "2026-07-28T00:00:00Z") as "Jul 28, 2026".
 * `created_at`/`updated_at` arrive pre-formatted from the API and are rendered
 * as-is; only the raw ISO date fields go through here.
 */
export function formatDate(iso?: string | null): string {
  if (!iso) return D.FALLBACK;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return dash(iso);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * The total the sailor is quoted: unit price × quantity, plus the fast-delivery
 * charge when they opted into fastest delivery. Mirrors how the backend builds
 * the order line on accept (Flow 13 API 4). Null until a quote exists.
 */
export function quotedTotal(
  quotedPrice?: string | null,
  quantity?: number | null,
  fastCharge?: string | null,
  isFastest?: boolean | null,
): number | null {
  const unit = Number(quotedPrice);
  if (!quotedPrice || Number.isNaN(unit)) return null;
  const qty = quantity && quantity > 0 ? quantity : 1;
  const shipping = isFastest ? Number(fastCharge) || 0 : 0;
  return unit * qty + shipping;
}
