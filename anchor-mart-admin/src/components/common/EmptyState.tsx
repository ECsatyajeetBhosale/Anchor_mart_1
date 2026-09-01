import { IconBoxSeam } from "@tabler/icons-react";
import type * as React from "react";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title = "No data available",
  description,
  icon = <IconBoxSeam size={36} className="text-[var(--t4)]" />,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-[var(--surface)] border border-[var(--border-sm)] rounded-[var(--radius-lg)]">
      {icon && <div className="mb-3">{icon}</div>}
      <h3 className="text-[14px] font-bold text-[var(--t2)] mb-1">{title}</h3>
      {description && <p className="text-[12px] text-[var(--t4)] max-w-sm mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

export default EmptyState;
