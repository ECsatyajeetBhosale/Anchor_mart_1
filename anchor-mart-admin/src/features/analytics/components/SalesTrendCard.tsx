import { IconChartBar } from "@tabler/icons-react";

import { SectionCard } from "@/components/common/SectionCard";
import { MESSAGES } from "@/lib/messages";

import { SALES_TREND } from "../data/analyticsData";
import { AnalyticsBarChart } from "./AnalyticsBarChart";

const M = MESSAGES.ANALYTICS;

const BARS = SALES_TREND.map((p) => ({
  label: p.label,
  heightPct: p.height,
  title: `${p.label}: $${p.revenue.toLocaleString()}`,
}));

/** Daily sales-revenue trend (navy bars) for the last 14 days. */
export function SalesTrendCard() {
  return (
    <SectionCard
      icon={<IconChartBar size={17} className="text-[var(--t4)]" />}
      title={M.SALES_TREND}
    >
      <AnalyticsBarChart bars={BARS} variant="hi" />
    </SectionCard>
  );
}

export default SalesTrendCard;
