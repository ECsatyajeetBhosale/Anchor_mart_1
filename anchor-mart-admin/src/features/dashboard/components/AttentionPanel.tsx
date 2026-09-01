import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Severity, which is the only thing colour means on this screen.
 *
 * `danger` — work that has already gone wrong.
 * `warning` — a deadline that has passed.
 * `review`  — a queue waiting on a decision, not itself a failure.
 */
export type AttentionSeverity = "danger" | "warning" | "review";

export interface AttentionPanelProps {
  label: string;
  /** Preformatted by {@link useDashboard} — "—" while loading, localised otherwise. */
  value: string;
  /** One line saying what the number means. Not a restatement of the label. */
  description: string;
  icon: ReactNode;
  severity: AttentionSeverity;
  /**
   * A qualifier under the description, e.g. "Oldest 6 days ago". Changes what
   * the number means rather than what it is, which is why it sits below.
   */
  meta?: string | null;
  /**
   * Omitted where no screen exists to drill into. Several of these deliberately
   * have none — see the notes in DashboardPage — and without a handler the panel
   * renders as a plain div with no hover, no cursor and no focus ring, so it
   * never advertises a click it cannot honour.
   */
  onClick?: () => void;
}

interface SeverityTheme {
  /** The heavier left rule. The only place the severity hue carries weight. */
  rule: string;
  value: string;
  icon: string;
  meta: string;
}

/**
 * Three parts of one panel move together per severity — rule, figure and icon
 * tile — so they are declared together rather than as three parallel lookups
 * that could drift apart.
 */
const SEVERITY: Record<AttentionSeverity, SeverityTheme> = {
  danger: {
    rule: "border-l-[color:var(--danger-icon)]",
    value: "text-[var(--danger-text)]",
    icon: "bg-[var(--danger-bg)] text-[var(--danger-icon)]",
    meta: "text-[var(--danger-text)]",
  },
  warning: {
    rule: "border-l-[color:var(--warning-icon)]",
    value: "text-[var(--warning-text)]",
    icon: "bg-[var(--warning-bg)] text-[var(--warning-icon)]",
    meta: "text-[var(--warning-text)]",
  },
  review: {
    rule: "border-l-[color:var(--purple-icon)]",
    value: "text-[var(--purple-text)]",
    icon: "bg-[var(--purple-bg)] text-[var(--purple-icon)]",
    meta: "text-[var(--purple-text)]",
  },
};

/**
 * A zero is the good outcome here, so it is drained of severity entirely: grey
 * rule, grey number, no coloured tile. An empty queue must not look like an
 * alert, or the coloured ones stop meaning anything.
 */
const CLEAR: SeverityTheme = {
  rule: "border-l-[color:var(--border-sm)]",
  value: "text-[var(--t4)]",
  icon: "bg-[var(--surface-alt)] text-[var(--t4)]",
  // Never rendered on a cleared panel, but declared so the shape is total.
  meta: "",
};

/**
 * The panel shell: a near-white body carrying a heavier left rule.
 *
 * Three sides at a hairline and the left at 3px, which is the whole visual
 * device — panels, not cards, so severity reads down the left edge instead of
 * from a coloured fill.
 */
const PANEL =
  "relative w-full rounded-[var(--radius-md)] " +
  "border-y border-r border-[var(--border-sm)] border-l-[3px] bg-[var(--surface)] " +
  "p-[15px_16px_15px_17px] text-left " +
  "transition-[box-shadow,transform,border-color] duration-[160ms] ease-[ease]";

/**
 * Only the clickable ones lift. A hover state on a dead panel promises a click
 * that never happens — several of these deliberately have no route.
 */
const CLICKABLE =
  "cursor-pointer hover:-translate-y-px hover:shadow-[var(--sh-sm)] " +
  "hover:border-[var(--border-lg)] motion-reduce:hover:transform-none " +
  "focus-visible:[outline:2px_solid_var(--teal-500)] focus-visible:[outline-offset:2px]";

/**
 * One item in the Needs Attention block.
 *
 * A **zero drops its severity entirely** — grey rule, grey number, plain icon
 * tile. An empty queue is the good outcome, and painting it red teaches the
 * operator to discount the colour on the day it means something. `"0"` is
 * matched after formatting, so a loading dash keeps the neutral treatment too
 * without being mistaken for a cleared queue.
 */
export function AttentionPanel({
  label,
  value,
  description,
  icon,
  severity,
  meta,
  onClick,
}: AttentionPanelProps) {
  const isClear = value === "0";
  const theme = isClear ? CLEAR : SEVERITY[severity];
  const className = cn(PANEL, theme.rule, onClick && CLICKABLE);

  const body = (
    <>
      {/* Icon and figure share a row; everything below it runs the full width of
          the panel. The prose used to sit in a column beside the icon, indented
          to the figure's left edge, which read as a hanging indent — the label
          describes the whole panel, not the number, so it starts where the panel
          starts. `items-center` because the two are now peers on one line
          rather than a tile beside a tall stack. */}
      <div className="flex items-center gap-[12px]">
        <div
          className={cn(
            "flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
            theme.icon,
          )}
        >
          {icon}
        </div>
        <div
          className={cn(
            "min-w-0 text-[27px] font-extrabold leading-none tracking-[-0.02em] tabular-nums max-[620px]:text-[24px]",
            theme.value,
          )}
        >
          {value}
        </div>
      </div>
      <div className="mt-[5px] text-[12.5px] font-bold text-[var(--t1)]">{label}</div>
      <div className="mt-[2px] text-[11px] leading-[1.4] text-[var(--t4)]">{description}</div>
      {/* Suppressed on a cleared queue: "oldest 6 days ago" beside a zero
          describes something that is no longer there. */}
      {meta && !isClear && (
        <div className={cn("mt-[5px] text-[10.5px] font-bold tracking-[0.02em]", theme.meta)}>
          {meta}
        </div>
      )}
    </>
  );

  if (!onClick) {
    return <div className={className}>{body}</div>;
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  );
}

export default AttentionPanel;
