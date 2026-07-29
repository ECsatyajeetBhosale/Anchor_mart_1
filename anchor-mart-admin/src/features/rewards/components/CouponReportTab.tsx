import { IconReportAnalytics } from "@tabler/icons-react";

import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { useGetCouponReportQuery } from "../api/promotionApi";
import type { CouponReportRow } from "../types/reward.types";

const M = MESSAGES.PROMOTION.REPORT;

/** Read-only redemption summary across every coupon. */
export function CouponReportTab() {
  const { data = [], isLoading, isError, refetch } = useGetCouponReportQuery();

  const columns: Column<CouponReportRow>[] = [
    { id: "code", header: M.COLUMNS.CODE, className: "td-id", cell: (r) => r.code },
    {
      id: "used",
      header: M.COLUMNS.USED,
      className: "td-p",
      cell: (r) => r.timesUsed.toLocaleString(),
    },
    {
      id: "limit",
      header: M.COLUMNS.LIMIT,
      className: "td-m",
      // A null limit means uncapped, which reads better than a blank cell.
      cell: (r) => (r.usageLimit === null ? M.UNLIMITED : r.usageLimit.toLocaleString()),
    },
    {
      id: "discount",
      header: M.COLUMNS.DISCOUNT,
      className: "td-p",
      cell: (r) => r.totalDiscount,
    },
    {
      id: "status",
      header: M.COLUMNS.STATUS,
      cell: (r) => (
        <Badge variant={r.isActive ? "success" : "neutral"}>
          {r.isActive ? M.ACTIVE : M.INACTIVE}
        </Badge>
      ),
    },
  ];

  return (
    <SectionCard icon={<IconReportAnalytics size={18} />} title={M.TITLE} bodyPadding="none">
      <DataTable
        columns={columns}
        data={data}
        rowKey="couponId"
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
        showPagination={false}
        emptyMessage={M.EMPTY}
        bare
      />
    </SectionCard>
  );
}

export default CouponReportTab;
