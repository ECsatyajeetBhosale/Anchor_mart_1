import { IconCurrencyDollar, IconPackage, IconUsers } from "@tabler/icons-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { DateRangePicker } from "@/components/common/DateRangePicker";
import { PageHeader } from "@/components/common/PageHeader";
import { PillToggle } from "@/components/common/PillToggle";
import { StatsGrid, type StatsGridItem } from "@/components/common/StatsGrid";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { formatCurrency } from "@/lib/utils";

import { useGetAnalyticsSummaryQuery } from "../api/analyticsApi";
import { type AnalyticsPeriod, useAnalyticsFilters } from "../hooks/useAnalyticsFilters";
import { OrdersByCategoryCard } from "./OrdersByCategoryCard";
import { ProductSalesCard } from "./ProductSalesCard";
import { SalesTrendCard } from "./SalesTrendCard";

const M = MESSAGES.ANALYTICS;

/** Placeholder shown in a stat card while data is loading or unavailable. */
const PLACEHOLDER = "—";

const PERIOD_OPTIONS: { label: string; value: AnalyticsPeriod }[] = [
  { label: M.PERIOD.D7, value: "7 Days" },
  { label: M.PERIOD.D30, value: "30 Days" },
  { label: M.PERIOD.QUARTER, value: "Quarter" },
  { label: M.PERIOD.YEAR, value: "Year" },
];

/** Format a numeric stat with thousands separators; fall back while loading. */
function formatStat(value: number | undefined): string {
  return value === undefined ? PLACEHOLDER : value.toLocaleString();
}

/**
 * Analytics & Insights — component-driven page wired to the analytics endpoints.
 * Layout: KPI stats → Sales Trend + Orders by Category charts → Product-wise
 * Sales. The header period toggle and date range drive a single shared `params`
 * object so every section refetches together when filters change.
 */
export function AnalyticsPage() {
  const { period, selectPeriod, dateRange, setDateRange, params } = useAnalyticsFilters();

  const summary = useGetAnalyticsSummaryQuery(params);

  // Surface summary load failures through the shared toast convention.
  useEffect(() => {
    if (summary.isError) {
      toast.error(getApiMessage(summary.error) ?? M.ERROR);
    }
  }, [summary.isError, summary.error]);

  const statCards: StatsGridItem[] = [
    {
      id: "revenue",
      label: M.STATS.MONTHLY_REVENUE,
      value: summary.data ? formatCurrency(summary.data.monthly_revenue) : PLACEHOLDER,
      icon: <IconCurrencyDollar size={19} />,
      variant: "teal",
    },
    {
      id: "orders",
      label: M.STATS.TOTAL_ORDERS,
      value: formatStat(summary.data?.total_orders),
      icon: <IconPackage size={19} />,
      variant: "navy",
    },
    {
      id: "sailors",
      label: M.STATS.ACTIVE_SAILORS,
      value: formatStat(summary.data?.active_sailors),
      icon: <IconUsers size={19} />,
      variant: "amber",
    },
  ];

  return (
    <div className="page-enter">
      <PageHeader
        title={M.TITLE}
        actions={
          <>
            <PillToggle<AnalyticsPeriod>
              options={PERIOD_OPTIONS}
              value={period}
              onChange={selectPeriod}
            />
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </>
        }
      />

      <StatsGrid items={statCards} />

      <div className="grid-2 mb20">
        <SalesTrendCard params={params} />
        <OrdersByCategoryCard params={params} />
      </div>

      <ProductSalesCard params={params} />
    </div>
  );
}

export default AnalyticsPage;
