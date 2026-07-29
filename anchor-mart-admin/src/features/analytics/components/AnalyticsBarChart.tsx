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
}

/**
 * Shared analytics bar chart — Recharts via the project's {@link ChartContainer},
 * matching the dashboard's revenue chart. Bars scale to the data and brighten on
 * hover. The axis category is the unique `key`; ticks and the tooltip header show
 * the human `label` (so repeated weekday labels don't collapse into one band).
 */
export function AnalyticsBarChart({
  bars,
  color,
  hoverColor,
  tooltipFormatter,
  heightClassName = "h-[150px]",
}: AnalyticsBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Small headroom above the tallest bar, mirroring the dashboard's top gap.
  const max = bars.reduce((m, b) => Math.max(m, b.value), 0);
  const yMax = max > 0 ? max * 1.08 : 1;

  // Map each axis category back to its display label for ticks + tooltip header.
  const labelByKey: Record<string, string> = {};
  for (const b of bars) labelByKey[b.key] = b.label;

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
          interval={0}
          tickMargin={8}
          tick={{ fontSize: 9.5, fontWeight: 600 }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(label) => labelByKey[String(label)] ?? label}
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
