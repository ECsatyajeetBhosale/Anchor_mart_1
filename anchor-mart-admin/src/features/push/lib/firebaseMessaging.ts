import { getFirebaseConfig, getVapidKey, isPushConfigured } from "./firebaseConfig";

/**
 * Thin wrapper over `firebase/messaging` — the only file that imports the SDK.
 *
 * Everything here loads the SDK through a **dynamic** `import()`. Firebase is a
 * large dependency and push is optional: a build with no `VITE_FIREBASE_*` vars,
 * or a browser that cannot do push at all, must not pay for it. Static imports
 * would pull the whole SDK into the entry chunk for every admin regardless.
 *
 * Every export is failure-tolerant on purpose. Push is a convenience layered on
 * top of a socket that already works, so nothing in here may throw into a render
 * path or block sign-in — the worst outcome of a broken push setup should be an
 * admin who does not get background notifications, never a panel that will not
 * load.
 */

/** The registered SW, memoised. Registering twice returns the same worker, but this saves the round trip. */
let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Can this browser do web push at all?
 *
 * All three checks matter and they fail in different places: no `Notification`
 * on older Safari, no `serviceWorker` on any insecure origin (which includes a
 * LAN IP in dev, though `localhost` is treated as secure), and no `PushManager`
 * in a Firefox private window.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/** Current browser permission, or `"denied"` where the API does not exist. */
export function currentPermission(): NotificationPermission {
  return isPushSupported() ? Notification.permission : "denied";
}

/**
 * Registers the messaging service worker, handing it the Firebase config.
 *
 * The config travels as a **query string** because a service worker is not part
 * of the Vite build graph: it is a static file in `public/`, so `import.meta.env`
 * is not substituted inside it and it has no other way to learn the project it
 * belongs to. The alternative — hardcoding the config in the worker — would put
 * one project's ids in the source tree and break every other environment.
 *
 * The query string is also part of the worker's identity to the browser, so a
 * config change produces a different URL and the browser fetches and installs
 * the new worker rather than keeping the old one alive on its byte-identical
 * script.
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) return swRegistration;
  try {
    const cfg = getFirebaseConfig();
    const qs = new URLSearchParams({
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId,
    });
    swRegistration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${qs.toString()}`,
      { scope: "/" },
    );
    // `register()` resolves as soon as the worker is *registered*, which can be
    // before it is active. `getToken` needs an active worker, and asking early
    // is a `messaging/failed-service-worker-registration` that looks like a
    // config error rather than a race.
    await navigator.serviceWorker.ready;
    return swRegistration;
  } catch {
    swRegistration = null;
    return null;
  }
}

/** The messaging instance, or null if the SDK says this browser is out. */
async function getMessagingInstance() {
  const [{ getApp, getApps, initializeApp }, { getMessaging, isSupported }] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);
  // The SDK's own support check is stricter than ours — it also rules out
  // browsers whose service-worker implementation cannot carry push payloads.
  if (!(await isSupported())) return null;
  // `initializeApp` throws on a duplicate name, and React strict mode plus a
  // remount makes duplicates ordinary rather than exceptional.
  const app = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
  return getMessaging(app);
}

/**
 * Asks the browser for permission, if it has not already answered.
 *
 * The panel calls this **without** a user gesture, from the sign-in effect in
 * `usePushNotifications`. Browsers differ on that: Chrome shows the prompt
 * anyway (possibly in its quieter UI), while Firefox and Safari require a
 * gesture and resolve to `"default"` without showing anything. That is not a
 * denial — permission is left untouched — so the silent no-op on those browsers
 * costs nothing beyond push staying off there.
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/**
 * Mints the FCM registration token for this browser, or null if anything fails.
 *
 * Assumes permission is already `granted` — `getToken` would prompt on its own
 * otherwise, outside the user gesture that makes prompting legal.
 *
 * The token is per browser-profile-per-origin, and it is **not** stable: FCM
 * rotates it, and clearing site data mints a fresh one. That is exactly why the
 * caller re-sends it on every sign-in rather than caching it as a one-time
 * setup step.
 */
export async function getDeviceToken(): Promise<string | null> {
  if (!isPushSupported() || !isPushConfigured()) return null;
  if (currentPermission() !== "granted") return null;
  try {
    const registration = await registerServiceWorker();
    if (!registration) return null;
    const messaging = await getMessagingInstance();
    if (!messaging) return null;
    const { getToken } = await import("firebase/messaging");
    const token = await getToken(messaging, {
      vapidKey: getVapidKey(),
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Subscribes to messages that arrive **while the panel is focused**.
 *
 * The service worker deliberately does not handle these: FCM delivers a
 * foreground message to the page instead of the worker, and a worker that also
 * posted a notification for them would double up. Returns an unsubscribe, or a
 * no-op when push is unavailable.
 */
export async function onForegroundMessage(
  handler: (payload: { title?: string; body?: string }) => void,
): Promise<() => void> {
  if (!isPushSupported() || !isPushConfigured()) return () => {};
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return () => {};
    const { onMessage } = await import("firebase/messaging");
    return onMessage(messaging, (payload) => {
      // A "notification" message carries the display fields; a "data" message
      // carries whatever the campaign put in `metadata` (Flow 32). Read both,
      // since the backend sends either depending on the notification type.
      const data = payload.data as Record<string, string> | undefined;
      handler({
        title: payload.notification?.title ?? data?.title,
        body: payload.notification?.body ?? data?.body,
      });
    });
  } catch {
    return () => {};
  }
}
