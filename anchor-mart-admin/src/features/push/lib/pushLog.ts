/**
 * Diagnostics for the push registration path.
 *
 * This flow is unusually hard to observe: it runs unattended on mount, every
 * step is failure-tolerant by design, and until now each of those steps
 * swallowed its error whole. "The backend is not receiving the token" was
 * therefore indistinguishable from "the browser refused permission", "the
 * service worker never activated", "the SDK would not mint a token" and "the
 * POST came back 401" — all of which look identical from outside: nothing
 * happens, and nothing is said.
 *
 * Off in production unless `VITE_PUSH_DEBUG=true`, so a shipped panel stays
 * silent; on in development, where the question is usually being asked.
 */
const ENABLED = import.meta.env.DEV || import.meta.env.VITE_PUSH_DEBUG === "true";

/**
 * An FCM registration token, reduced to something you can match across a log
 * and a database row without the log becoming a way to push to that device.
 *
 * Never pass an auth token to this — the session token has no business in a
 * console at any length, and nothing here needs it. The only credential-shaped
 * value this module will ever print is the device token, and only in this form.
 */
export function fingerprintToken(token: string | null | undefined): string {
  if (!token) return "(none)";
  if (token.length <= 16) return `(${token.length} chars)`;
  return `${token.slice(0, 8)}…${token.slice(-4)} (${token.length} chars)`;
}

export function pushLog(event: string, detail?: Record<string, unknown>): void {
  if (!ENABLED) return;
  if (detail) console.info(`[push] ${event}`, detail);
  else console.info(`[push] ${event}`);
}

/** Reduces an unknown throwable to something worth printing. */
export function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
