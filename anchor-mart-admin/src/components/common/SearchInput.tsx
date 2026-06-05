import { IconSearch } from "@tabler/icons-react";
import { Input } from "../ui/input";

export interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SearchInput({
  placeholder = "Search...",
  value,
  onChange,
  className,
}: SearchInputProps) {
  return (
    <div className={`relative flex items-center ${className}`} style={{ width: "260px" }}>
      <IconSearch
        size={16}
        style={{
          position: "absolute",
          left: "12px",
          color: "var(--t4)",
          pointerEvents: "none",
        }}
      />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ paddingLeft: "36px" }}
      />
    </div>
  );
}
export default SearchInput;
