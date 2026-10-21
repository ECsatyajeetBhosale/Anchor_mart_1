import { describe, expect, it } from "vitest";
import { isAssignableCoupon, isExpiredCoupon, isLiveCoupon } from "./couponStatus";

const NOW = new Date("2026-10-12T06:00:00Z");

describe("isExpiredCoupon (BUG-060)", () => {
  it("is expired once valid_to has passed", () => {
    expect(isExpiredCoupon({ valid_to: "2026-10-01T15:59:59Z" }, NOW)).toBe(true);
  });

  it("never expires without an end date", () => {
    expect(isExpiredCoupon({ valid_to: null }, NOW)).toBe(false);
  });

  it("keeps a bare date running to the end of that Singapore day", () => {
    // 06:00Z is 14:00 SGT on the 12th — still inside the 12th.
    expect(isExpiredCoupon({ valid_to: "2026-10-12" }, NOW)).toBe(false);
    expect(isExpiredCoupon({ valid_to: "2026-10-11" }, NOW)).toBe(true);
  });
});

describe("isLiveCoupon / isAssignableCoupon (BUG-061)", () => {
  const live = { is_active: true, is_public: false, valid_to: "2026-12-31T15:59:59Z" };

  it("drops a switched-off coupon", () => {
    expect(isLiveCoupon({ ...live, is_active: false }, NOW)).toBe(false);
  });

  it("drops an expired coupon that is still switched on", () => {
    expect(isLiveCoupon({ ...live, valid_to: "2026-10-01T15:59:59Z" }, NOW)).toBe(false);
  });

  it("offers only live private coupons for assignment", () => {
    expect(isAssignableCoupon(live, NOW)).toBe(true);
    expect(isAssignableCoupon({ ...live, is_public: true }, NOW)).toBe(false);
    expect(isAssignableCoupon({ ...live, is_active: false }, NOW)).toBe(false);
  });
});
