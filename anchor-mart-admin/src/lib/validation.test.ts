import { describe, expect, it } from "vitest";
import { COUNTRIES, countryForDialCode } from "./countries";
import {
  isPhoneValidForCountry,
  phoneCountryRule,
  phoneDigitsHint,
  phoneExamplePlaceholder,
} from "./validation";

describe("countryForDialCode", () => {
  it("resolves a prefix to its country", () => {
    expect(countryForDialCode("+91")?.name).toBe("India");
    expect(countryForDialCode("+65")?.name).toBe("Singapore");
  });

  it("accepts the bare form the API has also stored", () => {
    expect(countryForDialCode("91")?.iso).toBe("IN");
  });

  it("picks one owner for a shared prefix rather than an arbitrary territory", () => {
    // +1 belongs to 25 territories; without an explicit choice this resolved to
    // whichever sorted first — Anguilla — and every US number showed its flag.
    expect(countryForDialCode("+1")?.iso).toBe("US");
    expect(countryForDialCode("+44")?.iso).toBe("GB");
    expect(countryForDialCode("+7")?.iso).toBe("RU");
  });

  it("has no answer for a prefix belonging to no country", () => {
    expect(countryForDialCode("+999")).toBeUndefined();
    expect(countryForDialCode("")).toBeUndefined();
  });

  it("names every country it offers", () => {
    expect(COUNTRIES.length).toBeGreaterThan(200);
    expect(COUNTRIES.every((country) => country.name !== "")).toBe(true);
    expect(COUNTRIES.every((country) => /^\+\d{1,4}$/.test(country.dialCode))).toBe(true);
  });
});

describe("isPhoneValidForCountry", () => {
  it("accepts real mobile numbers", () => {
    expect(isPhoneValidForCountry("+91", "9876543210")).toBe(true);
    expect(isPhoneValidForCountry("+65", "91234567")).toBe(true);
    expect(isPhoneValidForCountry("+971", "501234567")).toBe(true);
  });

  it("rejects a length that is legal in some other country", () => {
    // The old rule was "6–15 digits, anywhere". An eight-digit Singaporean
    // number is fine; the same eight digits under +91 are not a phone number.
    expect(isPhoneValidForCountry("+91", "91234567")).toBe(false);
    expect(isPhoneValidForCountry("+65", "9876543210")).toBe(false);
  });

  it("rejects a number in a range the country does not assign", () => {
    // Indian mobiles start 6–9; this is the right length and still not real.
    expect(isPhoneValidForCountry("+91", "1234567890")).toBe(false);
  });

  it("resolves the territory from the number, not from the chosen flag", () => {
    // +1 is displayed as the US, but a Toronto number entered under it is
    // checked against Canada's plan and passes.
    expect(isPhoneValidForCountry("+1", "4165550123")).toBe(true);
  });

  it("normalises what an operator actually types", () => {
    expect(isPhoneValidForCountry("91", "98765 43210")).toBe(true);
    expect(isPhoneValidForCountry("+91", "(98765) 43-210")).toBe(true);
  });

  it("treats a prefix belonging to no country as invalid rather than throwing", () => {
    expect(isPhoneValidForCountry("+999", "9876543210")).toBe(false);
  });

  it("has nothing to say about a blank", () => {
    expect(isPhoneValidForCountry("+91", "")).toBe(false);
    expect(isPhoneValidForCountry("", "9876543210")).toBe(false);
  });
});

