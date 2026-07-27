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
  GET_STATS: "/superadmin/products/product-stats/",
  GET_PRODUCTS: "/superadmin/products/get-products/",
  GET_PRODUCT: (id: string) => `/superadmin/products/get-product/${id}/`,
  ADD_PRODUCT: "/superadmin/products/add-product/",
  UPDATE_PRODUCT: (id: string) => `/superadmin/products/update-product/${id}/`,
  DELETE_PRODUCT: (id: string) => `/superadmin/products/delete-product/${id}/`,
};

export const CATEGORY_ENDPOINTS = {
  GET_STATS: "/superadmin/categories/category-stats/",
  GET_CATEGORIES: "/superadmin/categories/get-categories/",
  ADD_CATEGORY: "/superadmin/categories/add-category/",
  UPDATE_CATEGORY: (id: string) => `/superadmin/categories/update-category/${id}/`,
  DELETE_CATEGORY: (id: string) => `/superadmin/categories/delete-category/${id}/`,
};

/**
 * Marine Emergency Categories — the emergency-spares catalog's own category set.
 * Mirrors CATEGORY_ENDPOINTS but under the emergency-spares namespace.
 */
export const EMERGENCY_CATEGORY_ENDPOINTS = {
  GET_STATS: "/superadmin/emergency-spares/categories/stats/",
  GET_CATEGORIES: "/superadmin/emergency-spares/categories/",
  GET_CATEGORY: (id: string) => `/superadmin/emergency-spares/categories/${id}/`,
  ADD_CATEGORY: "/superadmin/emergency-spares/categories/add/",
  UPDATE_CATEGORY: (id: string) => `/superadmin/emergency-spares/categories/${id}/update/`,
  DELETE_CATEGORY: (id: string) => `/superadmin/emergency-spares/categories/${id}/delete/`,
};

export const SHIP_AGENT_ENDPOINTS = {
  // Flow 02 — admin ship-agent directory (APIs 13–16).
  GET_SHIP_AGENTS: "/superadmin/ship-agents/",
  ADD_SHIP_AGENT: "/superadmin/ship-agents/create/",
  UPDATE_SHIP_AGENT: (id: string) => `/superadmin/ship-agents/${id}/update/`,
  DELETE_SHIP_AGENT: (id: string) => `/superadmin/ship-agents/${id}/delete/`,
  // API 17 — bind/clear an agent on an order (used from the order-detail side).
  SET_ORDER_SHIP_AGENT: (orderId: string) => `/superadmin/ship-agents/order/${orderId}/set/`,
};

export const SAILOR_ENDPOINTS = {
  GET_SAILORS: "/superadmin/sailors/sailors-list/",
  GET_STATS: "/superadmin/sailors/stats/",
  GET_SAILOR: (id: string) => `/superadmin/sailors/sailor/${id}/`,
  // Create goes through the shared admin create-user endpoint; the `role` in the
  // body picks the user type — a sailor is created as "customer".
  CREATE_SAILOR: "/superadmin/admin/create-user/",
  UPDATE_SAILOR: (id: string) => `/superadmin/sailors/sailor/${id}/update/`,
  DELETE_SAILOR: (id: string) => `/superadmin/sailors/sailor/${id}/delete/`,
  TOGGLE_STATUS: (id: string) => `/superadmin/sailors/sailor/${id}/status/`,
};

export const EXPRESS_ENDPOINTS = {
  GET_EXPRESS_ITEMS: "/superadmin/express/orders/",
};

export const ORDER_ENDPOINTS = {
  GET_ORDERS: "/superadmin/orders/orders/",
  // Post-payment KPI counters for the Orders screen (Flow 11 §16). No params.
  GET_ORDER_STATS: "/superadmin/orders/orders/stats/",
  ORDER_DETAIL: (id: string) => `/superadmin/orders/orders/${id}/`,
  // Cancel uses the singular `order/` segment (like claim/reassign), per the doc
  // — NOT the doubled `orders/orders/` shape of the list/detail paths. Full
  // request/error contract is Flow 12 (Order Cancellation & Refund), not in this doc.
  CANCEL_ORDER: (id: string) => `/superadmin/orders/order/${id}/cancel/`,
  // Flow 27 — order ownership. Note the singular `order/` segment here; it does
  // not follow the doubled `orders/orders/` shape used by the list/detail paths.
  CLAIM_ORDER: (id: string) => `/superadmin/orders/order/${id}/claim/`,
  REASSIGN_ORDER: (id: string) => `/superadmin/orders/order/${id}/reassign/`,
  // Flow 05 API 6 — terminal intent rejection. Requires a `reason`; gated by
  // Flow 27 ownership (409 if unclaimed, 403 if owned by another admin).
  REJECT_INTENT: (id: string) => `/superadmin/orders/order/${id}/reject-intent/`,
  // Flow 12 §3 — side-effect-free preview of what a refund would return.
  // Optional `?override=true` previews forcing it past the auto window.
  REFUND_QUOTE: (id: string) => `/superadmin/orders/order/${id}/refund-quote/`,
  // Flow 12 §4 — refund a paid order. Full (no `amount`) or partial (`amount`
  // + an `Idempotency-Key` header, `partially_delivered` orders only).
  REFUND: (id: string) => `/superadmin/orders/order/${id}/refund/`,
  // Flow 11 §2 — location-report review queue. Omit `order_id` for the
  // cross-order pending queue; pass it for one order's full history.
  LOCATION_REPORTS: "/superadmin/orders/location-reports/",
  // Flow 11 §3 — price the order's pending `delta` report into a DeltaPayment.
  RAISE_DELTA: (id: string) => `/superadmin/orders/order/${id}/raise-delta/`,
  // Flow 11 §4 — dismiss a location report (either kind).
  DISMISS_LOCATION_REPORT: (orderId: string, reportId: string) =>
    `/superadmin/orders/order/${orderId}/location-reports/${reportId}/dismiss/`,
  // Flow 11 §5 — apply a `rebill` report: relocate + kill the stale Stripe link.
  APPLY_LOCATION_REPORT: (orderId: string, reportId: string) =>
    `/superadmin/orders/order/${orderId}/location-reports/${reportId}/apply/`,
  // Flow 11 §13 — withdraw an open (unpaid) delta; the delivery hold lifts.
  WITHDRAW_DELTA: (orderId: string, deltaId: string) =>
    `/superadmin/orders/order/${orderId}/deltas/${deltaId}/withdraw/`,
  // Flow 10 API 10 — picking-slip PDF for any order. Streams a binary
  // attachment, so the caller must read it as a blob, not JSON.
  ORDER_SLIP: (id: string) => `/superadmin/orders/order/${id}/slip/`,
};

