import { APP_ROUTES } from "@/lib/constants";
import {
  IconBell,
  IconBolt,
  IconBoxSeam,
  IconBuildingStore,
  IconCategory,
  IconChartAreaLine,
  IconChecklist,
  IconClipboardList,
  IconClipboardText,
  IconEngine,
  IconFileInvoice,
  IconLayoutDashboard,
  IconLifebuoy,
  IconMessages,
  IconMotorbike,
  IconPackage,
  IconSettings,
  IconStar,
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
    ],
  },
  {
    label: "System",
    items: [
      {
        key: "settings",
        label: "Settings",
        icon: IconSettings,
        path: APP_ROUTES.SETTINGS,
      },
    ],
  },
];
