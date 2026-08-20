import { afterEach, describe, expect, it, vi } from "vitest";

const NGROK = "https://4a58-103-31-41-155.ngrok-free.app";
const S3 = "https://anchormart-bucket.s3.ap-south-1.amazonaws.com";

/**
 * `BACKEND_ORIGIN` is resolved once at import time, so each case re-imports the
 * module under the env it wants rather than mutating it after the fact.
 */
async function load(base: string | undefined, dev = true) {
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", base ?? "");
  vi.stubEnv("DEV", dev);
  return (await import("./mediaUrl")).mediaSrc;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("mediaSrc", () => {
  it("strips the backend origin so the dev proxy handles the request", async () => {
    const mediaSrc = await load(`${NGROK}/api`);
    expect(mediaSrc(`${NGROK}/media/product_images/bottle.jpg`)).toBe(
      "/media/product_images/bottle.jpg",
    );
  });

  it("keeps the query string, which signed URLs depend on", async () => {
    const mediaSrc = await load(`${NGROK}/api`);
    expect(mediaSrc(`${NGROK}/media/x.jpg?v=2`)).toBe("/media/x.jpg?v=2");
  });

  /**
   * The reason this matches on origin rather than on a `/media/` path: S3 and
   * CloudFront URLs carry that path too, and they are reachable from the
   * browser directly. Routing them at the Django proxy would turn a working
   * image into a 404.
   */
  it("leaves other hosts alone, including S3 media paths", async () => {
    const mediaSrc = await load(`${NGROK}/api`);
    expect(mediaSrc(`${S3}/media/product_images/bottle.jpg`)).toBe(
      `${S3}/media/product_images/bottle.jpg`,
    );
  });

  it("passes through blob previews and relative paths untouched", async () => {
    const mediaSrc = await load(`${NGROK}/api`);
    expect(mediaSrc("blob:http://localhost:3000/9f2c-uuid")).toBe(
      "blob:http://localhost:3000/9f2c-uuid",
    );
    expect(mediaSrc("/media/already/relative.jpg")).toBe("/media/already/relative.jpg");
  });

  it("is a no-op in a production build — there is no proxy there", async () => {
    const mediaSrc = await load(`${NGROK}/api`, false);
    expect(mediaSrc(`${NGROK}/media/x.jpg`)).toBe(`${NGROK}/media/x.jpg`);
  });

  it("rewrites nothing when the base URL is missing or unparseable", async () => {
    expect((await load(undefined))(`${NGROK}/media/x.jpg`)).toBe(`${NGROK}/media/x.jpg`);
    expect((await load("/api"))(`${NGROK}/media/x.jpg`)).toBe(`${NGROK}/media/x.jpg`);
  });

  it("returns an empty string for a missing value, so callers can test it", async () => {
    const mediaSrc = await load(`${NGROK}/api`);
    expect(mediaSrc(undefined)).toBe("");
    expect(mediaSrc(null)).toBe("");
    expect(mediaSrc("   ")).toBe("");
  });

  /** Non-media paths on the backend are left absolute — only media is proxied. */
  it("only rewrites paths the /media proxy actually serves", async () => {
    const mediaSrc = await load(`${NGROK}/api`);
    expect(mediaSrc(`${NGROK}/static/logo.png`)).toBe(`${NGROK}/static/logo.png`);
  });
});
