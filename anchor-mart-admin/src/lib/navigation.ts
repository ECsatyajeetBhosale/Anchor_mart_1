import type { BadgeQueue } from "@/features/realtime/types/realtime.types";
import { APP_ROUTES } from "@/lib/constants";
import {
  IconAlertTriangle,
  IconAnchor,
  IconBell,
  IconBolt,
  IconBoxSeam,
  IconBuildingStore,
  IconCategory,
  IconCategory2,
  IconChartAreaLine,
  IconChecklist,
  // Icons for the parked nav items below (Assignments, Message Log). Kept
  // commented, not deleted — `noUnusedLocals` would fail the build if they
  // stayed imported while their entries are off.
  // IconClipboardList,
  IconClipboardText,
  IconDiscount2,
  IconEngine,
  IconFileInvoice,
  IconGift,
  IconHeart,
  IconHelpCircle,
  IconLayoutDashboard,
  IconLifebuoy,
  // IconMailFast,
  IconMapPin,
  IconMessage2,
  IconMessages,
  IconMotorbike,
  IconPackage,
  IconSettings,
  IconShieldLock,
  IconStar,
  IconStarFilled,
  IconUserCog,
  IconUserMinus,
  IconUsers,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

export interface NavItem {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  path: string;
  /**
   * Which realtime counter this item's pill shows.
   *
   * A **key, never a number** — that is the point. The previous shape took a
   * literal string with a comment asking callers not to invent one, and three
   * invented ones ("5" on Notifications, "3" on Support, "4" on Seller
   * Requests) shipped anyway and sat in the sidebar looking like real
   * outstanding work. Naming a counter instead makes the rule structural: there
   * is no way to express a made-up number here, and an item with no counter
   * behind it simply has no pill.
   *
   * The value comes from `state.realtime.counts`, pushed over `ws/events/`.
   * Notifications and Support are absent from that contract, so neither carries
   * a pill until the backend publishes counts for them.
   */
  badgeKey?: BadgeQueue;
  badgeVariant?: "warning" | "success" | "info" | "danger" | null;
  /**
   * Match this path exactly instead of by prefix.
   *
   * `NavLink` treats a descendant route as active by default, which is right
   * for a detail page opened from a queue and wrong for a sibling screen that
   * happens to live under the same path — `/orders/failed` would otherwise keep
   * Orders lit alongside Failed Deliveries.
   */
  navEnd?: boolean;
  /**
   * Hide this entry below super admin.
   *
   * For screens the backend refuses outright at a lower tier, not merely ones
   * that render less. Listing such a screen and then explaining it is off-limits
   * advertises a permission a sub-admin cannot be granted.
   */
  superAdminOnly?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Sidebar grouping.
 *
 * Sections are kept few and broad on purpose. "Sailors App" previously held 16
 * entries — order queues, catalog administration and promotion surfaces in one
 * undifferentiated run — which is long enough that finding anything meant
 * reading the whole list. It is split by *what the admin is doing*: working the
 * order funnel, administering the catalog, or running promotions.
 *
 * The counterweight is that a section per screen is no better than none, so a
 * pair only splits out once the mismatch is plain: Ports and Ship Agents sat
 * under Catalog for exactly that reason until Catalog filled with entries that
 * genuinely are products, at which point the two non-products stood out enough
 * to be worth their own heading.
 *
 * **Section order is reactive work first, then planned work.** Orders &
 * Delivery and Operations are the two sections where work *arrives* — a queue
 * fills, a message lands, a request waits on a reply — so they sit together at
 * the top. Everything below is work an admin chooses to go and do: what is
 * sold, where it ships to, what promotes it, who holds an account, and the
 * system itself.
 *
 * That order is about *arrival*, not about badges, and the two no longer line
 * up: the live counters (`ws/events/`) cover Orders & Delivery's six entries
 * and Seller Requests over in Account Management, while Operations carries
 * none — Notifications and Support have no counter in the badge contract, and
 * the hardcoded pills they once showed were fabricated. A section is placed
 * here by whether work lands in it unbidden; whether the backend counts that
 * work is a separate question with a different answer.
 *
 * That is the axis, not raw frequency. Catalog is edited often but never
 * *waits* on anyone; Operations may be quiet for an hour and then need an answer
 * within minutes.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: IconLayoutDashboard,
        path: APP_ROUTES.DASHBOARD,
      },
      {
        key: "analytics",
        label: "Analytics",
        icon: IconChartAreaLine,
        path: APP_ROUTES.ANALYTICS,
      },
    ],
  },
  {
    // Six queues of work an admin actions. Sailors and Delivery Partners used to
    // sit here too, which mixed two jobs — working a queue and looking someone
    // up — under one heading. They live in Account Management now.
    //
    // Ordered along the funnel rather than by traffic: Intents is where an order
    // starts (pre-payment), Orders is where it continues (post-payment), and the
    // two share that funnel. Express skips it entirely and Special Requests sits
    // outside it, so both follow the pair they are the exception to.
    //
    // The last two are not funnel stages at all and sit after it deliberately:
    // Verifications is a review step that interrupts the funnel, and Failed
    // Deliveries is the exception state an order lands in when the funnel has
    // already failed. Both arrived with the realtime badges — each is a queue
    // precisely because a counter says how much is waiting in it.
    label: "Orders & Delivery",
    items: [
      {
        key: "intents",
        label: "Intents",
        icon: IconFileInvoice,
        path: APP_ROUTES.INTENTS,
        badgeKey: "intents",
      },
      {
        key: "orders",
        label: "Orders",
        icon: IconPackage,
        path: APP_ROUTES.ORDERS,
        badgeKey: "orders",
        // `/orders/failed` is its own entry below; without this both light up.
        navEnd: true,
      },
      {
        /**
         * Express orders, split out on 2026-08-17.
         *
         * The two entries above are the two halves of that funnel, both regular
         * + marine;
         * express is direct-pay and skips it, so it no longer appears on either.
         * It sits here rather than under Catalog because this is an order queue
         * — Catalog's "Express Products" is the catalog itself, a different job.
         */
        key: "express-orders",
        label: "Express Orders",
        icon: IconBolt,
        path: APP_ROUTES.EXPRESS_ORDERS,
        badgeKey: "express_orders",
      },
      {
        key: "requests",
        label: "Special Requests",
        icon: IconClipboardText,
        path: APP_ROUTES.REQUESTS,
        badgeKey: "special_requests",
      },
      {
        /**
         * Restored 2026-08-24 with the realtime badges. It had been parked with
         * no recorded reason; the counter behind it is live and parity-tested
         * against the dashboard card, so the screen and its badge came back
         * together — the badge is the argument for the entry.
         */
        key: "verification",
        label: "Verifications",
        icon: IconChecklist,
        path: APP_ROUTES.VERIFICATION,
        badgeKey: "verifications",
        badgeVariant: "warning",
      },
      {
        /**
         * Failed deliveries — the orders list preset to `delivery_failed`.
         *
         * Its **own path**, not `/orders?status=delivery_failed`. `NavLink`
         * matches on pathname, so a query-string entry would light up whenever
         * Orders was active and vice versa — the trap `constants.ts` records
         * this codebase being bitten by with `?tab=`. Orders carries `navEnd`
         * so the reverse cannot happen either: this path is a descendant of
         * `/orders`, which would otherwise keep Orders lit here.
         *
         * Last in the section because it is the exception state, not a stage of
         * the funnel.
         */
        key: "delivery-failed",
        label: "Failed Deliveries",
        icon: IconAlertTriangle,
        path: APP_ROUTES.ORDERS_FAILED,
        badgeKey: "delivery_failed",
        badgeVariant: "danger",
      },
      // Assignments stays parked, deliberately: no counter in the badge contract
      // covers it, so restoring it beside the two above would put one live badge
      // and one bare entry side by side. Its own decision, not this one's.
      // {
      //   key: "assignments",
      //   label: "Assignments",
      //   icon: IconClipboardList,
      //   path: APP_ROUTES.ASSIGNMENTS,
      // },
    ],
  },
  {
    // Four inboxes: what the platform sends out, and what comes back in.
    // Directly under the order funnel because both are reactive — someone is
    // waiting on the other end of each — and they are the two sections carrying
    // live counts.
    //
    // The two account-review queues that used to sit here moved to Account
    // Management. They are inboxes too, but the question they answer is about a
    // person rather than a conversation.
    label: "Operations",
    items: [
      {
        key: "notifications",
        label: "Notifications",
        icon: IconBell,
        path: APP_ROUTES.NOTIFICATIONS,
      },
      {
        key: "chat",
        label: "Chat Monitor",
        icon: IconMessages,
        path: APP_ROUTES.CHAT,
      },
      {
        key: "support",
        label: "Support",
        icon: IconLifebuoy,
        path: APP_ROUTES.SUPPORT,
      },
      {
        // Flow 23 §4.3 — per-order threads, deliberately separate from Chat
        // Monitor: that one is the shared partner support inbox, this one is
        // scoped to the orders you own (super admins see all).
        key: "order-chats",
        label: "Order Chats",
        icon: IconMessage2,
        path: APP_ROUTES.ORDER_CHATS,
      },
      // Parked, not removed — see the note on Assignments above.
      // {
      //   // Flow 22 §3.1 — the outbound email/WhatsApp delivery log.
      //   key: "messages",
      //   label: "Message Log",
      //   icon: IconMailFast,
      //   path: APP_ROUTES.MESSAGES,
      // },
    ],
  },
  {
    // Everything that defines what can be bought. The three catalogs (regular,
    // express, marine emergency) sit together because they are the same
    // administration job against different scopes.
    //
    // Categories lead the section: an admin defines the buckets before filling
    // them, so both category surfaces come first and the item surfaces
    // (products, express, spares) follow in the same scope order.
    label: "Catalog",
    items: [
      {
        key: "categories",
        label: "Categories",
        icon: IconCategory,
        path: APP_ROUTES.CATEGORIES,
      },
      {
        key: "emergency-categories",
        label: "Marine Emergency Categories",
        icon: IconCategory2,
        path: APP_ROUTES.EMERGENCY_CATEGORIES,
      },
      {
        key: "products",
        label: "Products",
        icon: IconBoxSeam,
        path: APP_ROUTES.PRODUCTS,
      },
      {
        /**
         * Named for the unit it opens on. Catalog works in products, so the
         * screen leads with `express/products/`; the SKU-level Items view is a
         * tab inside it rather than a sibling entry, because it is the same
         * catalog at a finer grain, not a second one.
         */
        key: "express",
        label: "Express Products",
        icon: IconBolt,
        path: APP_ROUTES.EXPRESS,
      },
      {
        key: "spares",
        label: "Marine Emergency Spares",
        icon: IconEngine,
        path: APP_ROUTES.SPARES,
      },
    ],
  },
  {
    /**
     * The real-world network the platform delivers into: the places a vessel
     * can be, and the agents who represent it there.
     *
     * They sat under Catalog on the reasoning that they are administered the
     * same way and did not earn a section of their own — the comment there said
     * as much. They are not catalog, though: nothing here is bought, and an
     * admin editing a port is not editing what is for sale. With Catalog now
     * holding five entries that genuinely are products, the two stand out
     * plainly enough to be worth their own heading.
     */
    label: "Ports & Agents",
    items: [
      {
        key: "ports",
        label: "Ports",
        icon: IconMapPin,
        path: APP_ROUTES.PORTS,
      },
      {
        key: "ship-agents",
        label: "Ship Agents",
        icon: IconAnchor,
        path: APP_ROUTES.SHIP_AGENTS,
      },
    ],
  },
  {
    // Demand-side surfaces: what the platform pushes to sailors and what comes
    // back. Run by whoever runs promotions, not the fulfilment desk.
    label: "Marketing",
    items: [
      {
        key: "rewards",
        label: "Rewards & Coupons",
        icon: IconStar,
        path: APP_ROUTES.REWARDS,
      },
      {
        // Was a tab of Rewards & Coupons. A daily offer is scheduled and priced
        // on its own terms — it shares nothing with the loyalty programme or the
        // coupon book beyond being a promotion — so it belongs beside Surprise
        // Gifts rather than behind a tab on a screen about points and codes.
        key: "deals",
        label: "Deal of the Day",
        icon: IconDiscount2,
        path: APP_ROUTES.DEALS,
      },
      {
        // Flow 20 is platform advertising ("reach, not reward"), so it belongs
        // with coupons and deals rather than the order funnel.
        key: "gifts",
        label: "Surprise Gifts",
        icon: IconGift,
        path: APP_ROUTES.GIFTS,
      },
      {
        key: "ratings",
        label: "Ratings & Reviews",
        icon: IconStarFilled,
        path: APP_ROUTES.RATINGS,
      },
      {
        // Flow 29c §5 — an engagement read (what sailors wishlisted), not
        // catalog administration, so it sits with the demand-side surfaces
        // rather than beside Products/Categories.
        key: "saved-products",
        label: "Saved Products",
        icon: IconHeart,
        path: APP_ROUTES.SAVED_PRODUCTS,
      },
    ],
  },
  {
    /**
     * Every account on the platform, one entry per kind, plus the queue that
     * closes one.
     *
     * These five answer the same question — *who is this, and may they be here?*
     * — and were previously split three ways: the two directories under the
     * order funnel because orders reference them, Seller Requests under
     * Operations because it is an inbox, and admins and deletion review buried
     * as tabs of a single "Account Management" screen. An admin looking up a
     * person had to know which of the three to try.
     *
     * The section replaces that screen, which is why there is no longer an entry
     * called Account Management: the section *is* it. Admins and Deletion
     * Requests each took a route of their own, because `NavLink` matches on
     * pathname and two `?tab=` links sharing `/account-management` would have
     * rendered active simultaneously.
     *
     * Sits low in the sidebar. It was directly under Orders & Delivery on the
     * grounds that Sailors and Delivery Partners get opened *from* order work —
     * but they largely do not: the order drawer already carries the sailor's
     * name, email and phone, and partner assignment happens inside it. What
     * remains is a directory to browse and three review queues, none of which
     * anybody is waiting on by the minute.
     */
    label: "Account Management",
    items: [
      {
        key: "admins",
        label: "Admins & Operators",
        icon: IconUserCog,
        path: APP_ROUTES.ADMIN_USERS,
        // Admin accounts are refused server-side below super admin (SEC-1).
        superAdminOnly: true,
      },
      {
        key: "sailors",
        label: "Sailors",
        icon: IconUsers,
        path: APP_ROUTES.SAILORS,
      },
      {
        key: "partners",
        label: "Delivery Partners",
        icon: IconMotorbike,
        path: APP_ROUTES.PARTNERS,
      },
      {
        key: "sellers",
        label: "Seller Requests",
        icon: IconBuildingStore,
        path: APP_ROUTES.SELLERS,
        badgeKey: "seller_requests",
        badgeVariant: "warning",
      },
      {
        // Flow 31 §8–11 — the deletion-review queue. Last in the section: it is
        // the end of an account's life, and the four above are its kinds.
        key: "deletion-requests",
        label: "Deletion Requests",
        icon: IconUserMinus,
        path: APP_ROUTES.DELETION_REQUESTS,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        // Flow 34. Role-scoped server-side: a sub-admin only ever sees
        // `category=order` entries, and chain verification is super-admin only.
        key: "audit",
        label: "Audit Trail",
        icon: IconShieldLock,
        path: APP_ROUTES.AUDIT,
      },
      {
        key: "settings",
        label: "Settings",
        icon: IconSettings,
        path: APP_ROUTES.SETTINGS,
      },
      {
        // Sailor-facing help content. It was reachable only through a card on
        // the Settings page — a screen with its own list, drawers and category
        // management, filed as if it were a setting. The card is gone; this is
        // the way in.
        key: "faqs",
        label: "Help & FAQ",
        icon: IconHelpCircle,
        path: APP_ROUTES.SETTINGS_FAQS,
      },
    ],
  },
];
