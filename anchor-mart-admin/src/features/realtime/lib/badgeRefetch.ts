import { APP_ROUTES } from "@/lib/constants";
import type { baseApi } from "@/lib/fetchUtils";
import type { TagDescription } from "@reduxjs/toolkit/query";
import type { BadgeQueue } from "../types/realtime.types";

/** The tag names `baseApi` was created with, recovered from its own type. */
type ApiTag = typeof baseApi extends { util: { invalidateTags: (t: (infer T)[]) => unknown } }
  ? Extract<T, { type: string }>["type"]
  : never;

/**
 * A tag descriptor `baseApi.util.invalidateTags` accepts.
 *
 * Typed off the API's own tag union rather than as a loose `string`, so a
 * mistyped tag name in the table below is a build error. It is the kind of typo
 * that otherwise fails silently: an unknown tag invalidates nothing at all, and
 * the symptom is a list that quietly stops refreshing.
 */
export type QueueTag = TagDescription<ApiTag> & { type: ApiTag; id: string };

interface QueueBinding {
  /** Where this queue's list lives, so we can tell whether it is on screen. */
  route: string;
  /** The list and stats caches to drop when this queue moves. */
  tags: QueueTag[];
}

/**
 * What each counter is bound to: a screen, and the caches behind it.
 *
 * Every tag id here already exists — the queues all follow the same
 * `PARTIAL-LIST` + `STATS` convention — so this is a lookup table rather than
 * new plumbing. Both halves matter: a list refetched without its stats leaves
 * the header tallies contradicting the rows underneath them.
 */
const QUEUE_BINDINGS: Record<BadgeQueue, QueueBinding> = {
  intents: {
    route: APP_ROUTES.INTENTS,
    tags: [
      { type: "Intents", id: "PARTIAL-LIST" },
      { type: "Intents", id: "STATS" },
    ],
  },
  orders: {
    route: APP_ROUTES.ORDERS,
    tags: [
      { type: "Orders", id: "PARTIAL-LIST" },
      { type: "Orders", id: "STATS" },
    ],
  },
  express_orders: {
    route: APP_ROUTES.EXPRESS_ORDERS,
    tags: [
      { type: "ExpressItems", id: "PARTIAL-LIST" },
      { type: "ExpressItems", id: "STATS" },
    ],
  },
  special_requests: {
    route: APP_ROUTES.REQUESTS,
    tags: [
      { type: "SpecialRequests", id: "PARTIAL-LIST" },
      { type: "SpecialRequests", id: "STATS" },
    ],
  },
  seller_requests: {
    route: APP_ROUTES.SELLERS,
    tags: [
      { type: "Sellers", id: "PARTIAL-LIST" },
      { type: "Sellers", id: "STATS" },
    ],
  },
  /**
   * Verifications are **intents**, not a screen of their own.
   *
   * `verification_submitted` is a status on the intent funnel and those rows
   * are already on the Intents list, which is why the panel folds this counter
   * into the Intents entry rather than giving it a sidebar row that duplicates
   * a filter. Binding it here to the Verifications caches — which no routed
   * screen reads any more — would mean a `verifications` frame refetched
   * **nothing at all**, with the admin sitting on the very list those rows
   * appear in.
   */
  verifications: {
    route: APP_ROUTES.INTENTS,
    tags: [
      { type: "Intents", id: "PARTIAL-LIST" },
      { type: "Intents", id: "STATS" },
    ],
  },
  /**
   * Failed deliveries are orders — the contract's own answer is "the orders list
   * filtered to failed" — so they share the Orders screen and its caches, and
   * the panel folds the counter into the Orders entry rather than routing a
   * second screen at the same list. A frame for either key refreshes the same
   * rows, which is correct: a delivery failing changes the orders list whether
   * or not a filter is applied to it.
   */
  delivery_failed: {
    route: APP_ROUTES.ORDERS,
    tags: [
      { type: "Orders", id: "PARTIAL-LIST" },
      { type: "Orders", id: "STATS" },
    ],
  },
};

