import { cn } from "@/lib/utils";
import { IconSearch, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "../ui/input";

export interface SearchProps {
  value: string;
  placeholder?: string;
  onSearch: (value: string) => void;
  onChange?: (value: string) => void;
  debounceMs?: number;
  loading?: boolean;
  clearable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Search({
  value,
  placeholder = "Search...",
  onSearch,
  onChange,
  debounceMs = 0,
  loading = false,
  clearable = true,
  className,
  style,
}: SearchProps) {
  const [localValue, setLocalValue] = useState(value);
  const isFirstRender = useRef(true);

  // Hold onSearch in a ref so the debounce effect doesn't re-run (and re-dispatch
  // a search) just because the parent passed a new callback identity on re-render.
  // Without this, paginating re-renders the parent, changes onSearch's identity,
  // and the effect fires onSearch("") again — resetting the page back to 1.
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  // Keep local value in sync with external prop updates
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Handle debouncing and dispatching search — only when the user changes the input
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (debounceMs > 0) {
      const timer = setTimeout(() => {
        onSearchRef.current(localValue);
      }, debounceMs);
      return () => clearTimeout(timer);
    }

    onSearchRef.current(localValue);
  }, [localValue, debounceMs]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    if (onChange) {
      onChange(val);
    }
  };

  const handleClear = () => {
    setLocalValue("");
    onSearch("");
    if (onChange) {
      onChange("");
    }
  };

  return (
    <div
      className={cn("relative flex items-center", className)}
      style={{ width: "260px", ...style }}
    >
      {loading ? (
        <div
          style={{
            position: "absolute",
            left: "12px",
            width: "16px",
            height: "16px",
            border: "2px solid var(--border-md)",
            borderTopColor: "var(--teal-500)",
            borderRadius: "50%",
            animation: "lspin 0.8s linear infinite",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      ) : (
        <IconSearch
          size={16}
          style={{
            position: "absolute",
            left: "12px",
            color: "var(--t4)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleTextChange}
        style={{
          paddingLeft: "36px",
          paddingRight: clearable && localValue ? "36px" : "12px",
        }}
      />
      {clearable && localValue && !loading && (
        <button
          type="button"
          onClick={handleClear}
          style={{
            position: "absolute",
            right: "12px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--t4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            zIndex: 1,
          }}
          title="Clear search"
        >
          <IconX size={16} />
        </button>
      )}
    </div>
  );
}

export default Search;
