import { describe, expect, it, vi } from "vitest";
import { applyApiFieldErrors, getApiMessage, getSuccessMessage } from "./apiError";

describe("getSuccessMessage (BUG-033)", () => {
  it("reads only an explicit message", () => {
    expect(getSuccessMessage({ message: "Category created" })).toBe("Category created");
    expect(getSuccessMessage({ data: { detail: "Saved." } })).toBe("Saved.");
  });

  it("never toasts a created record's first field", () => {
    expect(getSuccessMessage({ id: "a6ce8a25-88b8", name: "x" })).toBeUndefined();
    expect(getSuccessMessage({ port_code: "mum" })).toBeUndefined();
  });
});

describe("getApiMessage", () => {
  it("drops the field prefix by default (BUG-035)", () => {
    const err = { status: 400, data: { code: ["Coupon with this code already exists."] } };
    expect(getApiMessage(err)).toBe("Coupon with this code already exists.");
    expect(getApiMessage(err, { labelFields: true })).toBe(
      "code: Coupon with this code already exists.",
    );
  });

  it("rewrites DRF's unique-together sentence (BUG-041)", () => {
    const err = {
      status: 400,
      data: { non_field_errors: ["The fields coupon, user must make a unique set."] },
    };
    expect(getApiMessage(err)).toBe("This record already exists.");
  });
});

describe("applyApiFieldErrors", () => {
  it("pins known fields, including nested ones, and reports it", () => {
    const setError = vi.fn();
    const err = {
      status: 400,
      data: {
        port_code: ["Port code already exists."],
        default_anchorage: { anchorage_code: ["Duplicate code."] },
        unrelated: ["ignored"],
      },
    };
    const pinned = applyApiFieldErrors(err, setError, [
      "port_code",
      "default_anchorage.anchorage_code",
    ] as const);
    expect(pinned).toBe(true);
    expect(setError).toHaveBeenCalledWith(
      "port_code",
      { type: "server", message: "Port code already exists." },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenCalledWith(
      "default_anchorage.anchorage_code",
      { type: "server", message: "Duplicate code." },
      { shouldFocus: false },
    );
  });

  it("returns false when nothing matches, so the caller toasts", () => {
    const setError = vi.fn();
    expect(applyApiFieldErrors({ status: 400, data: { detail: "Nope" } }, setError, ["code"])).toBe(
      false,
    );
    expect(setError).not.toHaveBeenCalled();
  });
});
