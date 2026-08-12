import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { IconCheck, IconChevronDown, IconLoader2, IconSearch, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

const M = MESSAGES.COMMON.SEARCHABLE_SELECT;

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Short qualifier shown beside the label — e.g. the product's catalog type. */
  meta?: string;
}

/** One chip in the optional filter row above the options. */
export interface SearchableSelectFilter {
  label: string;
  value: string;
}

export interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  /** Live search term; owned by the caller so the query can run server-side. */
  search: string;
  onSearchChange: (value: string) => void;
  /** True while another page is available — renders the "Load more" row. */
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  /** When supplied, a reset row appears above the options. */
  onClear?: () => void;
  clearLabel?: string;
  /**
   * Optional chips that narrow the list before searching it — for a catalog
   * where the operator knows the kind of thing they want but not its name.
   * Applied server-side by the caller, like `search`.
   */
  filters?: SearchableSelectFilter[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  width?: string;
}

/**
 * A select for lists too long to render at once: server-side search, paged
 * loading, and an explicit reset.
 *
 * Built because `DropdownSelect` renders whatever array it is handed, so every
 * long-list caller fetched one page and hoped. The product picker this replaced
 * asked for `limit: 100` against an endpoint that caps a page at 50 — so it
 * silently showed the first 50 products and nothing could select the 51st.
 *
 * **Search is the caller's business, not this component's.** It reports the term
 * and renders what comes back; it never filters `options` locally, because
 * filtering a truncated page would look like it worked while still hiding
 * everything past the cap.
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
  search,
  onSearchChange,
  hasMore,
  onLoadMore,
  isLoading,
  placeholder = M.PLACEHOLDER,
  onClear,
  clearLabel = M.CLEAR,
  filters,
  activeFilter,
  onFilterChange,
  width = "220px",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus the field on open so typing works immediately — the whole point of
  // this control is that the list is too long to scan by eye.
  useEffect(() => {
    if (open) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          style={{ width }}
          className="flex h-9 items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-md)] bg-[var(--surface)] px-3 text-[13px] font-semibold text-[var(--t1)] transition-colors hover:border-[var(--teal-400)]"
        >
          <span className={cn("trunc", !selected && "font-medium text-[var(--t4)]")}>
            {selected?.label ?? placeholder}
          </span>
          <IconChevronDown size={15} className="shrink-0 text-[var(--t4)]" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-0"
      >
        <div className="flex items-center gap-2 border-b border-[var(--border-sm)] px-3 py-2">
          <IconSearch size={14} className="shrink-0 text-[var(--t4)]" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={M.SEARCH_PLACEHOLDER}
            className="w-full border-0 bg-transparent text-[13px] font-medium text-[var(--t1)] outline-none placeholder:text-[var(--t4)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label={M.CLEAR_SEARCH}
              className="shrink-0 text-[var(--t4)] hover:text-[var(--t2)]"
            >
              <IconX size={13} />
            </button>
          )}
        </div>

        {filters && filters.length > 0 && (
          <div className="flex flex-wrap gap-1 border-b border-[var(--border-sm)] px-2 py-2">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => onFilterChange?.(f.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11.5px] font-bold transition-colors",
                  f.value === activeFilter
                    ? "border-[var(--teal-500)] bg-[var(--teal-50)] text-[var(--teal-700)]"
                    : "border-[var(--border-md)] text-[var(--t3)] hover:bg-[var(--surface-alt)]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        <div className="max-h-[260px] overflow-y-auto p-1">
          {onClear && (
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] font-semibold text-[var(--t3)] hover:bg-[var(--surface-alt)]"
            >
              <IconX size={13} className="shrink-0" />
              {clearLabel}
            </button>
          )}

          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onValueChange(opt.value);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[13px] font-medium text-[var(--t1)] hover:bg-[var(--surface-alt)]"
            >
              <span className="trunc">{opt.label}</span>
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                {opt.meta && (
                  <span className="rounded-full bg-[var(--surface-alt)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.4px] text-[var(--t4)]">
                    {opt.meta}
                  </span>
                )}
              </span>
              {opt.value === value && (
                <IconCheck size={14} className="shrink-0 text-[var(--teal-600)]" />
              )}
            </button>
          ))}

          {options.length === 0 && !isLoading && (
            <div className="px-2 py-3 text-[12.5px] font-medium text-[var(--t4)]">
              {M.NO_RESULTS}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 px-2 py-3 text-[12.5px] font-medium text-[var(--t4)]">
              <IconLoader2 size={14} className="animate-spin" />
              {M.LOADING}
            </div>
          )}

          {hasMore && !isLoading && (
            <button
              type="button"
              onClick={onLoadMore}
              className="mt-1 w-full rounded border-t border-[var(--border-xs)] px-2 py-1.5 text-[12.5px] font-bold text-[var(--teal-700)] hover:bg-[var(--surface-alt)]"
            >
              {M.LOAD_MORE}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default SearchableSelect;
