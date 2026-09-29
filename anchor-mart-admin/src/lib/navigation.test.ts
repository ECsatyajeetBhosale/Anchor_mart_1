import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "./constants";
import { routeTitle } from "./navigation";

describe("routeTitle (BUG-032 / BUG-059)", () => {
  it("names every routed nav screen", () => {
    expect(routeTitle(APP_ROUTES.ORDERS)).not.toBe("");
    expect(routeTitle(APP_ROUTES.SAILORS)).not.toBe("");
    expect(routeTitle(APP_ROUTES.EXPRESS_ORDERS)).not.toBe("");
  });

  it("is blank for an unknown path", () => {
    expect(routeTitle("/this-page-does-not-exist")).toBe("");
  });
});
