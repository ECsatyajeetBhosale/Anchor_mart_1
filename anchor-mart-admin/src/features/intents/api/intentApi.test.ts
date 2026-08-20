import { describe, expect, it } from "vitest";
import type { IntentApi } from "../types/intent.types";
import { toIntentData } from "./intentApi";

/**
 * The §2 row contract, verbatim — including the 2026-08-19 renames
 * (`customer_*`), the 16-key `shipping_address`, and display-formatted dates.
 */
const ROW: IntentApi = {
  id: "d695daa8-0000-0000-0000-000000000001",
  order_number: "AM202608110001",
  customer_name: "Anjali Menon",
  customer_email: "anjali@example.com",
  status: "intent_received",
  status_display: "Intent Received",
  item_count: 1,
  items: [
    {
      id: "496407d1-0000-0000-0000-000000000001",
      product_name: "Deck Scraper & Wire Brush Set",
      sku: "SKU-3D35D0-1",
      quantity: 2,
      available_qty: undefined,
      is_available: null,
      shortfall: 0,
      needs_suggestion: false,
    },
  ],
  substitution_needed: false,
  shipping_address: {
    full_name: "Dfbfgfg",
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
  },
  ship_arrival_date: "August 22, 2026, 11:47 AM",
  expected_departure: "August 29, 2026, 12:00 AM",
  is_fastest_delivery: false,
  is_express: false,
  is_emergency: false,
  intent_received_at: "August 19, 2026, 06:18 AM",
  created_at: "August 19, 2026, 06:18 AM",
  total_amount: "0.00",
  assigned_admin: { id: "a-1", name: "Platform Admin", email: "admin@example.com" },
  location_change: null,
  rejection_reason: "",
  cancellation_reason: "",
  cancelled_at: null,
  needs_verifier_partner: true,
  needs_delivery_partner: false,
};

describe("toIntentData — customer identity", () => {
  it("reads customer_name, the post-rename field", () => {
    expect(toIntentData(ROW).s).toBe("Anjali Menon");
  });

  it("falls back to the email, then to a dash", () => {
    expect(toIntentData({ ...ROW, customer_name: undefined }).s).toBe("anjali@example.com");
    expect(toIntentData({ ...ROW, customer_name: undefined, customer_email: undefined }).s).toBe(
      "—",
    );
  });

  it("does not read the removed sailor_* keys", () => {
    // A hard swap: the old names are gone from the API and a backend test
    // asserts their absence, so reading them would be reading nothing.
    const legacy = { ...ROW, customer_name: undefined, customer_email: undefined };
    const withOldKeys = { ...legacy, sailor_name: "Anjali Menon" } as IntentApi;
    expect(toIntentData(withOldKeys).s).toBe("—");
  });
});

describe("toIntentData — shipping_address is the only location source", () => {
  it("takes the ship from vessel_name", () => {
    expect(toIntentData(ROW).sh).toBe("Vikrant");
  });

  it("falls back to imo_number — never a bare `imo`", () => {
    const noVessel = {
      ...ROW,
      shipping_address: { ...ROW.shipping_address, vessel_name: null },
    } as IntentApi;
    expect(toIntentData(noVessel).sh).toBe("VIK098");

    // `imo` was reconciled away server-side; a payload still carrying it is not
    // a source this mapper accepts.
    const legacyImo = {
      ...ROW,
      shipping_address: { ...ROW.shipping_address, vessel_name: null, imo_number: null, imo: "X" },
    } as unknown as IntentApi;
    expect(toIntentData(legacyImo).sh).toBe("—");
  });

  it("takes the port from shipping_address, not the removed top-level key", () => {
    expect(toIntentData(ROW).port).toBe("Port of Fujairah");
    const legacyPort = { ...ROW, shipping_address: undefined, port: "Elsewhere" } as IntentApi;
    expect(toIntentData(legacyPort).port).toBe("");
  });

  it("tolerates every optional key being null", () => {
    const blank = {
      ...ROW,
      shipping_address: { ...ROW.shipping_address, vessel_name: null, imo_number: null },
    } as IntentApi;
    expect(toIntentData(blank).sh).toBe("—");
  });
});

