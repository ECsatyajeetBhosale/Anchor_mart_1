/**
 * Flow 21 §9 — browser push registration types.
 *
 * The panel already receives live updates over the `/ws/events/` socket, which
 * only works while a tab is open. Push is the other half: it reaches an admin
 * who has the panel in a background tab, or closed altogether.
 */

/** Request body for `POST /api/v1/user/add-fcm-token/`. */
export interface AddFcmTokenRequest {
  fcm_token: string;
}

/** `200` body. The message is fixed text; nothing reads it but the type is honest. */
export interface AddFcmTokenResponse {
  message: string;
}

/**
 * Where this browser stands with push, as one value the UI can switch on.
 *
 * Deliberately not a boolean plus a reason string. Five of these six states are
 * *not* errors — they are ordinary conditions with different remedies, and a
 * boolean flattens "your browser can't do this" into the same shape as "you
 * haven't been asked yet", which is how a permanently impossible state ends up
 * rendered as a button that does nothing when clicked.
 */
export type PushState =
  /** No `Notification`/`serviceWorker`/`PushManager` — Safari in a private window, an old browser, or an insecure origin. Nothing to offer. */
  | "unsupported"
  /** The browser could, but the build has no Firebase config. The feature is dark until `.env` is filled in — see `lib/firebaseConfig.ts`. */
  | "unconfigured"
  /** Supported and configured; the user has not been asked yet. This is the only state where prompting is legal. */
  | "prompt"
  /** The user said no, or the browser decided for them. Irreversible from script — only the site settings UI can undo it. */
  | "denied"
  /** Permission granted and a token is registered with the backend. */
  | "enabled"
  /** Permission granted but the token could not be minted or delivered. Retryable. */
  | "error";
