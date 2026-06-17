import { IconChartBar } from "@tabler/icons-react";

import { SectionCard } from "@/components/common/SectionCard";
import { MESSAGES } from "@/lib/messages";

import { ORDERS_BY_CATEGORY } from "../data/analyticsData";
import { AnalyticsBarChart } from "./AnalyticsBarChart";

const M = MESSAGES.ANALYTICS;

const BARS = ORDERS_BY_CATEGORY.map((c) => ({
  label: c.label,
  heightPct: c.orders,
  title: `${c.label}: ${M.ORDERS_SUFFIX(c.orders)}`,
}));

/** Order volume per product category (teal bars). */
export function OrdersByCategoryCard() {
  return (
    <SectionCard
      icon={<IconChartBar size={17} className="text-[var(--t4)]" />}
      title={M.ORDERS_BY_CATEGORY}
    >
      <AnalyticsBarChart bars={BARS} variant="teal" />
    </SectionCard>
  );
}

export default OrdersByCategoryCard;
