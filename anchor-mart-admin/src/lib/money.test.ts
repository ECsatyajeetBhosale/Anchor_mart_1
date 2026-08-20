import { describe, expect, it } from "vitest";
import { formatMoney, hasAmount } from "./money";

describe("formatMoney", () => {
  it("formats decimal strings and numbers alike, to two places", () => {
    expect(formatMoney("55.00")).toBe("$55.00");
    expect(formatMoney("10")).toBe("$10.00");
    expect(formatMoney(78)).toBe("$78.00");
    expect(formatMoney("0.00")).toBe("$0.00");
  });

  it("groups thousands, so every screen agrees what a thousand looks like", () => {
    expect(formatMoney("1250.5")).toBe("$1,250.50");
    expect(formatMoney(1234567.891)).toBe("$1,234,567.89");
  });

  /**
   * The bug this file exists for: `Number("")` and `Number(null)` are `0`, and
   * `Number.isFinite(0)` is `true`, so a guard written as
   * `Number.isFinite(Number(v))` reports a missing amount as a confident zero.
   */
  it("never renders a missing amount as zero", () => {
    for (const absent of ["", "   ", null, undefined]) {
      expect(formatMoney(absent)).toBe("—");
    }
  });

  it("never renders unreadable input as $NaN", () => {
    expect(formatMoney("not a price")).toBe("—");
    expect(formatMoney(Number.NaN)).toBe("—");
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe("—");
  });

  it("lets the caller pick the fallback without touching the arithmetic", () => {
    expect(formatMoney(null, { fallback: "-" })).toBe("-");
    expect(formatMoney(null, { fallback: "Not billed" })).toBe("Not billed");
    // A readable zero is still a zero — the fallback is for absence only.
    expect(formatMoney("0", { fallback: "-" })).toBe("$0.00");
  });

  it("carries a non-dollar symbol when the record names one", () => {
    expect(formatMoney("34.00", { symbol: "€" })).toBe("€34.00");
  });

  it("keeps negatives signed rather than dropping the sign", () => {
    expect(formatMoney("-12.5")).toBe("-$12.50");
  });
});

describe("hasAmount", () => {
  /** Distinguishes "zero" from "absent" — a truthiness check cannot. */
  it("separates a real zero from a missing value", () => {
    expect(hasAmount("0.00")).toBe(true);
    expect(hasAmount(0)).toBe(true);
    expect(hasAmount("")).toBe(false);
    expect(hasAmount(null)).toBe(false);
    expect(hasAmount("abc")).toBe(false);
  });
});
