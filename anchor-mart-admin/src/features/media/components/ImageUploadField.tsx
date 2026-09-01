import { Input } from "@/components/ui/input";
import { mediaSrc } from "@/lib/mediaUrl";
import { MESSAGES } from "@/lib/messages";
import { IconPhoto, IconTrash, IconUpload } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { toStoredPath } from "../lib/storagePath";
import type { FileLocation } from "../types/media.types";
import { type UploadedFile, useMediaUpload } from "./useMediaUpload";

export interface ImageUploadFieldProps {
  /** The stored media-root relative path (or an absolute URL on older records). */
  value: string;
  onChange: (path: string) => void;
  /** Which mintable directory this image belongs in. */
  fileLocation: FileLocation;
  /** Placeholder for the manual path box. */
  placeholder?: string;
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
   * Matched against `value` rather than trusted outright, so hand-editing the
   * path drops the now-wrong thumbnail instead of leaving it asserting that the
   * new path is that picture.
   */
  previewUrl?: string;
}

/** Is this value already a full URL we can render directly? */
function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Single-image picker backed by the Flow 26 presigned handshake.
 *
 * The manual path box stays visible on purpose. Only 5 of the backend's 17
 * media directories can be minted a slip, older records already hold
 * hand-entered paths, and an admin sometimes needs to point at a file uploaded
 * elsewhere — so uploading is the easy path, not the only one.
 */
export function ImageUploadField({
  value,
  onChange,
  fileLocation,
  placeholder = `${fileLocation}example.jpg`,
  disabled,
  previewUrl,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, error } = useMediaUpload();
  /**
   * The last file uploaded from this field. An arbitrary stored path can't be
   * turned into a URL client-side (the CloudFront domain isn't exposed to the
   * frontend), so a fresh upload is the only time we can show a thumbnail
   * before the record is saved and read back.
   *
   * Keeping the path alongside the URL is what makes the preview self-correct:
   * if `value` is edited by hand — or the drawer is reopened on a different
   * record — it no longer matches and the stale thumbnail disappears on its own.
   */
  const [lastUpload, setLastUpload] = useState<UploadedFile | null>(null);

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
      <div className="flex items-start gap-3">
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-md)] bg-[var(--surface-input)]">
          {shownPreview ? (
            <img src={shownPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <IconPhoto size={22} className="text-[var(--t4)]" />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              <IconUpload size={16} />
              {isUploading ? "Uploading…" : value ? "Replace Image" : "Upload Image"}
            </button>
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

          <Input
            className="mono text-[12px]"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || isUploading}
          />
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {error && <div className="text-[11px] font-semibold text-[var(--danger-text)]">{error}</div>}
    </div>
  );
}

export default ImageUploadField;
