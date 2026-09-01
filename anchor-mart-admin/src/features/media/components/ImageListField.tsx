import { Input } from "@/components/ui/input";
import { mediaSrc } from "@/lib/mediaUrl";
import { MESSAGES } from "@/lib/messages";
import { IconPhoto, IconPlus, IconTrash, IconUpload } from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { FileLocation } from "../types/media.types";
import { useMediaUpload } from "./useMediaUpload";

export interface ImageListFieldProps {
  /** Current list of stored image paths (controlled). */
  values: string[];
  onChange: (next: string[]) => void;
  fileLocation: FileLocation;
  placeholder?: string;
  emptyHint?: string;
  disabled?: boolean;
  /**
   * Viewable URL for each stored path, so existing images can be **seen** and
   * not just read as a filename.
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
 * Multi-image editor for records that hold a `string[]` of stored paths
 * (products, variants). Uploading appends a path; rows stay individually
 * editable and removable so an existing list can still be corrected by hand.
 *
 * Files are uploaded **one at a time, sequentially**. Each needs its own signed
 * slip, and firing N mints concurrently only trades a readable failure for a
 * partially-populated list when one of them is rejected.
 */
export function ImageListField({
  values,
  onChange,
  fileLocation,
  placeholder,
  emptyHint = "No images yet — upload one or add a stored path.",
  disabled,
  previewUrls,
}: ImageListFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, error } = useMediaUpload();
  /**
   * Preview URLs for images uploaded in this session. The presign slip already
   * carries `file_future_url`; it used to be discarded, so a just-uploaded image
   * showed as a path with no way to check you had picked the right file.
   */
  const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>({});
  const previewFor = (path: string) =>
    mediaSrc(uploadedUrls[path] ?? previewUrls?.[path]) || undefined;

  const updateAt = (index: number, value: string) =>
    onChange(values.map((v, i) => (i === index ? value : v)));
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
    }
    if (uploaded.length > 0) onChange([...values, ...uploaded]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      {values.length === 0 && <div className="fg-hint">{emptyHint}</div>}

      {values.map((value, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: ordered editable list, values may repeat
        <div key={index} className="flex items-center gap-2">
          {/*
            A real thumbnail, not just the filename. Opens full size in a new
            tab, because "is this the right photo" is often not answerable at
            thumbnail scale.
          */}
          {previewFor(value) ? (
            <a
              href={previewFor(value)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded border border-[var(--border-sm)] overflow-hidden"
              title={MESSAGES.MEDIA.OPEN_FULL_SIZE}
            >
              <img
                src={previewFor(value)}
                alt={value}
                className="h-14 w-14 object-cover"
                loading="lazy"
              />
            </a>
          ) : (
            <div className="shrink-0 h-14 w-14 rounded border border-dashed border-[var(--border-sm)] grid place-items-center text-[var(--t4)]">
              <IconPhoto size={18} />
            </div>
          )}
          <Input
            className="mono text-[12px]"
            placeholder={placeholder ?? `${fileLocation}example.jpg`}
            value={value}
            onChange={(e) => updateAt(index, e.target.value)}
            disabled={disabled}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => removeAt(index)}
            disabled={disabled}
            title={MESSAGES.MEDIA.REMOVE}
          >
            <IconTrash size={16} />
          </button>
        </div>
      ))}

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
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onChange([...values, ""])}
          disabled={disabled || isUploading}
        >
          <IconPlus size={16} /> Add Path
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
        }}
      />

      {error && <div className="text-[11px] font-semibold text-[var(--danger-text)]">{error}</div>}
    </div>
  );
}

export default ImageListField;
