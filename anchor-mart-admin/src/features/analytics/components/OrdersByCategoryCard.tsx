import { IconChartBar } from "@tabler/icons-react";

import { SectionCard } from "@/components/common/SectionCard";
import { MESSAGES } from "@/lib/messages";

import { useOrdersByCategory } from "../hooks/useOrdersByCategory";
import type { AnalyticsParams } from "../types/analytics.types";
import { AnalyticsBarChart } from "./AnalyticsBarChart";
import { ChartState } from "./ChartState";

const M = MESSAGES.ANALYTICS;

export interface OrdersByCategoryCardProps {
  params: AnalyticsParams;
}

/** Order volume per product category (teal bars), wired to the category endpoint. */
export function OrdersByCategoryCard({ params }: OrdersByCategoryCardProps) {
  const { bars, isLoading, isError, isEmpty, refetch } = useOrdersByCategory(params);

  return (
    <SectionCard
      icon={<IconChartBar size={17} className="text-[var(--t4)]" />}
      title={M.ORDERS_BY_CATEGORY}
    >
      <ChartState isLoading={isLoading} isError={isError} isEmpty={isEmpty} onRetry={refetch}>
        <AnalyticsBarChart bars={bars} variant="teal" />
      </ChartState>
    </SectionCard>
  );
}

export default OrdersByCategoryCard;
