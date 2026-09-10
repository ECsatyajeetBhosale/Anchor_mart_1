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

/**
 * Where a click on a notification should land.
 *
 * The previous version read `data.url || data.click_action`, and **neither key
 * exists in any payload the backend sends** — so every background push opened
 * the dashboard root regardless of what it was about.
 *
 * `fcm_options.link` is checked first even though nothing sends it yet. It is
 * the right mechanism for web push, and the backend has offered to populate it
 * once this map is handed over; reading it now makes that switch a backend
 * deploy rather than a coordinated release, and demotes the table below from
 * source of truth to fallback.
 *
 * Until then the route comes from `data.type`. Broadcasts are checked first,
 * because their `type` is the literal string "broadcast" rather than one of the
 * notification types, and their `id` is a broadcast record — a different
 * resource from a personal notification, and not something to hand to a
 * mark-read call.
 *
 * Anything unrecognised lands on the inbox rather than being dropped: the type
 * list is open and new values reach already-shipped clients, so an unknown type
 * has to mean "somewhere you can read it", never "nowhere".
 */
const INBOX = "/notification-inbox";

const ROUTE_BY_TYPE = {
  // Orders, and the money attached to them.
  order_update: "/orders",
  payment: "/orders",
  out_for_delivery: "/orders",
  delivered: "/orders",
  // Sourcing — the intent queue and what happens inside it.
  intent_received: "/intents",
  out_of_stock: "/intents",
  substitution: "/intents",
  // Fulfilment.
  order_assigned: "/assignments",
  // Conversations.
  order_chat: "/order-chats",
  crew_nudge: "/order-chats",
  // A sourcing request raised by a sailor.
  special_request: "/requests",
  // Catalog and campaign types. These are written for the sailor apps; an admin
  // who receives one has no screen more specific than the inbox.
  back_in_stock: INBOX,
  deal_of_the_day: INBOX,
  promo: INBOX,
  system: INBOX,
};

/**
 * Where the panel is mounted — `/amadmin/`, read off the worker's own scope
 * rather than hardcoded, since the scope is exactly the prefix the app was
 * registered under. The paths above stay root-relative so they keep matching
 * `APP_ROUTES` one-for-one; this is what turns one into a URL the panel can
 * actually be opened at.
 */
const MOUNT = new URL(self.registration.scope).pathname;

function withMount(path) {
  return `${MOUNT.replace(/\/$/, "")}${path}`;
}

function targetUrl(payload) {
  // A link chosen by the sender is used exactly as given — it may well be an
  // absolute URL, and it is not this worker's place to rewrite one.
  const link = payload.fcmOptions?.link || payload.fcm_options?.link;
  if (link) return link;

  const data = payload.data || {};
  if (data.type === "broadcast") return withMount(INBOX);
  return withMount(ROUTE_BY_TYPE[data.type] || INBOX);
}

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
    // No `icon`/`badge`: this app ships no root icon file, and a 404'd icon URL
    // renders as a broken image slot in some browsers rather than falling back
    // cleanly. Add them here once there is a real asset to point at.
    self.registration.showNotification(title, {
      body,
      // Part of the documented notification block, and often null.
      image: payload.notification?.image || undefined,
      // Collapses repeats of the same subject rather than stacking them.
      // `notification_id` on a targeted push, `id` on a broadcast — the two
      // never appear together, which is what tells the shapes apart.
      tag: data.notification_id || data.id || undefined,
      data: { url: targetUrl(payload) },
    });
  });
}

/**
 * Click-through: focus an already-open panel tab rather than opening a second
 * one, and navigate it to whatever the payload pointed at.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || withMount(INBOX);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          if ("navigate" in client) client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
