import type * as React from "react";
import { type DropdownOption, DropdownSelect } from "./DropdownSelect";
import { Search } from "./Search";

export interface FilterConfig {
  id: string;
  value: string;
  placeholder: string;
  options: DropdownOption[];
  width?: string;
  onValueChange: (value: string) => void;
}

export interface SearchFiltersProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchDebounceMs?: number;
  searchLoading?: boolean;
  searchClearable?: boolean;
  filters?: FilterConfig[];
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
  children,
}: SearchFiltersProps) {
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
          onValueChange={filter.onValueChange}
        />
      ))}
      {children}
    </>
  );
}

export default SearchFilters;
