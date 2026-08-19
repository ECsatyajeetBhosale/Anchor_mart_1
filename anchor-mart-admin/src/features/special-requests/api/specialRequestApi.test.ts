import { describe, expect, it } from "vitest";
import type { SpecialRequestApi } from "../types/specialRequest.types";
import { toSpecialRequest } from "./specialRequestApi";

/** The §3 row contract, verbatim. */
const ROW: SpecialRequestApi = {
  id: "sr-1",
  reference: "SR202608120001",
  customer_name: "Anjali Menon",
  customer_email: "anjali@example.com",
  phone: "9657776454",
  product_name: "Realme 3 Pro",
  brand: "Realme",
  primary_image: null,
  shipping_address: {
    full_name: "Mahesh",
    phone: "9000000000",
    email: null,
    port_name: "Port of Fujairah",
    port_code: "AEFJR",
    anchorage_name: "Outer Anchorage",
    anchorage_code: "AEFJR-A1",
    country: "United Arab Emirates",
    city: null,
    zip_code: null,
    vessel_name: "Vikrant",
    imo_number: "VIK098",
    deck: "1",
    cabin_number: "19",
    section: "A",
    delivery_instructions: "Test",
  },
  ship_arrival_date: "August 22, 2026, 11:47 AM",
  expected_departure: "August 29, 2026, 12:00 AM",
  quantity: 2,
  max_budget: "600.00",
  currency: "USD",
  status: "quote_sent",
  status_display: "Quote Sent",
  is_fastest_delivery: true,
  quoted_price: "500.00",
  fast_delivery_charge: "20.00",
  rebill_requested: false,
  created_at: "August 12, 2026, 09:41 AM",
  updated_at: "August 13, 2026, 10:02 AM",
};

describe("toSpecialRequest — identity", () => {
  it("shows a name where a name belongs", () => {
    // Until the identity fields were unified the list sent only `sailor`, which
    // carried the email — so the Sailor column showed an address.
    const row = toSpecialRequest(ROW);
    expect(row.n).toBe("Anjali Menon");
    expect(row.email).toBe("anjali@example.com");
  });

  it("falls back to the email when the account has no name", () => {
    expect(toSpecialRequest({ ...ROW, customer_name: null }).n).toBe("anjali@example.com");
  });

  it("does not read the removed `sailor` key", () => {
    const legacy = { ...ROW, customer_name: null, customer_email: null, sailor: "x@y.z" };
    expect(toSpecialRequest(legacy as SpecialRequestApi).n).toBe("-");
  });

  it("keeps the account number and the delivery contact apart", () => {
    // `phone` identifies the person; `shipping_address.phone` says who to call
    // at the berth. Both are set here and they differ.
    const row = toSpecialRequest(ROW);
    expect(row.ph).toBe("9657776454");
    expect(ROW.shipping_address?.phone).toBe("9000000000");
    expect(row.ph).not.toBe(ROW.shipping_address?.phone);
  });
});

describe("toSpecialRequest — the delivery target", () => {
  it("reads vessel and location from the shared address object", () => {
    const row = toSpecialRequest(ROW);
    expect(row.vessel).toBe("Vikrant");
    expect(row.location).toBe("Port of Fujairah · Outer Anchorage");
  });

  it("falls back to the IMO when no vessel is named", () => {
    const row = toSpecialRequest({
      ...ROW,
      shipping_address: { ...ROW.shipping_address, vessel_name: null },
    });
    expect(row.vessel).toBe("VIK098");
  });

  it("joins only what is present", () => {
    const row = toSpecialRequest({
      ...ROW,
      shipping_address: { ...ROW.shipping_address, anchorage_name: null },
    });
    expect(row.location).toBe("Port of Fujairah");
  });

  it("dashes an address the request does not carry", () => {
    const row = toSpecialRequest({ ...ROW, shipping_address: null });
    expect(row.vessel).toBe("-");
    expect(row.location).toBe("-");
  });
});

describe("toSpecialRequest — dates", () => {
  it("shortens the vessel dates and passes the request date through", () => {
    const row = toSpecialRequest(ROW);
    expect(row.arrival).toBe("Aug 22, 2026");
    expect(row.departure).toBe("Aug 29, 2026");
    // `created_at` is the request's own timestamp and is shown as sent.
    expect(row.dt).toBe("August 12, 2026, 09:41 AM");
  });

  it("dashes an absent vessel date", () => {
    expect(toSpecialRequest({ ...ROW, ship_arrival_date: null }).arrival).toBe("—");
  });
});

describe("toSpecialRequest — the quotation fields", () => {
  it("keeps the rebill flag, which no `?status=` can select", () => {
    // `awaiting_rebill` is a subset of `sourcing_confirmed` with no filter of
    // its own, so the row flag is the only way the table can identify it.
    expect(toSpecialRequest({ ...ROW, rebill_requested: true }).rebillRequested).toBe(true);
    expect(toSpecialRequest(ROW).rebillRequested).toBe(false);
  });

  it("treats quantity as a scalar, not a line count", () => {
    // One product per request, N units — there is no basket here.
    expect(toSpecialRequest(ROW).qty).toBe(2);
    expect(toSpecialRequest({ ...ROW, quantity: null }).qty).toBe("-");
  });

  it("uses the request's own reference, not an order number", () => {
    expect(toSpecialRequest(ROW).r).toBe("SR202608120001");
  });
});
