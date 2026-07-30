import { getApiMessage } from "@/lib/apiError";
import { useCallback, useRef, useState } from "react";
import { useCreatePresignedUrlMutation } from "../api/mediaApi";
import {
  MediaUploadError,
  uploadToS3,
  validateFileName,
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
   */
  previewUrl: string;
}

export interface UseMediaUploadResult {
  /** Runs the full mint → S3 POST handshake. Returns null if it failed. */
  upload: (file: File, fileLocation: FileLocation) => Promise<UploadedFile | null>;
  isUploading: boolean;
  /** Last failure, cleared when a new upload starts. */
  error: string | null;
  clearError: () => void;
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

  const upload = useCallback(
    async (file: File, fileLocation: FileLocation): Promise<UploadedFile | null> => {
      if (inFlight.current) return null;

      // Fail fast on the two rules we can check without a round-trip.
      const sizeError = validateUploadSize(file);
      const nameError = validateFileName(file.name);
      if (sizeError || nameError) {
        setError(sizeError ?? nameError);
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

        await uploadToS3(slip.presigned_url, file);

        // `file_location` — never `file_key`, which carries the media-root
        // prefix and would fail the consuming serializer's prefix check.
        return { path: slip.file_location, previewUrl: slip.presigned_url.file_future_url };
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

  return { upload, isUploading, error, clearError: () => setError(null) };
}
