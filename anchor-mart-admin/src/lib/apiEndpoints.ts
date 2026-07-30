// API endpoint paths – moved to a dedicated file for better organization.
//
// NOTE: auth paths live in `lib/constants.ts` (`API_ROUTES.AUTH`). A second,
// stale `API_ROUTES` copy used to sit here with paths the backend never served
// (`/superadmin/verifications/`, `/superadmin/notifications/send/`, …); it was
// unused and has been removed. Add new endpoints to the typed blocks below.

export const PRODUCT_ENDPOINTS = {
  GET_STATS: "/superadmin/products/product-stats/",
  GET_PRODUCTS: "/superadmin/products/get-products/",
  GET_PRODUCT: (id: string) => `/superadmin/products/get-product/${id}/`,
  ADD_PRODUCT: "/superadmin/products/add-product/",
  UPDATE_PRODUCT: (id: string) => `/superadmin/products/update-product/${id}/`,
  DELETE_PRODUCT: (id: string) => `/superadmin/products/delete-product/${id}/`,
  /**
   * Move a product between catalogs. Body: `{ catalog_type }` plus a `category`
   * — required for `marine_emergency` (the emergency catalog has its own
   * category set), omitted for `express`.
   */
  SET_CATALOG_TYPE: (id: string) => `/superadmin/products/set-catalog-type/${id}/`,
  // Body: `{ is_top_rated: boolean }`.
  SET_TOP_RATED: (id: string) => `/superadmin/products/set-top-rated/${id}/`,
  /**
   * Body: `{ admin_sourceable: boolean }`. This is the product-level master
   * switch — a variant is only orderable when both it and its product are
   * sourceable (Flow 17 · `variant_is_effectively_sourceable`).
   */
  SET_ADMIN_SOURCEABLE: (id: string) => `/superadmin/products/set-admin-sourceable/${id}/`,
  /** Variant-level sourceability, routed under the products namespace. */
  SET_VARIANT_ADMIN_SOURCEABLE: (variantId: string) =>
    `/superadmin/products/product-variants/set-admin-sourceable/${variantId}/`,
  /**
   * Flow 17 Build A — manually broadcast "{product} is now available" to all
   * customers (push + in-app, never email). No request body.
   *
   * Guarded server-side: the product must be live, not a private quote product,
   * `admin_sourceable=true`, and have at least one live sourceable variant —
   * otherwise 400. Announcing is deliberately manual so a bulk sourceable edit
   * cannot blast every sailor.
   */
  ANNOUNCE_AVAILABILITY: (id: string) => `/superadmin/products/${id}/announce-availability/`,
};

/**
 * Product variants — the sellable SKUs beneath a product. Note the namespace
 * split: CRUD and the express flag live under `/product-variants/`, while
 * variant sourceability is routed under `/products/product-variants/`
 * (see `PRODUCT_ENDPOINTS.SET_VARIANT_ADMIN_SOURCEABLE`).
 */
export const VARIANT_ENDPOINTS = {
  GET_VARIANTS: "/superadmin/product-variants/get-product-variants/",
  // Detail is fetched by the `product_variant_id` query param, not a path segment.
  GET_VARIANT: "/superadmin/product-variants/product-variant/",
  ADD_VARIANT: "/superadmin/product-variants/add-product-variant/",
  UPDATE_VARIANT: (id: string) => `/superadmin/product-variants/update-product-variant/${id}/`,
  DELETE_VARIANT: (id: string) => `/superadmin/product-variants/delete-product-variant/${id}/`,
  // Body: `{ is_express: boolean }`.
  SET_EXPRESS: (id: string) => `/superadmin/product-variants/set-express/${id}/`,
  // Body: `{ admin_sourceable: boolean }`.
  SET_ADMIN_SOURCEABLE: (id: string) => `/superadmin/product-variants/set-admin-sourceable/${id}/`,
};

