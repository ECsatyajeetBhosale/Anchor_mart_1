import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type * as React from "react";

/**
 * A stat tile: label, icon, and one number.
 *
 * Deliberately no footer or delta line. The secondary text under the value
 * ("10 active · 4 top-rated", "All statuses") competed with the number it sat
 * under and cost every card a row of height on screens that show a dozen of
 * them. A card answers one question; anything more belongs on the page the card
 * links to.
 */
export interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: "navy" | "teal" | "amber" | "red" | "green" | "purple" | "blue";
  onClick?: () => void;
  /**
   * Marks this card as the one currently driving the screen's filter. Only
   * meaningful alongside `onClick`: a card that cannot be selected has no
   * selected state to show.
   */
  active?: boolean;
  /**
   * Sub-buckets of this card's figure — slices already counted inside it.
   *
   * Rendered *within* the card, never beside it: `awaiting_customer` and
   * `ready_to_bill` sum to `substitution_needed`, so listing all three as peers
   * double-counts the same orders. Nesting states the containment.
   */
  breakdown?: { label: string; value: string; onClick?: () => void }[];
}

export function StatCard({
  label,
  value,
  icon,
  variant = "navy",
  onClick,
  active,
  breakdown,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "stat-card flex flex-col justify-between h-full",
        `sc-${variant}`,
        onClick && "transition-shadow hover:shadow-[var(--sh-sm)]",
        active && "ring-2 ring-[var(--teal-500)] ring-offset-1",
      )}
      onClick={onClick}
      aria-pressed={onClick ? active === true : undefined}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="stat-stripe" />
      <div className="stat-top">
        <div className="stat-lbl">{label}</div>
        <div className="stat-icon">{icon}</div>
      </div>
      <div className="stat-val">{value}</div>
      {breakdown && breakdown.length > 0 && (
        <div className="mt-2 flex flex-col gap-1 border-t border-[var(--border-xs)] pt-2">
          {breakdown.map((row) => (
            <button
              key={row.label}
              type="button"
              disabled={!row.onClick}
              onClick={(e) => {
                // The card itself is clickable; a sub-bucket drills somewhere
                // narrower, so its click must not also trigger the parent's.
                e.stopPropagation();
                row.onClick?.();
              }}
              className="flex items-center justify-between gap-2 rounded px-1 py-0.5 text-left text-[11.5px] font-semibold text-[var(--t3)] transition-colors enabled:hover:bg-[var(--surface-alt)] enabled:hover:text-[var(--t1)] disabled:cursor-default"
            >
              <span className="trunc">{row.label}</span>
              <span className="tabular-nums font-bold text-[var(--t2)]">{row.value}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
export default StatCard;
