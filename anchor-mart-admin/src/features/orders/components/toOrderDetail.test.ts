import { describe, expect, it } from "vitest";
import type { Order, OrderShippingAddress } from "../types/order.types";
import { toOrderDetail } from "./OrdersPage";

/** The 16-key delivery target, as every row now carries it. */
const ADDRESS: OrderShippingAddress = {
  full_name: "Mahesh",
  phone: "9657776454",
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
};

const ROW: Order = {
  id: "o-1",
  order_number: "AM202608110001",
  status: "partially_delivered",
  status_display: "Partially Delivered",
  customer_name: "Anjali Menon",
  customer_email: "anjali@example.com",
  total_amount: "1750.00",
  item_count: 3,
  shipping_address: ADDRESS,
  ship_arrival_date: "August 22, 2026, 11:47 AM",
  expected_departure: "August 29, 2026, 12:00 AM",
  payment_completed_at: "August 19, 2026, 06:18 AM",
  created_at: "August 19, 2026, 06:18 AM",
  is_fastest_delivery: true,
  is_express: false,
  is_emergency: false,
  undelivered_value: "45.00",
  delivery_on_hold: false,
};

describe("toOrderDetail — the delivery target", () => {
  it("reads vessel and IMO from shipping_address only", () => {
    // The row root carries neither, and `imo` no longer exists as a key.
    const d = toOrderDetail(ROW);
    expect(d.vesselName).toBe("Vikrant");
    expect(d.imo).toBe("VIK098");
  });

  it("does not accept the retired `imo` spelling", () => {
    const legacy = {
      ...ROW,
      shipping_address: { ...ADDRESS, imo_number: null, imo: "OLD" },
    } as unknown as Order;
    expect(toOrderDetail(legacy).imo).toBe("");
  });

  it("takes location from the address, not the removed top-level keys", () => {
    const d = toOrderDetail(ROW);
    expect(d.portName).toBe("Port of Fujairah");
    expect(d.anchorageName).toBe("Outer Anchorage");
    expect(d.portCode).toBe("AEFJR");

    // The top-level names are gone from the list contract; a payload still
    // carrying them is not a source this mapper reads.
    const stale = {
      ...ROW,
      shipping_address: { ...ADDRESS, port_name: null, anchorage_name: null },
      port_name: "Elsewhere",
      anchorage_name: "Elsewhere Anchorage",
    } as unknown as Order;
    expect(toOrderDetail(stale).portName).toBe("");
    expect(toOrderDetail(stale).anchorageName).toBe("");
  });

  it("keeps the nested objects as detail-read fallbacks", () => {
    // A list row has no `port`/`anchorage`; the detail read does, and one
    // mapper serves both.
    const detail = {
      ...ROW,
      shipping_address: { ...ADDRESS, port_name: null, anchorage_name: null },
      port: { id: "p", port_code: "AEFJR", port_name: "Fujairah", country: "AE", region: "ME" },
      anchorage: { id: "a", anchorage_name: "Inner", anchorage_code: "AEFJR-B2" },
    } as Order;
    expect(toOrderDetail(detail).portName).toBe("Fujairah");
    expect(toOrderDetail(detail).anchorageName).toBe("Inner");
  });

  it("reads the delivery contact from `phone`, not the retired `contact`", () => {
    expect(toOrderDetail(ROW).sailorPhone).toBe("9657776454");
    const legacy = {
      ...ROW,
      shipping_address: { ...ADDRESS, phone: null, contact: "0000" },
    } as unknown as Order;
    expect(toOrderDetail(legacy).sailorPhone).toBe("");
  });

  it("prefers the account's own number over the delivery contact", () => {
    // Two different people can be on one order — the account holder and
    // whoever receives at the berth.
    const withAccount = { ...ROW, customer: { whatsapp_number: "111" } } as Order;
    expect(toOrderDetail(withAccount).sailorPhone).toBe("111");
  });
});

describe("toOrderDetail — dates", () => {
  it("shortens the vessel dates without parsing them", () => {
    const d = toOrderDetail(ROW);
    expect(d.shipArrivalDate).toBe("Aug 22, 2026");
    expect(d.expectedDeparture).toBe("Aug 29, 2026");
  });

  it("shows the order date as sent", () => {
    expect(toOrderDetail(ROW).orderDate).toBe("August 19, 2026, 06:18 AM");
  });

  it("dashes an absent date rather than inventing one", () => {
    expect(toOrderDetail({ ...ROW, expected_departure: null }).expectedDeparture).toBe("—");
  });
});
