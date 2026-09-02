import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MESSAGES } from "@/lib/messages";
import { IconExternalLink, IconX } from "@tabler/icons-react";

const M = MESSAGES.COMMON.LIGHTBOX;

export interface ImageLightboxProps {
  /** The image to show, or `null` when nothing is open. */
  src: string | null;
  /** Describes the image for screen readers and the dialog's accessible name. */
  alt?: string;
  onClose: () => void;
}

/**
 * Full-size view of a single image, over a dimmed backdrop.
 *
 * Built on the shared `Dialog` rather than a bespoke overlay so it inherits
 * the parts that are easy to get wrong: Escape and backdrop dismissal, focus
 * trapping and restoration, and — the reason `Dialog` itself is on Radix —
 * correct nesting when it is opened from inside a drawer.
 *
 * The panel's chrome is stripped back to nothing: an inline thumbnail is
 * opened to *see the image*, and a card border, padding and background around
 * it would only shrink it and frame it in furniture.
 */
export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  return (
    <Dialog open={Boolean(src)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[min(92vw,1100px)] border-none bg-transparent p-0 shadow-none"
        // The image is the content; nothing inside wants initial focus, and
        // focusing it would draw a ring around the picture on open.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {/* Radix names the dialog from its title and warns when there is none;
            here the image is the whole content, so the name is said rather
            than shown. */}
        <DialogTitle className="sr-only">{alt || M.TITLE}</DialogTitle>

        <div className="flex flex-col items-center gap-2">
          {src && (
            <img
              src={src}
              alt={alt || M.TITLE}
              className="max-h-[82vh] w-auto max-w-full rounded-[var(--radius-lg)] object-contain shadow-[var(--shadow-lg)]"
            />
          )}

          <div className="flex items-center gap-2">
            {/* Opening the original covers what this view deliberately does
                not: full resolution, zoom, and the browser's own save. */}
            {src && (
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-black/55 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              >
                <IconExternalLink size={14} />
                {M.OPEN_ORIGINAL}
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              title={MESSAGES.COMMON.CLOSE}
              aria-label={MESSAGES.COMMON.CLOSE}
              className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageLightbox;
