import { IconChartAreaLine } from "@tabler/icons-react";
import { useMemo } from "react";

import { SectionCard } from "@/components/common/SectionCard";
import { MESSAGES } from "@/lib/messages";

import { usePlatformBreakdown } from "../hooks/usePlatformBreakdown";
import { usePlatformTrend } from "../hooks/usePlatformTrend";
import { platformColor, platformFallbackLabel } from "../lib/platformSeries";
import type { AnalyticsParams } from "../types/analytics.types";
import { AnalyticsStackedBarChart } from "./AnalyticsStackedBarChart";
import { ChartState } from "./ChartState";

const M = MESSAGES.ANALYTICS;
const P = M.PLATFORM;

export interface PlatformTrendCardProps {
  params: AnalyticsParams;
}

/**
 * Orders placed per bucket, stacked by platform.
 *
 * Only volume is broken out over time. Revenue by platform is deliberately not
 * offered as a stacked series — placed, paid, and delivered are three different
 * recognition bases, and mixing them inside one column produces a chart whose
 * segments no longer reconcile with anything. The money lives on the breakdown
 * card, where each basis has its own column.
 *
 * Buckets on the same adaptive granularity as the Sales Trend chart, so the two
 * read as one timeline across the screen rather than two windows that happen to
 * share a filter.
 */
export function PlatformTrendCard({ params }: PlatformTrendCardProps) {
  const { bars, platforms, period, isLoading, isError, isForbidden, isEmpty, refetch } =
    usePlatformTrend(params);

  // Labels are only sent by the breakdown endpoint. Both calls are already on
  // the page under the same filter, so this is a cache read rather than an
  // extra request — and the chart still renders from the trend payload alone if
  // the breakdown is slower or absent.
  const breakdown = usePlatformBreakdown(params);
  const labelByPlatform = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of breakdown.rows) map[row.platform] = row.label;
    return map;
  }, [breakdown.rows]);

  if (isForbidden) return null;

  const seriesLabel = (key: string) => labelByPlatform[key] ?? platformFallbackLabel(key);

  return (
    <SectionCard
      icon={<IconChartAreaLine size={17} className="text-[var(--t4)]" />}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {P.TREND_TITLE}
          {period && (
            <span className="font-semibold text-[12.5px] text-[var(--t3)]">
              {P.PERIOD_PREFIX} {period}
            </span>
          )}
        </span>
      }
      // The legend is built from the response's series list, not a constant —
      // a platform the backend starts reporting appears without a code change,
      // and in the order the server chose to render them.
      actions={
        <div className="flex flex-wrap items-center gap-3">
          {platforms.map((key) => (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: platformColor(key) }}
              />
              <span className="font-semibold text-[var(--t3)]! text-[12px]">
                {seriesLabel(key)}
              </span>
            </span>
          ))}
        </div>
      }
    >
      <ChartState
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        emptyMessage={P.EMPTY}
        onRetry={refetch}
      >
        <AnalyticsStackedBarChart
          bars={bars}
          series={platforms}
          seriesLabel={seriesLabel}
          seriesColor={(key) => platformColor(key)}
          tooltipFormatter={(value) => M.ORDERS_SUFFIX(value)}
        />
      </ChartState>
    </SectionCard>
  );
}

export default PlatformTrendCard;