/**
 * Which caches to invalidate for a queue that just moved — but **only when the
 * admin is looking at it**.
 *
 * This gate is the whole discipline of the feature. The socket exists to replace
 * polling; refetching all seven lists on every frame turns it straight back into
 * polling, with extra steps. For every queue the admin is not looking at, the
 * badge number moves and nothing else happens — and `refetchOnMountOrArgChange`
 * already makes the list fresh the moment they navigate to it.
 *
 * @param pathname The current route, from `useLocation()`.
 * @returns The tags to drop, or an empty array to do nothing.
 */
export function tagsToInvalidate(queue: BadgeQueue, pathname: string): QueueTag[] {
  const binding = QUEUE_BINDINGS[queue];
  if (!binding) return [];
  return isOnRoute(pathname, binding.route) ? binding.tags : [];
}

/** The caches behind whatever screen is open, for the manual refresh button. */
export function tagsForRoute(pathname: string): QueueTag[] {
  // Every queue, so the button refreshes whatever the open screen happens to
  // show — including the dashboard, which is not any single queue's screen.
  return tagsForQueues(Object.keys(QUEUE_BINDINGS) as BadgeQueue[], pathname);
}

/**
 * The dashboard's own caches.
 *
 * The dashboard renders the *same counts* the badges do — `in_progress`,
 * `intent_received` and `delivery_failed` are cards on it — so a frame that moves
 * a badge moves a card too. Without this, an admin sitting on the dashboard
 * watches the sidebar tick up while the card beside it holds the old number:
 * two numbers on one screen disagreeing, which is exactly what the backend
 * importing the dashboard's own definitions was meant to prevent. It cannot
 * happen server-side; refreshing one and not the other reintroduces it here.
 *
 * Every queue invalidates all three rather than a per-queue subset. The cards
 * aggregate across queues (`in_progress` is orders + express; "action required"
 * spans several), so a subset would be guesswork about someone else's SQL — and
 * with the coalescer collapsing bursts, the breadth costs one request on one
 * screen.
 */
const DASHBOARD_TAGS: QueueTag[] = [
  { type: "Dashboard", id: "STATS" },
  { type: "Dashboard", id: "ACTION-REQUIRED" },
  { type: "Orders", id: "DASHBOARD-LIVE" },
];

/**
 * The union of what several queues need refetched, de-duplicated.
 *
 * Takes a batch because the coalescer hands one: a burst spanning `orders` and
 * `delivery_failed` must invalidate the shared Orders caches once, not twice.
 */
export function tagsForQueues(queues: BadgeQueue[], pathname: string): QueueTag[] {
  const seen = new Set<string>();
  const tags: QueueTag[] = [];
  const add = (tag: QueueTag) => {
    const key = `${tag.type}:${tag.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    tags.push(tag);
  };

  for (const queue of queues) {
    for (const tag of tagsToInvalidate(queue, pathname)) add(tag);
  }
  // The dashboard is every queue's second screen, so it is checked once for the
  // batch rather than per queue.
  if (queues.length > 0 && isOnRoute(pathname, APP_ROUTES.DASHBOARD)) {
    for (const tag of DASHBOARD_TAGS) add(tag);
  }
  return tags;
}

/**
 * The screen a queue belongs to.
 *
 * The same bindings the refetch uses, read in the other direction, so a toast
 * deep-links to exactly the screen the invalidation refreshed. Note that three
 * queues deliberately share two routes — `verifications` resolves to Intents
 * and `delivery_failed` to Orders — which is the existing folding decision, not
 * a lookup accident.
 */
export function routeForQueue(queue: BadgeQueue): string {
  return QUEUE_BINDINGS[queue].route;
}

/**
 * Which queues the screen at this path covers.
 *
 * The inverse of {@link tagsToInvalidate}'s route check, and what tells the
 * activity marker two things: don't mark a queue the admin is already looking
 * at, and clear its marker when they arrive. Several queues can share a screen —
 * opening Intents answers for `verifications` as well.
 */
export function queuesForRoute(pathname: string): BadgeQueue[] {
  return (Object.keys(QUEUE_BINDINGS) as BadgeQueue[]).filter((queue) =>
    isOnRoute(pathname, QUEUE_BINDINGS[queue].route),
  );
}

/**
 * Matches the route or anything nested under it, so a detail page opened from a
 * queue still counts as being on that queue's screen.
 *
 * The prefix is compared at a segment boundary: `/express-orders` must not be
 * read as being under `/express`, which is a different screen entirely (the
 * express *catalog*, not the order queue).
 */
function isOnRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}
