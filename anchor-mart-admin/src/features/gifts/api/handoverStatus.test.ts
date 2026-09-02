import { describe, expect, it } from "vitest";
import { giftTestables } from "./giftApi";

const { toGift } = giftTestables;

/** A gift payload as the admin API sends it, with only the parts under test. */
function payload(overrides: Record<string, unknown> = {}) {
  return {
    id: "g1",
    handover_status: "pending",
    carrier_order_id: "o1",
    carrier_order_number: "AM-1",
    source: "manual",
    granted_by_name: "Admin",
    granted_at: "2026-09-02T10:00:00Z",
    ...overrides,
  };
}

describe("toGift — handover status", () => {
  it("keeps `collected`, the state added with the partner's pickup checkpoint", () => {
    // The regression this guards: before `collected` was a known member, the
    // unchecked cast let it through and the drawer labelled a parcel already
    // on the van "Awaiting pickup".
    expect(toGift(payload({ handover_status: "collected" }))?.handover_status).toBe("collected");
  });

  it("keeps `pending` and `delivered`", () => {
    expect(toGift(payload())?.handover_status).toBe("pending");
    expect(toGift(payload({ handover_status: "delivered" }))?.handover_status).toBe("delivered");
  });

  it("drops a revoked or void gift — those sailors are giftable again", () => {
    expect(toGift(payload({ handover_status: "revoked" }))).toBeNull();
    expect(toGift(payload({ handover_status: "void" }))).toBeNull();
  });

  it("falls back to `pending` for a state it does not know", () => {
    // Fails towards "still ours to chase" rather than inventing a closed state.
    expect(toGift(payload({ handover_status: "teleported" }))?.handover_status).toBe("pending");
    expect(toGift(payload({ handover_status: "" }))?.handover_status).toBe("pending");
  });
});

describe("toGift — pickup and handover provenance", () => {
  it("reads the collected and delivered fields", () => {
    const gift = toGift(
      payload({
        handover_status: "delivered",
        collected_at: "2026-09-02T11:00:00Z",
        collected_by_name: "Partner A",
        delivered_by_name: "Partner B",
      }),
    );

    expect(gift?.collected_at).toBe("2026-09-02T11:00:00Z");
    expect(gift?.collected_by_name).toBe("Partner A");
    expect(gift?.delivered_by_name).toBe("Partner B");
  });

  it("nulls them when absent, so a pre-deploy gift reads as unmoved", () => {
    const gift = toGift(payload());

    expect(gift?.collected_at).toBeNull();
    expect(gift?.collected_by_name).toBeNull();
    expect(gift?.delivered_by_name).toBeNull();
  });

  it("surfaces collected-but-never-handed-over, the state ops must chase", () => {
    const gift = toGift(
      payload({
        handover_status: "collected",
        collected_at: "2026-09-02T11:00:00Z",
        collected_by_name: "Partner A",
      }),
    );

    expect(gift?.collected_at).not.toBeNull();
    expect(gift?.delivered_by_name).toBeNull();
  });
});
