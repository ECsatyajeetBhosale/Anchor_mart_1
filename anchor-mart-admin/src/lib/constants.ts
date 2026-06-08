/**
 * Application navigation routes.
 * All app path strings live here — never hardcode paths in components.
 */
export const APP_ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  ANALYTICS: "/analytics",
  SAILORS: "/sailors",
  ORDERS: "/orders",
  INTENTS: "/intents",
  PRODUCTS: "/products",
  EXPRESS: "/express",
  INVENTORY: "/inventory",
  REWARDS: "/rewards",
  PARTNERS: "/partners",
  ASSIGNMENTS: "/assignments",
  VERIFICATION: "/verification",
  NOTIFICATIONS: "/notifications",
  CHAT: "/chat",
  SUPPORT: "/support",
  SELLERS: "/sellers",
  SETTINGS: "/settings",
  REQUESTS: "/requests",
  SPARES: "/spares",
} as const;

/**
 * API endpoint paths.
 * All backend URLs live here — never hardcode API strings in feature files.
 * The base URL comes from import.meta.env.VITE_API_BASE_URL.
 */
export const API_ROUTES = {
  AUTH: {
    LOGIN: "/superadmin/admin/login/",
    LOGOUT: "/superadmin/auth/logout/",
    ME: "/superadmin/auth/me/",
  },
  DASHBOARD: {
    STATS: "/superadmin/dashboard/dashboard/",
  },
  SAILORS: {
    LIST: "/superadmin/sailors/",
    DETAIL: (id: string) => `/superadmin/sailors/${id}/`,
    CREATE: "/superadmin/sailors/",
    UPDATE: (id: string) => `/superadmin/sailors/${id}/`,
    DELETE: (id: string) => `/superadmin/sailors/${id}/`,
    BLOCK: (id: string) => `/superadmin/sailors/${id}/block/`,
  },
  ORDERS: {
    LIST: "/superadmin/orders/",
    DETAIL: (id: string) => `/superadmin/orders/${id}/`,
    CANCEL: (id: string) => `/superadmin/orders/${id}/cancel/`,
    ASSIGN: (id: string) => `/superadmin/orders/${id}/assign/`,
  },
  INTENTS: {
    LIST: "/superadmin/intents/",
    DETAIL: (id: string) => `/superadmin/intents/${id}/`,
    CONFIRM: (id: string) => `/superadmin/intents/${id}/confirm/`,
    REJECT: (id: string) => `/superadmin/intents/${id}/reject/`,
  },
  PRODUCTS: {
    LIST: "/superadmin/products/",
    DETAIL: (id: string) => `/superadmin/products/${id}/`,
    CREATE: "/superadmin/products/",
    UPDATE: (id: string) => `/superadmin/products/${id}/`,
    DELETE: (id: string) => `/superadmin/products/${id}/`,
  },
  PARTNERS: {
    LIST: "/superadmin/partners/",
    DETAIL: (id: string) => `/superadmin/partners/${id}/`,
    CREATE: "/superadmin/partners/",
    UPDATE: (id: string) => `/superadmin/partners/${id}/`,
  },
  REWARDS: {
    COUPONS_LIST: "/superadmin/coupons/",
    COUPON_DETAIL: (id: string) => `/superadmin/coupons/${id}/`,
    COUPON_CREATE: "/superadmin/coupons/",
    COUPON_UPDATE: (id: string) => `/superadmin/coupons/${id}/`,
    COUPON_DELETE: (id: string) => `/superadmin/coupons/${id}/`,
  },
  ASSIGNMENTS: {
    LIST: "/superadmin/assignments/",
  },
  VERIFICATION: {
    LIST: "/superadmin/verifications/",
    APPROVE: (id: string) => `/superadmin/verifications/${id}/approve/`,
  },
  NOTIFICATIONS: {
    SEND: "/superadmin/notifications/send/",
  },
  SELLERS: {
    LIST: "/superadmin/sellers/",
    APPROVE: (id: string) => `/superadmin/sellers/${id}/approve/`,
    REJECT: (id: string) => `/superadmin/sellers/${id}/reject/`,
  },
} as const;
