import { ImageLightbox } from "@/components/ui/image-lightbox";
import { mediaSrc } from "@/lib/mediaUrl";
import { MESSAGES } from "@/lib/messages";
import { IconAlertTriangle, IconPhoto, IconTrash, IconUpload } from "@tabler/icons-react";
import { useRef, useState } from "react";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  IMAGE_ACCEPT,
  MAX_UPLOAD_BYTES,
  MIN_UPLOAD_BYTES,
  formatBytes,
} from "../lib/s3Upload";
import { toStoredPath } from "../lib/storagePath";
import type { FileLocation } from "../types/media.types";
import { type UploadedFile, useMediaUpload } from "./useMediaUpload";

export interface ImageUploadFieldProps {
  /** The stored media-root relative path (or an absolute URL on older records). */
  value: string;
  onChange: (path: string) => void;
  /** Which mintable directory this image belongs in. */
  fileLocation: FileLocation;
  disabled?: boolean;
  /**
   * Viewable URL for the image `value` currently names, so a saved record can
   * be **seen** and not just read as a filename.
   *
   * Paths and URLs are asymmetric here (Flow 26): a write takes
   * `category_images/x.jpg`, a read hands back the absolute URL. The field holds
   * the path because that is what submits, which used to leave the preview box
   * empty on every existing record — the thumbnail only ever appeared for an
   * image uploaded in the same session. The caller has the read side already, so
   * it supplies it rather than the field trying to rebuild a URL it cannot know
   * (the CloudFront domain is not exposed to the frontend).
   *
   * Matched against `value` rather than trusted outright, so replacing the image
   * drops the now-wrong thumbnail instead of leaving it asserting that the new
   * path is that picture.
   */
  previewUrl?: string;
}

/**
 * The rule line under the picker — accepted types and the size window — built
 * from the same constants the upload is checked against, so it cannot drift
 * from what actually passes.
 */
const ACCEPTED_HINT = MESSAGES.MEDIA.ACCEPTED_HINT(
  ALLOWED_IMAGE_EXTENSIONS.map((ext) => ext.toUpperCase()).join(", "),
  formatBytes(MIN_UPLOAD_BYTES),
  formatBytes(MAX_UPLOAD_BYTES),
);

/** Is this value already a full URL we can render directly? */
function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Single-image picker backed by the Flow 26 presigned handshake.
 *
 * The field is the **picture and a way to remove it** — the stored path it
 * actually submits is held but never shown. There is no text box to type a path
 * into and no link out to the object: an admin picks a file or clears the one
 * that is there.
 *
 * The cost of that is worth stating, because it is not recoverable from inside
 * this component: only 5 of the backend's 17 media directories can be minted a
 * slip, so an image belonging to any of the other 12 can no longer be set here
 * at all, and a path on an older record can no longer be corrected by hand.
 * Those cases now need the API directly.
 */
export function ImageUploadField({
  value,
  onChange,
  fileLocation,
  disabled,
  previewUrl,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, error, uploadsToStorage, canUpload } = useMediaUpload();
  /**
   * The last file uploaded from this field. An arbitrary stored path can't be
   * turned into a URL client-side (the CloudFront domain isn't exposed to the
   * frontend), so a fresh upload is the only time we can show a thumbnail
   * before the record is saved and read back.
   *
   * Keeping the path alongside the URL is what makes the preview self-correct:
   * if the drawer is reopened on a different record it no longer matches, and
   * the stale thumbnail disappears on its own.
   */
  const [lastUpload, setLastUpload] = useState<UploadedFile | null>(null);
  /** The image being viewed full size, or `null` when the lightbox is closed. */
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const result = await upload(file, fileLocation);
    if (result) {
      setLastUpload(result);
      onChange(result.path);
    }
    // Clear the input so re-picking the same file fires a change event again.
    if (inputRef.current) inputRef.current.value = "";
  };

  /**
   * The caller's URL, but only while it still describes `value`. Both sides are
   * normalised to a stored path first: the two are different renderings of the
   * same file, so comparing them raw would never match.
   */
  const storedPreview =
    previewUrl && value && toStoredPath(previewUrl) === toStoredPath(value) ? previewUrl : null;

  const shownPreview =
    lastUpload && lastUpload.path === value
      ? lastUpload.previewUrl
      : isAbsoluteUrl(value)
        ? mediaSrc(value)
        : storedPreview
          ? mediaSrc(storedPreview)
          : null;

  const clear = () => {
    setLastUpload(null);
    onChange("");
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        {/*
          Clicking opens the image full size in the same lightbox the chat pane
          uses — a 72px square answers "is something attached", not "is this the
          right picture".

          Only a frame with an image in it is a button: an empty one has nothing
          to show, and a control that opens nothing is worse than no control.
          The path rides on the frame as a tooltip either way, which is what
          identifies a record whose image is set but whose read URL the caller
          didn't supply, and which therefore renders empty.
        */}
        {shownPreview ? (
          <button
            type="button"
            title={value || undefined}
            onClick={() => setPreview(shownPreview)}
            className="flex h-[72px] w-[72px] shrink-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-md)] bg-[var(--surface-input)]"
          >
            <img src={shownPreview} alt="" className="h-full w-full object-cover" />
          </button>
        ) : (
          <div
            title={value || undefined}
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-md)] bg-[var(--surface-input)]"
          >
            <IconPhoto size={22} className="text-[var(--t4)]" />
          </div>
        )}

        <div className="flex items-center gap-2">
          {/*
            Withdrawn rather than shown disabled when the session lacks
            `media.upload`: a greyed button invites a click that can never work.
          */}
          {canUpload && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              <IconUpload size={16} />
              {isUploading ? "Uploading…" : value ? "Replace Image" : "Upload Image"}
            </button>
          )}
          {value && (
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon"
              onClick={clear}
              disabled={disabled || isUploading}
              title={MESSAGES.MEDIA.REMOVE_IMAGE}
            >
              <IconTrash size={16} />
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {error && <div className="text-[11px] font-semibold text-[var(--danger-text)]">{error}</div>}

      {/* What will be accepted, said before the pick rather than after it —
          the 1 KB floor in particular is rejected by S3 as a 403 that reads
          like an auth failure. Replaced by the reason the button is gone when
          this session cannot upload at all. */}
      <div className="fg-hint text-[11px]">
        {canUpload ? ACCEPTED_HINT : MESSAGES.MEDIA.NO_PERMISSION}
      </div>

      {/*
        Two different statements, and only one of them is ever true.

        Before a file is picked, the rule is stated flatly so the admin knows
        the button will not do what it says. After one is picked, it becomes a
        warning about *this* record — the path about to be saved has nothing
        behind it. Anchored to `lastUpload.path === value` so it clears the
        moment the image is replaced or removed, exactly like the thumbnail.
      */}
      <ImageLightbox src={preview} alt={value} onClose={() => setPreview(null)} />

      {!uploadsToStorage &&
        (lastUpload && !lastUpload.uploaded && lastUpload.path === value ? (
          <div className="flex items-start gap-1.5 text-[11px] font-semibold text-[var(--amber-700)]">
            <IconAlertTriangle size={13} className="mt-px shrink-0" />
            <span>
              {MESSAGES.MEDIA.NOT_UPLOADED} {MESSAGES.MEDIA.NOT_UPLOADED_HINT}
            </span>
          </div>
        ) : (
          <div className="fg-hint text-[11px]">{MESSAGES.MEDIA.STORAGE_OFF}</div>
        ))}
    </div>
  );
}

export default ImageUploadField;
