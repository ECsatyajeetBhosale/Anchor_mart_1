/**
 * Whether the panel is running inside a frame owned by another origin.
 *
 * BUG-007: the HTML is served without `X-Frame-Options` / `frame-ancestors`, so
 * any site could frame the admin panel and overlay it (clickjacking). That
 * header is the real fix and belongs to nginx; until it ships, the app refuses
 * to render in a cross-origin frame. Same-origin framing stays allowed — it is
 * what `frame-ancestors 'self'` will allow, and QA's responsive checks use it.
 */
export function isFramedCrossOrigin(win: Window = window): boolean {
  if (win.top === win.self) return false;
  try {
    // A cross-origin parent's location cannot be read: this throws.
    return win.top?.location.origin !== win.location.origin;
  } catch {
    return true;
  }
}
