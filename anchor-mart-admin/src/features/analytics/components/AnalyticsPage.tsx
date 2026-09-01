import { IconCurrencyDollar, IconFilterOff, IconPackage, IconUsers } from "@tabler/icons-react";
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
import { PlatformTrendCard } from "./PlatformTrendCard";
import { ProductSalesCard } from "./ProductSalesCard";
import { SalesTrendCard } from "./SalesTrendCard";
import { TrafficByPlatformCard } from "./TrafficByPlatformCard";

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
            {/* Matched to the pill toggle beside it. `DateRangePicker`
                renders a `size="sm"` Button at 32px while the toggle stands at
                38px, so the two sat 6px apart in one control strip. `h-[38px]`
                lands after `sizeClasses` in the Button's `cn()`, so twMerge
                drops the 32px rather than stacking two heights. */}
            <DateRangePicker value={dateRange} onChange={setDateRange} className="h-[38px]" />
            {/* A custom range overrides the period pills, so clearing it is the
                only way back to a named window. */}
            {dateRange?.from && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setDateRange(undefined)}
                title={MESSAGES.COMMON.RESET_FILTERS}
              >
                <IconFilterOff size={15} />
                {MESSAGES.COMMON.RESET}
              </button>
            )}
          </>
        }
      />

      <StatsGrid items={statCards} />

      <div className="mb-[20px] grid grid-cols-[1fr_1fr] gap-[16px]">
        <SalesTrendCard params={params} />
        <OrdersByCategoryCard params={params} />
      </div>

      {/* Where the traffic comes from, then the same split over time. Both take
          the shared `params` unchanged, so they refetch with the rest of the
          screen on a filter change and need no control of their own.

          Stacked full width rather than side by side: the trend is a stacked
          bar chart over a time axis, and at half width its buckets compress
          until adjacent columns are no longer separable. The breakdown card
          above it carries a five-column table that reads better with the room
          too, so neither loses anything by taking the whole line. */}
      <div className="mb-[20px]">
        <TrafficByPlatformCard params={params} />
      </div>
      <div className="mb-[20px]">
        <PlatformTrendCard params={params} />
      </div>

      <ProductSalesCard params={params} />
    </div>
  );
}

export default AnalyticsPage;
