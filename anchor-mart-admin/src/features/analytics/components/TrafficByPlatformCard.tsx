import { IconDeviceMobileShare } from "@tabler/icons-react";
import { Cell, Pie, PieChart } from "recharts";

import { SectionCard } from "@/components/common/SectionCard";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { MESSAGES } from "@/lib/messages";
import { formatCurrency } from "@/lib/utils";

import { usePlatformBreakdown } from "../hooks/usePlatformBreakdown";
import { platformColor } from "../lib/platformSeries";
import type { AnalyticsParams } from "../types/analytics.types";
import { ChartState } from "./ChartState";

const M = MESSAGES.ANALYTICS;
const P = M.PLATFORM;

const chartConfig: ChartConfig = { orders_placed: { label: P.COL_ORDERS } };

export interface TrafficByPlatformCardProps {
  params: AnalyticsParams;
}

/**
 * Where the orders are coming from — the sailor app, the web, or unrecorded.
 *
 * A donut for the share and a table for the conversion story, in one card
 * rather than two. The volume question ("which surface is busier") and the
 * quality question ("does that traffic pay and get delivered") are the same
 * question asked twice, and splitting them across cards would mean reading a
 * platform's name in one place and its numbers in another.
 *
 * The table is not decoration: the teal wedge sits below 3:1 against the card
 * surface, so the exact figures next to a named row are what keeps every value
 * readable without relying on the fill.
 */
export function TrafficByPlatformCard({ params }: TrafficByPlatformCardProps) {
  const { rows, total, period, isLoading, isError, isForbidden, isEmpty, refetch } =
    usePlatformBreakdown(params);

  // Not admin-tier. Hiding beats an error box: the account cannot be given this
  // data, so there is nothing here for them to retry or act on.
  if (isForbidden) return null;

  return (
    <SectionCard
      icon={<IconDeviceMobileShare size={17} className="text-[var(--t4)]" />}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {P.TITLE}
          {/* The server's own statement of what it measured. Rendered rather
              than re-derived from the filter, so a window the backend resolved
              differently than expected is visible instead of silently assumed. */}
          {period && (
            <span className="font-semibold text-[12.5px] text-[var(--t3)]">
              {P.PERIOD_PREFIX} {period}
            </span>
          )}
        </span>
      }
    >
      <ChartState
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        emptyMessage={P.EMPTY}
        onRetry={refetch}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <ChartContainer config={chartConfig} className="h-[150px] w-[150px] shrink-0">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_label, payload) => payload?.[0]?.payload?.label}
                      formatter={(value) => M.ORDERS_SUFFIX(Number(value))}
                    />
                  }
                />
                <Pie
                  data={rows}
                  dataKey="orders_placed"
                  nameKey="label"
                  innerRadius={38}
                  outerRadius={64}
                  // A hairline of card surface between wedges, so two adjacent
                  // fills stay separable without a border darkening the chart.
                  stroke="var(--surface)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {rows.map((row) => (
                    // Keyed on the machine value, so a wedge keeps its colour
                    // when the ranking changes between periods.
                    <Cell key={row.platform} fill={platformColor(row.platform)} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div>
                <div className="text-[11px] text-[var(--t4)]! font-bold uppercase tracking-wide">
                  {P.TOTAL}
                </div>
                <div className="font-extrabold text-[var(--t1)]! text-[22px] tabular-nums">
                  {(total ?? 0).toLocaleString()}
                </div>
              </div>
              {/* The legend doubles as the share readout — identity is never
                  carried by the wedge colour alone. */}
              <ul className="flex flex-col gap-1">
                {rows.map((row) => (
                  <li key={row.platform} className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: platformColor(row.platform) }}
                    />
                    <span className="font-semibold text-[var(--t3)]! min-w-0 flex-1 truncate text-[12.5px]">
                      {row.label}
                    </span>
                    <span className="font-bold text-[var(--t1)]! tabular-nums text-[12.5px]">
                      {row.share_pct}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="tbl-wrap overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-[var(--border-sm)] border-b">
                  <th className="font-bold! text-[var(--t3)]! px-2 py-1.5 text-left">
                    {P.COL_PLATFORM}
                  </th>
                  <th className="font-bold! text-[var(--t3)]! px-2 py-1.5 text-right">
                    {P.COL_PAID}
                  </th>
                  <th className="font-bold! text-[var(--t3)]! px-2 py-1.5 text-right">
                    {P.COL_REVENUE}
                  </th>
                  <th className="font-bold! text-[var(--t3)]! px-2 py-1.5 text-right">
                    {P.COL_DELIVERED}
                  </th>
                  <th className="font-bold! text-[var(--t3)]! px-2 py-1.5 text-right">
                    {P.COL_CANCELLED}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.platform}
                    className="border-[var(--border-xs)] border-b last:border-0"
                  >
                    <td className="font-semibold! text-[var(--t2)]! px-2 py-1.5">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: platformColor(row.platform) }}
                        />
                        {row.label}
                      </span>
                    </td>
                    <td className="text-[var(--t2)]! px-2 py-1.5 text-right tabular-nums">
                      {row.paid_orders}
                    </td>
                    {/* JSON numbers, not strings — formatted, never parsed. */}
                    <td className="text-[var(--t2)]! px-2 py-1.5 text-right tabular-nums">
                      {formatCurrency(row.gross_revenue)}
                    </td>
                    <td className="text-[var(--t2)]! px-2 py-1.5 text-right tabular-nums">
                      {row.deliveries}
                    </td>
                    <td className="text-[var(--t2)]! px-2 py-1.5 text-right tabular-nums">
                      {row.cancelled_orders}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-[var(--t4)]! font-semibold leading-relaxed">
            {P.UNKNOWN_NOTE}
          </p>
        </div>
      </ChartState>
    </SectionCard>
  );
}

export default TrafficByPlatformCard;
