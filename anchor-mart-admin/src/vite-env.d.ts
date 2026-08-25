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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
