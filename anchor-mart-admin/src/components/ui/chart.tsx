import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

/**
 * Per-series chart config. `color` accepts any CSS color — prefer a design
 * token, e.g. `color: "var(--navy-600)"`. Exposed to Recharts as `--color-<key>`.
 */
export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  };
};

type ChartContextProps = { config: ChartConfig };

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

/** Build the `--color-<key>` CSS variables consumed by Recharts series. */
function chartColorVars(config: ChartConfig): React.CSSProperties {
  const vars: Record<string, string> = {};
  for (const [key, item] of Object.entries(config)) {
    if (item.color) vars[`--color-${key}`] = item.color;
  }
  return vars as React.CSSProperties;
}

export interface ChartContainerProps extends React.ComponentProps<"div"> {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}

/**
 * Token-themed wrapper around Recharts' {@link RechartsPrimitive.ResponsiveContainer}.
 * Themes axes/grid/cursor via the project's design tokens and injects per-series
 * `--color-<key>` variables from `config`. The canonical chart primitive — reuse
 * it instead of hand-rolling SVG or raw Recharts containers.
 */
export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, children, config, style, ...props }, ref) => (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={cn(
          "w-full text-[var(--t4)]",
          "[&_.recharts-cartesian-axis-tick_text]:fill-[var(--t4)]",
          "[&_.recharts-cartesian-grid_line]:stroke-[var(--border-xs)]",
          "[&_.recharts-cartesian-axis_line]:stroke-[var(--border-sm)]",
          "[&_.recharts-tooltip-cursor]:fill-[var(--surface-hover)]",
          "[&_.recharts-surface]:outline-none [&_.recharts-sector]:outline-none",
          className,
        )}
        style={{ ...chartColorVars(config), ...style }}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  ),
);
ChartContainer.displayName = "ChartContainer";

/** Re-export of Recharts' Tooltip — pair with {@link ChartTooltipContent}. */
export const ChartTooltip = RechartsPrimitive.Tooltip;

export interface ChartTooltipContentProps {
  active?: boolean;
  // biome-ignore lint/suspicious/noExplicitAny: Recharts payload is loosely typed.
  payload?: any[];
  label?: React.ReactNode;
  // biome-ignore lint/suspicious/noExplicitAny: Recharts label/payload are loosely typed.
  labelFormatter?: (label: any, payload: any[]) => React.ReactNode;
  // biome-ignore lint/suspicious/noExplicitAny: Recharts value/item are loosely typed.
  formatter?: (value: any, name: string, item: any) => React.ReactNode;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  className?: string;
}

/** Themed tooltip body, styled with the project's surface/border/shadow tokens. */
export const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    { active, payload, label, labelFormatter, formatter, hideLabel, hideIndicator, className },
    ref,
  ) => {
    const { config } = useChart();
    if (!active || !payload?.length) return null;

    const renderedLabel = hideLabel
      ? null
      : labelFormatter
        ? labelFormatter(label, payload)
        : label;

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-md)] bg-[var(--surface)] px-3 py-2 text-[12px] shadow-[var(--shadow-md)]",
          className,
        )}
      >
        {renderedLabel != null && <div className="font-bold text-[var(--t2)]">{renderedLabel}</div>}
        <div className="grid gap-1.5">
          {payload.map((item, i) => {
            const key = String(item.dataKey ?? item.name ?? `item-${i}`);
            const itemConfig = config[key];
            const color = item.payload?.fill ?? item.color ?? itemConfig?.color;
            return (
              <div key={key} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {!hideIndicator && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  <span className="text-[var(--t4)]">{itemConfig?.label ?? item.name}</span>
                </div>
                <span className="font-bold tabular-nums text-[var(--t1)]">
                  {formatter ? formatter(item.value, item.name, item) : item.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltipContent";
