import { describe, expect, it } from "vitest";
import { hasActiveFilters } from "./searchFilters";

describe("hasActiveFilters", () => {
  it("ignores paging and the 'all' sentinel", () => {
    expect(hasActiveFilters(new URLSearchParams("page=2&status=all&search="))).toBe(false);
  });
  it("sees a real filter", () => {
    expect(hasActiveFilters(new URLSearchParams("status=sourcing"))).toBe(true);
    expect(hasActiveFilters(new URLSearchParams("search=moon"))).toBe(true);
  });
});
