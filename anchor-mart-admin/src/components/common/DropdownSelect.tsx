import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useEffect, useRef, useState } from "react";

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
  /**
   * Adds a filter box above the options.
   *
   * For lists whose length is the operator's problem rather than ours — the
   * delivery-partner pickers, where scrolling a fleet to find one name is the
   * whole interaction. Not on by default: a three-option status filter with a
   * search box above it reads as a list that might be longer than it is.
   */
  searchable?: boolean;
  searchPlaceholder?: string;
  /**
   * Makes the built-in search box **server-side**: the typed query is handed
   * up (debounced) instead of filtering `options` here, and whatever comes back
   * is rendered as-is.
   *
   * The distinction matters once a list is paginated. Filtering locally can only
   * narrow the page already fetched, so a name on page two stays unfindable no
   * matter what is typed — the box looks like it searched everything and did
   * not. Where the API takes a `?search=`, this routes to it.
   */
  onSearchChange?: (query: string) => void;
  /** Server-side only: a request is in flight. */
  searchLoading?: boolean;
  /** Server-side only — "no admins match" beats a generic "no matches". */
  emptyMessage?: string;
}

export function DropdownSelect({
  value,
  onValueChange,
  placeholder,
  options,
  width = "160px",
  disabled,
  searchable,
  searchPlaceholder,
  onSearchChange,
  searchLoading,
  emptyMessage,
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
          {searchable ? (
            <SearchableOptions
              options={options}
              placeholder={searchPlaceholder}
              onSearchChange={onSearchChange}
              loading={searchLoading}
              emptyMessage={emptyMessage}
            />
          ) : (
            options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * The filter box and the options it narrows.
 *
 * Deliberately its own component **inside** `SelectContent`, which renders null
 * while closed — so this unmounts on close and the query resets by construction.
 * Held one level up it would survive, and reopening the picker would silently
 * show a list still filtered by whatever was typed last time.
 */
function SearchableOptions({
  options,
  placeholder,
  onSearchChange,
  loading,
  emptyMessage,
}: {
  options: DropdownOption[];
  placeholder?: string;
  onSearchChange?: (query: string) => void;
  loading?: boolean;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isServerSide = !!onSearchChange;
  /**
   * Kept in a ref so the debounce effect depends on the query alone. A caller
   * passing an inline arrow — every caller — would otherwise hand it a new
   * function each render and re-arm the timer on renders nobody typed into.
   */
  const searchRef = useRef(onSearchChange);
  searchRef.current = onSearchChange;
  /**
   * Focused on mount — which, because this only mounts while the dropdown is
   * open, means "when the operator opened it", not on page load. Done with a ref
   * rather than `autoFocus` for exactly that reason: the attribute is the
   * page-load anti-pattern the a11y rule is guarding against.
   */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced, because server-side each keystroke is a request.
  useEffect(() => {
    if (!isServerSide) return;
    const timer = setTimeout(() => searchRef.current?.(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query, isServerSide]);

  /**
   * Closing clears the query upstream too. This component unmounting already
   * resets the box; without this the *parent's* term would outlive it, and
   * reopening would show an empty box above a list still narrowed by whatever
   * was typed last time — the one mismatch the local-state design avoids.
   */
  useEffect(() => {
    if (!isServerSide) return;
    return () => searchRef.current?.("");
  }, [isServerSide]);

  const q = query.trim().toLowerCase();
  // Server-side, `options` is already the answer to this query — filtering it
  // again would drop rows the server matched on a field not in the label.
  const filtered =
    isServerSide || !q ? options : options.filter((opt) => opt.label.toLowerCase().includes(q));

  return (
    <>
      <div className="p-1 pb-1.5">
        <input
          // Typing must not reach the trigger or the outside-click handler; the
          // input sits inside the select's container, so only the key events
          // need stopping (Escape still closes, which is the useful exception).
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Escape") e.stopPropagation();
          }}
          placeholder={placeholder ?? "Search…"}
          className="h-8 w-full rounded-[var(--radius-sm)] border border-[var(--border-sm)] bg-[var(--surface-input)] px-2 text-[13px] outline-none focus:border-[var(--teal-500)]"
        />
      </div>
      {loading ? (
        <div className="px-2 py-3 text-center text-[12.5px] text-[var(--t4)]">Searching…</div>
      ) : filtered.length === 0 ? (
        <div className="px-2 py-3 text-center text-[12.5px] text-[var(--t4)]">
          {emptyMessage ?? "No matches"}
        </div>
      ) : (
        filtered.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))
      )}
    </>
  );
}
