import { afterEach, describe, expect, it, vi } from "vitest";
import { isMediaUploadEnabled, isProductionEnv } from "./appEnv";

afterEach(() => vi.unstubAllEnvs());

describe("isProductionEnv", () => {
  it("is true for exactly 'production'", () => {
    vi.stubEnv("VITE_APP_ENV", "production");
    expect(isProductionEnv()).toBe(true);
  });

  it("tolerates surrounding whitespace, which env files pick up easily", () => {
    vi.stubEnv("VITE_APP_ENV", " production ");
    expect(isProductionEnv()).toBe(true);
  });

  it("is false for the local environment", () => {
    vi.stubEnv("VITE_APP_ENV", "local");
    expect(isProductionEnv()).toBe(false);
  });

  // Fail-closed cases. Each of these is a broken or absent env file, and the
  // required outcome is "no upload happened", never "uploaded to the shared
  // bucket by accident".
  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["whitespace", "   "],
    ["misspelt", "prod"],
    ["wrong case", "Production"],
    ["a near miss", "production-eu"],
  ])("fails closed when VITE_APP_ENV is %s", (_label, value) => {
    vi.stubEnv("VITE_APP_ENV", value as string);
    expect(isProductionEnv()).toBe(false);
  });
});

describe("isMediaUploadEnabled", () => {
  it("tracks the production check", () => {
    vi.stubEnv("VITE_APP_ENV", "production");
    expect(isMediaUploadEnabled()).toBe(true);
    vi.stubEnv("VITE_APP_ENV", "local");
    expect(isMediaUploadEnabled()).toBe(false);
  });
});
