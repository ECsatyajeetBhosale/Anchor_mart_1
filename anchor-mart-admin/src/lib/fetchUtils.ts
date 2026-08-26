import { logout } from "@/features/auth/slice/authSlice";
import type { RootState } from "@/store";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/**
 * RTK Query base API — the single source of truth for all API calls.
 *
 * Auth: Django REST Framework Token Auth
 * Header: Authorization: Token <token>
 *
 * All feature APIs must extend this via injectEndpoints() — never
 * create a new createApi() instance.
 */
/**
 * Shared client secret required by the `/api/chat/` mounts.
 *
 * The `/api/superadmin/` prefix — which is almost everything this panel calls —
 * is **exempt**, so this is attached per-endpoint rather than globally. The one
 * admin call that needs it is chat attachment upload (Flow 23 §4.4).
 *
 * ⚠️ Not a secret from this panel's own users: Vite inlines every `VITE_*` var
 * into the bundle at build time, so it is readable in any browser that loads the
 * app. It gates the API against unauthenticated traffic, nothing more — which is
 * the same footing the sailor and partner apps carry it on.
 */
const SERVER_SECRET_KEY = import.meta.env.VITE_SERVER_SECRET_KEY as string | undefined;

/**
 * Marks a request as needing the `server-secret-key` header.
 *
 * Spelled as an endpoint opt-in because the exemption runs the other way round
 * from what you would guess: the privileged `/superadmin/` routes do **not**
 * want it, and only the shared `/api/chat/` mounts do. Attaching it globally
 * would send the panel's secret on every request in the app to no purpose.
 */
export const SERVER_SECRET_HEADER = "x-am-needs-server-secret";

const rawBaseQuery = fetchBaseQuery({
  // Dev: empty baseUrl → relative URLs hit Vite proxy (no CORS)
  // Prod: full URL → requests go directly to backend
  baseUrl: import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_BASE_URL as string),
  prepareHeaders: (headers, { getState, extra: _extra, endpoint: _endpoint, type: _type }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      // Django REST Framework Token Auth — NOT Bearer
      headers.set("Authorization", `Token ${token}`);
    }

    // Opt-in marker set by the endpoint, swapped for the real header here so the
    // key itself never has to be imported into a feature module.
    if (headers.has(SERVER_SECRET_HEADER)) {
      headers.delete(SERVER_SECRET_HEADER);
      if (SERVER_SECRET_KEY) headers.set("server-secret-key", SERVER_SECRET_KEY);
    }

    // **Never set Content-Type on a multipart body.** The browser has to write
    // it itself, because only it knows the boundary token it generated; setting
    // it here produces a body the server cannot parse and a 400 that looks like
    // a rejected file rather than a malformed request.
    if (headers.get("Content-Type") === "multipart/form-data") {
      headers.delete("Content-Type");
    } else if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    // Default to JSON, but let an endpoint override `Accept` (e.g. file exports
    // that return xlsx — forcing application/json makes DRF reply 406).
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }
    // Skip ngrok browser interstitial in development
    headers.set("ngrok-skip-browser-warning", "true");
    return headers;
  },
});

/**
 * Clears the session when the API says the token is dead.
 *
 * There was no 401 handling anywhere in this panel — no wrapper, no middleware,
 * no interceptor, zero hits for `401` across `src/`. Every call against a dead
 * token failed silently in whichever hook made it, leaving the admin on a fully
 * rendered screen whose data had quietly stopped arriving. The badge socket's
 * `auth_error` was papering over a gap that belongs here, in the API layer.
 *
 * With this in place the two signals sit the right way round: the REST layer
 * detects a dead token on the very next call an admin makes, and the socket's
 * terminal auth frame is a second, faster notice of the same thing. Either can
 * fire first; `logout()` is idempotent, so both firing is harmless.
 *
 * **401 only.** A 403 is an authorisation verdict on one endpoint — a sub-admin
 * reaching for something only a super admin may do — and signing them out over
 * it would end a perfectly good session for touching the wrong screen.
 */
const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    api.dispatch(logout());
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  /**
   * Refetch every subscribed query when its component mounts.
   *
   * Without this the RTK Query defaults apply — `keepUnusedDataFor: 60` keeps a
   * cache entry alive for 60s after the last subscriber unmounts, and
   * `refetchOnMountOrArgChange` is `false` — so navigating Orders → Intents →
   * Orders inside a minute served the cached rows and issued **no request at
   * all**. Mutations invalidate their own tags correctly, so the operator's own
   * edits always showed; what went stale was everything they did not cause —
   * another admin claiming an order, a payment landing, a partner submitting
   * verification, a Celery timer firing. On a console that drives live order
   * queues, that is exactly the data that must not be stale.
   *
   * Cached data still renders immediately while the refetch is in flight
   * (`isLoading` stays false when a cache entry exists; only `isFetching` goes
   * true), so screens show their rows instantly and swap in fresh ones — no
   * skeleton flash. Endpoints that must never serve a cached answer keep their
   * own `keepUnusedDataFor: 0`.
   *
   * ⚠️ This makes data fresh *per navigation*, not real-time. A screen left open
   * does not update on its own — that needs `pollingInterval` or a socket.
   */
  refetchOnMountOrArgChange: true,
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    "Dashboard",
    "Analytics",
    "Sailors",
    "Orders",
    "Intents",
    "Products",
    "Variants",
    "ExpressItems",
    "Categories",
    "EmergencyCategories",
    "Partners",
    "Coupons",
    "Loyalty",
    "Deals",
    "BonusPoints",
    "Assignments",
    "Verifications",
    "Notifications",
    "Sellers",
    "Support",
    "Faqs",
    "FaqTypes",
    "SpecialRequests",
    "Spares",
    "ShipAgents",
    "Ratings",
    "Chats",
    "Ports",
    "Gifts",
    "AccountDeletions",
    "AdminUsers",
    "Audit",
    "OutboundMessages",
    "SavedProducts",
    "OrderConfig",
  ],
  endpoints: () => ({}),
});
