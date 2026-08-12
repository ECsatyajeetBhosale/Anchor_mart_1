import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MESSAGES } from "@/lib/messages";
import { ORDER_STATUS_BY_KEY } from "@/lib/orderStatuses";
import { type TimelineStepLike, resolveTimelineStates } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";

const R = MESSAGES.INTENTS.REVIEW;
const L = R.RAIL_LEGEND;

/**
 * The pre-delivery journey, grouped into six stages. The 18 canonical statuses
 * (`docs/ORDER_STATUSES.md`) are too granular for a compact rail, so each stage
 * owns the statuses that mean "the order is sitting here".
 * `pending_customer_response` is a branch off the review step rather than a step
 * of its own, so it maps back to Reviewed.
 */
const STAGES: { label: string; statuses: string[] }[] = [
  { label: R.STAGES.RECEIVED, statuses: ["intent_received", "pending_intent"] },
  { label: R.STAGES.SOURCING, statuses: ["sourcing"] },
  { label: R.STAGES.VERIFYING, statuses: ["partner_verifying"] },
  { label: R.STAGES.REVIEWED, statuses: ["verification_submitted", "pending_customer_response"] },
  { label: R.STAGES.BILLING, statuses: ["payment_pending", "payment_received"] },
  {
    label: R.STAGES.CONFIRMED,
    statuses: [
      "order_confirmed",
      "partner_assigned",
      "items_collected",
      "at_port",
      "at_berth",
      "delivered",
    ],
  },
];

/** Statuses that close the order — the rail is replaced by a notice. */
const TERMINAL = new Set(["intent_rejected", "cancelled", "refunded", "delivery_failed"]);

const BAR: Record<string, string> = {
  done: "bg-[var(--teal-500)]",
  active: "bg-[var(--navy-700)]",
  pend: "bg-[var(--border-md)]",
};

const LABEL: Record<string, string> = {
  done: "text-[var(--teal-700)]",
  active: "text-[var(--navy-800)]",
  pend: "text-[var(--t4)]",
};

/** Colour key rows — swatches reuse the exact rail/notice colours. */
const LEGEND_ROWS: { swatch: string; label: string; hint: string }[] = [
  { swatch: "bg-[var(--teal-500)]", label: L.DONE, hint: L.DONE_HINT },
  { swatch: "bg-[var(--navy-700)]", label: L.ACTIVE, hint: L.ACTIVE_HINT },
  { swatch: "bg-[var(--border-md)]", label: L.PENDING, hint: L.PENDING_HINT },
  { swatch: "bg-[var(--danger-icon)]", label: L.CLOSED, hint: L.CLOSED_HINT },
];

