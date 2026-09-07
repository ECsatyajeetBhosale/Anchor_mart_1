import { baseApi } from "@/lib/fetchUtils";
import { MESSAGES } from "@/lib/messages";
import type { Middleware } from "@reduxjs/toolkit";
import { toast } from "sonner";
import { logout } from "../slice/authSlice";
import { publishLogout, subscribeToRemoteLogout } from "./sessionChannel";

/**
 * Everything that has to happen around a sign-out beyond emptying the auth
 * slice — in one place, so it happens for *every* sign-out rather than for the
 * one the sidebar button knows about.
 *
 * There are five callers of `logout()` and they are not all under this app's
 * control: the sidebar, `useAuth`, the API layer's 401 handler, the badge
 * socket's terminal auth frame, and now another tab. Hanging this off the
 * action instead of off any of those means none of them can be the one that
 * forgets.
 */

/**
 * Announces local sign-outs, and empties the query cache on every sign-out.
 *
 * **Why the cache reset lives here.** `logout` clears the token and the stored
 * identity, but nothing has ever cleared what those credentials fetched — RTK
 * Query kept every page of orders, sailors and partners the session had loaded.
 * In one tab that was mostly invisible, since the redirect follows immediately.
 * Across tabs it is not: a tab signed out from elsewhere would sit on the login
 * screen still holding the previous admin's data, and hand it straight back to
 * whoever signed in next, for the frame before the refetch lands.
 */
export const sessionSyncMiddleware: Middleware = (api) => (next) => (action) => {
  const result = next(action);

  if (logout.match(action)) {
    // After `next`, so the auth slice is already empty: any subscribed query
    // that re-runs as a result of this finds no token rather than the dead one.
    api.dispatch(baseApi.util.resetApiState());
    // A remote sign-out is already common knowledge — re-publishing it would
    // put one message on the wire per open tab for a single click.
    if (!action.meta.remote) publishLogout();
  }

  return result;
};

/** The slice of the store this needs; keeps the sync testable without one. */
interface SessionStore {
  getState: () => { auth: { isAuthenticated: boolean } };
  dispatch: (action: ReturnType<typeof logout>) => unknown;
}

/**
 * Signs this tab out when another tab does. Returns an unsubscribe.
 *
 * No navigation happens here on purpose. `ProtectedRoute` already sends an
 * unauthenticated visitor to the login screen, so flipping `isAuthenticated` is
 * the whole redirect — and routing from two places is how you get the loop the
 * requirement warns about.
 */
export function startSessionSync(store: SessionStore): () => void {
  return subscribeToRemoteLogout(() => {
    // Idempotent by design. The channel message and the token's removal both
    // describe the same sign-out and either may arrive first, so the second one
    // has to be a no-op — not a second toast and a second cache reset.
    if (!store.getState().auth.isAuthenticated) return;
    store.dispatch(logout({ remote: true }));
    toast.info(MESSAGES.AUTH.SIGNED_OUT_OTHER_TAB);
  });
}
