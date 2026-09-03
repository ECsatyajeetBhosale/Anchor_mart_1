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
import type { FileLocation } from "../types/media.types";
import { useMediaUpload } from "./useMediaUpload";

export interface ImageListFieldProps {
  /** Current list of stored image paths (controlled). */
  values: string[];
  onChange: (next: string[]) => void;
  fileLocation: FileLocation;
  emptyHint?: string;
  disabled?: boolean;
  /**
   * Viewable URL for each stored path, so existing images can be **seen** and
   * not just counted.
   *
   * Paths and URLs are asymmetric here (Flow 26): a write takes
   * `product_images/x.jpg`, a read hands back the absolute CloudFront URL. The
   * field holds paths because that is what submits, so the caller supplies the
   * read side from whatever the detail response returned. Freshly uploaded
   * images fill themselves in — the presign slip carries their future URL.
   */
  previewUrls?: Record<string, string>;
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

/**
 * Multi-image editor for records that hold a `string[]` of stored paths
 * (products, variants).
 *
 * A gallery of tiles: each is the picture and a way to remove it, and nothing
 * else. The stored paths are held and submitted but never shown, so there is no
 * text box to type one into — an admin adds images by uploading them and
 * removes them with the tile's own button.
 *
 * The cost is the same one the single-image field carries: only 5 of the
 * backend's 17 media directories can be minted a slip, so images belonging to
 * the other 12 cannot be set here at all, and an existing path cannot be
 * corrected by hand — only removed and re-uploaded.
 *
 * Files are uploaded **one at a time, sequentially**. Each needs its own signed
 * slip, and firing N mints concurrently only trades a readable failure for a
 * partially-populated list when one of them is rejected.
 */
export function ImageListField({
  values,
  onChange,
  fileLocation,
  emptyHint = "No images yet — upload one to get started.",
  disabled,
  previewUrls,
}: ImageListFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, error, uploadsToStorage, canUpload } = useMediaUpload();
  /**
   * Paths added this session whose bytes never left the browser. Tracked as a
   * set of paths rather than a count so the warning follows the actual tiles —
   * removing the offending one clears it, and it cannot outlive what it
   * describes.
   */
  const [unsentPaths, setUnsentPaths] = useState<Set<string>>(new Set());
  const unsentShown = values.filter((v) => unsentPaths.has(v)).length;
  /**
   * Preview URLs for images uploaded in this session. The presign slip already
   * carries `file_future_url`, so a just-uploaded image is visible immediately
   * rather than waiting for the record to be saved and read back.
   */
  const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>({});
  /** The image being viewed full size, or `null` when the lightbox is closed. */
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  const previewFor = (path: string) =>
    mediaSrc(uploadedUrls[path] ?? previewUrls?.[path]) || undefined;

  const removeAt = (index: number) => onChange(values.filter((_, i) => i !== index));

  const handleFiles = async (files: FileList) => {
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const result = await upload(file, fileLocation);
      // Stop at the first failure — `error` from the hook explains why, and the
      // successful ones so far are still kept.
      if (!result) break;
      uploaded.push(result.path);
      if (result.previewUrl) {
        setUploadedUrls((prev) => ({ ...prev, [result.path]: result.previewUrl }));
      }
      if (!result.uploaded) {
        setUnsentPaths((prev) => new Set(prev).add(result.path));
      }
    }
    if (uploaded.length > 0) onChange([...values, ...uploaded]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-2.5">
      {values.length === 0 && <div className="fg-hint">{emptyHint}</div>}

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: ordered list, values may repeat
            <div key={index} className="group relative">
              {/*
                Clicking opens the image full size in the same lightbox the chat
                pane uses — at 72px a row of product photos is a row of coloured
                squares, and "is this the right one" is not answerable there.

                Only a tile with an image in it is a button: an empty one has
                nothing to show. The path rides on the tile as a tooltip either
                way, which is what identifies an image whose read URL the caller
                didn't supply and which therefore renders as an empty frame.
              */}
              {previewFor(value) ? (
                <button
                  type="button"
                  title={value || undefined}
                  onClick={() => setPreview({ src: previewFor(value) as string, alt: value })}
                  className="flex h-[72px] w-[72px] cursor-zoom-in items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-md)] bg-[var(--surface-input)]"
                >
                  <img
                    src={previewFor(value)}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ) : (
                <div
                  title={value || undefined}
                  className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-md)] bg-[var(--surface-input)]"
                >
                  <IconPhoto size={22} className="text-[var(--t4)]" />
                </div>
              )}

              {/*
                Sits on the tile rather than beside it, so a row of images stays
                a row of images. Always rendered, not revealed on hover: the
                only action here is removal, and a control that appears only
                under a mouse is not reachable by touch.
              */}
              <button
                type="button"
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-md)] bg-[var(--surface)] text-[var(--t3)] shadow-[var(--sh-xs)] transition-colors hover:border-[var(--danger-text)] hover:text-[var(--danger-text)] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => removeAt(index)}
                disabled={disabled || isUploading}
                title={MESSAGES.MEDIA.REMOVE_IMAGE}
                aria-label={MESSAGES.MEDIA.REMOVE_IMAGE}
              >
                <IconTrash size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {canUpload && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            <IconUpload size={16} />
            {isUploading ? "Uploading…" : "Upload Images"}
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
        }}
      />

      {error && <div className="text-[11px] font-semibold text-[var(--danger-text)]">{error}</div>}

      {/* Same rule line as the single-image field: what will be accepted, said
          before the pick rather than after it. */}
      <div className="fg-hint text-[11px]">
        {canUpload ? ACCEPTED_HINT : MESSAGES.MEDIA.NO_PERMISSION}
      </div>

      {/* Same two-state notice as the single-image field: the standing rule
          until something is actually affected by it, then the warning. */}
      <ImageLightbox
        src={preview?.src ?? null}
        alt={preview?.alt}
        onClose={() => setPreview(null)}
      />

      {!uploadsToStorage &&
        (unsentShown > 0 ? (
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

export default ImageListField;
