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

const SEVERITY_CLASS: Record<AttentionSeverity, string> = {
  danger: "sev-danger",
  warning: "sev-warning",
  review: "sev-review",
};

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
  const className = cn(
    "occ-att",
    isClear ? "is-clear" : SEVERITY_CLASS[severity],
    onClick && "is-clickable",
  );

  const body = (
    <>
      <div className="occ-att-icon">{icon}</div>
      <div className="occ-att-body">
        <div className="occ-att-value">{value}</div>
        <div className="occ-att-label">{label}</div>
        <div className="occ-att-desc">{description}</div>
        {/* Suppressed on a cleared queue: "oldest 6 days ago" beside a zero
            describes something that is no longer there. */}
        {meta && !isClear && <div className="occ-att-meta">{meta}</div>}
      </div>
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
