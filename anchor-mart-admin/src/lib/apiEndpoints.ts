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
    DETAIL: (id: string) => `/superadmin/orders/orders//${id}/`,
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
  GET_PRODUCTS: "/superadmin/products/get-products/",
  ADD_PRODUCT: "/superadmin/products/add-product/",
  UPDATE_PRODUCT: (id: string) => `/superadmin/products/update-product/${id}/`,
  DELETE_PRODUCT: (id: string) => `/superadmin/products/delete-product/${id}/`,
};

export const CATEGORY_ENDPOINTS = {
  GET_CATEGORIES: "/superadmin/categories/get-categories/",
};

export const SAILOR_ENDPOINTS = {
  GET_SAILORS: "/superadmin/sailors/sailors-list/",
  GET_STATS: "/superadmin/sailors/stats/",
  GET_SAILOR: (id: string) => `/superadmin/sailors/sailor/${id}/`,
  // Create goes through the shared admin create-user endpoint (role: "customer").
  CREATE_SAILOR: "/superadmin/admin/create-user/",
  UPDATE_SAILOR: (id: string) => `/superadmin/sailors/sailor/${id}/update/`,
  DELETE_SAILOR: (id: string) => `/superadmin/sailors/sailor/${id}/delete/`,
  TOGGLE_STATUS: (id: string) => `/superadmin/sailors/sailor/${id}/status/`,
};

export const EXPRESS_ENDPOINTS = {
  GET_EXPRESS_ITEMS: "/superadmin/product-variants/get-express-items/",
};

export const ORDER_ENDPOINTS = {
  GET_ORDERS: "/superadmin/orders/orders/",
  ORDER_DETAIL: (id: string) => `/superadmin/orders/orders/${id}/`,
  CANCEL_ORDER: (id: string) => `/superadmin/orders/orders/${id}/cancel/`,
};

export const INTENT_ENDPOINTS = {
  GET_INTENTS: "/superadmin/orders/intents/",
  GET_STATS: "/superadmin/orders/intents/stats/",
};

export const PARTNER_ENDPOINTS = {
  GET_LIST: "/superadmin/partner/list/",
  CREATE: "/superadmin/partner/create/",
  // Detail is fetched by the row's user id via the `user_id` query param.
  GET_DETAIL: "/superadmin/partner/partner_detail/",
  // Delete by the row's user id via the `user_id` query param.
  DELETE: "/superadmin/partner/delete/",
  // Update partner detail; user id sent as the `user_id` query param.
  UPDATE: "/superadmin/partner/partner_detail_update/",
};

export const SPECIAL_REQUEST_ENDPOINTS = {
  GET_LIST: "/superadmin/special-requests/get-special-products/",
  GET_STATS: "/superadmin/special-requests/special-request-stats/",
  // Detail is fetched by the row id via the `product_id` query param.
  GET_DETAIL: "/superadmin/special-requests/get-special-interests/",
  // Excel export; accepts the same optional `status` filter as the list.
  EXPORT: "/superadmin/special-requests/export-to-excel/",
};

export const SELLER_ENDPOINTS = {
  GET_LIST: "/superadmin/sellers/requests/",
  GET_STATS: "/superadmin/sellers/stats/",
  // Detail is fetched by the row id via the `seller_id` query param.
  GET_DETAIL: "/superadmin/sellers/seller-detail/",
  APPROVE: (id: string) => `/superadmin/sellers/${id}/approve/`,
  REJECT: (id: string) => `/superadmin/sellers/${id}/reject/`,
};

export const SPARE_ENDPOINTS = {
  GET_LIST: "/superadmin/emergency-spares/products/",
  GET_STATS: "/superadmin/emergency-spares/products/stats/",
};

export const DASHBOARD_ENDPOINTS = {
  GET_STATS: "/superadmin/dashboard/dashboard/stats/",
  GET_LIVE_ORDERS: "/superadmin/dashboard/live-orders/",
  LIVE_ORDER_DETAIL: (id: string) => `/superadmin/dashboard/live-orders/${id}/`,
  GET_REVENUE: "/superadmin/dashboard/revenue/",
  GET_TOP_PRODUCTS: "/superadmin/dashboard/top-products/",
  GET_ACTIVE_PARTNERS: "/superadmin/dashboard/active-partners/",
  GET_ACTION_REQUIRED: "/superadmin/dashboard/action-required/",
};

export const ANALYTICS_ENDPOINTS = {
  GET_SUMMARY: "/superadmin/analytics/summary/",
  GET_SALES_TREND: "/superadmin/analytics/sales-trend/",
  GET_ORDERS_BY_CATEGORY: "/superadmin/analytics/orders-by-category/",
  GET_PRODUCT_SALES: "/superadmin/analytics/product-sales/",
};

export const REWARD_ENDPOINTS = {
  GET_LOYALTY_OVERVIEW: "/superadmin/promotion/loyalty/overview/",
  GET_COUPONS: "/superadmin/promotion/coupons/",
  CREATE_COUPON: "/superadmin/promotion/coupons/add/",
  UPDATE_COUPON: (id: string) => `/superadmin/orders/coupons/update/${id}/`,
  DELETE_COUPON: (id: string) => `/superadmin/orders/coupons/delete/${id}/`,
};
