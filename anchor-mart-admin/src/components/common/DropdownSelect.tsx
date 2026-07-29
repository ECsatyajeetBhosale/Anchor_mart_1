import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: DropdownOption[];
  width?: string;
  disabled?: boolean;
}

export function DropdownSelect({
  value,
  onValueChange,
  placeholder,
  options,
  width = "160px",
  disabled,
}: DropdownSelectProps) {
  // Show the selected option's label (value may be an id that differs from the label).
  const selectedLabel = options.find((opt) => opt.value === value)?.label;
  return (
    <div style={{ width }}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger disabled={disabled}>
          <span className="truncate">{selectedLabel || placeholder}</span>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
