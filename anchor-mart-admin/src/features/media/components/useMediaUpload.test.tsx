import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The presign mutation is mocked rather than driven through the real store: the
 * behaviour under test is "were the bytes sent to S3", and that is decided
 * between the mint and the POST. A real RTK Query round-trip would only add a
 * second network stub to keep in sync.
 */
const unwrap = vi.fn();
const createPresignedUrl = vi.fn(() => ({ unwrap }));
vi.mock("../api/mediaApi", () => ({
  useCreatePresignedUrlMutation: () => [createPresignedUrl],
}));

import { FILE_LOCATIONS } from "../types/media.types";
import { type UploadedFile, useMediaUpload } from "./useMediaUpload";

const SLIP = {
  file_location: "category_images/3f9c_Aphoto.jpg",
  file_key: "media/category_images/3f9c_Aphoto.jpg",
  file_name: "3f9c_Aphoto.jpg",
  presigned_url: {
    url: "https://bucket.s3.ap-south-1.amazonaws.com/",
    fields: { key: "media/category_images/3f9c_Aphoto.jpg", policy: "signed" },
    file_future_url: "https://cdn.example.com/media/category_images/3f9c_Aphoto.jpg",
  },
};

/**
 * Renders the hook, runs one upload, and hands back both.
 *
 * The cast is unavoidable rather than lazy: the assignment happens inside
 * `act`'s callback, which TypeScript cannot see through, so it narrows the
 * declaration to `null` and every property read becomes `never`.
 */
async function runUpload(file: File) {
  const view = renderHook(() => useMediaUpload());
  let uploaded: UploadedFile | null = null;
  await act(async () => {
    uploaded = await view.result.current.upload(file, FILE_LOCATIONS.CATEGORY_IMAGES);
  });
  return { ...view, uploaded: uploaded as UploadedFile | null };
}

/** A file that clears the 1 KB floor the signed policy enforces. */
function imageFile(name = "photo.jpg") {
  return new File(["x".repeat(2048)], name, { type: "image/jpeg" });
}

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  unwrap.mockResolvedValue(SLIP);
  fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 204, text: async () => "" });
  vi.stubGlobal("fetch", fetchSpy);
  // jsdom implements neither, and the local-preview path needs both.
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:local-preview"),
      revokeObjectURL: vi.fn(),
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("useMediaUpload — production", () => {
  beforeEach(() => vi.stubEnv("VITE_APP_ENV", "production"));

  it("mints a slip and POSTs the bytes to S3", async () => {
    const { uploaded } = await runUpload(imageFile());

    expect(createPresignedUrl).toHaveBeenCalledWith({
      file_location: "category_images/",
      file_name: "photo.jpg",
      file_type: "image/jpeg",
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0]).toBe(SLIP.presigned_url.url);
    expect(uploaded).toEqual({
      // `file_location`, never `file_key` — the media/ prefix fails the
      // consuming serializer's directory check (Flow 26 §1).
      path: "category_images/3f9c_Aphoto.jpg",
      previewUrl: SLIP.presigned_url.file_future_url,
      uploaded: true,
    });
  });

  it("sends every signed field before the file part", async () => {
    const { result } = renderHook(() => useMediaUpload());
    await act(async () => {
      await result.current.upload(imageFile(), FILE_LOCATIONS.CATEGORY_IMAGES);
    });

    const body = fetchSpy.mock.calls[0][1].body as FormData;
    // S3 ignores fields that appear after the file, which invalidates the policy.
    expect([...body.keys()]).toEqual(["key", "policy", "file"]);
  });
});

describe("useMediaUpload — outside production", () => {
  beforeEach(() => vi.stubEnv("VITE_APP_ENV", "local"));

  it("mints the slip but never sends the bytes", async () => {
    const { uploaded } = await runUpload(imageFile());

    expect(createPresignedUrl).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(uploaded).toMatchObject({
      path: "category_images/3f9c_Aphoto.jpg",
      uploaded: false,
    });
  });

  it("previews from a local blob, not the S3 URL that would 404", async () => {
    const { uploaded } = await runUpload(imageFile());
    expect(uploaded?.previewUrl).toBe("blob:local-preview");
  });

  it("reports the gate through uploadsToStorage", () => {
    const { result } = renderHook(() => useMediaUpload());
    expect(result.current.uploadsToStorage).toBe(false);
  });

  it("releases its blob URLs on unmount", async () => {
    const { unmount } = await runUpload(imageFile());
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-preview");
  });
});

describe("useMediaUpload — client-side validation", () => {
  // Nothing server-side checks type on the presigned path (Flow 26 §3), so a
  // rejection here must happen before a slip is even minted.
  beforeEach(() => vi.stubEnv("VITE_APP_ENV", "production"));

  it.each([
    ["an unsupported type", new File(["x".repeat(2048)], "notes.pdf", { type: "application/pdf" })],
    ["a file under the 1 KB floor", new File(["tiny"], "icon.png", { type: "image/png" })],
    ["a name with no extension", new File(["x".repeat(2048)], "photo", { type: "image/jpeg" })],
  ])("rejects %s without minting a slip", async (_label, file) => {
    const { uploaded, result } = await runUpload(file);

    expect(uploaded).toBeNull();
    expect(createPresignedUrl).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });
});
