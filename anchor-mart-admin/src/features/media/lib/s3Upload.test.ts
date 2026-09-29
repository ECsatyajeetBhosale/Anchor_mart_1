import { describe, expect, it } from "vitest";
import { safeUploadName, uploadMimeType } from "./s3Upload";

describe("safeUploadName", () => {
  it("keeps an ordinary name", () => {
    expect(safeUploadName("photo.jpg")).toBe("photo.jpg");
  });

  it("drops path segments and the backend's forbidden `..`", () => {
    expect(safeUploadName("../my photo..v2.JPG")).toBe("my_photo_v2.JPG");
    expect(safeUploadName("C:\\pics\\a.png")).toBe("a.png");
    expect(safeUploadName("x.y.z.webp")).not.toContain("..");
  });

  it("never returns an empty stem", () => {
    expect(safeUploadName("....png")).toBe("file.png");
  });
});

describe("uploadMimeType", () => {
  it("derives the allow-listed type from the extension", () => {
    expect(uploadMimeType("a.JPG")).toBe("image/jpeg");
    expect(uploadMimeType("a.jpeg")).toBe("image/jpeg");
    expect(uploadMimeType("a.png")).toBe("image/png");
    expect(uploadMimeType("a.webp")).toBe("image/webp");
    expect(uploadMimeType("a.gif")).toBe("image/gif");
  });
});
