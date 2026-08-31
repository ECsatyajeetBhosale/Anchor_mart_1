/* eslint-disable */
/**
 * Firebase Cloud Messaging service worker — background push for the admin panel.
 *
 * This file is NOT part of the Vite build. It sits in `public/` and is served
 * verbatim from the site root, which has two consequences worth knowing before
 * editing it:
 *
 *  1. `import.meta.env` is not substituted here, so the Firebase config cannot
 *     be baked in. It arrives on the query string of the `register()` call in
 *     `features/push/lib/firebaseMessaging.ts`, and is read back below.
 *  2. `import` is unavailable in a classic worker, so the SDK comes from the
 *     `compat` builds over `importScripts`. These are the versioned, pinned
 *     Google CDN copies — keep the version in step with the `firebase` package
 *     in `package.json` when upgrading, since the worker and the page negotiate
 *     the same token.
 *
 * A worker must live at the site root to claim a root scope, which is why this
 * is here rather than beside the feature it belongs to.
 */

importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");

const params = new URLSearchParams(self.location.search);
const config = {
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
};

// Registered without config — nothing to do. Bailing out beats initialising with
// nulls, which throws inside the SDK on a line that says nothing about the cause.
if (config.apiKey && config.projectId && config.messagingSenderId && config.appId) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  /**
   * Fires only when no tab has focus — a focused page gets the message through
   * `onMessage` instead. Handling both would show every alert twice.
   *
   * A "notification" message is displayed by the browser on its own, so this
   * handler exists for "data" messages, which are delivered silently and show
   * nothing unless the worker draws them.
   */
  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = payload.notification?.title || data.title || "AnchorMart";
    const body = payload.notification?.body || data.body || "";
    // `tag` collapses repeats of the same subject into one notification rather
    // than stacking them; `data.url` is read back on click below.
    // No `icon`/`badge`: this app ships no root icon file (index.html points at
    // a /favicon.svg that does not exist), and a 404'd icon URL renders as a
    // broken image slot in some browsers rather than falling back cleanly. Add
    // them here once there is a real asset to point at.
    self.registration.showNotification(title, {
      body,
      tag: data.tag || data.notification_id || undefined,
      data: { url: data.url || data.click_action || "/" },
    });
  });
}

/**
 * Click-through: focus an already-open panel tab rather than opening a second
 * one, and navigate it to whatever the payload pointed at.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          if ("navigate" in client && target !== "/") client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
