import {
  ColumnFilterHeader,
  type ColumnFilterOption,
} from "@/components/common/ColumnFilterHeader";
import type * as React from "react";
import { Button } from "./button";
import Pagination from "./pagination";

/** Optional per-column header filter. Empty `value` = no filter (show all). */
export interface ColumnFilter {
  value: string;
  options: ColumnFilterOption[];
  onChange: (value: string) => void;
  allLabel?: string;
}

export interface Column<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  /** When set, the header becomes a clickable filter dropdown. */
  filter?: ColumnFilter;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  isError?: boolean;
  error?: string | null;
  onRetry?: () => void;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  emptyMessage?: string;
  page?: number;
  pages?: number;
  total?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  showPagination?: boolean;
  onRowClick?: (row: T) => void;
  /** Stable React key per row — a field name or a function. Falls back to index. */
  rowKey?: keyof T | ((row: T, index: number) => React.Key);
  /**
   * Omit the outer `.card` wrapper so the table can be embedded inside an
   * existing card (e.g. a {@link SectionCard} with its own header/footer).
   * Defaults to `false` — standalone tables keep the card shell.
   */
  bare?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  isError = false,
  error = null,
  onRetry,
  hasActiveFilters = false,
  onResetFilters,
  emptyMessage = "No results found.",
  page = 1,
  pages = 1,
  onPageChange,
  showPagination = true,
  onRowClick,
  rowKey,
  bare = false,
}: DataTableProps<T>) {
  const getRowKey = (row: T, index: number): React.Key => {
    if (typeof rowKey === "function") return rowKey(row, index);
    if (rowKey) return row[rowKey] as React.Key;
    return index;
  };

  const body = (
    <>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.id} className={col.headerClassName}>
                  {col.filter ? (
                    <ColumnFilterHeader
                      label={col.header}
                      value={col.filter.value}
                      options={col.filter.options}
                      onChange={col.filter.onChange}
                      allLabel={col.filter.allLabel}
                    />
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--border-md)] border-t-[var(--teal-500)]" />
                    <span className="text-[13px] font-semibold text-[var(--t4)]">
                      Loading data...
                    </span>
                  </div>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-[13.5px] font-semibold text-[var(--danger-text)]">
                      {error || "Failed to load data."}
                    </span>
                    {onRetry && (
                      <Button variant="secondary" size="xs" onClick={onRetry}>
                        Retry
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[14px] font-bold text-[var(--t3)]">{emptyMessage}</span>
                    {hasActiveFilters && onResetFilters && (
                      <Button variant="link" size="xs" onClick={onResetFilters} className="mt-1">
                        Reset Filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={getRowKey(row, rowIndex)}
                  className={onRowClick ? "tr-click" : ""}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                >
                  {columns.map((col) => {
                    const value = col.accessorKey ? row[col.accessorKey] : undefined;
                    return (
                      <td key={col.id} className={col.className}>
                        {col.cell ? col.cell(row) : (value as React.ReactNode)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination &&
        !isLoading &&
        !isError &&
        data.length > 0 &&
        page &&
        pages &&
        onPageChange && <Pagination page={page} pages={pages} onPageChange={onPageChange} />}
    </>
  );

  return bare ? body : <div className="card">{body}</div>;
}
export default DataTable;
