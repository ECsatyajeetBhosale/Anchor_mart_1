/**
 * Firebase Web config, read from `VITE_FIREBASE_*` at build time.
 *
 * Every value here is public by design — Firebase Web config is not a
 * credential. It identifies the project to Google's servers; what protects the
 * data behind it is the backend's auth, not the secrecy of these strings. They
 * ship in the bundle exactly like `VITE_API_BASE_URL` does.
 *
 * The VAPID key is the one that is easy to get wrong: it is the **public** key
 * of the Web Push certificate pair (Firebase console → Project settings → Cloud
 * Messaging → Web configuration), not the server key and not the private half.
 * Without it `getToken` throws `messaging/token-subscribe-failed`.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

/**
 * The subset the messaging SDK actually needs to mint a token.
 *
 * `authDomain` is absent on purpose — it belongs to Firebase Auth, which this
 * panel does not use — so a config missing it is still perfectly serviceable and
 * must not be treated as unconfigured.
 */
const REQUIRED = ["apiKey", "projectId", "messagingSenderId", "appId"] as const;

/**
 * Is there enough config to attempt push at all?
 *
 * Checked before anything else, in the hook and again in the SW registration,
 * because the failure mode otherwise is genuinely bad: an unconfigured build
 * calls `initializeApp` with `undefined` fields, which throws inside the SDK at
 * a point that has nothing to do with the real cause. A panel deployed without
 * these vars should simply not offer push — not break.
 */
export function isPushConfigured(): boolean {
  return REQUIRED.every((k) => Boolean(config[k])) && Boolean(vapidKey);
}

/** Narrowed config for `initializeApp`. Only call after {@link isPushConfigured}. */
export function getFirebaseConfig() {
  return {
    apiKey: config.apiKey as string,
    authDomain: config.authDomain ?? `${config.projectId}.firebaseapp.com`,
    projectId: config.projectId as string,
    messagingSenderId: config.messagingSenderId as string,
    appId: config.appId as string,
  };
}

/** Public VAPID key. Only call after {@link isPushConfigured}. */
export function getVapidKey(): string {
  return vapidKey as string;
}