describe("toIntentData — dates", () => {
  it("shortens the vessel dates without parsing them", () => {
    const row = toIntentData(ROW);
    expect(row.ar).toBe("Aug 22, 2026");
    expect(row.sy).toBe("Aug 29, 2026");
  });

  it("shows the submitted timestamp exactly as sent", () => {
    expect(toIntentData(ROW).sb).toBe("August 19, 2026, 06:18 AM");
  });

  it("falls back to intent_received_at only when created_at is missing", () => {
    const noCreated = { ...ROW, created_at: null };
    expect(toIntentData(noCreated).sb).toBe("August 19, 2026, 06:18 AM");
    expect(toIntentData({ ...noCreated, intent_received_at: null }).sb).toBe("—");
  });

  it("dashes an absent date instead of inventing one", () => {
    expect(toIntentData({ ...ROW, ship_arrival_date: null }).ar).toBe("—");
  });
});

describe("toIntentData — delivery flags", () => {
  it("reads the three flags independently", () => {
    const fastRegular = toIntentData({ ...ROW, is_fastest_delivery: true });
    // A regular order can be fastest-delivery: it is not express, it just gains
    // a hard deadline it would otherwise not have.
    expect(fastRegular.isFastest).toBe(true);
    expect(fastRegular.isExpress).toBe(false);
    expect(fastRegular.isEmergency).toBe(false);
  });

  it("defaults a missing flag to false rather than undefined", () => {
    expect(toIntentData({ ...ROW, is_fastest_delivery: undefined }).isFastest).toBe(false);
  });
});

describe("toIntentData — location_change", () => {
  it("is null when there is nothing to act on", () => {
    expect(toIntentData(ROW).locationChange).toBeNull();
  });

  it("maps a pending report — the state this screen normally sees", () => {
    const row = toIntentData({
      ...ROW,
      location_change: {
        state: "report_pending",
        delta_id: null,
        report_id: "r-1",
        amount: null,
      },
    });
    expect(row.locationChange).toEqual({
      state: "report_pending",
      delta_id: null,
      report_id: "r-1",
      amount: null,
    });
  });

  it("carries the delta amount through as a decimal string", () => {
    const row = toIntentData({
      ...ROW,
      location_change: {
        state: "delta_pending",
        delta_id: "d-1",
        report_id: null,
        amount: "450.00",
      },
    });
    expect(row.locationChange?.amount).toBe("450.00");
    expect(row.locationChange?.delta_id).toBe("d-1");
  });

  it("rejects an unrecognised state rather than badging it blank", () => {
    const row = toIntentData({
      ...ROW,
      location_change: { state: "something_new", delta_id: null, report_id: null, amount: null },
    } as unknown as IntentApi);
    expect(row.locationChange).toBeNull();
  });

  it("is not confused with the orders screen's boolean", () => {
    // `has_location_request` is a different, poorer signal and must never be
    // read as this one.
    const row = toIntentData({ ...ROW, has_location_request: true } as unknown as IntentApi);
    expect(row.locationChange).toBeNull();
  });
});

describe("toIntentData — situation", () => {
  it("carries the sub-state through for the action to read", () => {
    const row = toIntentData({
      ...ROW,
      status: "pending_customer_response",
      situation: "ready_to_bill",
      status_display: "Ready to Bill",
    });
    expect(row.situation).toBe("ready_to_bill");
  });

  it("shows the label of the situation, not of the status", () => {
    // `status_display` labels `situation` now, so a settled basket reads
    // "Ready to Bill" rather than the status it shares with an unanswered one.
    const row = toIntentData({
      ...ROW,
      status: "pending_customer_response",
      situation: "ready_to_bill",
      status_display: "Ready to Bill",
    });
    expect(row.st).toBe("Ready to Bill");
    // The raw status is untouched — it is what the lifecycle and the other
    // apps read, and it does not move when the situation does.
    expect(row.status).toBe("pending_customer_response");
  });

  it("colours from the situation so the split is visible", () => {
    const settled = toIntentData({
      ...ROW,
      status: "pending_customer_response",
      situation: "ready_to_bill",
    });
    const waiting = toIntentData({
      ...ROW,
      status: "pending_customer_response",
      situation: "awaiting_customer",
    });
    // Same status, two situations, two colours — colouring by status would
    // render a billable row identically to one still waiting on the sailor.
    expect(settled.sc).not.toBe(waiting.sc);
    expect(waiting.sc).toBe("warning");
  });

  it("splits intent_received on ownership, not progress", () => {
    const unclaimed = toIntentData({ ...ROW, status: "intent_received", situation: "new" });
    const claimed = toIntentData({ ...ROW, status: "intent_received", situation: "sourcing" });
    expect(unclaimed.status).toBe("intent_received");
    expect(claimed.status).toBe("intent_received");
    expect(unclaimed.sc).not.toBe(claimed.sc);
  });

  it("falls back to the status colour for a situation it does not know", () => {
    const row = toIntentData({
      ...ROW,
      status: "payment_pending",
      situation: "something_new",
    });
    expect(row.sc).toBe(toIntentData({ ...ROW, status: "payment_pending" }).sc);
  });

  it("keeps both halves of the split under one status", () => {
    const waiting = toIntentData({
      ...ROW,
      status: "pending_customer_response",
      situation: "awaiting_customer",
      status_display: "Awaiting Customer",
    });
    expect(waiting.status).toBe("pending_customer_response");
    expect(waiting.st).toBe("Awaiting Customer");
  });

  it("is empty on a row that carries no sub-state", () => {
    expect(toIntentData(ROW).situation).toBe("");
  });
});

