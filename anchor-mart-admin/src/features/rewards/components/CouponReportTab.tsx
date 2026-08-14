import { IconReportAnalytics } from "@tabler/icons-react";
import { useState } from "react";

import { Search } from "@/components/common/Search";
import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { useGetCouponReportQuery } from "../api/promotionApi";
import type { CouponReportRow } from "../types/reward.types";

const M = MESSAGES.PROMOTION.REPORT;
const LIMIT = 10;

/**
 * Read-only redemption summary across every coupon.
 *
 * Paginated and searched server-side. It used to fetch the report with no
 * arguments and render whatever came back with the pager off — which is the
 * first ten rows of a paginated endpoint, presented as the whole report.
 */
export function CouponReportTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useGetCouponReportQuery({
    page,
    limit: LIMIT,
    search,
  });
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  const columns: Column<CouponReportRow>[] = [
    { id: "code", header: M.COLUMNS.CODE, className: "td-id", cell: (r) => r.code },
    { id: "title", header: M.COLUMNS.TITLE, className: "td-m", cell: (r) => r.title },
    // Already formatted by the API ("10%", "$5.00") — nothing to compute here.
    { id: "discount", header: M.COLUMNS.DISCOUNT, className: "td-m", cell: (r) => r.discount },
    {
      // Prose from the API: "All users" or "3 assigned users".
      id: "applicable",
      header: M.COLUMNS.APPLICABLE,
      className: "td-m",
      cell: (r) => r.applicableTo,
    },
    {
      id: "used",
      header: M.COLUMNS.USED,
      className: "td-p text-right",
      headerClassName: "text-right",
      cell: (r) => r.timesUsed.toLocaleString(),
    },
    {
      id: "total-discount",
      header: M.COLUMNS.TOTAL_DISCOUNT,
      className: "td-p text-right",
      headerClassName: "text-right",
      cell: (r) => r.totalDiscount,
    },
    {
      // Order value the coupon was redeemed against — what the discount bought.
      id: "revenue",
      header: M.COLUMNS.REVENUE,
      className: "td-p text-right",
      headerClassName: "text-right",
      cell: (r) => r.revenueImpact,
    },
    {
      id: "status",
      header: M.COLUMNS.STATUS,
      // The API's own word, title-cased for display — not re-derived from a
      // boolean this response does not send.
      cell: (r) => (
        <Badge variant={r.status === "active" ? "success" : "neutral"}>
          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
        </Badge>
      ),
    },
  ];

  return (
    <SectionCard
      icon={<IconReportAnalytics size={18} />}
      title={M.TITLE}
      bodyPadding="none"
      actions={
        <Search
          value={search}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={M.SEARCH_PLACEHOLDER}
          debounceMs={300}
          style={{ width: "240px" }}
        />
      }
    >
      <DataTable
        columns={columns}
        data={data?.rows ?? []}
        rowKey="couponId"
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
        page={page}
        pages={totalPages}
        onPageChange={setPage}
        emptyMessage={M.EMPTY}
        bare
      />
    </SectionCard>
  );
}

export default CouponReportTab;
