/**
 * Application navigation routes.
 * All app path strings live here — never hardcode paths in components.
 */
export const APP_ROUTES = {
  LOGIN: "/login",
  LOGIN_OTP: "/login/otp",
  DASHBOARD: "/dashboard",
  ANALYTICS: "/analytics",
  SAILORS: "/sailors",
  ORDERS: "/orders",
  INTENTS: "/intents",
  PRODUCTS: "/products",
  CATEGORIES: "/categories",
  EMERGENCY_CATEGORIES: "/emergency-categories",
  SHIP_AGENTS: "/ship-agents",
  EXPRESS: "/express",
  REWARDS: "/rewards",
  PARTNERS: "/partners",
  ASSIGNMENTS: "/assignments",
  VERIFICATION: "/verification",
  NOTIFICATIONS: "/notifications",
  CHAT: "/chat",
  SUPPORT: "/support",
  SELLERS: "/sellers",
  SETTINGS: "/settings",
  SETTINGS_FAQS: "/settings/faqs",
  SETTINGS_USERS: "/settings/users",
  REQUESTS: "/requests",
  SPARES: "/spares",
  RATINGS: "/ratings",
  PORTS: "/ports",
} as const;

/**
 * Auth endpoint paths. Every other backend URL lives in `lib/apiEndpoints.ts`
 * in its own typed block — never hardcode API strings in feature files.
 * The base URL comes from import.meta.env.VITE_API_BASE_URL.
 *
 * This object used to carry a route group per feature, but they had drifted:
 * paths like `/superadmin/verifications/` and `/superadmin/notifications/send/`
 * were never served by the backend and nothing read them. Only `AUTH` was live,
 * so only `AUTH` remains.
 */
export const API_ROUTES = {
  AUTH: {
    LOGIN: "/superadmin/admin/login/",
    LOGOUT: "/superadmin/admin/logout/",
    ME: "/superadmin/auth/me/",
    // OTP login (two-step). /superadmin/ is exempt from the server-secret-key
    // header — do not add it for these two endpoints.
    LOGIN_WITH_OTP: "/superadmin/admin/login-with-otp/",
    VERIFY_OTP: "/superadmin/admin/verify-otp/",
  },
} as const;
