import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface ThumbnailProps {
  /** Absolute image URL. Empty/undefined renders `placeholder` instead. */
  src?: string;
  alt: string;
  /** Glyph shown when there is no image. */
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
 */
export function Thumbnail({ src, alt, placeholder, className }: ThumbnailProps) {
  if (!src) {
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
        className="h-full w-full rounded-[inherit] object-cover"
      />
    </div>
  );
}

export default Thumbnail;
