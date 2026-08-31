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
 *
 * The menu is bounded to the space it actually has rather than left to grow to
 * its content. A short option list never noticed the difference; the intents
 * screen's status filter, at thirteen entries, is tall enough that Radix flips
 * it above the trigger when the table header sits low in the window, and an
 * unbounded menu then ran up over the sticky topbar with its first options past
 * the top edge of the screen. Every column that opts in gets the bounded
 * behaviour, so this cannot come back on the next long filter.
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
        {/* Three things keep a long option list on screen.

            `collisionPadding` is the reason for the top value in particular:
            the app shell is a grid whose first row is the 62px sticky topbar,
            and this menu is portalled to `body`, so it is not clipped by
            `.main-content` and will happily flip up into — or straight past —
            that row when the trigger sits low in the window. Reserving the
            topbar's height plus a margin keeps the menu inside the content
            area, on either side of the trigger.

            `max-h` is what makes that survivable. Radix publishes the room it
            actually has on the chosen side as
            `--radix-dropdown-menu-content-available-height` (already net of
            `collisionPadding`), so binding the height to it turns a list too
            tall for the window into a scrolling one instead of one whose first
            items are off the top edge. `overscroll-contain` stops that scroll
            from chaining to the page underneath once it bottoms out.

            The z-index sits above the row action menu (`.action-menu`, 200) and
            the sticky panel headers (30), so nothing the table itself paints
            can cover the open menu. */}
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          collisionPadding={{ top: 70, bottom: 12, left: 12, right: 12 }}
          className="z-[300] max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[150px] overflow-y-auto overscroll-contain rounded-md border p-1 shadow-md"
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
