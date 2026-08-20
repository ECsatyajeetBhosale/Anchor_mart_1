/**
 * Same-origin form of a backend media URL — **dev server only**.
 *
 * ### The problem this solves
 *
 * With `VITE_API_BASE_URL` pointed at an ngrok tunnel, Django builds its image
 * URLs from the request host, so a product comes back carrying
 * `https://<tunnel>.ngrok-free.app/media/product_images/x.jpg`. API calls are
 * fine — they go through the Vite proxy, which attaches
 * `ngrok-skip-browser-warning`. An `<img>` does not: it fetches that URL
 * straight from the browser, and a free tunnel answers any browser request
 * lacking that header with **its interstitial page — 200, `text/html`**.
 *
 * Chrome then refuses the response outright rather than trying to decode it:
 * Opaque Response Blocking rejects an HTML body delivered to an image
 * destination, which surfaces as `net::ERR_BLOCKED_BY_ORB`, 0 bytes, and no
 * `Type` in the network panel. It reads as "the image is missing" when the file
 * is there and the backend serves it perfectly well.
 *
 * Rewriting the URL to its path alone routes the request through the dev
 * server's `/media` proxy (see `vite.config.ts`), which does send the header and
 * hands back the real JPEG.
 *
 * ### Why it is this narrow
 *
 * Only URLs on **the configured backend's own origin** are rewritten. Media may
 * equally be served from S3/CloudFront (Flow 26), whose URLs also carry a
 * `/media/` path — those hosts are reachable from the browser directly, and
 * pointing them at the Django proxy would turn a working image into a 404.
 *
 * In a production build this returns its input untouched: there is no proxy
 * there, and the absolute URL is the only one that resolves.
 */

/** The only path the dev server proxies for files — see `vite.config.ts`. */
const MEDIA_PREFIX = "/media/";

/** Origin of the configured backend, or `""` when there isn't a usable one. */
const BACKEND_ORIGIN = (() => {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!base?.trim()) return "";
  try {
    return new URL(base.trim()).origin;
  } catch {
    // A relative or malformed base leaves nothing to match against, which is
    // the same as having no backend origin: rewrite nothing.
    return "";
  }
})();

/**
 * The `src` to render for a stored image reference.
 *
 * A no-op for empty values, relative paths, production builds, and any host
 * that isn't the backend — so it is safe to apply to every `<img>` regardless
 * of where that particular image is stored.
 */
export function mediaSrc(url?: string | null): string {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";
  if (!import.meta.env.DEV || !BACKEND_ORIGIN) return trimmed;
  // Relative already — it goes through the dev server as it stands.
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.origin !== BACKEND_ORIGIN) return trimmed;
    // Only `/media/` is proxied. Rewriting any other backend path — `/static/`,
    // say — would point it at the dev server, which serves the SPA shell and
    // has no route for it, trading a working URL for a 404.
    if (!parsed.pathname.startsWith(MEDIA_PREFIX)) return trimmed;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return trimmed;
  }
}
