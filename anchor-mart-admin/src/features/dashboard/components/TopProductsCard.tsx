import { IconArrowRight, IconAward, IconPackage } from "@tabler/icons-react";

import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MESSAGES } from "@/lib/messages";
import { formatNumber } from "@/lib/utils";
import type { TopProductItem } from "../types/dashboard.types";

const M = MESSAGES.DASHBOARD;

export interface TopProductsCardProps {
  items: TopProductItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onViewAll: () => void;
  /** Receives `product_id` for future product-detail navigation. */
  onSelect: (productId: string) => void;
}

/**
 * Top-selling products leaderboard — capped preview list driven by the
 * top-products endpoint (via {@link useDashboard}), mirroring the Live Orders
 * props pattern. UI is unchanged; only the data is now live. The thumbnail shows
 * the standard fallback icon since the endpoint returns no image.
 */
export function TopProductsCard({
  items,
  isLoading,
  isError,
  onRetry,
  onViewAll,
  onSelect,
}: TopProductsCardProps) {
  return (
    <SectionCard
      bodyPadding="sm"
      bodyClassName="flex flex-col justify-between gap-6"
      icon={<IconAward size={17} className="text-[var(--t4)]" />}
      title={M.TOP_PRODUCTS}
      actions={
        <Button variant="ghost" size="xs" onClick={onViewAll}>
          {M.VIEW_ALL} <IconArrowRight size={13} />
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--border-md)] border-t-[var(--teal-500)]" />
        </div>
      ) : isError ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3">
          <span className="td-m text-[var(--danger-text)]">{M.ERROR}</span>
          <Button variant="secondary" size="xs" onClick={onRetry}>
            {MESSAGES.COMMON.RETRY}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <span className="td-m">{M.TOP_PRODUCTS_EMPTY}</span>
        </div>
      ) : (
        items.map((p, i) => (
          <button
            type="button"
            key={p.product_id}
            onClick={() => onSelect(p.product_id)}
            className="flex aic g10 w-full appearance-none border-0 bg-transparent p-0 text-left"
          >
            <span className="w-4 shrink-0 text-[11px] font-extrabold text-[var(--t4)]">
              {i + 1}
            </span>
            <div className="prod-thumb !h-8 !w-8">
              <IconPackage size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="trunc text-[12.5px] font-bold text-[var(--t1)]">{p.product_name}</div>
              <div className="text-[10.5px] text-[var(--t4)]">{p.category}</div>
            </div>
            <Badge variant="teal">{formatNumber(p.units)}</Badge>
          </button>
        ))
      )}
    </SectionCard>
  );
}

export default TopProductsCard;