describe("phoneDigitsHint", () => {
  it("states the mobile length for the picked country", () => {
    expect(phoneDigitsHint("+91")).toBe("India mobile numbers are 10 digits");
    expect(phoneDigitsHint("+65")).toBe("Singapore mobile numbers are 8 digits");
  });

  it("narrows to mobiles rather than quoting the whole numbering plan", () => {
    // India's plan spans 8–13 digits once landlines and service numbers count.
    // Advising that on a WhatsApp field would be true and useless.
    expect(phoneDigitsHint("+91")).not.toContain("8");
  });

  it("collapses a run of lengths into a range and lists a pair", () => {
    expect(phoneDigitsHint("+62")).toBe("Indonesia mobile numbers are 9–12 digits");
    expect(phoneDigitsHint("+49")).toBe("Germany mobile numbers are 10 or 11 digits");
  });

  it("says nothing until there is a country to say it about", () => {
    expect(phoneDigitsHint("")).toBeUndefined();
    expect(phoneDigitsHint(null)).toBeUndefined();
    expect(phoneDigitsHint("+999")).toBeUndefined();
  });
});

describe("phoneExamplePlaceholder", () => {
  it("shows the picked country's own example, grouped the way it is written", () => {
    expect(phoneExamplePlaceholder("+91")).toBe("81234 56789");
    expect(phoneExamplePlaceholder("+65")).toBe("8123 4567");
  });

  it("drops the trunk prefix the field does not want", () => {
    // `formatNational()` writes these as they would be dialled inside the
    // country — "081234 56789", "07400 123456" — and a placeholder carrying
    // that zero teaches an eleven-digit answer to a ten-digit field.
    expect(phoneExamplePlaceholder("+91")).not.toMatch(/^0/);
    expect(phoneExamplePlaceholder("+44")).toBe("7400 123456");
    expect(phoneExamplePlaceholder("+31")).not.toMatch(/^0/);
  });

  it("keeps a bracket that belongs to the number rather than to a prefix", () => {
    expect(phoneExamplePlaceholder("+1")).toBe("(201) 555-0123");
    // Russia's is "8 (912) 345-67-89" — the 8 goes, the bracket stays.
    expect(phoneExamplePlaceholder("+7")).toBe("(912) 345-67-89");
  });

  it("is a number the field would actually accept", () => {
    for (const code of ["+91", "+65", "+44", "+1", "+7", "+62", "+49"]) {
      const example = phoneExamplePlaceholder(code) ?? "";
      expect(isPhoneValidForCountry(code, example)).toBe(true);
    }
  });

  it("says nothing until there is a country to say it about", () => {
    expect(phoneExamplePlaceholder("")).toBeUndefined();
    expect(phoneExamplePlaceholder("+999")).toBeUndefined();
  });
});

describe("phoneCountryRule", () => {
  /** Collects the issues a run of the rule adds. */
  type Issue = { path?: PropertyKey[]; message?: string };
  function run(form: Record<string, unknown>, optional = false) {
    const issues: Issue[] = [];
    const rule = phoneCountryRule({
      codeKey: "country_code",
      numberKey: "whatsapp_number",
      optional,
    });
    rule(form, { addIssue: (issue: Issue) => issues.push(issue) } as never);
    return issues;
  }

  it("passes a matching pair silently", () => {
    expect(run({ country_code: "+91", whatsapp_number: "9876543210" })).toEqual([]);
  });

  it("pins the error to the number, which is what has to change", () => {
    const issues = run({ country_code: "+91", whatsapp_number: "91234567" });
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toEqual(["whatsapp_number"]);
    expect(issues[0].message).toContain("India (+91)");
    // The hint under the field is swapped out for the error, so the error has
    // to carry the length the hint was showing.
    expect(issues[0].message).toContain("10 digits");
  });

  it("leaves an empty number to the field-level rule", () => {
    // Required-ness is `phoneNumberField`'s job; saying "not a valid Indian
    // number" about an untouched box would be the wrong complaint.
    expect(run({ country_code: "+91", whatsapp_number: "" })).toEqual([]);
  });

  it("skips the check when an optional form has no country to check against", () => {
    expect(run({ country_code: "", whatsapp_number: "9876543210" }, true)).toEqual([]);
  });

  it("still checks an optional form once a country is picked", () => {
    expect(run({ country_code: "+91", whatsapp_number: "91234567" }, true)).toHaveLength(1);
  });
});
