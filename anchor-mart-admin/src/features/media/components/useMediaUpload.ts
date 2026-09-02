import { getApiMessage } from "@/lib/apiError";
import { isMediaUploadEnabled } from "@/lib/appEnv";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCreatePresignedUrlMutation } from "../api/mediaApi";
import {
  MediaUploadError,
  uploadToS3,
  validateFileName,
  validateFileType,
  validateUploadSize,
} from "../lib/s3Upload";
import type { FileLocation } from "../types/media.types";

/** What a completed upload yields. */
export interface UploadedFile {
  /** The media-root relative path to submit downstream (`category_images/…`). */
  path: string;
  /**
   * A URL good enough to preview the file right now. Built from
   * `AWS_S3_CUSTOM_DOMAIN` rather than the CloudFront domain everything is read
   * back from, so it is **not** the canonical display URL — don't persist it.
   *
   * Outside production this is a local `blob:` URL of the picked file instead,
   * because the S3 object was never written and its URL would 404.
   */
  previewUrl: string;
  /**
   * Whether the bytes actually reached S3.
   *
   * `false` outside production: the slip is still minted and `path` is a real,
   * submittable value, but no object exists behind it. Callers surface this so
   * an admin is told at upload time, rather than discovering a broken image
   * after the record is saved. See {@link isMediaUploadEnabled}.
   */
  uploaded: boolean;
}

export interface UseMediaUploadResult {
  /** Runs the full mint → S3 POST handshake. Returns null if it failed. */
  upload: (file: File, fileLocation: FileLocation) => Promise<UploadedFile | null>;
  isUploading: boolean;
  /** Last failure, cleared when a new upload starts. */
  error: string | null;
  clearError: () => void;
  /**
   * False outside production, where the S3 POST is skipped. Exposed so a field
   * can explain itself before the user picks a file, not only after.
   */
  uploadsToStorage: boolean;
}

/**
 * Drives the Flow 26 three-step handshake from a component.
 *
 * Step 3 (submitting the path to the owning endpoint) is deliberately *not*
 * here — that belongs to whichever form owns the record, and its serializer is
 * what validates the directory prefix.
 */
export function useMediaUpload(): UseMediaUploadResult {
  const [createPresignedUrl] = useCreatePresignedUrlMutation();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards against a second upload starting while one is in flight — the
  // isUploading state alone updates too late to catch a double click.
  const inFlight = useRef(false);
  // `blob:` URLs minted for local previews. They pin the file in memory until
  // revoked, so the hook owns them and releases them when it unmounts.
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  const upload = useCallback(
    async (file: File, fileLocation: FileLocation): Promise<UploadedFile | null> => {
      if (inFlight.current) return null;

      // Fail fast on every rule we can check without a round-trip. Type is one
      // of them by necessity: nothing on the presigned path validates it
      // server-side (Flow 26 §3), so this is the only place it is checked.
      const sizeError = validateUploadSize(file);
      const nameError = validateFileName(file.name);
      const typeError = validateFileType(file);
      if (sizeError || nameError || typeError) {
        setError(sizeError ?? nameError ?? typeError);
        return null;
      }

      inFlight.current = true;
      setIsUploading(true);
      setError(null);
      try {
        const slip = await createPresignedUrl({
          file_location: fileLocation,
          file_name: file.name,
          // Browsers leave `type` empty for unknown extensions; the backend only
          // checks the value contains a "/", and S3 accepts any MIME anyway.
          file_type: file.type || "application/octet-stream",
        }).unwrap();

        // The one line this whole gate exists for. Outside production the slip
        // is minted but the bytes stay in the browser, so no developer's test
        // file lands in the shared bucket.
        //
        // The consequence is deliberate and was chosen knowingly: `path` below
        // is a real path to an object that does not exist, so a record saved
        // locally reads back as a broken image until it is re-saved against
        // production. Callers show the `uploaded: false` warning for exactly
        // this reason.
        if (!isMediaUploadEnabled()) {
          const localPreview = URL.createObjectURL(file);
          objectUrls.current.push(localPreview);
          return { path: slip.file_location, previewUrl: localPreview, uploaded: false };
        }

        await uploadToS3(slip.presigned_url, file);

        // `file_location` — never `file_key`, which carries the media-root
        // prefix and would fail the consuming serializer's prefix check.
        return {
          path: slip.file_location,
          previewUrl: slip.presigned_url.file_future_url,
          uploaded: true,
        };
      } catch (err) {
        setError(
          err instanceof MediaUploadError
            ? err.message
            : (getApiMessage(err) ?? "Upload failed. Please try again."),
        );
        return null;
      } finally {
        inFlight.current = false;
        setIsUploading(false);
      }
    },
    [createPresignedUrl],
  );

  return {
    upload,
    isUploading,
    error,
    clearError: () => setError(null),
    uploadsToStorage: isMediaUploadEnabled(),
  };
}
