import { IconChartBar } from "@tabler/icons-react";

import { SectionCard } from "@/components/common/SectionCard";
import { MESSAGES } from "@/lib/messages";

import { useSalesTrend } from "../hooks/useSalesTrend";
import type { AnalyticsParams } from "../types/analytics.types";
import { AnalyticsBarChart } from "./AnalyticsBarChart";
import { ChartState } from "./ChartState";

const M = MESSAGES.ANALYTICS;

export interface SalesTrendCardProps {
  params: AnalyticsParams;
}

/** Daily sales-revenue trend (navy bars), wired to the sales-trend endpoint. */
export function SalesTrendCard({ params }: SalesTrendCardProps) {
  const { bars, isLoading, isError, isEmpty, refetch } = useSalesTrend(params);

  return (
    <SectionCard
      icon={<IconChartBar size={17} className="text-[var(--t4)]" />}
      title={M.SALES_TREND}
    >
      <ChartState isLoading={isLoading} isError={isError} isEmpty={isEmpty} onRetry={refetch}>
        <AnalyticsBarChart
          bars={bars}
          color="var(--navy-600)"
          hoverColor="var(--navy-400)"
          tooltipFormatter={(value) => `$${value.toLocaleString()}`}
        />
      </ChartState>
    </SectionCard>
  );
}

export default SalesTrendCard;
