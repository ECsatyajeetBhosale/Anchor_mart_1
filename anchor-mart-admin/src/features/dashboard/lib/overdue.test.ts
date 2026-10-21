import { describe, expect, it } from "vitest";
import { dueAt, isOverdue } from "./overdue";

const NOW = new Date("2026-10-12T06:00:00Z");

describe("isOverdue (BUG-065)", () => {
  it("flags an open order past its deliver_by", () => {
    const order = {
      status: "order_confirmed",
      deliver_by: "October 9, 2026, 08:00 PM SGT",
      ship_arrival_date: null,
    };
    expect(isOverdue(order, 12, NOW)).toBe(true);
  });

  it("falls back to arrival plus the express SLA without a deliver_by", () => {
    const order = {
      status: "order_confirmed",
      deliver_by: null,
      ship_arrival_date: "October 12, 2026, 08:00 AM SGT",
    };
    // Arrived 00:00Z; a 12h SLA runs to 12:00Z — not yet due at 06:00Z.
    expect(isOverdue(order, 12, NOW)).toBe(false);
    // A 4h SLA ran out at 04:00Z.
    expect(isOverdue(order, 4, NOW)).toBe(true);
  });

  it("never flags a finished order", () => {
    const base = { deliver_by: "October 1, 2026, 08:00 PM SGT", ship_arrival_date: null };
    expect(isOverdue({ ...base, status: "delivered" }, 12, NOW)).toBe(false);
    expect(isOverdue({ ...base, status: "cancelled" }, 12, NOW)).toBe(false);
    expect(isOverdue({ ...base, status: "payment_pending" }, 12, NOW)).toBe(false);
  });

  it("has no deadline with neither field, or no SLA to apply", () => {
    expect(dueAt({ deliver_by: null, ship_arrival_date: null }, 12)).toBeNull();
    expect(
      dueAt({ deliver_by: null, ship_arrival_date: "October 12, 2026, 08:00 AM SGT" }, undefined),
    ).toBeNull();
  });
});
