import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

/** One bucket: a shared axis identity plus a value per series. */
export interface StackedBar {
  /** Unique axis category. Bars sharing display text never collapse into one band. */
  key: string;
  /** Short axis tick. */
  label: string;
  /** Unabbreviated identity for the tooltip — ticks are thinned, this never is. */
  fullLabel?: string;
  /** `{ seriesKey: value }`, zero-filled for every series. */
  values: Record<string, number>;
}

export interface AnalyticsStackedBarChartProps {
  bars: StackedBar[];
  /** Series keys in render order — bottom of the stack first. */
  series: readonly string[];
  /** Display name per series key. */
  seriesLabel: (key: string) => string;
  /** Resting fill per series key. */
  seriesColor: (key: string) => string;
  tooltipFormatter: (value: number) => string;
  heightClassName?: string;
  minTickGap?: number;
}

/**
 * Stacked counterpart to {@link AnalyticsBarChart}, for a total that is worth
 * seeing whole *and* worth seeing split.
 *
 * Stacked rather than grouped because the question this chart answers is "where
 * did the day's orders come from" — a part-to-whole reading. Grouped bars put
 * every series on the baseline, which compares them well but makes the daily
 * total something the eye has to add up. Stacking gives the total for free and
 * keeps the dominant series (the one on the baseline) directly comparable; the
 * cost is that upper segments are harder to compare across buckets, which the
 * breakdown card's exact numbers already cover.
 *
 * The series list is a prop rather than a constant so the caller can take it
 * from the payload; the colour and label functions keep the chart ignorant of
 * what a series *is*.
 */
export function AnalyticsStackedBarChart({
  bars,
  series,
  seriesLabel,
  seriesColor,
  tooltipFormatter,
  heightClassName = "h-[150px]",
  minTickGap = 14,
}: AnalyticsStackedBarChartProps) {
  // Recharts reads flat rows, so the per-series map is spread onto the datum.
  const data = useMemo(() => bars.map((b) => ({ key: b.key, ...b.values })), [bars]);

  // Names the tooltip rows. Without this each row falls back to the raw series
  // key, so the chart would say "app" where its legend says "App".
  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    for (const key of series) config[key] = { label: seriesLabel(key) };
    return config;
  }, [series, seriesLabel]);

  const labelByKey: Record<string, string> = {};
  const fullLabelByKey: Record<string, string> = {};
  for (const b of bars) {
    labelByKey[b.key] = b.label;
    fullLabelByKey[b.key] = b.fullLabel ?? b.label;
  }

  return (
    <ChartContainer config={chartConfig} className={heightClassName}>
      <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} barCategoryGap="18%">
        <YAxis hide />
        <XAxis
          dataKey="key"
          tickFormatter={(key) => labelByKey[key] ?? key}
          tickLine={false}
          axisLine={false}
          // Same thinning rule as the single-series chart: Recharts measures the
          // rendered labels and drops any that would crowd their neighbour,
          // pinning the first and last so the window's bounds stay visible.
          interval="preserveStartEnd"
          minTickGap={minTickGap}
          tickMargin={8}
          tick={{ fontSize: 9.5, fontWeight: 600 }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(label) => fullLabelByKey[String(label)] ?? label}
              formatter={(value) => tooltipFormatter(Number(value))}
            />
          }
        />
        {series.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="platform"
            fill={seriesColor(key)}
            // Only the top of the stack is rounded — rounding every segment
            // would carve notches into what should read as one column.
            radius={index === series.length - 1 ? [5, 5, 0, 0] : undefined}
            // A hairline of card surface between segments, so two adjacent
            // fills stay separable without a border darkening the chart.
            stroke="var(--surface)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

export default AnalyticsStackedBarChart;
