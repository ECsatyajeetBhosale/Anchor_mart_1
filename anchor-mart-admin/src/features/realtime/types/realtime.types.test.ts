import { describe, expect, it } from "vitest";
import { isBadgeQueue, isSignalScreen, sameCounts } from "./realtime.types";

describe("isSignalScreen", () => {
  it.each([
    "intents",
    "verifications",
    "orders",
    "delivery_failed",
    "express_orders",
    "special_requests",
    "seller_requests",
  ])("accepts %s — signal screens span the whole queue vocabulary", (screen) => {
    expect(isSignalScreen(screen)).toBe(true);
  });

  it("accepts express_orders, which the narrower list used to drop", () => {
    // The regression this widening fixes: an express order names
    // `express_orders`, never `orders`, so under the old four-screen list an
    // express assignment failed the guard and produced no toast, no refetch and
    // no marker — silently, because the handler simply returned.
    expect(isBadgeQueue("express_orders")).toBe(true);
    expect(isSignalScreen("express_orders")).toBe(true);
  });

  it("rejects deltas — in the wire vocabulary, but no screen in this panel", () => {
    // Routing it would send the admin to a screen that cannot show the row.
    expect(isSignalScreen("deltas")).toBe(false);
  });

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

describe("isBadgeQueue — the `changed` gate", () => {
  it("rejects assignment, so an ownership frame refetches nothing", () => {
    // `assignment` is a real wire value (2026-09-01) but not a queue: the shared
    // counts are unchanged by definition, because the work was already on
    // someone's desk. The frame exists to carry the new `mine`, and the handler
    // applies that *before* this gate — so returning false here is the whole
    // correct behaviour, not a gap.
    expect(isBadgeQueue("assignment")).toBe(false);
  });

  it.each(["connect", "sync"])("rejects the snapshot marker %s", (changed) => {
    expect(isBadgeQueue(changed)).toBe(false);
  });

  it("rejects an unrecognised future value rather than throwing", () => {
    // The wire list is append-only; a client that does not know a value must
    // refetch nothing rather than error.
    expect(isBadgeQueue("some_future_queue")).toBe(false);
  });
});
