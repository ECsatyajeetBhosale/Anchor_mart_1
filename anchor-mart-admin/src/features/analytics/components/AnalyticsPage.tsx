import { IconCalendar, IconCurrencyDollar, IconPackage, IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { PillToggle } from "@/components/common/PillToggle";
import { StatsGrid, type StatsGridItem } from "@/components/common/StatsGrid";
import { Button } from "@/components/ui/button";
import { MESSAGES } from "@/lib/messages";

import type { AnalyticsPeriod } from "../data/analyticsData";
import { ExpressPerformanceCard } from "./ExpressPerformanceCard";
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
    delta: { value: "18.3%", direction: "up" },
    footer: "vs last month",
  },
  {
    id: "orders",
    label: M.STATS.TOTAL_ORDERS,
    value: "3,421",
    icon: <IconPackage size={19} />,
    variant: "navy",
    delta: { value: "12.1%", direction: "up" },
  },
  {
    id: "sailors",
    label: M.STATS.ACTIVE_SAILORS,
    value: "1,204",
    icon: <IconUsers size={19} />,
    variant: "amber",
    delta: { value: "220 new", direction: "up" },
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

  return (
    <div className="page-enter">
      <PageHeader
        title={M.TITLE}
        subtitle={M.SUBTITLE}
        actions={
          <>
            <PillToggle<AnalyticsPeriod>
              options={PERIOD_OPTIONS}
              value={period}
              onChange={setPeriod}
            />
            <Button variant="secondary" size="sm" onClick={() => toast.info(M.DATE_RANGE_SOON)}>
              <IconCalendar size={14} />
              {M.DATE_RANGE}
            </Button>
          </>
        }
      />

      <StatsGrid items={STAT_CARDS} />

      <div className="grid-2 mb20">
        <SalesTrendCard />
        <OrdersByCategoryCard />
      </div>

      <div className="mb20">
        <ProductSalesCard />
      </div>

      <ExpressPerformanceCard />
    </div>
  );
}

export default AnalyticsPage;
