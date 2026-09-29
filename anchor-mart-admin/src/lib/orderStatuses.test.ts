import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  ORDER_STATUS_BY_KEY,
  isExpiredOrder,
  orderStatusLabel,
  orderStatusText,
  orderStatusVariant,
} from "./orderStatuses";

describe("ORDER_STATUSES", () => {
  it("knows partially_delivered", () => {
    // Added 2026-08-19 with per-unit delivery. Until it was here the badge on
    // the status this release is built around fell back to neutral and a
    // title-cased key.
    const s = ORDER_STATUS_BY_KEY.partially_delivered;
    expect(s).toBeDefined();
    expect(s.label).toBe("Partially Delivered");
    // Needs attention, but the partner may still return — not a failure.
    expect(s.variant).toBe("warning");
    expect(s.variant).not.toBe(ORDER_STATUS_BY_KEY.delivery_failed.variant);
  });

  it("orders every status uniquely and as an integer", () => {
    // The legend renders `order` literally, so a fractional inserted between
    // two existing entries would display as "14.5".
    const orders = ORDER_STATUSES.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(new Set(orders).size).toBe(orders.length);
    for (const n of orders) expect(Number.isInteger(n)).toBe(true);
  });

  it("places the incomplete handover beside the complete one", () => {
    const delivered = ORDER_STATUS_BY_KEY.delivered.order;
    const partial = ORDER_STATUS_BY_KEY.partially_delivered.order;
    expect(partial).toBe(delivered + 1);
  });

  it("keys every entry uniquely, and the lookup covers all of them", () => {
    expect(Object.keys(ORDER_STATUS_BY_KEY)).toHaveLength(ORDER_STATUSES.length);
  });

  it("keeps the retired statuses for historical timelines", () => {
    // `pending_intent` and the raw `sourcing` have no writer and no live rows,
    // but a past order really did pass through them — the sailor-facing
    // timeline still has to resolve their labels.
    expect(ORDER_STATUS_BY_KEY.pending_intent).toBeDefined();
    expect(ORDER_STATUS_BY_KEY.sourcing).toBeDefined();
  });

  it("gives every status a label, an actor and a meaning", () => {
    for (const s of ORDER_STATUSES) {
      expect(s.label.trim()).not.toBe("");
      expect(s.actor.trim()).not.toBe("");
      expect(s.meaning.trim()).not.toBe("");
    }
  });
});

describe("expired orders (BUG-021)", () => {
  const expired = { status: "cancelled", cancellation_reason: "Vessel departed" };

  it("recognises the departure sweep and nothing else", () => {
    expect(isExpiredOrder(expired)).toBe(true);
    expect(isExpiredOrder({ status: "cancelled", cancellation_reason: "Changed my mind" })).toBe(
      false,
    );
    expect(isExpiredOrder({ status: "delivered", cancellation_reason: "Vessel departed" })).toBe(
      false,
    );
  });

  it("labels and colours it as Expired, not Cancelled", () => {
    expect(orderStatusLabel(expired, "Cancelled")).toBe("Expired");
    expect(orderStatusVariant(expired)).toBe("neutral");
    expect(orderStatusLabel({ status: "cancelled" }, "Cancelled")).toBe("Cancelled");
    expect(orderStatusVariant({ status: "cancelled" })).toBe("danger");
  });
});

describe("orderStatusText", () => {
  it("never shows a raw code", () => {
    expect(orderStatusText("sourcing")).toBe("Sourcing");
    expect(orderStatusText("at_berth")).toBe("At Berth");
    expect(orderStatusText("MARINE_EMERGENCY")).toBe("Marine Emergency");
    expect(orderStatusText(null)).toBe("");
  });
});
