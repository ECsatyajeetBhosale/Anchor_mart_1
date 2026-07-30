import { Input } from "@/components/ui/input";
import { IconPlus, IconTrash, IconUpload } from "@tabler/icons-react";
import { useRef } from "react";
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
}: ImageListFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, error } = useMediaUpload();

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
            title="Remove"
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
