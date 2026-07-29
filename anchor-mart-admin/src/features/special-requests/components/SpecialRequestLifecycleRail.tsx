import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";

const R = MESSAGES.SPECIAL_REQUESTS.RAIL;
const L = R.LEGEND;

/**
 * The Flow 13 journey as four forward stages. `sourcing_confirmed` is both the
 * "admin is working on it" state and where a rebill sends the request back to,
 * so the rail legitimately steps backwards during the re-quote loop.
 */
const STAGES: { label: string; status: string }[] = [
  { label: R.STAGES.REQUESTED, status: "pending" },
  { label: R.STAGES.SOURCING, status: "sourcing_confirmed" },
  { label: R.STAGES.QUOTED, status: "quote_sent" },
  { label: R.STAGES.ACCEPTED, status: "accepted" },
];

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

export interface SpecialRequestLifecycleRailProps {
  /** Raw backend status key (e.g. `quote_sent`). */
  status: string;
  /** Status label from the API, used in the closed notice. */
  statusLabel?: string;
  className?: string;
}

/**
 * Compact horizontal progress rail for a special request — where it sits in the
 * sourcing/quotation lifecycle. A rejected request renders a danger notice
 * instead, since a progress bar would imply it is still moving. `accepted` is
 * the happy terminal state and stays on the rail, fully complete.
 */
export function SpecialRequestLifecycleRail({
  status,
  statusLabel,
  className,
}: SpecialRequestLifecycleRailProps) {
  if (status === "rejected") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2",
          className,
        )}
      >
        <IconAlertTriangle size={15} className="shrink-0 text-[var(--danger-icon)]" />
        <span className="text-[12px] font-bold text-[var(--danger-text)]">
          {R.TERMINAL_NOTICE(statusLabel || status)}
        </span>
      </div>
    );
  }

  const activeIdx = STAGES.findIndex((s) => s.status === status);
  // `accepted` is the last stage and is complete, so nothing is left "active".
  const isComplete = status === "accepted";

  const segments = STAGES.map((stage, i) => ({
    label: stage.label,
    // An unknown status leaves every segment pending rather than guessing.
    state:
      activeIdx < 0
        ? "pend"
        : isComplete
          ? "done"
          : i < activeIdx
            ? "done"
            : i === activeIdx
              ? "active"
              : "pend",
  }));

  return (
    <div className={className}>
      <div className="flex items-start gap-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="min-w-0 flex-1">
            <div className={cn("h-1.5 rounded-full transition-colors", BAR[seg.state])} />
            <div
              className={cn(
                "trunc mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.6px]",
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
        {activeIdx >= 0 && !isComplete && (
          <span className="text-[10.5px] font-bold text-[var(--t4)]">
            {R.STAGE_OF(activeIdx + 1, segments.length)}
          </span>
        )}
        <ColourLegend />
      </div>
    </div>
  );
}

export default SpecialRequestLifecycleRail;
