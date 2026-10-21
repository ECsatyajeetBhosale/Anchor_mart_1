import { describe, expect, it } from "vitest";
import { createUserSchema } from "./createUser.schema";

const base = {
  first_name: "Ana",
  last_name: "Lim",
  email: "ana@example.com",
  country_code: "+65",
  whatsapp_number: "81234567",
};

const issuePaths = (input: unknown) => {
  const r = createUserSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("createUserSchema — delivery partner onboarding rules", () => {
  it("requires a port and at least one capability for a delivery partner", () => {
    const paths = issuePaths({
      ...base,
      role: "delivery_partner",
      can_verify: false,
      can_deliver: false,
      assigned_port: "",
    });
    expect(paths).toContain("can_verify");
    expect(paths).toContain("assigned_port");
  });

  it("accepts a complete partner, and ignores the partner fields for other roles", () => {
    expect(
      issuePaths({ ...base, role: "delivery_partner", can_deliver: true, assigned_port: "p-1" }),
    ).toEqual([]);
    expect(issuePaths({ ...base, role: "admin" })).toEqual([]);
  });
});
