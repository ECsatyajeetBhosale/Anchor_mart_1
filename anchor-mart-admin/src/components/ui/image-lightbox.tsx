import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MESSAGES } from "@/lib/messages";

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
 * **The image is the entire dialog.** No chrome, no buttons: it is dismissed by
 * clicking anywhere off the picture, or with Escape. That is the whole reason
 * the panel is sized `w-auto max-w-fit` — the dialog box hugs the image, so
 * every pixel that is not the picture belongs to Radix's overlay and closes on
 * click. Give this box any width of its own and a band of dead space appears
 * beside the image that looks dismissible and is not.
 */
export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  return (
    <Dialog open={Boolean(src)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-auto max-w-fit border-none bg-transparent p-0 shadow-none"
        // The image is the content; nothing inside wants initial focus, and
        // focusing it would draw a ring around the picture on open.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {/* Radix names the dialog from its title and warns when there is none;
            here the image is the whole content, so the name is said rather
            than shown. */}
        <DialogTitle className="sr-only">{alt || M.TITLE}</DialogTitle>

        {src && (
          <img
            src={src}
            alt={alt || M.TITLE}
            className="max-h-[85vh] w-auto max-w-[92vw] rounded-[var(--radius-lg)] object-contain shadow-[var(--shadow-lg)]"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ImageLightbox;
