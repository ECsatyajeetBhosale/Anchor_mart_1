import { IconChartBar, IconDownload } from "@tabler/icons-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
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
import { formatCurrency } from "@/lib/utils";

import { useRevenue } from "../hooks/useRevenue";
import type { RevenueGranularity } from "../types/dashboard.types";

const M = MESSAGES.DASHBOARD;

/** Placeholder shown in the Total metric while data is loading/unavailable. */
const PLACEHOLDER = "—";

/** Bar fill per the mockup: base colors, brighter while hovered. */
function barFill(highlight: boolean, active: boolean): string {
  if (highlight) return active ? "var(--navy-400)" : "var(--navy-600)";
  return active ? "var(--amber-400)" : "var(--amber-200)";
}

const chartConfig: ChartConfig = {
  net: { label: M.REVENUE_TITLE, color: "var(--navy-600)" },
};

export interface RevenueChartCardProps {
  /** Dashboard-wide custom range; scopes the revenue window when complete. */
  dateRange?: DateRange;
}

/**
 * Revenue bar chart (Recharts via the shared {@link ChartContainer}), wired to
 * the revenue endpoint through {@link useRevenue}. Plots `net` per bucket and
 * shows aggregated totals; the daily/weekly toggle and dashboard date range
 * drive refetches. Chart visuals are unchanged — only the data is now live.
 */
export function RevenueChartCard({ dateRange }: RevenueChartCardProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { granularity, setGranularity, data, totals, isLoading, isError, isEmpty, refetch } =
    useRevenue(dateRange);

  // Headroom above the tallest bar mirrors the mockup's slight top gap.
  const maxNet = data.reduce((max, d) => Math.max(max, d.net), 0);
  const yMax = maxNet > 0 ? maxNet * 1.08 : 1;

  return (
    <SectionCard
      bodyPadding="none"
      icon={<IconChartBar size={17} className="text-[var(--t4)]" />}
      title={M.REVENUE_TITLE}
      actions={
        <>
          <PillToggle<RevenueGranularity>
            value={granularity}
            options={[
              { label: M.CHART_MODE.DAILY, value: "daily" },
              { label: M.CHART_MODE.WEEKLY, value: "weekly" },
            ]}
            onChange={setGranularity}
          />
          <Button variant="ghost" size="xs" onClick={() => toast.success(M.REVENUE_EXPORTED)}>
            <IconDownload size={14} />
          </Button>
        </>
      }
    >
      {/* Metrics summary row — single "Total" like the mockup */}
      <div className="flex items-center gap-[22px] border-b border-[var(--border-xs)] p-[15px_20px]">
        <div className="flex flex-col gap-[3px]">
          <div className="text-[10.5px] font-extrabold uppercase tracking-[1px] text-[var(--t4)]">
            {M.METRICS.TOTAL}
          </div>
          <div className="text-[22px] font-extrabold tracking-[-1px] text-[var(--green-text)]">
            {totals ? formatCurrency(totals.net) : PLACEHOLDER}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="card-body">
        {isLoading ? (
          <div className="flex h-[150px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--border-md)] border-t-[var(--teal-500)]" />
          </div>
        ) : isError ? (
          <div className="flex h-[150px] flex-col items-center justify-center gap-3">
            <span className="td-m text-[var(--danger-text)]">{M.ERROR}</span>
            <Button variant="secondary" size="xs" onClick={() => refetch()}>
              {MESSAGES.COMMON.RETRY}
            </Button>
          </div>
        ) : isEmpty ? (
          <div className="flex h-[150px] items-center justify-center">
            <span className="td-m">{M.REVENUE_EMPTY}</span>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[150px]">
            <BarChart
              data={data}
              margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
              barCategoryGap="3%"
              onMouseMove={(state) => {
                const idx = state?.activeTooltipIndex;
                setActiveIndex(typeof idx === "number" ? idx : null);
              }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <YAxis hide domain={[0, yMax]} />
              <XAxis
                dataKey="label"
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
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Bar dataKey="net" radius={[5, 5, 0, 0]} isAnimationActive={false}>
                {data.map((d, i) => (
                  <Cell key={d.label} fill={barFill(d.highlight, activeIndex === i)} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </SectionCard>
  );
}

export default RevenueChartCard;
