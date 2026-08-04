import { APP_ROUTES } from "@/lib/constants";
import {
  IconAnchor,
  IconBell,
  IconBolt,
  IconBoxSeam,
  IconBuildingStore,
  IconCategory,
  IconCategory2,
  IconChartAreaLine,
  // Icons for the three parked nav items below (Assignments, Verifications,
  // Message Log). Kept commented, not deleted — `noUnusedLocals` would fail the
  // build if they stayed imported while their entries are off.
  // IconChecklist,
  // IconClipboardList,
  IconClipboardText,
  IconEngine,
  IconFileInvoice,
  IconGift,
  IconHeart,
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
  IconUsers,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

export interface NavItem {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  path: string;
  badge?: string | null;
  badgeVariant?: "warning" | "success" | "info" | "danger" | null;
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
 * The counterweight is that a section per screen is no better than none, so
 * related work stays together even when the fit isn't perfect (Ports and Ship
 * Agents are master data rather than catalog, but they are administered the
 * same way and don't earn a section of their own).
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
    // The order funnel end to end, plus the two parties to it. Delivery
    // Partners joins here rather than keeping a one-item "Delivery App"
    // section — assignment is the tail of this same flow.
    label: "Orders & Delivery",
    items: [
      {
        key: "orders",
        label: "Orders",
        icon: IconPackage,
        path: APP_ROUTES.ORDERS,
        badge: "12",
      },
      {
        key: "intents",
        label: "Intents",
        icon: IconFileInvoice,
        path: APP_ROUTES.INTENTS,
        badge: "8",
        badgeVariant: "warning",
      },
      {
        key: "requests",
        label: "Special Requests",
        icon: IconClipboardText,
        path: APP_ROUTES.REQUESTS,
        badge: "5",
        badgeVariant: "warning",
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
      // Parked, not removed — both screens are built and wired; they are just
      // hidden from the drawer for now. Restore these entries together with
      // their routes in `routes/AppRouter.tsx` to bring them back.
      // {
      //   key: "assignments",
      //   label: "Assignments",
      //   icon: IconClipboardList,
      //   path: APP_ROUTES.ASSIGNMENTS,
      //   badge: "4",
      // },
      // {
      //   key: "verification",
      //   label: "Verifications",
      //   icon: IconChecklist,
      //   path: APP_ROUTES.VERIFICATION,
      //   badge: "3",
      //   badgeVariant: "warning",
      // },
    ],
  },
  {
    // Everything that defines what can be bought and where it goes. The three
    // catalogs (regular, express, marine emergency) sit together because they
    // are the same administration job against different scopes.
    label: "Catalog",
    items: [
      {
        key: "products",
        label: "Products",
        icon: IconBoxSeam,
        path: APP_ROUTES.PRODUCTS,
      },
      {
        key: "categories",
        label: "Categories",
        icon: IconCategory,
        path: APP_ROUTES.CATEGORIES,
      },
      {
        key: "express",
        label: "Express Items",
        icon: IconBolt,
        path: APP_ROUTES.EXPRESS,
      },
      {
        key: "spares",
        label: "Marine Emergency Spares",
        icon: IconEngine,
        path: APP_ROUTES.SPARES,
      },
      {
        key: "emergency-categories",
        label: "Marine Emergency Categories",
        icon: IconCategory2,
        path: APP_ROUTES.EMERGENCY_CATEGORIES,
      },
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
    label: "Operations",
    items: [
      {
        key: "notifications",
        label: "Notifications",
        icon: IconBell,
        path: APP_ROUTES.NOTIFICATIONS,
        badge: "5",
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
        badge: "3",
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
      {
        key: "sellers",
        label: "Seller Requests",
        icon: IconBuildingStore,
        path: APP_ROUTES.SELLERS,
        badge: "4",
        badgeVariant: "warning",
      },
      {
        // Flow 31 — provisioning and deletion review on one screen. Sits beside
        // Seller Requests: both are review queues, and neither is sailor-only
        // (partners and sellers raise deletion requests too).
        key: "account-management",
        label: "Account Management",
        icon: IconUserCog,
        path: APP_ROUTES.ACCOUNT_MANAGEMENT,
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
    ],
  },
];
