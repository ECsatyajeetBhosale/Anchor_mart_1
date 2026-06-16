import { IconChartBar, IconDownload } from "@tabler/icons-react";
import { useState } from "react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { PillToggle } from "@/components/common/PillToggle";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { MESSAGES } from "@/lib/messages";

const M = MESSAGES.DASHBOARD;

/* ─── Mock revenue data — pending a revenue/timeseries endpoint ───────────── */
const CHART_VALS = [48, 62, 55, 80, 70, 95, 84, 110, 88, 102, 114, 98, 128, 112];
const CHART_DAYS = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];

/** Bars from this index on are emphasised (navy) vs amber — matches the mockup. */
const HIGHLIGHT_FROM = 7;
/** Y domain max mirrors the legacy `height: value / 1.3 %` scaling (max ≈ 130). */
const Y_MAX = 130;

const revenueData = CHART_DAYS.map((day, i) => ({
  day: `May ${day}`,
  revenue: CHART_VALS[i],
  highlight: i >= HIGHLIGHT_FROM,
}));

/** Bar fill per the mockup: base colors, brighter while hovered. */
function barFill(highlight: boolean, active: boolean): string {
  if (highlight) return active ? "var(--navy-400)" : "var(--navy-600)";
  return active ? "var(--amber-400)" : "var(--amber-200)";
}

const chartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "var(--navy-600)" },
};

/**
 * Revenue bar chart (last 14 days), rendered with Recharts via the shared
 * {@link ChartContainer} primitive but styled to match the legacy mockup exactly:
 * gridless, full-width amber/navy bars that brighten on hover. Mock data until a
 * revenue timeseries endpoint exists.
 */
export function RevenueChartCard() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <SectionCard
      bodyPadding="none"
      icon={<IconChartBar size={17} className="text-[var(--t4)]" />}
      title={M.REVENUE_TITLE}
      actions={
        <>
          <PillToggle
            value={M.CHART_MODE.DAILY}
            options={[
              { label: M.CHART_MODE.DAILY, value: M.CHART_MODE.DAILY },
              { label: M.CHART_MODE.WEEKLY, value: M.CHART_MODE.WEEKLY },
            ]}
            onChange={(v) => {
              if (v === M.CHART_MODE.WEEKLY) toast.info(M.WEEKLY_LOADING);
            }}
          />
          <Button variant="ghost" size="xs" onClick={() => toast.success(M.REVENUE_EXPORTED)}>
            <IconDownload size={14} />
          </Button>
        </>
      }
    >
      {/* Metrics summary row — single "Total" like the mockup */}
      <div className="metric-row">
        <div className="metric-item">
          <div className="metric-lbl">{M.METRICS.TOTAL}</div>
          <div className="metric-val text-[var(--green-text)]!">$168.2k</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="card-body">
        <ChartContainer config={chartConfig} className="h-[150px]">
          <BarChart
            data={revenueData}
            margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
            barCategoryGap="4%"
            onMouseMove={(state) => {
              const idx = state?.activeTooltipIndex;
              setActiveIndex(typeof idx === "number" ? idx : null);
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <YAxis hide domain={[0, Y_MAX]} />
            <XAxis
              dataKey="day"
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
                  formatter={(value) => `$${(Number(value) * 145).toLocaleString()}`}
                />
              }
            />
            <Bar dataKey="revenue" radius={[5, 5, 0, 0]} isAnimationActive={false}>
              {revenueData.map((d, i) => (
                <Cell key={d.day} fill={barFill(d.highlight, activeIndex === i)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </SectionCard>
  );
}

export default RevenueChartCard;
