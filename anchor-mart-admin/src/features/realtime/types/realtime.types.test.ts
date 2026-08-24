import { describe, expect, it } from "vitest";
import { isBadgeQueue, isSignalScreen, sameCounts } from "./realtime.types";

describe("isSignalScreen", () => {
  it.each(["intents", "verifications", "orders", "delivery_failed"])(
    "accepts %s — a screen an admin is handed work on",
    (screen) => {
      expect(isSignalScreen(screen)).toBe(true);
    },
  );

  it.each(["express_orders", "special_requests", "seller_requests"])(
    "rejects %s — a real queue, but never signalled",
    (screen) => {
      // These are valid BadgeQueue keys, so a looser check would have let them
      // through. Signals only ever name the four admin hand-off screens.
      expect(isBadgeQueue(screen)).toBe(true);
      expect(isSignalScreen(screen)).toBe(false);
    },
  );

  it.each(["", "dashboard", "ORDERS", "some_future_screen"])(
    "rejects the unknown screen %o rather than guessing",
    (screen) => {
      // Marking the wrong queue is worse than marking none: the admin goes and
      // looks at a screen where nothing happened.
      expect(isSignalScreen(screen)).toBe(false);
    },
  );
});

describe("sameCounts", () => {
  const A = {
    intents: 1,
    orders: 2,
    express_orders: 3,
    special_requests: 4,
    seller_requests: 5,
    verifications: 6,
    delivery_failed: 7,
  };

  it("is true for identical numbers in different objects", () => {
    expect(sameCounts(A, { ...A })).toBe(true);
  });

  it("is false when any single key differs", () => {
    expect(sameCounts(A, { ...A, delivery_failed: 8 })).toBe(false);
  });

  it("treats null as different from any real counts", () => {
    expect(sameCounts(null, A)).toBe(false);
    expect(sameCounts(null, null)).toBe(true);
  });
});
