import type { PresignedPost } from "../types/media.types";

/**
 * The size window S3 enforces via the signed policy's `content-length-range`.
 * Checked client-side too so an oversized file fails instantly with a readable
 * message instead of after a full upload and an XML `<Error>` body.
 */
export const MIN_UPLOAD_BYTES = 1024; // 1 KB
export const MAX_UPLOAD_BYTES = 157_286_400; // 150 MB

/** Thrown for anything that goes wrong between picking a file and S3 accepting it. */
export class MediaUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaUploadError";
  }
}

/** Human-readable byte size for error copy, e.g. "1 KB" / "150 MB". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${Math.round(bytes / 1_048_576)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Rejects a file the signed policy would reject anyway.
 * Returns an error message, or `null` when the file is acceptable.
 */
export function validateUploadSize(file: File): string | null {
  if (file.size < MIN_UPLOAD_BYTES) {
    return `File is too small — the minimum is ${formatBytes(MIN_UPLOAD_BYTES)}.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is too large — the maximum is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }
  return null;
}

/**
 * Image types the panel accepts.
 *
 * Nothing server-side enforces this on the presigned path (Flow 26 §3): the
 * signed policy's only Content-Type condition is `["starts-with", "", ""]`,
 * which matches every MIME type, and the `file_type` we declare is a form
 * default rather than a constraint. There is no extension allow-list, no
 * sniffing and no transcode either — so an `.exe` renamed to `.jpg`, or even
 * left as `.exe`, would be accepted and stored.
 *
 * This list is therefore the *only* type check on the whole path. It is a
 * usability guard, not a security control — a determined caller can still POST
 * anything to a minted slip — but it stops the ordinary mistake of putting a
 * PDF where a product photo goes.
 */
export const ALLOWED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"] as const;

/**
 * The picker's `accept` filter, derived from the same list the upload is
 * checked against.
 *
 * It used to be `image/*`, which is wider than what we accept: the OS dialog
 * offered SVG, BMP, HEIC and TIFF, and the file was only rejected after the
 * admin had chosen it. Narrowing the dialog turns that error into a file that
 * simply cannot be picked. Still a convenience, never the authority — a
 * determined picker can always switch the dialog to "all files", which is why
 * {@link validateFileType} runs regardless.
 */
export const IMAGE_ACCEPT = ALLOWED_IMAGE_EXTENSIONS.map((ext) => `.${ext}`).join(",");

/** Lowercase extension without the dot, or "" when the name has none. */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/**
 * Rejects a file whose extension is not an image we accept.
 *
 * Checked against the **extension**, not `file.type`: browsers leave `type`
 * empty for unrecognised files, and it is trivially wrong for a renamed one, so
 * the extension is what the stored object will actually be read back as.
 */
export function validateFileType(file: File): string | null {
  const ext = extensionOf(file.name);
  if (!ext) return "File needs an extension (e.g. .jpg).";
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext as (typeof ALLOWED_IMAGE_EXTENSIONS)[number])) {
    return `${ext.toUpperCase()} files aren't supported — use ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}.`;
  }
  return null;
}

/**
 * The backend requires a `file_name` containing a `.` that doesn't start with
 * one, so a dotfile or an extension-less name is rejected before we spend a
 * round-trip on it.
 */
export function validateFileName(name: string): string | null {
  if (name.startsWith(".")) return "File name can't start with a dot.";
  if (!name.includes(".")) return "File needs an extension (e.g. .jpg).";
  return null;
}

/**
 * POST the bytes directly to S3 using a minted slip.
 *
 * Two details are load-bearing:
 *  - **Every signed field goes in first, the file part last.** S3 ignores form
 *    fields that appear after the file, which invalidates the policy.
 *  - **No `Authorization` header.** This request must not carry the app's DRF
 *    token — the signature in the form *is* the credential, and a stray auth
 *    header makes S3 reject it. That's why this is a bare `fetch` rather than an
 *    RTK Query endpoint (which would attach one via `prepareHeaders`).
 *
 * S3 answers `204 No Content` on success.
 */
export async function uploadToS3(presigned: PresignedPost, file: File): Promise<void> {
  const form = new FormData();
  for (const [key, value] of Object.entries(presigned.fields)) {
    form.append(key, value);
  }
  form.append("file", file);

  let response: Response;
  try {
    response = await fetch(presigned.url, { method: "POST", body: form });
  } catch {
    // A network-level failure here is usually a CORS rule missing on the bucket
    // rather than the user being offline, so say what to check.
    throw new MediaUploadError(
      "Couldn't reach the storage bucket. Check your connection and the bucket's CORS rules.",
    );
  }

  if (!response.ok) {
    // S3 replies with an XML <Error> body; surface its <Message> when present.
    const body = await response.text().catch(() => "");
    const message = /<Message>([^<]+)<\/Message>/.exec(body)?.[1];
    if (message) throw new MediaUploadError(message);

    // A 403 here reads as an auth problem and is almost never one — the slip is
    // the credential, and it fails for exactly three reasons (Flow 26 §2). Say
    // which three, because "forbidden" sends people to look at their login.
    if (response.status === 403) {
      throw new MediaUploadError(
        `Storage rejected the upload. The file may be outside the ${formatBytes(
          MIN_UPLOAD_BYTES,
        )}–${formatBytes(MAX_UPLOAD_BYTES)} range, or the upload slip expired — try again.`,
      );
    }
    throw new MediaUploadError(`Upload was rejected by storage (HTTP ${response.status}).`);
  }
}
