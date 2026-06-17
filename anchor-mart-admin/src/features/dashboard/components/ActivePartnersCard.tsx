import { IconArrowRight, IconMotorbike } from "@tabler/icons-react";

import { SectionCard } from "@/components/common/SectionCard";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MESSAGES } from "@/lib/messages";
import type { ActivePartner } from "../types/dashboard.types";

const M = MESSAGES.DASHBOARD;

/** Static weekly earnings — the endpoint exposes no earnings figure. */
const WEEKLY_EARNINGS_TOTAL = "$3,400";

/** Map a partner `work_status` to a badge variant, preserving the current colors. */
const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  available: "success",
  delivering: "teal",
  verifying: "warning",
};

function statusVariant(workStatus: string): BadgeProps["variant"] {
  return STATUS_VARIANT[workStatus.toLowerCase()] ?? "neutral";
}

/** Title-case the status for the badge label (e.g. "delivering" → "Delivering"). */
function statusLabel(workStatus: string): string {
  return workStatus ? workStatus.charAt(0).toUpperCase() + workStatus.slice(1) : "—";
}

export interface ActivePartnersCardProps {
  items: ActivePartner[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onViewAll: () => void;
  /** Receives the partner `id` for future partner-detail navigation. */
  onSelect: (partnerId: string) => void;
}

/**
 * Delivery partners currently on shift — capped preview list driven by the
 * (param-less) active-partners endpoint via {@link useDashboard}. UI is
 * unchanged; only the list data is live. The earnings footer stays static since
 * the endpoint returns no earnings value.
 */
export function ActivePartnersCard({
  items,
  isLoading,
  isError,
  onRetry,
  onViewAll,
  onSelect,
}: ActivePartnersCardProps) {
  return (
    <SectionCard
      bodyPadding="sm"
      bodyClassName="flex flex-col justify-between gap-6"
      icon={<IconMotorbike size={17} className="text-[var(--t4)]" />}
      title={M.ACTIVE_PARTNERS_TITLE}
      actions={
        <Button variant="ghost" size="xs" onClick={onViewAll}>
          {M.VIEW_ALL} <IconArrowRight size={13} />
        </Button>
      }
      footer={
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-bold text-[var(--t4)]">{M.WEEKLY_EARNINGS}</span>
          <span className="text-[13px] font-extrabold text-[var(--amber-700)]">
            {WEEKLY_EARNINGS_TOTAL}
          </span>
        </div>
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
          <span className="td-m">{M.ACTIVE_PARTNERS_EMPTY}</span>
        </div>
      ) : (
        items.map((p) => (
          <button
            type="button"
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="flex aic g10 w-full appearance-none border-0 bg-transparent p-0 text-left"
          >
            <div className="av av-sm av-teal">{p.name.charAt(0)}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold text-[var(--t1)]">{p.name}</div>
              <div className="text-[10.5px] text-[var(--t4)]">
                {p.partner_code ?? "—"} · {p.current_order?.order_number ?? M.PARTNER_FREE}
              </div>
            </div>
            <Badge variant={statusVariant(p.work_status)} className="h-[18px] px-2 text-[9.5px]">
              {statusLabel(p.work_status)}
            </Badge>
          </button>
        ))
      )}
    </SectionCard>
  );
}

export default ActivePartnersCard;
