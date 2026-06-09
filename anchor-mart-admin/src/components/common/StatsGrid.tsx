import { cn } from "@/lib/utils";
import { StatCard, type StatCardProps } from "./StatCard";

export interface StatsGridItem extends Omit<StatCardProps, "className"> {
  id: string;
}

export interface StatsGridProps {
  items: StatsGridItem[];
  className?: string;
}

export function StatsGrid({ items, className }: StatsGridProps) {
  return (
    <div className={cn("stats-row", className)}>
      {items.map(({ id, ...cardProps }) => (
        <StatCard key={id} {...cardProps} />
      ))}
    </div>
  );
}

export default StatsGrid;
