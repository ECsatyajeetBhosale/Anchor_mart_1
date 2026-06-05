import type * as React from "react";
import { Pagination } from "./Pagination";
import { Button } from "../ui/button";

export interface Column<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
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
}: DataTableProps<T>) {
  return (
    <div
      className="card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-sm)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        boxShadow: "var(--sh-xs)",
      }}
    >
      <div className="tbl-wrap" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid var(--border-md)", background: "var(--surface-alt)" }}>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={col.headerClassName}
                  style={{
                    padding: "14px 20px",
                    textAlign: "left",
                    fontWeight: 800,
                    color: "var(--t3)",
                    fontSize: "11.5px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        border: "3px solid var(--border-md)",
                        borderTopColor: "var(--teal-500)",
                        borderRadius: "50%",
                        animation: "lspin 0.8s linear infinite",
                      }}
                    />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--t4)" }}>Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--danger-text)" }}>
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
                <td colSpan={columns.length} style={{ padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--t3)" }}>
                      {emptyMessage}
                    </span>
                    {hasActiveFilters && onResetFilters && (
                      <Button variant="link" size="xs" onClick={onResetFilters} style={{ marginTop: "4px" }}>
                        Reset Filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  style={{
                    borderBottom: "1px solid var(--border-xs)",
                    transition: "background 0.15s",
                  }}
                  className="hover:bg-[var(--surface-alt)]"
                >
                  {columns.map((col) => {
                    const value = col.accessorKey ? row[col.accessorKey] : undefined;
                    return (
                      <td
                        key={col.id}
                        className={col.className}
                        style={{
                          padding: "14px 20px",
                          color: "var(--t1)",
                          fontWeight: 500,
                          verticalAlign: "middle",
                        }}
                      >
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

      {showPagination && !isLoading && !isError && data.length > 0 && page && pages && onPageChange && (
        <Pagination page={page} pages={pages} onPageChange={onPageChange} />
      )}
    </div>
  );
}
export default DataTable;
