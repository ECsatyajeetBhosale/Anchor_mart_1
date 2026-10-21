import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { pageFromParams, useFirstPageOnOutOfRange } from "./usePageParam";

describe("pageFromParams", () => {
  it("reads a valid page and falls back to 1 for junk, zero or absence", () => {
    expect(pageFromParams(new URLSearchParams("page=3"))).toBe(3);
    for (const q of ["", "page=abc", "page=0", "page=-2"]) {
      expect(pageFromParams(new URLSearchParams(q))).toBe(1);
    }
  });
});

describe("useFirstPageOnOutOfRange", () => {
  const notFound = { status: 404, data: { detail: "Invalid page." } };

  it("goes back to page 1 when a later page 404s", () => {
    const toFirst = vi.fn();
    renderHook(() => useFirstPageOnOutOfRange(notFound, 3, toFirst));
    expect(toFirst).toHaveBeenCalledTimes(1);
  });

  it("leaves page 1 and other errors alone, so it cannot loop", () => {
    const toFirst = vi.fn();
    renderHook(() => useFirstPageOnOutOfRange(notFound, 1, toFirst));
    renderHook(() => useFirstPageOnOutOfRange({ status: 500 }, 3, toFirst));
    renderHook(() => useFirstPageOnOutOfRange(undefined, 3, toFirst));
    expect(toFirst).not.toHaveBeenCalled();
  });
});
