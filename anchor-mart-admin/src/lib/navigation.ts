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
  IconChecklist,
  IconClipboardList,
  IconClipboardText,
  IconEngine,
  IconFileInvoice,
  IconGift,
  IconHeart,
  IconLayoutDashboard,
  IconLifebuoy,
  IconMailFast,
  IconMapPin,
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
    label: "Sailors App",
    items: [
      {
        key: "sailors",
        label: "Sailors",
        icon: IconUsers,
        path: APP_ROUTES.SAILORS,
      },
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
        key: "emergency-categories",
        label: "Marine Emergency Categories",
        icon: IconCategory2,
        path: APP_ROUTES.EMERGENCY_CATEGORIES,
      },
      {
        key: "ship-agents",
        label: "Ship Agents",
        icon: IconAnchor,
        path: APP_ROUTES.SHIP_AGENTS,
      },
      {
        key: "ports",
        label: "Ports",
        icon: IconMapPin,
        path: APP_ROUTES.PORTS,
      },
      {
        key: "spares",
        label: "Marine Emergency Spares",
        icon: IconEngine,
        path: APP_ROUTES.SPARES,
      },
      {
        key: "express",
        label: "Express Items",
        icon: IconBolt,
        path: APP_ROUTES.EXPRESS,
      },
      {
        key: "rewards",
        label: "Rewards & Coupons",
        icon: IconStar,
        path: APP_ROUTES.REWARDS,
      },
      {
        // Sits with the promotion surfaces, not the order funnel: Flow 20 is
        // platform advertising ("reach, not reward"), run by whoever runs
        // coupons and deals rather than the fulfilment desk.
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
    label: "Delivery App",
    items: [
      {
        key: "partners",
        label: "Delivery Partners",
        icon: IconMotorbike,
        path: APP_ROUTES.PARTNERS,
      },
      {
        key: "assignments",
        label: "Assignments",
        icon: IconClipboardList,
        path: APP_ROUTES.ASSIGNMENTS,
        badge: "4",
      },
      {
        key: "verification",
        label: "Verifications",
        icon: IconChecklist,
        path: APP_ROUTES.VERIFICATION,
        badge: "3",
        badgeVariant: "warning",
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
      {
        // Flow 22 §3.1 — the outbound email/WhatsApp delivery log.
        key: "messages",
        label: "Message Log",
        icon: IconMailFast,
        path: APP_ROUTES.MESSAGES,
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
    ],
  },
];
