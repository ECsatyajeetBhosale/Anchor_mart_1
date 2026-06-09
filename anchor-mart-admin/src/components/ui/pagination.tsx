import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export interface PaginationProps {
  page: number;
  pages: number;
  total?: number;
  limit?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pages, onPageChange }: PaginationProps) {
  if (pages <= 1) return null;

  // Generate page numbers to show
  const pageNumbers = [];
  for (let i = 1; i <= pages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="pagination" style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid var(--border-xs)" }}>
      {/* Prev button */}
      <button
        type="button"
        className="pg-btn"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "13px",
          fontWeight: 700,
          color: "var(--t3)",
          cursor: page === 1 ? "not-allowed" : "pointer",
          border: "1.5px solid transparent",
          background: "transparent",
          opacity: page === 1 ? 0.35 : 1,
          transition: "all 0.15s",
        }}
      >
        <IconChevronLeft size={16} />
      </button>

      {/* Pages */}
      {pageNumbers.map((num) => {
        const isActive = num === page;
        return (
          <button
            key={num}
            type="button"
            className={`pg-btn ${isActive ? "active" : ""}`}
            onClick={() => onPageChange(num)}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
              border: "1.5px solid transparent",
              background: isActive ? "var(--navy-900)" : "transparent",
              color: isActive ? "#fff" : "var(--t3)",
              borderColor: isActive ? "var(--navy-900)" : "transparent",
            }}
          >
            {num}
          </button>
        );
      })}

      {/* Next button */}
      <button
        type="button"
        className="pg-btn"
        disabled={page === pages}
        onClick={() => onPageChange(page + 1)}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "13px",
          fontWeight: 700,
          color: "var(--t3)",
          cursor: page === pages ? "not-allowed" : "pointer",
          border: "1.5px solid transparent",
          background: "transparent",
          opacity: page === pages ? 0.35 : 1,
          transition: "all 0.15s",
        }}
      >
        <IconChevronRight size={16} />
      </button>
    </div>
  );
}
export default Pagination;
