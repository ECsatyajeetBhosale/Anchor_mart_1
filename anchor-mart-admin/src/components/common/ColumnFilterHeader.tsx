import { cn } from "@/lib/utils";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { IconCheck, IconFilter } from "@tabler/icons-react";

export interface ColumnFilterOption {
  label: string;
  value: string;
}

export interface ColumnFilterHeaderProps {
  /** Column header label, e.g. "Status". */
  label: string;
  /** Currently selected value. Empty string means "no filter / show all". */
  value: string;
  options: ColumnFilterOption[];
  onChange: (value: string) => void;
  /** Label for the reset/clear item. */
  allLabel?: string;
}

/**
 * Reusable clickable table-header filter. Renders the column label with a
 * filter icon; clicking opens a menu of options plus an "All" reset item.
 * Generic by design — any DataTable column can opt in via its `filter` config.
 */
export function ColumnFilterHeader({
  label,
  value,
  options,
  onChange,
  allLabel = "All",
}: ColumnFilterHeaderProps) {
  const isFiltered = value !== "";

  const items: ColumnFilterOption[] = [{ label: allLabel, value: "" }, ...options];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 cursor-pointer select-none border-0 bg-transparent p-0 font-[inherit] text-[inherit] uppercase tracking-[inherit] outline-none focus:outline-none focus-visible:outline-none"
        >
          {label}
          <IconFilter
            size={13}
            style={{ color: isFiltered ? "var(--teal-500)" : "var(--t4)" }}
            fill={isFiltered ? "currentColor" : "none"}
          />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[150px] rounded-md border p-1 shadow-md"
          style={{ background: "var(--surface)", borderColor: "var(--border-md)" }}
        >
          {items.map((opt) => (
            <DropdownMenu.Item
              key={opt.value || "__all"}
              onSelect={() => onChange(opt.value)}
              className={cn(
                "flex items-center justify-between gap-3 rounded px-2 py-1.5 text-[13px] font-medium normal-case outline-none cursor-pointer",
                "data-[highlighted]:bg-[var(--surface-hover)]",
              )}
              style={{ color: "var(--t3)" }}
            >
              {opt.label}
              {value === opt.value && <IconCheck size={14} style={{ color: "var(--teal-500)" }} />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default ColumnFilterHeader;
