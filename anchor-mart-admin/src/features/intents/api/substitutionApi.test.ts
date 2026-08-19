import { describe, expect, it } from "vitest";
import { mapStaged } from "./substitutionApi";

/** One row of API 9, verbatim from the flow doc §9.2. */
const ROW = {
  id: 18,
  order_item_id: "7638cd01-0000-0000-0000-000000000001",
  variant_id: "b940ddc5-0000-0000-0000-000000000001",
  product_name: "Seed Deck Brush",
  sku: "SEED-REG-2",
  quantity: 2,
  unit_price: "45.00",
  status: "pending",
  is_released_to_user: true,
  admin_notes: "Closest match in the catalog",
  suggested_by_role: "admin",
  suggested_image: null,
  is_partner_freeform: false,
  partner_confirmed_at: null,
  needs_partner_confirmation: true,
};

describe("mapStaged — the two facts that are not the same fact", () => {
  it("reads the sailor's decision from `status`", () => {
    expect(mapStaged({ ...ROW, status: "accepted" }).decision).toBe("accepted");
    expect(mapStaged({ ...ROW, status: "rejected" }).decision).toBe("rejected");
    expect(mapStaged({ ...ROW, status: "pending" }).decision).toBe("pending");
  });

  it("reads whether the admin sent it from `is_released_to_user`", () => {
    expect(mapStaged({ ...ROW, is_released_to_user: true }).released).toBe(true);
    expect(mapStaged({ ...ROW, is_released_to_user: false }).released).toBe(false);
  });

  it("does not infer release from the decision", () => {
    // The regression this replaces: a suggestion the sailor REJECTED was shown
    // as "Released" in green, because the mapper matched the status against
    // /released|accepted|rejected/ instead of reading the flag.
    const rejectedButUnsent = mapStaged({
      ...ROW,
      status: "rejected",
      is_released_to_user: false,
    });
    expect(rejectedButUnsent.released).toBe(false);
    expect(rejectedButUnsent.decision).toBe("rejected");
  });

  it("does not infer the decision from release", () => {
    const sentButUnanswered = mapStaged({ ...ROW, is_released_to_user: true, status: "pending" });
    expect(sentButUnanswered.released).toBe(true);
    expect(sentButUnanswered.decision).toBe("pending");
  });

  it("treats an unrecognised decision as pending, never as an answer", () => {
    // Putting words in the sailor's mouth is the one wrong answer that matters.
    expect(mapStaged({ ...ROW, status: "substituted" }).decision).toBe("pending");
    expect(mapStaged({ ...ROW, status: "" }).decision).toBe("pending");
    expect(mapStaged({ ...ROW, status: undefined }).decision).toBe("pending");
  });
});

describe("mapStaged — the release blocker", () => {
  it("reads needs_partner_confirmation straight", () => {
    expect(mapStaged(ROW).needsPartnerConfirmation).toBe(true);
    expect(mapStaged({ ...ROW, needs_partner_confirmation: false }).needsPartnerConfirmation).toBe(
      false,
    );
  });

  it("does not guess it from the role or the confirmation timestamp", () => {
    // A partner's own pick is confirmed at creation, but that is the backend's
    // call to make — deriving it here would drift the moment the rule changes.
    const partnerPick = {
      ...ROW,
      suggested_by_role: "delivery_partner",
      partner_confirmed_at: "August 19, 2026, 06:18 AM",
      needs_partner_confirmation: true,
    };
    expect(mapStaged(partnerPick).needsPartnerConfirmation).toBe(true);
  });

  it("defaults to not-blocked when the field is absent", () => {
    expect(
      mapStaged({ ...ROW, needs_partner_confirmation: undefined }).needsPartnerConfirmation,
    ).toBe(false);
  });
});

describe("mapStaged — the row's own fields", () => {
  it("takes the SUGGESTED product from product_name", () => {
    // The original is not on this row at all; it is joined in by
    // `order_item_id`, which is why that id is carried through.
    const row = mapStaged(ROW);
    expect(row.suggestedName).toBe("Seed Deck Brush");
    expect(row.orderItemId).toBe("7638cd01-0000-0000-0000-000000000001");
  });

  it("keeps the integer id as a string for React keys", () => {
    expect(mapStaged(ROW).suggestionId).toBe("18");
  });

  it("carries price, quantity and sku as sent", () => {
    const row = mapStaged(ROW);
    expect(row.quantity).toBe(2);
    expect(row.unitPrice).toBe("45.00");
    expect(row.suggestedSku).toBe("SEED-REG-2");
  });

  it("falls back to a label rather than an empty name", () => {
    expect(mapStaged({ ...ROW, product_name: null }).suggestedName).toBe("Item");
  });

  it("has no image for a catalog pick", () => {
    expect(mapStaged(ROW).imageUrl).toBe("");
    expect(mapStaged({ ...ROW, suggested_image: "https://x/y.jpg" }).imageUrl).toBe(
      "https://x/y.jpg",
    );
  });
});
