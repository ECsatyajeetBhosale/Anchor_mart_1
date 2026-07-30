/** The media-root segment CloudFront/S3 read URLs carry, but write payloads must not. */
const MEDIA_SEGMENT = "/media/";

/**
 * Converts a stored image reference back to the **media-root relative path**
 * that write endpoints accept.
 *
 * Images are asymmetric across read and write (Flow 26). A write takes
 * `variant_images/uuid_Aname.jpg`, and the consuming serializer's
 * `validate_<field>` rejects anything that doesn't start with that directory.
 * A read hands back the CloudFront URL —
 * `https://cdn…/media/variant_images/uuid_Aname.jpg` — so feeding a read value
 * straight into an update fails that prefix check with a 400.
 *
 * Anything already relative passes through unchanged, so this is safe to apply
 * to freshly uploaded paths as well as re-read ones.
 */
export function toStoredPath(value: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";

  const idx = trimmed.indexOf(MEDIA_SEGMENT);
  if (idx >= 0) return trimmed.slice(idx + MEDIA_SEGMENT.length);

  // Relative already — drop a leading slash or a bare `media/` prefix, both of
  // which would fail the same directory check.
  return trimmed.replace(/^\/+/, "").replace(/^media\//, "");
}
