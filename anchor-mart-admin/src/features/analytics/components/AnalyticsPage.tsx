import { IconCurrencyDollar, IconPackage, IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { DateRangePicker } from "@/components/common/DateRangePicker";
import { PageHeader } from "@/components/common/PageHeader";
import { PillToggle } from "@/components/common/PillToggle";
import { StatsGrid, type StatsGridItem } from "@/components/common/StatsGrid";
import { MESSAGES } from "@/lib/messages";

import type { AnalyticsPeriod } from "../data/analyticsData";
import { OrdersByCategoryCard } from "./OrdersByCategoryCard";
import { ProductSalesCard } from "./ProductSalesCard";
import { SalesTrendCard } from "./SalesTrendCard";

const M = MESSAGES.ANALYTICS;

const PERIOD_OPTIONS: { label: string; value: AnalyticsPeriod }[] = [
  { label: M.PERIOD.D7, value: "7 Days" },
  { label: M.PERIOD.D30, value: "30 Days" },
  { label: M.PERIOD.QUARTER, value: "Quarter" },
  { label: M.PERIOD.YEAR, value: "Year" },
];

const STAT_CARDS: StatsGridItem[] = [
  {
    id: "revenue",
    label: M.STATS.MONTHLY_REVENUE,
    value: "$284k",
    icon: <IconCurrencyDollar size={19} />,
    variant: "teal",
  },
  {
    id: "orders",
    label: M.STATS.TOTAL_ORDERS,
    value: "3,421",
    icon: <IconPackage size={19} />,
    variant: "navy",
  },
  {
    id: "sailors",
    label: M.STATS.ACTIVE_SAILORS,
    value: "1,204",
    icon: <IconUsers size={19} />,
    variant: "amber",
  },
];

/**
 * Analytics & Insights — component-driven port of the reference mockup. Layout:
 * KPI stats → Sales Trend + Orders by Category charts → Product-wise Sales →
 * Express Item Performance table. Data is static fixtures (no API yet); see
 * `data/analyticsData.ts`.
 */
export function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("7 Days");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  return (
    <div className="page-enter">
      <PageHeader
        title={M.TITLE}
        actions={
          <>
            <PillToggle<AnalyticsPeriod>
              options={PERIOD_OPTIONS}
              value={period}
              onChange={setPeriod}
            />
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </>
        }
      />

      <StatsGrid items={STAT_CARDS} />

      <div className="grid-2 mb20">
        <SalesTrendCard />
        <OrdersByCategoryCard />
      </div>

      <ProductSalesCard />
    </div>
  );
}

export default AnalyticsPage;