export const CATEGORY_ENDPOINTS = {
  GET_STATS: "/superadmin/categories/category-stats/",
  GET_CATEGORIES: "/superadmin/categories/get-categories/",
  // Single category by id — same field set as a list row, fetched fresh so the
  // edit drawer shows current values rather than the (possibly stale) row.
  GET_CATEGORY: (id: string) => `/superadmin/categories/get-category/${id}/`,
  ADD_CATEGORY: "/superadmin/categories/add-category/",
  UPDATE_CATEGORY: (id: string) => `/superadmin/categories/update-category/${id}/`,
  DELETE_CATEGORY: (id: string) => `/superadmin/categories/delete-category/${id}/`,
  /**
   * Categories scoped to one catalog (`regular` | `marine_emergency`). Used by
   * the set-catalog-type flow, which requires a category from the target
   * catalog when moving a product into marine emergency.
   */
  GET_BY_CATALOG_TYPE: "/superadmin/categories/get-categories-by-catalog-type/",
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

/**
 * Help & FAQ management (Settings screen).
 * Note: FAQ and FAQ-type ids are **integers**, not the UUIDs used elsewhere,
 * and detail is fetched via a `?faq_id=` query rather than a path segment.
 */
export const FAQ_ENDPOINTS = {
  GET_FAQS: "/superadmin/faq/list/",
  GET_FAQ: "/superadmin/faq/detail/",
  ADD_FAQ: "/superadmin/faq/create/",
  UPDATE_FAQ: (id: number) => `/superadmin/faq/update/${id}/`,
  DELETE_FAQ: (id: number) => `/superadmin/faq/delete/${id}/`,
  GET_TYPES: "/superadmin/faq/types/",
  ADD_TYPE: "/superadmin/faq/types/add/",
  UPDATE_TYPE: (id: number) => `/superadmin/faq/types/update/${id}/`,
  DELETE_TYPE: (id: number) => `/superadmin/faq/types/delete/${id}/`,
};

/**
 * Shared admin user-creation endpoint. The `role` in the body picks the user
 * type, so this same path also backs sailor creation
 * (`SAILOR_ENDPOINTS.CREATE_SAILOR` sends `role: "customer"`).
 */
export const ADMIN_USER_ENDPOINTS = {
  CREATE_USER: "/superadmin/admin/create-user/",
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
  // Flow 09 API 2 — the post-payment orders list, pre-scoped to `is_express=True`.
  GET_EXPRESS_ORDERS: "/superadmin/express/orders/",
  /**
   * Flow 09 API 3 — the express **variant** catalog. Filters are validated up
   * front, so a malformed UUID/number returns 400 rather than 500. Sort params
   * take the literal phrases "low to high" / "high to low"
   * (and `newest_first` / `oldest_first` for relevance).
   */
  GET_EXPRESS_ITEMS: "/superadmin/express/items/",
  // Flow 09 API 4 — product, variant and order-volume aggregates in one call. No params.
  GET_EXPRESS_STATS: "/superadmin/express/stats/",
};

export const ORDER_ENDPOINTS = {
  GET_ORDERS: "/superadmin/orders/orders/",
  /**
   * Sailor carts that have not yet converted into an order — an admin
   * visibility surface for stalled baskets.
   *
   * NOTE: this endpoint is present in the API collection but is **not** covered
   * by any flow document (flow 04 is the sailor-side cart). Its response shape
   * is therefore read defensively rather than typed against a contract.
   */
  GET_CARTS: "/superadmin/orders/carts/",
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
  // Flow 28 API 3 — `{ total_partners, active_deliveries }`. No filters.
  GET_STATS: "/superadmin/partner/stats/",
  CREATE: "/superadmin/partner/create/",
  // Detail is fetched by the row's user id via the `user_id` query param.
  GET_DETAIL: "/superadmin/partner/partner_detail/",
  // Delete by the row's user id via the `user_id` query param.
  DELETE: "/superadmin/partner/delete/",
  // Update partner detail; user id sent as the `user_id` query param.
  UPDATE: "/superadmin/partner/partner_detail_update/",
};

export const VERIFICATION_ENDPOINTS = {
  // Flow 06 API 5 — latest report per order. Params: `search`, `order_status`
  // (defaults to `verification_submitted` server-side), `page`, `page_size`.
  GET_REPORTS: "/superadmin/partner/verification-reports/",
  // Flow 06 API 4 — three counters, no params.
  GET_STATS: "/superadmin/partner/verification-stats/",
  /**
   * Flow 06 API 7 — every report for one order, with full lines, unpaginated.
   * Query: `order_id`. Uses the **partner app's** serializer, so `status` here is
   * the human label and `status_code` the raw token — the reverse of APIs 5/6.
   */
  GET_ORDER_REPORTS: "/superadmin/partner/reports/",
  // Flow 06 API 8 — bookkeeping only: sets status=reviewed + reviewed_at=now().
  // Its one downstream effect is the `verified_today` counter.
  REVIEW_REPORT: "/superadmin/partner/review-report/",
};

export const ASSIGNMENT_ENDPOINTS = {
  GET_UNASSIGNED_ORDERS: "/superadmin/partner/unassigned-orders/",
  // Flow 28 API 14 ("board a") — every order with a live partner assignment.
  GET_ACTIVE_ASSIGNMENTS: "/superadmin/partner/active-assignments/",
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

/**
 * Flow 13 — Special Request (non-catalog sourcing & quotation). The admin side
 * is exactly these six routes; the customer half of the flow (submit / pay /
 * request-changes) lives on the sailor app under `/api/catalog/`.
 */
export const SPECIAL_REQUEST_ENDPOINTS = {
  // Flow 13 API 8 — `?status` (validated, 400 on a bad value) · `?search` · paginated.
  GET_LIST: "/superadmin/special-requests/get-all-special-requests/",
  // Flow 13 API 7 — count per status.
  GET_STATS: "/superadmin/special-requests/special-request-stats/",
  // Flow 13 API 9 — detail is fetched by the row id via the `product_id` query param.
  GET_DETAIL: "/superadmin/special-requests/get-special-requests/",
  // Flow 13 API 10 — quote a not-yet-quoted request → `quote_sent`.
  GENERATE_BILL: (id: string) => `/superadmin/special-requests/${id}/generate-bill/`,
  // Flow 13 API 11 — reject before quoting → `rejected`.
  REJECT: (id: string) => `/superadmin/special-requests/${id}/reject/`,
  // Flow 13 API 12 — raise the rebill cap (`additional`, 1–10).
  ALLOW_CHANGES: (id: string) => `/superadmin/special-requests/${id}/allow-changes/`,
};

export const SELLER_ENDPOINTS = {
  GET_LIST: "/superadmin/sellers/requests/",
  GET_STATS: "/superadmin/sellers/stats/",
  // Detail is fetched by the applicant's **user** id via the `user_id` query param.
  GET_DETAIL: "/superadmin/sellers/request/",
  /**
   * Approve *and* reject both go through this one endpoint — the decision is the
   * `status` field in the body (`"approved"` | `"rejected"`), not the path.
   * A rejection must carry a non-empty `admin_note`.
   */
  SET_STATUS: "/superadmin/sellers/set-status/",
};

/**
 * Marine Emergency Spares — the emergency catalog's products. Sibling of
 * EMERGENCY_CATEGORY_ENDPOINTS, which owns the categories these are filed under.
 * A spare is a Product with `catalog_type = "marine_emergency"`, so its payload
 * mirrors add/update-product.
 */
export const SPARE_ENDPOINTS = {
  GET_LIST: "/superadmin/emergency-spares/products/",
  GET_STATS: "/superadmin/emergency-spares/products/stats/",
  GET_PRODUCT: (id: string) => `/superadmin/emergency-spares/products/${id}/`,
  ADD_PRODUCT: "/superadmin/emergency-spares/products/add/",
  UPDATE_PRODUCT: (id: string) => `/superadmin/emergency-spares/products/${id}/update/`,
  DELETE_PRODUCT: (id: string) => `/superadmin/emergency-spares/products/${id}/delete/`,
};

export const DASHBOARD_ENDPOINTS = {
  GET_STATS: "/superadmin/dashboard/dashboard/stats/",
  GET_LIVE_ORDERS: "/superadmin/dashboard/live-orders/",
  LIVE_ORDER_DETAIL: (id: string) => `/superadmin/dashboard/live-orders/${id}/`,
  GET_REVENUE: "/superadmin/dashboard/revenue/",
  GET_TOP_PRODUCTS: "/superadmin/dashboard/top-products/",
  GET_ACTIVE_PARTNERS: "/superadmin/dashboard/active-partners/",
  GET_ACTION_REQUIRED: "/superadmin/dashboard/action-required/",
  /**
   * The full operations order list. Distinct from `live-orders/`, which is a
   * capped real-time preview: this one is searchable and filterable by
   * `order_status` and `filter_by_port`, and paginated.
   *
   * `filter_by_port` takes the port **name** (not its id) — the values come from
   * `GET_PORTS` below.
   */
  GET_ORDERS: "/superadmin/dashboard/orders/",
  // Order detail keyed by the `order_id` query param (not a path segment).
  GET_ORDER_DETAIL: "/superadmin/dashboard/orders/detail/",
  // Ports available as `filter_by_port` values on the orders list.
  GET_PORTS: "/superadmin/dashboard/ports/",
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
  // Note the namespace split: coupons are created under `promotion/` but
  // updated and deleted under `orders/`.
  UPDATE_COUPON: (id: string) => `/superadmin/orders/coupons/update/${id}/`,
  DELETE_COUPON: (id: string) => `/superadmin/orders/coupons/delete/${id}/`,
  // Redemption/usage report across all coupons. No params.
  COUPON_REPORT: "/superadmin/promotion/coupons/report/",

  /**
   * Per-user coupon grants. Assignment ids are **integers**, not the UUIDs used
   * by the coupons themselves.
   */
  GET_COUPON_ASSIGNMENTS: "/superadmin/promotion/coupons/assignments/",
  ADD_COUPON_ASSIGNMENT: "/superadmin/promotion/coupons/assignments/add/",
  DELETE_COUPON_ASSIGNMENT: (id: number | string) =>
    `/superadmin/promotion/coupons/assignments/${id}/`,

  /** Bonus points. `?type=` scopes to `referral` or `loyalty`. */
  GET_BONUS_POINTS: "/superadmin/promotion/bonus-points/",
  ADD_BONUS_POINTS: "/superadmin/promotion/bonus-points/add/",
  // Deletion keys on `?user_id=` rather than a bonus-point row id.
  DELETE_BONUS_POINTS: "/superadmin/promotion/delete-bonus-points/",
  // Per-user ledger; paginated. Query: `user_id`, `page`, `page_size`.
  BONUS_POINT_HISTORY: "/superadmin/promotion/bonus-point-history/",

  /** Deal of the Day. */
  GET_DEALS: "/superadmin/promotion/deals/",
  GET_DEAL: (id: string) => `/superadmin/promotion/deals/${id}/`,
  GET_DEAL_STATS: "/superadmin/promotion/deals/stats/",
  // Today's live deals — the customer-facing selection, not the admin list.
  GET_DEALS_OF_DAY: "/superadmin/promotion/deals-of-day/",
  ADD_DEAL: "/superadmin/promotion/deals/add/",
  UPDATE_DEAL: (id: string) => `/superadmin/promotion/deals/update/${id}/`,
  DELETE_DEAL: (id: string) => `/superadmin/promotion/deals/delete/${id}/`,
  // Body: `{ is_active: boolean }`.
  TOGGLE_DEAL: (id: string) => `/superadmin/promotion/deals/${id}/toggle/`,
};

/**
 * Flow 16 — Post-Delivery Feedback & Ratings (admin read surfaces).
 *
 * Three reads, no writes: the admin can see every review but never authors or
 * edits one. The per-partner delivery leaderboard is deliberately NOT here —
 * it lives in the partner-KPI reads (Flow 28), which are Build-2.
 */
export const RATING_ENDPOINTS = {
  // Every delivery review, newest first. Query: `rating` (1–5, else 400),
  // `partner_id` (UUID, else 400), `search`, `page`, `page_size`.
  GET_DELIVERY_RATINGS: "/superadmin/ratings/delivery/",
  // Every app review, newest first. Query: `rating`, `platform`
  // (case-insensitive exact), `app_version` (exact), `search`, `page`, `page_size`.
  GET_APP_RATINGS: "/superadmin/ratings/app/",
  /**
   * Platform-wide averages tile. Query: `days` (positive int → rolling window;
   * omitted → all-time; `< 1` or non-integer → 400).
   *
   * The payload is cached server-side for ~5 minutes, so a rating submitted
   * seconds ago can be missing from the tile while already present in the lists.
   */
  GET_RATINGS_SUMMARY: "/superadmin/ratings/summary/",
};

/**
 * Flow 26 — Media Upload. Mints a short-lived, size-bounded presigned S3 POST
 * for exactly one object key; the browser then uploads straight to S3 and the
 * owning endpoint is given the returned **`file_location`** (the media-root
 * relative path). `file_key` includes the media-root prefix and will fail the
 * consuming serializer's directory-prefix check — never submit it.
 */
export const MEDIA_ENDPOINTS = {
  PRESIGNED_URL: "/superadmin/admin/presigned-url/",
};

/**
 * Admin notification console. Distinct from the per-user inbox at
 * `/api/notifications/` (Flow 21) — these compose and fan out messages.
 */
export const ADMIN_NOTIFICATION_ENDPOINTS = {
  // Reach preview per role for one notification type. Query: `type`.
  RECIPIENT_SUMMARY: "/superadmin/notifications/recipient-summary/",
  // Reach for one role+type pair. Query: `role`, `type`.
  RECIPIENT_COUNT: "/superadmin/notifications/recipient-count/",
  // Body: `{ role, notification_type, title, message, metadata }`.
  SEND_ROLE_BASED: "/superadmin/notifications/send-rolebased-notification/",
  // Body: `{ title, message, image_path }` — every user, all channels.
  SEND_BROADCAST: "/superadmin/notifications/send-broadcast-notification/",
};

/** Admin chat monitor — read-only visibility into support and order threads. */
export const CHAT_ENDPOINTS = {
  // Support threads (sailors ↔ admin).
  GET_USER_CHATS: "/superadmin/chat/user-chats/",
  // Order/delivery threads.
  GET_DELIVERY_CHATS: "/superadmin/chat/delivery-chats/",
  // Messages in one thread. Query: `chat_id` (note: an integer, not a UUID).
  GET_CHAT_MESSAGES: "/superadmin/chat/chat-messenger-detail/",
};

/**
 * Port directory (admin CRUD). Distinct from `DASHBOARD_ENDPOINTS.GET_PORTS`,
 * which returns bare port **names** for the orders-list filter.
 */
export const PORT_ENDPOINTS = {
  GET_PORTS: "/superadmin/catalog/get-ports/",
  ADD_PORT: "/superadmin/catalog/add-port/",
  UPDATE_PORT: (id: string) => `/superadmin/catalog/update-port/${id}/`,
  DELETE_PORT: (id: string) => `/superadmin/catalog/delete-port/${id}/`,
};

// The backend also serves shops (`/catalog/{add,get,update,delete}-shop*`),
// inventory (`…-inventory*`) and `get-saved-products/` under this namespace.
// No admin screen consumes them, so their constants are intentionally absent
// rather than sitting here uncalled — add them back alongside the UI that needs
// them.