describe("toIntentData — everything else the row renders", () => {
  it("keeps the signals the columns branch on", () => {
    const row = toIntentData(ROW);
    expect(row.r).toBe("AM202608110001");
    expect(row.st).toBe("Intent Received");
    expect(row.status).toBe("intent_received");
    expect(row.it).toBe("Deck Scraper & Wire Brush Set (1)");
    expect(row.itemCount).toBe(1);
    expect(row.substitutionNeeded).toBe(false);
    expect(row.needsVerifierPartner).toBe(true);
    expect(row.needsDeliveryPartner).toBe(false);
    expect(row.assignedAdmin?.name).toBe("Platform Admin");
    // "0.00" until the bill exists — an intent is not priced yet.
    expect(row.total).toBe("0.00");
  });

  it("reports an absent partner flag as null, never as false", () => {
    const row = toIntentData({ ...ROW, needs_verifier_partner: undefined });
    expect(row.needsVerifierPartner).toBeNull();
  });

  it("derives substitution_needed from the items when the row omits it", () => {
    const short = toIntentData({
      ...ROW,
      substitution_needed: undefined,
      items: [{ ...(ROW.items?.[0] ?? {}), needs_suggestion: true }],
    });
    expect(short.substitutionNeeded).toBe(true);
  });

  /**
   * The list serializer's placeholders disagree with each other outside
   * `verification_submitted`: `available_qty`/`is_available` are null while
   * `shortfall` is hardcoded `0`. Two fields say "unknown", one says
   * "definitely nothing short" — and the mapper used to believe the third.
   */
  describe("unverified lines", () => {
    const unverified = {
      ...ROW,
      substitution_needed: undefined,
      items: [
        {
          ...(ROW.items?.[0] ?? {}),
          quantity: 2,
          available_qty: null,
          is_available: null,
          shortfall: 0,
          needs_suggestion: false,
        },
      ],
    };

    it("does not read a hardcoded shortfall of 0 as 'nothing is short'", () => {
      const row = toIntentData(unverified);
      // The honest answer is "not measured" — and specifically NOT a clean bill
      // of health derived from a number the backend did not measure.
      expect(row.reqItems[0].available).toBeNull();
      expect(row.reqItems[0].needsSuggestion).toBe(false);
      expect(row.substitutionNeeded).toBe(false);
    });

    /**
     * The regression this guards: with `is_available` null, a `shortfall` of 2
     * is still a placeholder and must not manufacture a suggestion prompt for a
     * line nobody has verified.
     */
    it("ignores a shortfall figure on a line that was never verified", () => {
      const row = toIntentData({
        ...unverified,
        items: [{ ...(unverified.items[0] ?? {}), shortfall: 2 }],
      });
      expect(row.reqItems[0].shortfall).toBe(0);
      expect(row.reqItems[0].needsSuggestion).toBe(false);
    });

    it("still trusts the shortfall once the line IS verified", () => {
      const row = toIntentData({
        ...unverified,
        items: [
          {
            ...(unverified.items[0] ?? {}),
            is_available: true,
            available_qty: 1,
            shortfall: 1,
          },
        ],
      });
      expect(row.reqItems[0].shortfall).toBe(1);
      expect(row.reqItems[0].needsSuggestion).toBe(true);
      expect(row.substitutionNeeded).toBe(true);
    });

    /** `is_available: false` is a verdict, not a placeholder — always honoured. */
    it("honours an explicit unavailable regardless of shortfall", () => {
      const row = toIntentData({
        ...unverified,
        items: [{ ...(unverified.items[0] ?? {}), is_available: false, shortfall: 0 }],
      });
      expect(row.reqItems[0].needsSuggestion).toBe(true);
    });
  });
});
