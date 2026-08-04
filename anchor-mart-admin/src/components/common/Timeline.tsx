import { ORDER_STATUS_BY_KEY } from "@/lib/orderStatuses";
import { cn } from "@/lib/utils";
import {
  IconAlertTriangle,
  IconAnchor,
  IconBan,
  IconChecks,
  IconClipboardCheck,
  IconCreditCard,
  IconFileInvoice,
  IconMessage,
  IconPackage,
  IconReceiptRefund,
  IconSearch,
  IconShip,
  IconUserCheck,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { OrderTimelineItem } from "./OrderDetailDrawer";

/**
 * Per-step icons, keyed by the **canonical status keys** (`lib/orderStatuses.ts`
 * — the same 18 the status-legend popup explains), so a step in this timeline
 * reads as the status the rest of the app names.
 *
 * The previous keys (`intent_submitted`, `payment_confirmed`, `assigned`,
 * `out_for_delivery`) were not statuses at all, so every row fell through to the
 * generic icon and the timeline told a different story from the legend.
 * Anything unrecognised still falls back rather than rendering blank.
 */
const TIMELINE_ICONS: Record<string, ReactNode> = {
  intent_received: <IconFileInvoice size={14} />,
  pending_intent: <IconFileInvoice size={14} />,
  sourcing: <IconSearch size={14} />,
  partner_verifying: <IconClipboardCheck size={14} />,
  verification_submitted: <IconChecks size={14} />,
  pending_customer_response: <IconMessage size={14} />,
  payment_pending: <IconCreditCard size={14} />,
  payment_received: <IconCreditCard size={14} />,
  order_confirmed: <IconChecks size={14} />,
  partner_assigned: <IconUserCheck size={14} />,
  items_collected: <IconPackage size={14} />,
  at_port: <IconAnchor size={14} />,
  at_berth: <IconShip size={14} />,
  delivered: <IconPackage size={14} />,
  delivery_failed: <IconAlertTriangle size={14} />,
  intent_rejected: <IconBan size={14} />,
  cancelled: <IconBan size={14} />,
  refunded: <IconReceiptRefund size={14} />,
};

/** Dot styling per step state (Tailwind utilities over design tokens). */
const DOT_STATE: Record<string, string> = {
  done: "bg-[var(--success-bg)] text-[var(--success-icon)] border-[var(--success-border)]",
  active:
    "bg-[var(--warning-bg)] text-[var(--warning-icon)] border-[var(--warning-border)] animate-[livePulse_2s_infinite]",
  pend: "bg-[var(--surface-alt)] text-[var(--t4)] border-[var(--border-md)]",
};

/** Shared style for the small muted secondary line. */
const SUB_TEXT = "text-[12px] font-medium leading-[1.35] text-[var(--t4)]";

export interface TimelineProps {
  items?: OrderTimelineItem[];
  loading?: boolean;
  loadingLabel?: string;
  emptyLabel?: string;
  className?: string;
}

/**
 * Vertical order-progress timeline, styled with Tailwind utilities + design
 * tokens. The first incomplete step is highlighted as "active"; the connector
 * rail (`before:`) sits centered just below each dot, and steps without a
 * date/detail keep the same height so node spacing stays consistent.
 */
export function Timeline({
  items,
  loading,
  loadingLabel = "Loading timeline…",
  emptyLabel = "No timeline available",
  className,
}: TimelineProps) {
  // The first incomplete step is the current ("active") one.
  const firstPendingIdx = items ? items.findIndex((t) => !t.is_done) : -1;
  const rows = (items ?? []).map((item, i) => ({
    id: item.key,
    state: item.is_done ? "done" : i === firstPendingIdx ? "active" : "pend",
    icon: TIMELINE_ICONS[item.key] ?? <IconFileInvoice size={14} />,
    // Prefer the canonical label over whatever the API sent, so a step reads
    // identically here, in the status column, and in the legend.
    title: ORDER_STATUS_BY_KEY[item.key]?.label ?? item.label,
    // Empty date/detail is fine — the sub line reserves its height via min-h.
    sub: [item.at, item.detail].filter(Boolean).join(" · "),
  }));

  return (
    <div className={cn("flex flex-col", className)}>
      {loading ? (
        <div className={SUB_TEXT}>{loadingLabel}</div>
      ) : rows.length === 0 ? (
        <div className={SUB_TEXT}>{emptyLabel}</div>
      ) : (
        rows.map((tl) => (
          <div
            key={tl.id}
            className="relative flex gap-3 pb-6 last:pb-0 before:absolute before:top-8 before:bottom-0 before:left-[15px] before:w-[1.5px] before:-translate-x-1/2 before:bg-[var(--border-sm)] before:content-[''] last:before:hidden"
          >
            <div
              className={cn(
                "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2",
                DOT_STATE[tl.state],
              )}
            >
              {tl.icon}
            </div>
            <div className="flex-1 -mt-0.9">
              <div className="text-[13.5px] font-bold leading-[1.35] text-[var(--t1)]">
                {tl.title}
              </div>
              <div className={cn("min-h-4", SUB_TEXT)}>{tl.sub}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Timeline;
