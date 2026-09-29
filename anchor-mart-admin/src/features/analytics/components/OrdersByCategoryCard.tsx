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
  const { bars, isLoading, isError, error, isEmpty, refetch } = useOrdersByCategory(params);

  return (
    <SectionCard
      icon={<IconChartBar size={17} className="text-[var(--t4)]" />}
      title={M.ORDERS_BY_CATEGORY}
    >
      <ChartState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={isEmpty}
        onRetry={refetch}
      >
        <AnalyticsBarChart
          bars={bars}
          color="var(--teal-200)"
          hoverColor="var(--teal-500)"
          tooltipFormatter={(value) => M.DELIVERED_UNITS_SUFFIX(value)}
        />
      </ChartState>
    </SectionCard>
  );
}

export default OrdersByCategoryCard;
