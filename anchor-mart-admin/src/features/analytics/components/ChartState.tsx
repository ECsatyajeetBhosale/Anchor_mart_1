import type * as React from "react";

import { Button } from "@/components/ui/button";
import { MESSAGES } from "@/lib/messages";

const M = MESSAGES.ANALYTICS;

export interface ChartStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  /**
   * Overrides the empty-state text.
   *
   * "No data for this period" is right for a chart whose window simply has no
   * buckets. A section that can legitimately return a fully-populated but
   * all-zero payload wants to say so in its own words instead.
   */
  emptyMessage?: string;
  /** Rendered once data has loaded successfully. */
  children: React.ReactNode;
}

/**
 * Loading / error / empty wrapper for the analytics charts — the same spinner,
 * error+retry, and empty-message treatment the dashboard's revenue chart uses,
 * sized to the chart area so the card never shifts. Renders `children` (the
 * chart) only when data is ready.
 */
export function ChartState({
  isLoading,
  isError,
  isEmpty,
  onRetry,
  emptyMessage,
  children,
}: ChartStateProps) {
  if (isLoading) {
    return (
      <div className="flex h-[150px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--border-md)] border-t-[var(--teal-500)]" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex h-[150px] flex-col items-center justify-center gap-3">
        <span className="td-m text-[var(--danger-text)]">{M.ERROR}</span>
        <Button variant="secondary" size="xs" onClick={onRetry}>
          {MESSAGES.COMMON.RETRY}
        </Button>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex h-[150px] items-center justify-center">
        <span className="td-m">{emptyMessage ?? M.EMPTY}</span>
      </div>
    );
  }
  return <>{children}</>;
}

export default ChartState;
