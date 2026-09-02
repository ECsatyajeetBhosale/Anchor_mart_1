import { describe, expect, it } from "vitest";
import type { GiftHandoverStatus } from "../types/gift.types";
import { HANDOVER_BADGE } from "./giftFormat";

const ALL: GiftHandoverStatus[] = ["pending", "collected", "delivered", "revoked", "void"];

describe("HANDOVER_BADGE", () => {
  it("distinguishes a parcel on our shelf from one on the van", () => {
    // The defect this replaces: the drawer asked `=== "delivered" ? … : pending`,
    // so every non-delivered state — `collected` included — was reported to
    // admins as "awaiting pickup". A parcel already collected by the partner
    // read as one nobody had touched.
    expect(HANDOVER_BADGE.collected.label).not.toBe(HANDOVER_BADGE.pending.label);
    expect(HANDOVER_BADGE.collected.variant).not.toBe(HANDOVER_BADGE.pending.variant);
  });

  it("reads `delivered` as the only finished state", () => {
    expect(HANDOVER_BADGE.delivered.variant).toBe("success");
    expect(HANDOVER_BADGE.collected.variant).not.toBe("success");
    expect(HANDOVER_BADGE.pending.variant).not.toBe("success");
  });

  it("covers every state the API can send", () => {
    // Exhaustiveness is the guard: a state added later must not silently
    // borrow another's label, which is exactly how `collected` went wrong.
    for (const status of ALL) {
      expect(HANDOVER_BADGE[status]?.label).toBeTruthy();
    }
  });

  it("gives each open state its own label", () => {
    const open = [HANDOVER_BADGE.pending.label, HANDOVER_BADGE.collected.label];
    expect(new Set(open).size).toBe(open.length);
  });
});
