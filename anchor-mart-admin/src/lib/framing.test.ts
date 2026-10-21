import { describe, expect, it } from "vitest";
import { isFramedCrossOrigin } from "./framing";

const ORIGIN = "https://anchormart.store";

function frameOf(top: unknown): Window {
  const self = { location: { origin: ORIGIN } };
  return { self, top: top ?? self, location: self.location } as unknown as Window;
}

describe("isFramedCrossOrigin (BUG-007)", () => {
  it("is false when not framed", () => {
    expect(isFramedCrossOrigin(frameOf(undefined))).toBe(false);
  });

  it("allows a same-origin frame", () => {
    expect(isFramedCrossOrigin(frameOf({ location: { origin: ORIGIN } }))).toBe(false);
  });

  it("refuses a frame whose parent cannot be read", () => {
    const top = {
      get location(): never {
        throw new DOMException("Blocked a frame", "SecurityError");
      },
    };
    expect(isFramedCrossOrigin(frameOf(top))).toBe(true);
  });
});
