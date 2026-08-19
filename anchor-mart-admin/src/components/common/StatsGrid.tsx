import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { StatCard, type StatCardProps } from "./StatCard";

export interface StatsGridItem extends Omit<StatCardProps, "className"> {
  id: string;
}

export interface StatsGridProps {
  items: StatsGridItem[];
  className?: string;
  /**
   * Set when the stats request failed. The cards themselves show a dash rather
   * than a zero, which says the console does not know the figure — this line
   * says why, so the deck is not read as an empty queue.
   */
  error?: string | null;
  /** Retry affordance for that failure; omitted when the screen has none. */
  onRetry?: () => void;
}

export function StatsGrid({ items, className, error = null, onRetry }: StatsGridProps) {
  return (
    <>
      {error && (
        <div
          role="alert"
          className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--danger-text)]"
        >
          <span>{error}</span>
          {onRetry && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
              {MESSAGES.COMMON.RETRY}
            </button>
          )}
        </div>
      )}
      <div className={cn("stats-row", className)}>
        {items.map(({ id, ...cardProps }) => (
          <StatCard key={id} {...cardProps} />
        ))}
      </div>
    </>
  );
}

export default StatsGrid;
