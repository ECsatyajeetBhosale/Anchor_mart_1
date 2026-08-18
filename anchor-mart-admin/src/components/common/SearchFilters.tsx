import { MESSAGES } from "@/lib/messages";
import { IconFilterOff } from "@tabler/icons-react";
import type * as React from "react";
import { type DropdownOption, DropdownSelect } from "./DropdownSelect";
import { Search } from "./Search";

export interface FilterConfig {
  id: string;
  value: string;
  placeholder: string;
  options: DropdownOption[];
  width?: string;
  /** Adds a filter box inside the dropdown — for lists long enough to scroll. */
  searchable?: boolean;
  searchPlaceholder?: string;
  onValueChange: (value: string) => void;
  /**
   * Value that counts as "not filtering". Most filters use `""`, but some use
   * `"all"` — without this the reset button would show on a pristine toolbar.
   */
  emptyValue?: string;
}

export interface SearchFiltersProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchDebounceMs?: number;
  searchLoading?: boolean;
  searchClearable?: boolean;
  filters?: FilterConfig[];
  /**
   * Clears every filter this toolbar owns. Passing it turns on a Reset button
   * that appears **only once something is actually filtering** — a toolbar with
   * several dropdowns is easy to leave narrowed by one forgotten value, and
   * hunting for which one is worse the more filters there are.
   *
   * Extra state the toolbar can't see (a date range in `children`, say) can be
   * reported through `isFiltered` so Reset still offers itself.
   */
  onReset?: () => void;
  /** Forces Reset on regardless of the filter/search values above. */
  isFiltered?: boolean;
  children?: React.ReactNode;
}

export function SearchFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  searchDebounceMs = 0,
  searchLoading = false,
  searchClearable = true,
  filters = [],
  onReset,
  isFiltered = false,
  children,
}: SearchFiltersProps) {
  const anyFilterSet = filters.some((f) => f.value && f.value !== (f.emptyValue ?? ""));
  const showReset = !!onReset && (isFiltered || anyFilterSet || !!searchValue);

  return (
    <>
      {onSearchChange !== undefined && searchValue !== undefined && (
        <Search
          placeholder={searchPlaceholder}
          value={searchValue}
          onSearch={onSearchChange}
          debounceMs={searchDebounceMs}
          loading={searchLoading}
          clearable={searchClearable}
        />
      )}
      {filters.map((filter) => (
        <DropdownSelect
          key={filter.id}
          value={filter.value}
          placeholder={filter.placeholder}
          options={filter.options}
          width={filter.width}
          searchable={filter.searchable}
          searchPlaceholder={filter.searchPlaceholder}
          onValueChange={filter.onValueChange}
        />
      ))}
      {children}
      {showReset && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onReset}
          title={MESSAGES.COMMON.RESET_FILTERS}
        >
          <IconFilterOff size={15} />
          {MESSAGES.COMMON.RESET}
        </button>
      )}
    </>
  );
}

export default SearchFilters;
