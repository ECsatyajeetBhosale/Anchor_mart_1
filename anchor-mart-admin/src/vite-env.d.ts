/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Which environment this build targets, set per env file: `local` in
   * `.env.development`, `production` in `.env.production`.
   *
   * Distinct from Vite's own `MODE`/`DEV`/`PROD`, which describe how the bundle
   * was compiled. This describes which backend it was pointed at, so a build
   * can be identified without inferring it from the API URL.
   *
   * **Gates media upload** (Flow 26) — see `src/lib/appEnv.ts`. Read it through
   * `isProductionEnv()` / `isMediaUploadEnabled()` rather than comparing this
   * string at a call site, so the rule lives in one place.
   */
  readonly VITE_APP_ENV: "local" | "production";
  /**
   * Django backend, ending in `/api`. Lives in the mode files, not `.env` —
   * it is the value that differs between environments.
   *
   * Used verbatim in production builds. In dev the app calls the relative
   * `/api` instead and `vite.config.ts` proxies it here, which is what avoids
   * CORS; this value is the proxy target rather than a request URL.
   */
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
  /**
   * Shared client secret for the `/api/chat/` mounts (Flow 23 §4.4).
   *
   * Optional: every other endpoint this panel calls sits under
   * `/api/superadmin/`, which is exempt. Absent, chat attachment upload is the
   * only thing that stops working.
   */
  readonly VITE_SERVER_SECRET_KEY?: string;

  /**
   * Firebase Web config for browser push (Flow 21 §9).
   *
   * All optional, and all-or-nothing: `isPushConfigured()` treats a partial set
   * as unconfigured and the feature stays dark, so a deployment that does not
   * want push simply leaves them out. `AUTH_DOMAIN` is the one genuine optional
   * within the set — it belongs to Firebase Auth, which this panel does not use,
   * and is defaulted from the project id.
   *
   * Not secrets. Firebase Web config identifies a project; it authorises
   * nothing, and Vite inlines it into the bundle like every other `VITE_*` var.
   */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** PUBLIC half of the Web Push certificate pair — not the server key. */
  readonly VITE_FIREBASE_VAPID_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
