// API endpoint paths – moved to a dedicated file for better organization
export const API_ROUTES = {
  AUTH: {
    LOGIN: "/superadmin/admin/login/",
    LOGOUT: "/superadmin/admin/logout/",
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

export const PRODUCT_ENDPOINTS = {
  GET_PRODUCTS: "/superadmin/catalog/get-products/",
  ADD_PRODUCT: "/superadmin/catalog/add-product/",
  UPDATE_PRODUCT: (id: string) => `/superadmin/catalog/update-product/${id}/`,
  DELETE_PRODUCT: (id: string) => `/superadmin/catalog/delete-product/${id}/`,
};

export const CATEGORY_ENDPOINTS = {
  GET_CATEGORIES: "/superadmin/catalog/get-categories/",
};

export const EXPRESS_ENDPOINTS = {
  GET_EXPRESS_ITEMS: "/superadmin/catalog/get-express-items/",
};
