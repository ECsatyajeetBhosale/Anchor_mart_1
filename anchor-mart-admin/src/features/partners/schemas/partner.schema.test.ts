import { describe, expect, it } from "vitest";
import { partnerFormSchema, partnerUpdateSchema } from "./partner.schema";

/** A valid body for the fields both forms share. */
const SHARED = {
  first_name: "Aisha",
  last_name: "Karimi",
  email: "partner@example.com",
  country_code: "+91",
  whatsapp_number: "9876543210",
  can_verify: true,
  can_deliver: true,
  assigned_port: "port-uuid",
};

describe("partnerUpdateSchema", () => {
  it("accepts the account flag the update endpoint takes", () => {
    const parsed = partnerUpdateSchema.parse({ ...SHARED, is_active: true });
    expect(parsed.is_active).toBe(true);
  });

  it("will not submit without it", () => {
    // Optional would be worse than required here: an edit that omitted it would
    // reset a partner's account state to whatever the server defaults to.
    expect(partnerUpdateSchema.safeParse(SHARED).success).toBe(false);
  });

  it("never carries availability, even when handed it", () => {
    // The endpoint accepts `is_available`, and this form deliberately does not
    // send it: on-duty state is the partner's own, and the form is submittable
    // before the detail response lands, so carrying it would let an unrelated
    // edit write a stale value over what the partner had just chosen.
    const parsed = partnerUpdateSchema.parse({
      ...SHARED,
      is_active: true,
      is_available: false,
    });
    expect(parsed).not.toHaveProperty("is_available");
  });

  it("still enforces the shared rules", () => {
    const noCapability = partnerUpdateSchema.safeParse({
      ...SHARED,
      can_verify: false,
      can_deliver: false,
      is_active: true,
    });
    expect(noCapability.success).toBe(false);

    // Eight digits is a Singaporean number, not an Indian one.
    const badNumber = partnerUpdateSchema.safeParse({
      ...SHARED,
      whatsapp_number: "91234567",
      is_active: true,
    });
    expect(badNumber.success).toBe(false);
  });
});

describe("assigned_port", () => {
  it("is required when onboarding", () => {
    // Stricter than the API on purpose: without a port a partner is
    // capability-matched only, and the port-scoped picker never returns them.
    const blank = partnerFormSchema.safeParse({ ...SHARED, assigned_port: "" });
    expect(blank.success).toBe(false);
    expect(blank.error?.issues[0]?.path).toEqual(["assigned_port"]);

    expect(partnerFormSchema.safeParse({ ...SHARED, assigned_port: "port-uuid" }).success).toBe(
      true,
    );
  });

  it("stays optional when editing", () => {
    // Partners created before anything collected a port have none; requiring it
    // here would block every unrelated edit to those records.
    expect(
      partnerUpdateSchema.safeParse({ ...SHARED, assigned_port: "", is_active: true }).success,
    ).toBe(true);
  });
});

describe("partnerFormSchema", () => {
  it("does not ask onboarding for flags it has nowhere to send", () => {
    // `partner/create/` has no concept of either, so the onboard form must
    // parse cleanly without them.
    expect(partnerFormSchema.safeParse(SHARED).success).toBe(true);
  });

  it("keeps the rules the two forms share", () => {
    expect(
      partnerFormSchema.safeParse({ ...SHARED, can_verify: false, can_deliver: false }).success,
    ).toBe(false);
    expect(partnerFormSchema.safeParse({ ...SHARED, email: "not-an-email" }).success).toBe(false);
  });
});
