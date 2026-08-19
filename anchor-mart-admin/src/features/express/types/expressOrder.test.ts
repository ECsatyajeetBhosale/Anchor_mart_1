import type { Order } from "@/features/orders";
import { describe, expect, it } from "vitest";
import type { ExpressOrder, ExpressOrderListResponse } from "./expressItem.types";

/**
 * The contract this file exists to hold: express and orders are served by the
 * same `OrderListSerializer`, and a backend test asserts their key sets stay
 * equal. Aliasing rather than re-declaring is what makes that guarantee reach
 * the frontend — a second hand-written type could drift silently, and did.
 */
describe("ExpressOrder is the Orders row", () => {
  it("accepts an Order wherever an ExpressOrder is expected, and back", () => {
    const order: Order = {
      id: "o-1",
      order_number: "AM1",
      status: "delivered",
      status_display: "Delivered",
      total_amount: "10.00",
      created_at: "August 19, 2026, 06:18 AM",
    };
    const express: ExpressOrder = order;
    const backAgain: Order = express;
    expect(backAgain).toBe(order);
  });

  it("carries the fields the express row used to lack", () => {
    // The old hand-written type had 19 fields and none of these, so the screen
    // could not show a partner requirement, an owner, a terminal reason, or the
    // partial-delivery signals the shared serializer has always sent.
    const row: ExpressOrder = {
      id: "o-1",
      order_number: "AM1",
      status: "partially_delivered",
      status_display: "Partially Delivered",
      total_amount: "10.00",
      created_at: "August 19, 2026, 06:18 AM",
      expected_departure: "August 29, 2026, 12:00 AM",
      undelivered_value: "45.00",
      delivery_on_hold: true,
      needs_verifier_partner: false,
      needs_delivery_partner: true,
      assigned_admin: null,
      failure_reason: "",
      cancellation_reason: "",
      shipping_address: {
        full_name: null,
        phone: null,
        email: null,
        port_name: "Port of Fujairah",
        port_code: "AEFJR",
        anchorage_name: "Outer Anchorage",
        anchorage_code: "AEFJR-A1",
        country: null,
        city: null,
        zip_code: null,
        vessel_name: "Vikrant",
        imo_number: "VIK098",
        deck: null,
        cabin_number: null,
        section: null,
        delivery_instructions: null,
      },
    };
    expect(row.shipping_address?.port_name).toBe("Port of Fujairah");
    expect(row.undelivered_value).toBe("45.00");
    expect(row.delivery_on_hold).toBe(true);
  });

  it("shares the list envelope too", () => {
    const page: ExpressOrderListResponse = {
      count: 152,
      next: null,
      previous: null,
      results: [],
    };
    expect(page.count).toBe(152);
  });
});