export const INTENT_ENDPOINTS = {
  GET_INTENTS: "/superadmin/orders/intents/",
  GET_STATS: "/superadmin/orders/intents/stats/",
};

// Flow 07 — Order Billing & Payment (admin billing surface).
// `generate-link` (Stripe) is intentionally omitted — the flow doc says not to
// build it yet.
export const PAYMENT_ENDPOINTS = {
  // API 1 — set fees, move order to PAYMENT_PENDING, notify the customer (no link).
  CREATE_BILL: "/superadmin/payments/create-bill/",
  // API 2 — recompute a pending bill (available for a later step).
  UPDATE_BILL: "/superadmin/payments/update-bill/",
};

// Flow 06 — Stock Verification & Substitution (admin substitution surface).
export const SUBSTITUTION_ENDPOINTS = {
  // API 6 — drill-in: latest report lines (with order_item_id, shortfall,
  // needs_suggestion), partner, and order block. Query: `order_id`.
  VERIFICATION_DETAIL: "/superadmin/partner/verification-detail/",
  // API 9 — staged (unreleased) + released suggestions for an order. Query: `order_id`.
  FETCH_SUGGESTED_ITEMS: "/superadmin/orders/fetch-suggested-items/",
  // API 10 — variant picker: products carried at a port, with variants.
  // Query: `port_id` (required), optional `search`, `page`.
  SUGGESTION_PRODUCTS: "/superadmin/dashboard/products/suggestion/",
  // API 11 — stage an existing catalog variant as a suggestion.
  SUGGEST: "/superadmin/orders/suggest/",
  // API 12 — create a brand-new product + variant and suggest it.
  SUGGEST_NEW_PRODUCT: "/superadmin/orders/suggest-new-product/",
  // API 13 — release ALL staged suggestions for an order to the sailor.
  RELEASE_SUGGESTION: "/superadmin/orders/release-suggestion/",
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

export const VERIFICATION_ENDPOINTS = {
  GET_REPORTS: "/superadmin/partner/verification-reports/",
};

export const ASSIGNMENT_ENDPOINTS = {
  GET_UNASSIGNED_ORDERS: "/superadmin/partner/unassigned-orders/",
  ASSIGN_ORDER: "/superadmin/partner/assign-order/",
  // Flow 28 API 11 — partners scoped to an order's capability (verify/deliver) + port.
  ASSIGNABLE_PARTNERS: "/superadmin/partner/assignable-partners/",
  // Flow 28 API 16 — milestone ladder for one order (`steps` / `terminal_state` /
  // raw `history`), shared with the customer track screen. Query: `order_id`.
  ORDER_TIMELINE: "/superadmin/partner/order-timeline/",
  // Flow 28 API 13 — every assignment ever made on one order, newest first
  // (including ones closed as `reassigned`). Query: `order_id` (required).
  ORDER_ASSIGNMENTS: "/superadmin/partner/order-assignments/",
};

export const SPECIAL_REQUEST_ENDPOINTS = {
  GET_LIST: "/superadmin/special-requests/get-all-special-requests/",
  GET_STATS: "/superadmin/special-requests/special-request-stats/",
  // Detail is fetched by the row id via the `product_id` query param.
  GET_DETAIL: "/superadmin/special-requests/get-special-requests/",
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
  GET_LOYALTY_CONFIG: "/superadmin/promotion/loyalty/config/",
  UPDATE_LOYALTY_CONFIG: "/superadmin/promotion/loyalty/config/update/",
  GET_COUPONS: "/superadmin/promotion/coupons/",
  CREATE_COUPON: "/superadmin/promotion/coupons/add/",
  UPDATE_COUPON: (id: string) => `/superadmin/orders/coupons/update/${id}/`,
  DELETE_COUPON: (id: string) => `/superadmin/orders/coupons/delete/${id}/`,
};
