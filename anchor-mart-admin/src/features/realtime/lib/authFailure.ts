import type { EventsAuthErrorCode } from "../types/realtime.types";

/**
 * What the panel should do about a terminal socket auth failure.
 *
 * `auth_error` is not merely informational — §3 of the contract gives every code
 * a prescribed action, and this is that table in code. It matters more here than
 * it looks: there is **no global 401 handling anywhere in this app**, so a dying
 * token produces no signal from the REST layer at all. The socket's auth frame is
 * the only place the panel ever learns that the session is gone.
 */
export type AuthFailureAction =
  /** Session is over. Clear it and send them to sign in again. */
  | "logout-to-login"
  /** Session is over *and* the account is barred. Same clearing, different copy. */
  | "logout-blocked"
  /** Nothing to do to the session. Log it and leave the admin where they are. */
  | "inert";

const ACTIONS: Record<EventsAuthErrorCode, AuthFailureAction> = {
  /**
   * Our own bug — we connected without a token. Logging the admin out over a
   * defect in our connect URL would destroy a perfectly good session.
   */
  missing_token: "inert",
  invalid_token: "logout-to-login",
  token_expired: "logout-to-login",
  blocked: "logout-blocked",
  /**
   * Not a login problem at all: this account *type* has no badges (customer /
   * seller). Signing them out and back in changes nothing, and the REST session
   * behind the panel is unaffected — only the badges are unavailable.
   */
  no_badge_scope: "inert",
};

/**
 * Maps an auth code to its action.
 *
 * An unrecognised code is **inert** by design. A code this frontend has not been
 * taught is the one case where guessing is worst: treating it as a session
 * failure would log an admin out mid-task on the strength of a string we do not
 * understand. Failing to log someone out is recoverable; the reverse is not.
 */
export function authFailureAction(code: string): AuthFailureAction {
  return ACTIONS[code as EventsAuthErrorCode] ?? "inert";
}
