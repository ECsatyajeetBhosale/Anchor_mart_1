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
      <div className="occ-pulse-label">{label}</div>
      <div className={cn("occ-pulse-value", isZero && "is-zero")}>{value}</div>
      <div className="occ-pulse-desc">
        {isZero && zeroDescription ? zeroDescription : description}
      </div>
    </>
  );

  const className = cn("occ-pulse-cell", lead && "occ-pulse-lead", onClick && "is-clickable");

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
