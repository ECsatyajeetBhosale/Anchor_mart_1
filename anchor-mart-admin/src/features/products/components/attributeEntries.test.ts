import { describe, expect, it } from "vitest";
import { attributeEntries } from "./ProductEditDrawer";

/**
 * `attributes` is free-form JSON on the variant — whatever the catalog team
 * put there — so this has to survive shapes no schema promises.
 */
describe("attributeEntries", () => {
  it("keeps the order and the values the API sent", () => {
    expect(
      attributeEntries({
        RAM: "8 GB",
        Brand: "Apple",
        Model: "MacBook Air M2",
        Storage: "256 GB SSD",
      }),
    ).toEqual([
      ["RAM", "8 GB"],
      ["Brand", "Apple"],
      ["Model", "MacBook Air M2"],
      ["Storage", "256 GB SSD"],
    ]);
  });

  it("drops keys with nothing behind them", () => {
    // A key whose value is blank is normal in this payload and is not a row.
    expect(
      attributeEntries({ Brand: "Apple", Colour: "", Weight: null, Depth: undefined, Trim: "   " }),
    ).toEqual([["Brand", "Apple"]]);
  });

  it("renders non-string values rather than dropping them", () => {
    // Free-form JSON: numbers and booleans are as legal here as strings, and a
    // zero or a false is a fact worth showing.
    expect(attributeEntries({ Cores: 8, Refurbished: false, Weight: 0 })).toEqual([
      ["Cores", "8"],
      ["Refurbished", "false"],
      ["Weight", "0"],
    ]);
  });

  it("has nothing to say about a variant with no attributes", () => {
    expect(attributeEntries({})).toEqual([]);
    expect(attributeEntries(undefined)).toEqual([]);
  });
});
