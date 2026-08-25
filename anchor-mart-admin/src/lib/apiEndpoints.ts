// API endpoint paths – moved to a dedicated file for better organization.
//
// NOTE: auth paths live in `lib/constants.ts` (`API_ROUTES.AUTH`). A second,
// stale `API_ROUTES` copy used to sit here with paths the backend never served
// (`/superadmin/verifications/`, `/superadmin/notifications/send/`, …); it was
// unused and has been removed. Add new endpoints to the typed blocks below.

export const PRODUCT_ENDPOINTS = {
  GET_STATS: "/superadmin/products/product-stats/",
  GET_PRODUCTS: "/superadmin/products/get-products/",
  /**
   * Whole-catalog list — all three catalog types in one paginated, searchable
   * response, each row carrying `catalog_type`. **Use this for pickers.**
   *
   * `GET_PRODUCTS` above serves the general catalog only (regular + express) and
   * does not say so: it returns 200 with an ordinary page and the
   * marine-emergency products are simply absent. The partition is deliberate —
   * catalog type decides which create/update/delete rules apply — so the scoped
   * endpoints stay as the management surfaces and read-only pickers use this.
   */
  GET_ALL_PRODUCTS: "/superadmin/products/get-all-products/",
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
  /**
   * Body: `{ is_active: boolean }` — the reversible alternative to delete, and
   * the third of the row toggles. Same shape as its two siblings: strict JSON
   * bool (`"false"`, `0`, `"no"` are a 400), single-column write, small
   * `{ message, is_active }` response, `CATALOG_AVAILABILITY` feature, and a
   * 404 on a deleted product.
   *
   * **Does not cascade to variants** — child rows keep their own `is_active`,
   * deliberately, so this cannot drift from a plain `PATCH update-product`
   * field write. Ordering is still blocked either way, because the variant gate
   * ANDs product liveness; the variants tab renders that as inherited state
   * rather than flipping the children.
   *
   * Catalog-wide like the other toggles, so the marine emergency screen uses
   * this one too — it has no toggle routes of its own.
   */
  SET_ACTIVE: (id: string) => `/superadmin/products/set-active/${id}/`,
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
 * Product variants — the sellable SKUs beneath a product. Everything variant
 * lives under `/product-variants/`, sourceability included; the mirror route
 * under `/products/product-variants/` that this comment once described is not
 * served by the backend.
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
 * Admin-tier user administration.
 *
 * `CREATE_USER` is shared: the `role` in the body picks the user type, so this
 * same path also backs sailor creation (`SAILOR_ENDPOINTS.CREATE_SAILOR` sends
 * `role: "customer"`). **Creating an `admin` or `super_admin` requires a
 * super-admin caller** — a sub-admin gets a 403 (Flow 31 SEC-1).
 *
 * The remaining six are the admin-users CRUD. They are newer than Flow 31,
 * which documents only `create-user` and states there is no way to list or
 * remove an admin; that is no longer true. Unlike the sailor endpoints these
 * are **not** customer-scoped — they operate on the two admin tiers.
 */
export const ADMIN_USER_ENDPOINTS = {
  CREATE_USER: "/superadmin/admin/create-user/",
  // Query: `role`, `is_active`, `search`, `page`, `page_size`.
  GET_USERS: "/superadmin/admin/users/",
  GET_USER: (id: string) => `/superadmin/admin/users/${id}/`,
  // PUT and PATCH are both partial, per the project convention.
  UPDATE_USER: (id: string) => `/superadmin/admin/users/${id}/update/`,
  // Body: `{ is_active: boolean }` — activate / deactivate.
  SET_USER_STATUS: (id: string) => `/superadmin/admin/users/${id}/status/`,
  /**
   * Generates a fresh password and **emails it**. The new password is never in
   * the response — do not build UI that expects to display it.
   */
  RESET_USER_PASSWORD: (id: string) => `/superadmin/admin/users/${id}/reset-password/`,
  DELETE_USER: (id: string) => `/superadmin/admin/users/${id}/delete/`,
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

/**
 * Flow 31 §8–11 — Account-deletion review.
 *
 * A user asks to be erased (sailors from the app, partners from the partner
 * app); an admin approves, rejects or *completes* the request. Approve and
 * complete are deliberately two steps — approving is agreeing, completing is
 * erasing — so one click can never deactivate a sailor with a delivery in
 * flight.
 *
 * **Request ids are integers**, not the UUIDs used elsewhere, and detail is
 * fetched via a `?request_id=` query rather than a path segment.
 */
export const ACCOUNT_DELETION_ENDPOINTS = {
  // `{ total, pending, approved, rejected, completed }`. No params.
  GET_STATS: "/superadmin/account-deletion/stats/",
  // Queue. Query: `status`, `role`, `user_id`, `search`, `page`, `page_size`.
  // An unrecognised `status`/`role` or a malformed `user_id` is a 400.
  GET_REQUESTS: "/superadmin/account-deletion/requests/",
  // One request plus the account footprint (`open_order_count`,
  // `total_order_count`, `outstanding_points`). Query: `request_id` (int).
  GET_REQUEST: "/superadmin/account-deletion/request/",
  /**
   * Body: `{ request_id, decision: "approve" | "reject" | "complete", admin_note }`.
   * `admin_note` is **required** when rejecting. The row is locked for the
   * duration, so two admins pressing opposite buttons cannot both win — the
   * loser gets a 409, as does any transition out of a terminal state or a
   * completion while the account still has open orders.
   */
  SET_STATUS: "/superadmin/account-deletion/set-status/",
};

/**
 * Flow 34 — Audit Trail & Tamper-Evidence.
 *
 * Entries are hash-chained (`entry_hash` / `prev_hash`), so the verify endpoint
 * can recompute the chain and report tampering. **Both endpoints are role-scoped
 * beyond the usual admin gate**: a sub-admin (`admin`) may only read
 * `category=order` — asking for `operational` is a 403 — and verification is
 * super-admin only. See `lib/roles.ts` for the client-side gate that keeps the
 * UI from offering what the server will refuse.
 */
export const AUDIT_ENDPOINTS = {
  // Query: `subject_type`, `subject_id`, `actor_id`, `action`, `category`,
  // `from`, `to` (both ISO-8601), `page`, `page_size` (default 20).
  GET_ENTRIES: "/superadmin/audit/",
  // Query: `subject_type` + `subject_id`, **both required** (400 otherwise).
  // A broken chain is still a 200 — read `verified`, not the status code.
  VERIFY_CHAIN: "/superadmin/audit/verify/",
};

/**
 * Flow 22 §3.1–3.2 — the outbound message ledger (email + WhatsApp).
 *
 * Read-only, and deliberately so: it answers "did the sailor actually get the
 * payment link?". `context` and `body` are **not** returned by the API — they
 * carry rendered content including generated passwords — so there is no message
 * reader here, only a delivery record.
 */
export const OUTBOUND_MESSAGE_ENDPOINTS = {
  // Query: `channel`, `status`, `recipient` (the only partial match),
  // `event_type`, `user_id`, `ordering`, `page`, `page_size` (max 50).
  GET_MESSAGES: "/superadmin/messages/",
  GET_MESSAGE: (id: string) => `/superadmin/messages/${id}/`,
};

/**
 * Flow 29c §5 — customer wishlist rows (`SavedProduct`).
 *
 * Filed under `/catalog/` but it is an engagement read, not catalog
 * administration — which is why it lives in its own block rather than beside
 * the port CRUD in {@link PORT_ENDPOINTS}.
 */
export const SAVED_PRODUCT_ENDPOINTS = {
  // Query: `search` (matches the product name), `is_active`, `user`, `product`,
  // `page`, `page_size`. A malformed `user`/`product`/`is_active` is a 400.
  GET_SAVED_PRODUCTS: "/superadmin/catalog/get-saved-products/",
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
  /**
   * Flow 09 API 2 — every express order, pre-scoped to `is_express=True`.
   *
   * **Both sides of payment**, unlike `orders/orders/`. Express is direct-pay
   * with no intent funnel behind it, so since the 2026-08-17 order split this is
   * the only screen an unpaid express order appears on; unpaid rows sort first.
   */
  GET_EXPRESS_ORDERS: "/superadmin/express/orders/",
  /**
   * Flow 09 API 3 — the express **variant** catalog. Filters are validated up
   * front, so a malformed UUID/number returns 400 rather than 500. Sort params
   * take the literal phrases "low to high" / "high to low"
   * (and `newest_first` / `oldest_first` for relevance).
   */
  GET_EXPRESS_ITEMS: "/superadmin/express/items/",
  /**
   * Express catalog at **product** level — the same base view class as
   * `products/get-products/` and `emergency-spares/products/`, so an identical
   * row shape, filter set, ordering and envelope.
   *
   * It does **not** replace `express/items/`: this lists products, that lists
   * variants. Only the variant list can show an *unflagged* SKU, which is
   * exactly the set no sailor can see — so it stays the flagging surface.
   *
   * Read-only. Detail, update, delete and the three `set-*` toggles are
   * catalog-wide on `products/`, and still accept an express id.
   */
  GET_EXPRESS_PRODUCTS: "/superadmin/express/products/",
  /**
   * Flow 09 API 4 — product, variant and order-volume aggregates in one call.
   *
   * Takes the **items** filter set since 2026-08-17 (it read no params before),
   * so the `items` half narrows with the catalog table. The `orders` half never
   * narrows — item filters have no meaning for an order count.
   */
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
  /**
   * Give the order back to the unassigned pool. Flow 27 documented no such
   * endpoint ("ownership returns to NULL only when the owning admin's account
   * is deleted"); it exists now, so handing an order back no longer requires
   * finding another admin to take it.
   */
  RELEASE_ORDER: (id: string) => `/superadmin/orders/order/${id}/release/`,
  /**
   * The reassign picker — active `admin` / `super_admin` accounts.
   * Query: `search`, `page`, `page_size`. This is what closes Flow 27's F-03,
   * where `reassign` was unusable because nothing listed admins.
   */
  ASSIGNABLE_ADMINS: "/superadmin/orders/assignable-admins/",
  // Flow 05 API 6 — terminal intent rejection. Requires a `reason`; gated by
  // Flow 27 ownership (409 if unclaimed, 403 if owned by another admin).
  REJECT_INTENT: (id: string) => `/superadmin/orders/order/${id}/reject-intent/`,
  /** Flow 01 §4.3b — send a submitted report back to the partner to re-check. */
  REQUEST_REVERIFICATION: (id: string) => `/superadmin/orders/order/${id}/request-reverification/`,
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
export const PAYMENT_ENDPOINTS = {
  // API 1 — set fees, move order to PAYMENT_PENDING, notify the customer (no link).
  CREATE_BILL: "/superadmin/payments/create-bill/",
  // API 2 — recompute a pending bill (available for a later step).
  UPDATE_BILL: "/superadmin/payments/update-bill/",
  // API 3 — set fees, move order to PAYMENT_PENDING *and* mint a Stripe Checkout
  // link (or reuse an open, same-amount one). 201 = newly created, 200 = reused.
  GENERATE_LINK: "/superadmin/payments/generate-link/",
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
  /**
   * Flow 28 API 6b — the individual jobs behind one partner's KPI numbers.
   * Query: `user_id` (**required**, 404 if unknown or soft-deleted), `outcome`,
   * `period`, `from_date` / `to_date`, `search` (order number only), `page`,
   * `page_size`. Defaults to **all time**, not a rolling window.
   *
   * ⚠️ Deliberately not `GET /orders/?partner_id=`. That filter matches
   * `assignments__is_active=True`, and delivering an order *closes* its
   * assignment — so it returns the partner's current workload and silently
   * omits every completed delivery.
   */
  HISTORY: "/superadmin/partner/history/",
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
  /**
   * Flow 29c §6 — the special-request export. Mounted under `/catalog/` and
   * named `export-to-excel`, but it exports **`SpecialRequest` rows and nothing
   * else** — there is no catalog export anywhere in the API. It lives here, with
   * the flow that owns the data, rather than beside the port CRUD.
   *
   * Streams a binary `.xlsx` attachment, so the caller must read it as a blob.
   * Optional `?status=` filters the rows; omit it for all.
   */
  EXPORT_EXCEL: "/superadmin/catalog/export-to-excel/",
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
  /*
   * `GET_ORDERS` (legacy `dashboard/orders/`) removed — no consumer, and the
   * Orders screen's own list is the authoritative paid-order population.
   */
  // Order detail keyed by the `order_id` query param (not a path segment).
  // KEPT despite having no consumer: it exposes fields the presentational
  // live-order detail does not, so it is not a duplicate of it.
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
  /**
   * There is **no namespace split** — that earlier note was wrong. Flow 30
   * mounts the whole `promotion_urls` module twice, at `promotion/` and again
   * at `orders/`, so every route answers at both prefixes with identical
   * behaviour (they are the same view instances, not copies). The doc's
   * instruction is to pick one prefix and use it consistently; update and
   * delete were the only two on `orders/`, so they now match their siblings.
   */
  UPDATE_COUPON: (id: string) => `/superadmin/promotion/coupons/update/${id}/`,
  DELETE_COUPON: (id: string) => `/superadmin/promotion/coupons/delete/${id}/`,
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
 * Flow 20 — Surprise Gift Program.
 *
 * **No endpoint here accepts an item of any kind.** The system records *whether*
 * an order was gifted, never *what* — there is no `variant_id` anywhere, by
 * design.
 *
 * **No ownership gate in this flow** (decision 2026-07-28): any admin may grant,
 * revoke and dismiss without claiming the order first. Don't add a claim check.
 *
 * The master switch gates only the writes that move goods — grant and revoke
 * 409 when the programme is off, while the reads and dismiss/undismiss keep
 * working so the screen stays usable.
 */
export const GIFT_ENDPOINTS = {
  GET_CONFIG: "/superadmin/gifts/config/",
  // PUT and PATCH are both partial — send any subset of { is_enabled, min_orders }.
  UPDATE_CONFIG: "/superadmin/gifts/config/update/",
  // Ship browse. One row per IMO with live giftable orders.
  GET_SHIPS: "/superadmin/gifts/ships/",
  // Ship detail, grouped by sailor. 404 when the vessel is below `min_orders`
  // — sub-minimum ships are out of scope, not forbidden.
  GET_SHIP: (imo: string) => `/superadmin/gifts/ships/${imo}/`,
  // One gift per not-yet-gifted sailor, riding their earliest-arriving order.
  // Re-runnable by design: call it again as more of the crew orders.
  GRANT_SHIP: (imo: string) => `/superadmin/gifts/ships/${imo}/grant/`,
  // List preference only — exempt from the master switch, no reason required.
  DISMISS_SHIP: (imo: string) => `/superadmin/gifts/ships/${imo}/dismiss/`,
  UNDISMISS_SHIP: (imo: string) => `/superadmin/gifts/ships/${imo}/undismiss/`,
  // Pick which of a sailor's orders carries the gift. NOT a way around the ship
  // minimum — that gate applies here too. Optional `note` (≤1000 chars).
  GRANT_ORDER: (orderId: string) => `/superadmin/gifts/orders/${orderId}/grant/`,
  // Requires a non-blank `reason`. Cut-off is `items_collected`: once the
  // partner has the parcel the gift is physically gone.
  REVOKE_ORDER: (orderId: string) => `/superadmin/gifts/orders/${orderId}/revoke/`,
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
  /**
   * Body: `{ title, message, category, channels?, audience?, image_path? }`.
   *
   * `category` is **required** — `promotional` honours each user's opt-out and
   * injects an unsubscribe link, `service` reaches everyone including opted-out
   * users. It is the legal line, not a label.
   */
  SEND_BROADCAST: "/superadmin/notifications/send-broadcast-notification/",
  /**
   * Flow 32 §3.5 — every broadcast and role-based send, newest first. Query:
   * `category`, `audience`, `notification_type`, `created_by`, `date_from`,
   * `date_to`, `page`, `page_size`. Every filter is exact-match and validated —
   * an unrecognised value is a 400, never a silently empty page.
   */
  HISTORY: "/superadmin/notifications/history/",
};

/**
 * Admin chat (Flow 23 §4). Base `/superadmin/chat/` is **exempt from
 * `ServerSecurityMiddleware`** — unlike `/api/chat/`, it needs no
 * `server-secret-key` header, which is why the panel reads threads here rather
 * than through the customer routes.
 *
 * Reads are REST; **writes are not** — messages are sent over the chat
 * websocket (`ws/chat/`), see `features/chat/lib/chatSocket.ts`.
 */
export const CHAT_ENDPOINTS = {
  // §4.1 — customer support inbox. Shared: every admin sees every thread.
  GET_USER_CHATS: "/superadmin/chat/user-chats/",
  // §4.2 — delivery-partner support inbox. Also shared.
  GET_DELIVERY_CHATS: "/superadmin/chat/delivery-chats/",
  /**
   * §4.3 — order-chat inbox. **Not shared**: a sub-admin sees only threads on
   * orders they own; a super-admin sees all, including still-unclaimed orders.
   * Query: `category` (`order` | `order_delivery`, anything else → 400),
   * `page`, `page_size`.
   */
  GET_ORDER_CHATS: "/superadmin/chat/order-chats/",
  /** §4.4 — one order thread by its integer chat id. 404 on a support thread. */
  GET_ORDER_CHAT: (chatId: string) => `/superadmin/chat/order-chats/${chatId}/`,
  /**
   * §4.6 — create a group chat. Body: `{ group_name, participants[] }`. The
   * creating admin becomes `group_admin` and is added as a participant.
   */
  CREATE_GROUP: "/superadmin/chat/create-chat-group/",
  /**
   * §4.5 — messages in one thread. Query: `chat_id` (an **integer**, not a
   * UUID), `page`, `page_size`.
   *
   * **Newest first**, identical to the customer route (§3.5). Until 2026-08-03
   * this route returned them *oldest* first — same thread, same serializer,
   * inverted results — so one chat component can now serve both. Page 1 is the
   * latest messages and you page *backwards* through history.
   */
  GET_CHAT_MESSAGES: "/superadmin/chat/chat-messenger-detail/",
  /**
   * §4.7 — who is online right now, for the users on the page being rendered.
   *
   * **Presence is polled, not pushed.** Admins receive no presence frames on the
   * websocket at all: broadcasting every connect/disconnect made the cost scale
   * with connection-event volume, which is exactly what spikes in a reconnect
   * storm. Polling bounds it by frequency × roster size instead.
   *
   * Query: `user_ids` — comma-separated UUIDs, **required**, **max 100** (one
   * page of threads). A non-UUID or more than 100 is a 400, not a truncation.
   * There is deliberately no "who is online globally" mode.
   *
   * The response's `presence` map has an entry for every id asked about; an
   * unknown-but-valid UUID is simply `false`. If the presence store is
   * unreachable everyone reports offline — a visible "nobody online" beats a
   * confidently wrong "everyone online".
   */
  PRESENCE: "/superadmin/chat/presence/",
  /**
   * §4.5 — the unread badge. Returns `total`, `has_unread`, `threads_with_unread`
   * and a `by_category` breakdown.
   *
   * **Never polled.** Called at launch, after login, and after every reconnect;
   * the socket keeps it live in between. Polling on top of the socket is exactly
   * the cost this design exists to avoid.
   *
   * ⚠️ The admin unread rule differs from the client apps' and is **not a bug**:
   * unread counts only messages sent by the thread's *owner*, never by another
   * admin. The support inbox is shared, so counting a colleague's reply would
   * light every admin's badge every time anyone answered anyone.
   */
  UNREAD_SUMMARY: "/superadmin/chat/unread-summary/",
  /**
   * §5 — the order a thread is about, projected for the caller's audience.
   * Admins always receive the **admin** shape, on the sailor's thread and the
   * partner's alike.
   *
   * 404 means the thread is fine and the order is gone — render the conversation
   * without the strip. The chat must never be blocked on this call.
   */
  ORDER_CONTEXT: (chatId: string) => `/superadmin/chat/order-chats/${chatId}/order-context/`,
  /**
   * §8.3 — open a support thread with a user. Body: `{ user_id, message? }`.
   * **201** = created, **200** = it already existed; both mean "open it".
   */
  CREATE_SUPPORT_CHAT: "/superadmin/chat/support-chats/create/",
  /**
   * §8.3 — open an order thread. Body: `{ order_id, side, user_id?, message? }`.
   *
   * `side` is required and never guessed. `user_id` reaches a **previous**
   * delivery partner on a reassigned order; omit it for the current one. Sending
   * it with `side: "customer"` is a 400 — an order has exactly one sailor.
   *
   * 403 = another admin owns this order, 409 = the order is unassigned. Both come
   * from the same ownership gate as every other admin action on an order.
   */
  CREATE_ORDER_CHAT: "/superadmin/chat/order-chats/create/",
  /**
   * §4.4 — attachment upload. Multipart: `file`, `message_type`
   * (`image` | `file`), optional `message` caption, and **one** target —
   * `chat_id` for a support thread (admins only) or `order_id` for an order one.
   *
   * ⚠️ The only endpoint this panel calls that is **not** under
   * `/api/superadmin/`, so it is the only one needing the `server-secret-key`
   * header. Max 10 MB; the server sniffs the real bytes rather than trusting the
   * extension or the content type, so a renamed file is a 400 and an oversized
   * one is a 413.
   *
   * The created message is broadcast to every participant as a normal
   * `chat_message` frame, so the response must **not** be appended — doing both
   * is how the sender sees their own attachment twice.
   */
  UPLOAD_MEDIA: "/chat/upload-media/",
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
