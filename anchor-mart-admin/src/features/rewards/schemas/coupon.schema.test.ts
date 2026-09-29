import { describe, expect, it } from "vitest";
import { couponSchema } from "./coupon.schema";

const BASE = {
  code: "SHIP10",
  discount_type: "fixed",
  applies_to: "order_total",
  discount_value: 10,
  valid_from: "2026-09-29",
  valid_to: "2026-10-31",
};

/** The first message on `path`, or undefined when that field passed. */
function errorOn(input: Record<string, unknown>, path: string): string | undefined {
  const result = couponSchema.safeParse({ ...BASE, ...input });
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path.join(".") === path)?.message;
}

describe("couponSchema", () => {
  it("accepts a flat coupon with no restrictions", () => {
    const result = couponSchema.safeParse({
      ...BASE,
      min_purchase_amount: 0,
      no_end_date: true,
      valid_to: "",
      usage_limit: "",
      per_user_usage_limit: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a discount of 0, except for free shipping (BUG-014)", () => {
    expect(errorOn({ discount_value: 0 }, "discount_value")).toBeDefined();
    expect(errorOn({ discount_type: "free_shipping", discount_value: 0 }, "discount_value")).toBe(
      undefined,
    );
  });

  it("requires max discount on percentage coupons only (BUG-038)", () => {
    expect(errorOn({ discount_type: "percentage" }, "max_discount_amount")).toBeDefined();
    expect(
      errorOn({ discount_type: "percentage", max_discount_amount: "50" }, "max_discount_amount"),
    ).toBeUndefined();
    expect(errorOn({}, "max_discount_amount")).toBeUndefined();
  });

  it("allows blank or ≥ 1 limits, never 0", () => {
    expect(errorOn({ per_user_usage_limit: "0" }, "per_user_usage_limit")).toBeDefined();
    expect(errorOn({ usage_limit: "0" }, "usage_limit")).toBeDefined();
    expect(errorOn({ per_user_usage_limit: "" }, "per_user_usage_limit")).toBeUndefined();
    expect(errorOn({ usage_limit: "5" }, "usage_limit")).toBeUndefined();
  });

  it("needs an end date unless No end date is on", () => {
    expect(errorOn({ valid_to: "" }, "valid_to")).toBeDefined();
    expect(errorOn({ valid_to: "", no_end_date: true }, "valid_to")).toBeUndefined();
    expect(errorOn({ valid_to: "2026-09-01" }, "valid_to")).toBeDefined();
  });
});
