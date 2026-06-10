import { Input } from "@/components/ui/input";
import { IconPlus, IconTrash } from "@tabler/icons-react";

export interface StringListFieldProps {
  /** Current list of values (controlled). */
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  emptyHint?: string;
  /** Render inputs in monospace (useful for paths/ids). */
  mono?: boolean;
}

/**
 * Reusable editable list of free-text strings — add / edit / remove rows.
 * Used for product image paths, attribute pockets, and any other string[] field.
 */
export function StringListField({
  values,
  onChange,
  placeholder,
  addLabel = "Add Item",
  emptyHint = "No items yet — add one below.",
  mono,
}: StringListFieldProps) {
  const updateAt = (index: number, value: string) =>
    onChange(values.map((v, i) => (i === index ? value : v)));
  const removeAt = (index: number) => onChange(values.filter((_, i) => i !== index));
  const add = () => onChange([...values, ""]);

  return (
    <div className="flex flex-col gap-2">
      {values.length === 0 && <div className="fg-hint">{emptyHint}</div>}
      {values.map((value, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: ordered editable list, values may repeat
        <div key={index} className="flex items-center gap-2">
          <Input
            className={mono ? "mono" : undefined}
            placeholder={placeholder}
            value={value}
            onChange={(e) => updateAt(index, e.target.value)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => removeAt(index)}
            title="Remove"
          >
            <IconTrash size={16} />
          </button>
        </div>
      ))}
      <div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={add}>
          <IconPlus size={16} /> {addLabel}
        </button>
      </div>
    </div>
  );
}

export default StringListField;
