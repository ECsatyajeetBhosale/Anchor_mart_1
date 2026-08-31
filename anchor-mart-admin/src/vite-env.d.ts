/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Django backend, ending in `/api`. Used verbatim in production builds. */
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
