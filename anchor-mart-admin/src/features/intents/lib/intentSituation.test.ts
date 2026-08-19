import { ORDER_STATUS_BY_KEY } from "@/lib/orderStatuses";
import { describe, expect, it } from "vitest";
import { INTENT_SITUATIONS, situationVariant } from "./intentSituation";

describe("situationVariant", () => {
  it("gives the two halves of intent_received different colours", () => {
    // The whole point of the split: colouring by status alone would render an
    // unclaimed row and a claimed one identically.
    expect(situationVariant("new", "intent_received")).not.toBe(
      situationVariant("sourcing", "intent_received"),
    );
  });

  it("matches the raw sourcing status's colour", () => {
    // `?status=sourcing` returns the union of claimed `intent_received` rows
    // and raw `sourcing` ones. Two colours in one filtered list would read as a
    // rendering bug.
    expect(situationVariant("sourcing", "intent_received")).toBe(
      ORDER_STATUS_BY_KEY.sourcing.variant,
    );
  });

  it("keeps an unclaimed row the colour it has always been", () => {
    expect(situationVariant("new", "intent_received")).toBe(
      ORDER_STATUS_BY_KEY.intent_received.variant,
    );
  });

  it("separates the two halves of pending_customer_response", () => {
    expect(situationVariant("awaiting_customer", "pending_customer_response")).not.toBe(
      situationVariant("ready_to_bill", "pending_customer_response"),
    );
  });

  it("falls through to the canonical status map for an unsplit status", () => {
    // Every other situation is a status verbatim, so it must resolve exactly as
    // the status does — the canonical map stays the source of truth.
    expect(situationVariant("delivered", "delivered")).toBe(ORDER_STATUS_BY_KEY.delivered.variant);
    expect(situationVariant("", "payment_pending")).toBe(
      ORDER_STATUS_BY_KEY.payment_pending.variant,
    );
  });

  it("falls back to the status when the situation is unrecognised", () => {
    expect(situationVariant("something_new", "payment_pending")).toBe(
      ORDER_STATUS_BY_KEY.payment_pending.variant,
    );
  });

  it("is neutral when neither key is known, rather than throwing", () => {
    expect(situationVariant("", "")).toBe("neutral");
  });
});

describe("INTENT_SITUATIONS", () => {
  it("covers exactly the four derived values", () => {
    expect(INTENT_SITUATIONS.map((s) => s.key)).toEqual([
      "new",
      "sourcing",
      "awaiting_customer",
      "ready_to_bill",
    ]);
  });

  it("names a real status as the one each splits", () => {
    for (const situation of INTENT_SITUATIONS) {
      expect(ORDER_STATUS_BY_KEY[situation.status]).toBeDefined();
    }
  });

  it("agrees with the colour map it is rendered beside", () => {
    for (const situation of INTENT_SITUATIONS) {
      expect(situation.variant).toBe(situationVariant(situation.key, situation.status));
    }
  });

  it("is not in the canonical status list — these are not statuses", () => {
    for (const situation of INTENT_SITUATIONS) {
      if (situation.key === "sourcing") continue; // also a real (writerless) status
      expect(ORDER_STATUS_BY_KEY[situation.key]).toBeUndefined();
    }
  });
});
