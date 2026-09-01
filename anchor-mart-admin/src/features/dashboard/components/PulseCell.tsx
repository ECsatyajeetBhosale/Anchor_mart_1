import { cn } from "@/lib/utils";

export interface PulseCellProps {
  label: string;
  /** Preformatted by {@link useDashboard} — "—" while loading. */
  value: string;
  description: string;
  /** The lead cell: wider, and the only large number in the strip. */
  lead?: boolean;
  /**
   * Zero-state copy, swapped in for `description` when the figure is 0. Keeps an
   * empty period from reading as a broken one without inventing an event.
   */
  zeroDescription?: string;
  onClick?: () => void;
}

/**
 * The hairline dividers between cells.
 *
 * A left rule on every cell but the first, which is what turns four cells into
 * one strip. The two `max-` rules restore the dividers the wrap breaks: at two
 * columns the third cell has become a row start and needs its left rule
 * dropped and a top rule added; at one column every cell is a row start.
 */
const DIVIDERS =
  "border-l border-[var(--border-xs)] first:border-l-0 " +
  "max-[1000px]:[&:nth-child(3)]:border-l-0 max-[1000px]:[&:nth-child(n+3)]:border-t " +
  "max-[620px]:border-l-0 max-[620px]:border-t max-[620px]:first:border-t-0";

/**
 * One cell of the Operations Pulse strip.
 *
 * Cells are divided by hairlines inside a single bordered strip rather than
 * being separate cards. That is the whole point of the component: four floating
 * rectangles is the pattern this screen is moving away from, and a divided strip
 * says "these belong together" where a row of cards says "these are four
 * unrelated things that happen to be adjacent".
 */
export function PulseCell({
  label,
  value,
  description,
  lead,
  zeroDescription,
  onClick,
}: PulseCellProps) {
  const isZero = value === "0";
  const body = (
    <>
      <div className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[var(--t4)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-[6px] font-extrabold leading-none tracking-[-0.02em] tabular-nums",
          lead ? "text-[34px] text-[var(--navy-800)]" : "text-[22px] text-[var(--t1)]",
          // A zero here is neither good nor bad — it is just quiet. Greying it
          // keeps the row from looking broken without dressing an empty period
          // up as an event. Last, so it wins over the lead cell's navy too.
          isZero && "text-[var(--t4)]",
        )}
      >
        {value}
      </div>
      <div className="mt-[5px] text-[11px] text-[var(--t4)]">
        {isZero && zeroDescription ? zeroDescription : description}
      </div>
    </>
  );

  const className = cn(
    "w-full p-[15px_17px] text-left transition-[background] duration-[160ms] ease-[ease]",
    DIVIDERS,
    lead && "bg-[var(--navy-25)] hover:bg-[var(--navy-50)]",
    // After the lead cell's own hover, so a clickable lead takes the neutral
    // hover rather than the navy one — matching the specificity the stylesheet
    // resolved this with.
    onClick && "cursor-pointer hover:bg-[var(--surface-alt)]",
    onClick &&
      "focus-visible:[outline:2px_solid_var(--teal-500)] focus-visible:[outline-offset:-2px]",
  );

  if (!onClick) {
    return <div className={className}>{body}</div>;
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  );
}

export default PulseCell;
