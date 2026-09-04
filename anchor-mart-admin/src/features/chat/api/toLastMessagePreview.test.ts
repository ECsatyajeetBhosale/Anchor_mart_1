import { MESSAGES } from "@/lib/messages";
import { describe, expect, it } from "vitest";
import { toLastMessagePreview } from "./chatApi";

const T = MESSAGES.CHAT.THREADS;

/**
 * The preview is the only thing standing between an attachment-only thread and
 * a row reading "No messages yet" — a claim the admin can see is false the
 * moment they open it. The four inboxes (§4.1–4.3) are separate serializers, so
 * these cases are about tolerating the spread between them, not about one shape.
 */
describe("toLastMessagePreview", () => {
  it("prefers a caption over naming the attachment, but still reports the kind", () => {
    // The icon has to show beside a captioned photo too — the caption is the
    // better text, but "this is a photo" is no less true for it.
    expect(
      toLastMessagePreview({ content: "here it is", message_type: "image", media: "a.png" }, {}),
    ).toEqual({ text: "here it is", kind: "image" });
  });

  it("names an image message that carries no caption", () => {
    expect(
      toLastMessagePreview({ content: "", message_type: "image", media: "a.png" }, {}),
    ).toEqual({ text: T.IMAGE_PREVIEW, kind: "image" });
  });

  it("names a file message that carries no caption", () => {
    expect(toLastMessagePreview({ content: "", message_type: "file", media: "a.pdf" }, {})).toEqual(
      {
        text: T.FILE_PREVIEW,
        kind: "file",
      },
    );
  });

  it("falls back to the media URL when no type is declared", () => {
    // Extension decides, case-insensitively, and a query string must not defeat it.
    expect(toLastMessagePreview({ media: "https://cdn/x/photo.JPEG?v=2" }, {})).toEqual({
      text: T.IMAGE_PREVIEW,
      kind: "image",
    });
    expect(toLastMessagePreview({ media: "https://cdn/x/invoice.pdf" }, {})).toEqual({
      text: T.FILE_PREVIEW,
      kind: "file",
    });
  });

  it("reads the alternative key spellings a differently-shaped row may use", () => {
    expect(toLastMessagePreview({ type: "image" }, {}).kind).toBe("image");
    expect(toLastMessagePreview({ image_url: "x.webp" }, {}).kind).toBe("image");
    expect(toLastMessagePreview({ attachment: "x.pdf" }, {}).kind).toBe("file");
  });

  it("reads a flat row when last_message is absent entirely", () => {
    expect(toLastMessagePreview(null, { last_message_type: "image" })).toEqual({
      text: T.IMAGE_PREVIEW,
      kind: "image",
    });
    expect(toLastMessagePreview(null, { latest_message: "hello" })).toEqual({
      text: "hello",
      kind: "text",
    });
  });

  it("returns empty text for a genuinely empty thread, so the row can say so", () => {
    expect(toLastMessagePreview(null, {})).toEqual({ text: "", kind: "text" });
    // A bare string is the shape that produced the original bug: every lookup
    // reads "" and the row is indistinguishable from one with no messages.
    expect(toLastMessagePreview("", {})).toEqual({ text: "", kind: "text" });
  });
});
