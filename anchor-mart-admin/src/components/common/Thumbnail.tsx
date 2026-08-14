import { cn } from "@/lib/utils";
import { type ReactNode, useState } from "react";

export interface ThumbnailProps {
  /** Absolute image URL. Empty/undefined renders `placeholder` instead. */
  src?: string;
  alt: string;
  /** Glyph shown when there is no image, or when the one given fails to load. */
  placeholder: ReactNode;
  /** Size override, e.g. `"h-8 w-8"`. Defaults to `.prod-thumb`'s 40px box. */
  className?: string;
}

/**
 * Square image cell for list rows (products, variants, categories).
 *
 * The image **fills the box edge to edge**: `.prod-thumb`'s border and centring
 * exist to frame the empty-state glyph, and against a real photo they read as
 * padding — a fixed-size image centred in a larger container leaves a ring of
 * surface on every side. With no image the frame is kept and the glyph centred,
 * which is what it is for.
 *
 * **A URL that fails falls back to the same glyph.** Having a `src` is not the
 * same as having an image: the row can carry a link to a file that has been
 * moved, a host that is unreachable, or a media path the browser is refused —
 * and the browser's own answer to that is a broken-image icon, which looks like
 * the console is broken rather than the file being missing. The placeholder is
 * the honest rendering of "no picture to show", whichever way it happened.
 */
export function Thumbnail({ src, alt, placeholder, className }: ThumbnailProps) {
  /**
   * The URL that failed, rather than a boolean — so a row whose `src` changes
   * retries the new one instead of staying broken from the old. No effect
   * needed: a different `src` no longer matches what was recorded.
   */
  const [failedSrc, setFailedSrc] = useState<string>();

  if (!src || failedSrc === src) {
    return <div className={cn("prod-thumb", className)}>{placeholder}</div>;
  }

  return (
    <div className={cn("prod-thumb overflow-hidden !border-0", className)}>
      {/* `rounded-[inherit]` so the corners follow the container's radius
          instead of squaring off inside it. */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailedSrc(src)}
        className="h-full w-full rounded-[inherit] object-cover"
      />
    </div>
  );
}

export default Thumbnail;
