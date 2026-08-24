/**
 * Resolves a websocket URL for one of the backend's Django Channels consumers.
 *
 * Shared by `ws/chat/` (Flow 23 §2) and `ws/events/` (the realtime badge
 * socket). The path is the only thing that differs between them; the origin and
 * scheme rules below are identical and getting either wrong fails in a way that
 * looks like a backend outage.
 *
 * In dev the Vite proxy forwards `/ws` to the backend (`vite.config.ts`, with
 * `ws: true`), so a relative path on the current origin is correct and avoids
 * CORS entirely. In production the API base URL points at the backend, so its
 * origin is reused with the matching `ws`/`wss` scheme — mixed content on an
 * HTTPS panel would be blocked outright.
 *
 * The token goes in the query string rather than a header because browsers
 * cannot set headers on a WebSocket handshake. It is the same token the REST
 * calls send as `Authorization: Token <key>`.
 *
 * @param path Consumer path, with both slashes — e.g. `"/ws/events/"`.
 */
export function resolveSocketUrl(path: string, token: string): string {
  const query = `?token=${encodeURIComponent(token)}`;

  if (import.meta.env.DEV) {
    const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${window.location.host}${path}${query}`;
  }

  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
  try {
    const url = new URL(base, window.location.origin);
    const scheme = url.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${url.host}${path}${query}`;
  } catch {
    // A malformed or empty base URL is a deployment error, but falling back to
    // the current origin is the reading most likely to work: it is what dev
    // does, and a same-origin deployment needs nothing else.
    const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${window.location.host}${path}${query}`;
  }
}
