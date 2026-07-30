/**
 * Flow 26 — Media Upload (presigned S3 POST).
 *
 * Large files never travel through the API server. The admin mints a
 * short-lived, size-bounded permission slip for exactly one object key, the
 * browser POSTs the bytes straight to S3, and the *relative path* is then
 * submitted to whichever endpoint owns the record.
 */

/**
 * The five directories `FILE_DIR_CHOICES` accepts. The comparison is an exact
 * string match **including the trailing slash** — `"category_images"` without
 * it is a 400.
 *
 * There are 17 `*_DIR_PATH` settings on the backend but only these five are
 * mintable; a consuming endpoint may accept a path elsewhere, yet no slip can
 * be issued for it.
 */
export const FILE_LOCATIONS = {
  CATEGORY_IMAGES: "category_images/",
  PRODUCT_IMAGES: "product_images/",
  VARIANT_IMAGES: "variant_images/",
  PROFILE_PICTURES: "profile_pictures/",
  SHOP_IMAGES: "shop_images/",
} as const;

export type FileLocation = (typeof FILE_LOCATIONS)[keyof typeof FILE_LOCATIONS];

/** Request body for `POST /superadmin/admin/presigned-url/`. */
export interface PresignedUrlPayload {
  /** Must be exactly one of {@link FILE_LOCATIONS}, trailing slash included. */
  file_location: FileLocation;
  /** Must contain a `.` and must not start with one. The extension is not allow-listed. */
  file_name: string;
  /** Must contain a `/`. Not enforced at upload time — S3 accepts any MIME type. */
  file_type: string;
}

/** The S3 form fields that must be posted *before* the file part. */
export interface PresignedPost {
  /** The S3 bucket endpoint to POST the multipart form to. */
  url: string;
  /** Signed policy fields — send every one, unmodified, ahead of the file. */
  fields: Record<string, string>;
  /**
   * Built from `AWS_S3_CUSTOM_DOMAIN`, while everything is *read back* from
   * `AWS_CLOUDFRONT_DOMAIN` — two different settings. Usable for an immediate
   * optimistic preview, but never persist or display it as the canonical URL.
   */
  file_future_url: string;
}

/** Success body of the presigned-url endpoint. */
export interface PresignedUrlResponse {
  /**
   * The media-root **relative** path — this is the value to submit downstream,
   * because it starts with the directory the consuming serializer validates.
   */
  file_location: string;
  /**
   * Includes the `AWS_MEDIA_ROOT_DIR_NAME` prefix, so it **fails** the
   * downstream prefix check. Never submit this one.
   */
  file_key: string;
  presigned_url: PresignedPost;
  /** The rewritten object name, `{uuid4}_A{base}.{ext}`. */
  file_name: string;
}
