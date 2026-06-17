import { cn } from "@/lib/utils";

/** A single bar: `heightPct` drives its height (0–100), `title` the hover tooltip. */
export interface ChartBar {
  label: string;
  heightPct: number;
  title: string;
}

export interface AnalyticsBarChartProps {
  bars: ChartBar[];
  /** Bar color modifier — `hi` (navy) or `teal`, per the design system. */
  variant: "hi" | "teal";
  /** Chart area height (Tailwind class). Defaults to the reference's 130px. */
  heightClassName?: string;
}

/**
 * Labelled bar chart built from the design-system `.bar-chart` / `.chart-bar` /
 * `.chart-labels` classes — a faithful port of the reference mockup's charts
 * (hover lift + color come from CSS). Reused by the Sales Trend, Orders-by-
 * Category, and Product-wise Sales cards.
 */
export function AnalyticsBarChart({
  bars,
  variant,
  heightClassName = "h-[130px]",
}: AnalyticsBarChartProps) {
  return (
    <>
      <div className={cn("bar-chart", heightClassName)}>
        {bars.map((b) => (
          <div
            key={b.label}
            className={cn("chart-bar", variant)}
            style={{ height: `${b.heightPct}%` }}
            title={b.title}
          />
        ))}
      </div>
      <div className="chart-labels">
        {bars.map((b) => (
          <div key={b.label} className="chart-label">
            {b.label}
          </div>
        ))}
      </div>
    </>
  );
}

export default AnalyticsBarChart;