/** Info button + popover explaining what each segment colour means. */
function ColourLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={L.OPEN_LABEL}
          title={L.OPEN_LABEL}
          className="text-[var(--t4)] transition-colors hover:text-[var(--teal-600)]"
        >
          <IconInfoCircle size={13} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[268px] p-3.5">
        <div className="sec-label !mb-2.5">{L.TITLE}</div>
        <div className="flex flex-col gap-2.5">
          {LEGEND_ROWS.map((row) => (
            <div key={row.label} className="flex items-start gap-2.5">
              <span className={cn("mt-1 h-2 w-6 shrink-0 rounded-full", row.swatch)} />
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-[var(--t1)]">{row.label}</div>
                <div className="text-[11.5px] font-medium leading-[1.4] text-[var(--t4)]">
                  {row.hint}
                </div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** The minimum a rail segment needs: a name, plus whatever says it is done. */
export interface LifecycleRailStep extends TimelineStepLike {
  label: string;
}

export interface LifecycleRailProps {
  /** Raw backend status key (e.g. `verification_submitted`). */
  status: string;
  /**
   * Live milestones from `order-timeline` (Flow 28 API 16). When present these
   * drive the rail; the status-derived stages below are only the fallback for
   * an order the timeline endpoint has nothing for yet.
   */
  /**
   * Typed structurally rather than against either feature's step interface:
   * this component lives in `common` and is rendered by both the intents and
   * orders drawers, whose producers describe completion differently
   * (`status` vs `is_done` — see `lib/timeline.ts`). Both shapes satisfy this.
   */
  steps?: LifecycleRailStep[];
  className?: string;
}

/** One rendered segment, whichever source produced it. */
interface Segment {
  label: string;
  state: "done" | "active" | "pend";
}

/**
 * Live steps → segments, using the backend's own per-step verdict via
 * `resolveTimelineStates` (never re-derived here — see `lib/timeline.ts`).
 *
 * Labels come from the step itself. They used to be looked up in
 * `ORDER_STATUS_BY_KEY` to keep the rail worded like the status legend, but
 * that map is keyed by *order status* while these steps are keyed by
 * *milestone*: only 6 of the 10 milestones share a key with a status, so the
 * rail was drawing 6 labels from one vocabulary and 4 from another. The
 * timeline endpoint names its own milestones; that is the authority here.
 */
function fromSteps(steps: LifecycleRailStep[]): Segment[] {
  const states = resolveTimelineStates(steps);
  return steps.map((s, i) => ({
    label: s.label,
    state: states[i] === "pending" ? "pend" : states[i],
  }));
}

/** Status-derived segments — the fallback when no timeline is available. */
function fromStatus(status: string): Segment[] {
  const activeIdx = STAGES.findIndex((s) => s.statuses.includes(status));
  return STAGES.map((stage, i) => ({
    label: stage.label,
    // An unknown status leaves every segment pending rather than guessing.
    state: activeIdx < 0 ? "pend" : i < activeIdx ? "done" : i === activeIdx ? "active" : "pend",
  }));
}

/**
 * Compact horizontal progress rail — where an order currently
 * sits in the pre-delivery lifecycle. Closed orders (rejected / cancelled /
 * refunded / delivery failed) render a danger notice instead, since a progress
 * bar would imply the order is still moving.
 */
export function LifecycleRail({ status, steps, className }: LifecycleRailProps) {
  const info = ORDER_STATUS_BY_KEY[status];

  if (TERMINAL.has(status)) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2",
          className,
        )}
      >
        <IconAlertTriangle size={15} className="shrink-0 text-[var(--danger-icon)]" />
        <span className="text-[12px] font-bold text-[var(--danger-text)]">
          {R.TERMINAL_NOTICE(info?.label ?? status)}
        </span>
      </div>
    );
  }

  const segments = steps?.length ? fromSteps(steps) : fromStatus(status);
  const activeIdx = segments.findIndex((s) => s.state === "active");

  return (
    <div className={className}>
      <div className="flex items-start gap-1.5">
        {segments.map((seg, i) => (
          <div key={`${seg.label}-${i}`} className="min-w-0 flex-1">
            <div className={cn("h-1.5 rounded-full transition-colors", BAR[seg.state])} />
            {/* Wraps to two lines instead of truncating: segments are narrow
                and the canonical labels are long ("Verification Submitted",
                "Pending Customer Response"), so a single clipped line left most
                stages unreadable. `min-h` keeps every segment the same height
                whether its label wraps or not, so the bars stay aligned. */}
            <div
              className={cn(
                "mt-1.5 line-clamp-2 min-h-[24px] text-[10px] font-extrabold uppercase leading-[1.2] tracking-[0.4px] [overflow-wrap:anywhere]",
                LABEL[seg.state],
              )}
              title={seg.label}
            >
              {seg.label}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        {activeIdx >= 0 && (
          <span className="text-[10.5px] font-bold text-[var(--t4)]">
            {R.STAGE_OF(activeIdx + 1, segments.length)}
          </span>
        )}
        <ColourLegend />
      </div>
    </div>
  );
}

export default LifecycleRail;
