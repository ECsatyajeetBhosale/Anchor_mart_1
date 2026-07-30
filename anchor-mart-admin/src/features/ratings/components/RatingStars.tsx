import { IconStar, IconStarFilled } from "@tabler/icons-react";

export interface RatingStarsProps {
  /** 1–5. Values outside the range are clamped so a bad payload can't break the row. */
  value: number;
  /** Show the numeric value next to the stars. */
  showValue?: boolean;
  size?: number;
}

const MAX = 5;

/**
 * Five-star display for a rating value. Read-only by design — no admin surface
 * in Flow 16 authors or edits a rating, so this never takes an onChange.
 */
export function RatingStars({ value, showValue = true, size = 14 }: RatingStarsProps) {
  const filled = Math.max(0, Math.min(MAX, Math.round(value)));
  return (
    <span className="inline-flex items-center gap-1.5" title={`${filled} of ${MAX}`}>
      <span className="inline-flex items-center gap-0.5 text-[var(--amber-500)]">
        {Array.from({ length: MAX }, (_, i) =>
          i < filled ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length star row, index is the identity
            <IconStarFilled key={i} size={size} />
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length star row, index is the identity
            <IconStar key={i} size={size} className="text-[var(--border-md)]" />
          ),
        )}
      </span>
      {showValue && <span className="td-p">{filled}</span>}
    </span>
  );
}

export default RatingStars;
