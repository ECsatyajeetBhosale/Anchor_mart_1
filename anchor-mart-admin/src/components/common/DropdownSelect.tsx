import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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
}

export function DropdownSelect({ value, onValueChange, placeholder, options, width = "160px" }: DropdownSelectProps) {
  return (
    <div style={{ width }}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
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
