import { useState } from "react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

/** A single bar. `key` is the unique axis category; `label` is its display text. */
export interface ChartBar {
  key: string;
  label: string;
  value: number;
  /**
   * Unabbreviated identity for the tooltip. Ticks are thinned on a crowded axis,
   * so on a long window hovering is the only way to tell which bucket a bar is —
   * this is what makes that readable. Falls back to `label` when omitted.
   */
  fullLabel?: string;
}

const chartConfig: ChartConfig = {
  value: { label: "Value" },
};

export interface AnalyticsBarChartProps {
  bars: ChartBar[];
  /** Resting bar color (design token). */
  color: string;
  /** Bar color while hovered. */
  hoverColor: string;
  /** Formats the tooltip value (e.g. currency, "85 orders", "3 units"). */
  tooltipFormatter: (value: number) => string;
  /** Chart height (Tailwind class). Defaults to the dashboard's 150px. */
  heightClassName?: string;
  /**
   * Minimum pixel gap between rendered tick labels. Raise it for a denser font
   * or a narrower card.
   */
  minTickGap?: number;
}

/**
 * Shared analytics bar chart — Recharts via the project's {@link ChartContainer},
 * matching the dashboard's revenue chart. Bars scale to the data and brighten on
 * hover. The axis category is the unique `key`, so bars with the same display
 * text never collapse into one band.
 *
 * The axis thins its own labels as the series grows (see the `XAxis` below), so
 * a 30-day or 12-month window stays readable. Because a thinned tick means some
 * bars have no label, the tooltip always shows `fullLabel` — the unabbreviated
 * identity — rather than the terse axis text.
 */
export function AnalyticsBarChart({
  bars,
  color,
  hoverColor,
  tooltipFormatter,
  heightClassName = "h-[150px]",
  minTickGap = 14,
}: AnalyticsBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Small headroom above the tallest bar, mirroring the dashboard's top gap.
  const max = bars.reduce((m, b) => Math.max(m, b.value), 0);
  const yMax = max > 0 ? max * 1.08 : 1;

  // Map each axis category back to its labels — the short one for ticks, the
  // full one for the tooltip header.
  const labelByKey: Record<string, string> = {};
  const fullLabelByKey: Record<string, string> = {};
  for (const b of bars) {
    labelByKey[b.key] = b.label;
    fullLabelByKey[b.key] = b.fullLabel ?? b.label;
  }

  return (
    <ChartContainer config={chartConfig} className={heightClassName}>
      <BarChart
        data={bars}
        margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
        barCategoryGap="18%"
        onMouseMove={(state) => {
          const idx = state?.activeTooltipIndex;
          setActiveIndex(typeof idx === "number" ? idx : null);
        }}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <YAxis hide domain={[0, yMax]} />
        <XAxis
          dataKey="key"
          tickFormatter={(key) => labelByKey[key] ?? key}
          tickLine={false}
          axisLine={false}
          /**
           * This used to be `interval={0}` — draw every tick — which reads fine
           * across 7 bars and turns into a smear at 30, 90 or 365, where labels
           * overlap each other.
           *
           * `preserveStartEnd` hands the thinning to Recharts, which *measures*
           * the rendered labels and drops any that would fall within
           * `minTickGap` of its neighbour, while pinning the first and last so
           * the window's bounds always stay visible. Measuring is what makes it
           * adaptive: "Aug" is narrow enough to show twelve of, "12 Aug" is not,
           * and the same rule handles a card resize without a magic number.
           * Every bar is still individually identified by the tooltip.
           */
          interval="preserveStartEnd"
          minTickGap={minTickGap}
          tickMargin={8}
          tick={{ fontSize: 9.5, fontWeight: 600 }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(label) => fullLabelByKey[String(label)] ?? label}
              formatter={(value) => tooltipFormatter(Number(value))}
            />
          }
        />
        <Bar dataKey="value" radius={[5, 5, 0, 0]} isAnimationActive={false}>
          {bars.map((b, i) => (
            <Cell key={b.key} fill={activeIndex === i ? hoverColor : color} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export default AnalyticsBarChart;
