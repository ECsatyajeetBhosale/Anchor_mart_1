import { IconChartHistogram } from "@tabler/icons-react";

import { DropdownSelect } from "@/components/common/DropdownSelect";
import { SectionCard } from "@/components/common/SectionCard";
import { MESSAGES } from "@/lib/messages";
import { formatCurrency } from "@/lib/utils";

import { useProductSales } from "../hooks/useProductSales";
import type { AnalyticsParams } from "../types/analytics.types";
import { AnalyticsBarChart } from "./AnalyticsBarChart";
import { ChartState } from "./ChartState";

const M = MESSAGES.ANALYTICS;

/** Placeholder shown in a metric while data is loading or unavailable. */
const PLACEHOLDER = "—";

/** Format a growth percentage with the existing ↑/↓ prefix. */
function formatGrowth(value: number | undefined): string {
  if (value === undefined) return PLACEHOLDER;
  const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "";
  return `${arrow} ${Math.abs(value)}%`.trim();
}

export interface ProductSalesCardProps {
  params: AnalyticsParams;
}

/**
 * Product-wise weekly sales — the product picker drives the metric summary
 * (revenue / units / growth) and the daily units bar chart below it, all wired
 * to the product-sales endpoint.
 */
export function ProductSalesCard({ params }: ProductSalesCardProps) {
  const {
    revenue,
    unitsSold,
    growth,
    bars,
    options,
    selectedId,
    setProductId,
    isLoading,
    isError,
    isEmpty,
    refetch,
  } = useProductSales(params);

  return (
    <SectionCard
      bodyPadding="none"
      icon={<IconChartHistogram size={17} className="text-[var(--t4)]" />}
      title={M.PRODUCT_SALES}
      actions={
        <DropdownSelect
          value={selectedId}
          onValueChange={setProductId}
          options={options}
          width="200px"
        />
      }
    >
      {/* Metric summary row */}
      <div className="metric-row">
        <div className="metric-item">
          <div className="metric-lbl">{M.PRODUCT_METRICS.REVENUE_7D}</div>
          <div className="metric-val text-[var(--teal-700)]!">
            {revenue === undefined ? PLACEHOLDER : formatCurrency(revenue)}
          </div>
        </div>
        <div className="metric-sep" />
        <div className="metric-item">
          <div className="metric-lbl">{M.PRODUCT_METRICS.UNITS_SOLD}</div>
          <div className="metric-val">
            {unitsSold === undefined ? PLACEHOLDER : M.UNITS_SUFFIX(unitsSold)}
          </div>
        </div>
        <div className="metric-sep" />
        <div className="metric-item">
          <div className="metric-lbl">{M.PRODUCT_METRICS.GROWTH}</div>
          <div className="metric-val text-[var(--green-text)]!">
            {formatGrowth(growth?.revenue)}
          </div>
        </div>
      </div>

      {/* Daily units bar chart */}
      <div className="card-body">
        <ChartState isLoading={isLoading} isError={isError} isEmpty={isEmpty} onRetry={refetch}>
          <AnalyticsBarChart
            bars={bars}
            color="var(--teal-200)"
            hoverColor="var(--teal-500)"
            tooltipFormatter={(value) => M.UNITS_SUFFIX(value)}
          />
        </ChartState>
      </div>
    </SectionCard>
  );
}

export default ProductSalesCard;
