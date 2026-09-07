import { AUTH_TOKEN_STORAGE_KEY } from "../slice/authSlice";

/**
 * The cross-tab sign-out wire.
 *
 * Two transports carry the same fact, because neither is enough alone:
 *
 * - **`BroadcastChannel`** is the deliberate signal. It is instant, it carries
 *   an explicit message rather than an inference, and it works even where the
 *   token never reached `localStorage` (private mode, storage disabled).
 * - **The `storage` event** is the backstop. `logout` already removes the token
 *   key, and every *other* tab is notified of that removal for free — so this
 *   path costs nothing extra and still fires if `BroadcastChannel` is missing,
 *   or if a tab was signed out by something that never posted a message at all,
 *   such as the 401 handler in an older build.
 *
 * Neither transport can echo: `BroadcastChannel` does not deliver to the
 * context that posted, and `storage` never fires in the tab that wrote. Both
 * *can* fire in the same receiving tab for one sign-out, which is why the
 * subscriber has to be idempotent — see `startSessionSync`.
 *
 * There is no polling and no request here. A signed-out tab learns from the
 * browser, not from the API.
 */

/** Exported so a test can stand in for "the other tab" on the same wire. */
export const SESSION_CHANNEL_NAME = "anchor-mart-admin.session";
const CHANNEL_NAME = SESSION_CHANNEL_NAME;
const LOGOUT_MESSAGE = "logout";

/**
 * Opened lazily and kept for the life of the document.
 *
 * A channel per publish would work but would also open and abandon one on every
 * sign-out; a channel per subscriber would silently stop delivering once the
 * first one closed it.
 */
let channel: BroadcastChannel | null = null;
let channelUnavailable = false;

function getChannel(): BroadcastChannel | null {
  if (channel || channelUnavailable) return channel;
  if (typeof BroadcastChannel === "undefined") {
    channelUnavailable = true;
    return null;
  }
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    // Some embedded webviews expose the constructor and then refuse to
    // construct it. The `storage` path still covers those.
    channelUnavailable = true;
  }
  return channel;
}

/** Tells every other tab of this browser profile that the session has ended. */
export function publishLogout(): void {
  try {
    getChannel()?.postMessage(LOGOUT_MESSAGE);
  } catch {
    // A closed or broken channel must never take the local sign-out down with
    // it — this tab has already cleared its own session by the time we get here.
  }
}

/**
 * Runs `onLogout` when *another* tab signs out. Returns an unsubscribe.
 *
 * `onLogout` may be called more than once for a single sign-out and must be
 * safe to run when this tab is already signed out.
 */
export function subscribeToRemoteLogout(onLogout: () => void): () => void {
  const teardown: Array<() => void> = [];

  const bus = getChannel();
  if (bus) {
    const onMessage = (event: MessageEvent) => {
      if (event.data === LOGOUT_MESSAGE) onLogout();
    };
    bus.addEventListener("message", onMessage);
    teardown.push(() => bus.removeEventListener("message", onMessage));
  }

  const onStorage = (event: StorageEvent) => {
    // A null `key` means the whole store was cleared, which takes the token
    // with it. Anything else is only interesting if it is the token key.
    if (event.key !== null && event.key !== AUTH_TOKEN_STORAGE_KEY) return;
    // A non-null `newValue` is a *write* — a sign-in, or the identity refresh.
    // Only the removal means the session ended.
    if (event.newValue !== null) return;
    onLogout();
  };
  window.addEventListener("storage", onStorage);
  teardown.push(() => window.removeEventListener("storage", onStorage));

  return () => {
    for (const off of teardown) off();
  };
}

/** Test seam: drops the memoised channel so a suite can start from nothing. */
export function resetSessionChannelForTests(): void {
  channel?.close();
  channel = null;
  channelUnavailable = false;
}
