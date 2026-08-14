// Domain types for the Rewards & Coupons feature.

/** A discount coupon shown in the Active Coupons list. */
export interface Coupon {
  /** Coupon UUID — used for the delete/edit API calls. */
  id: string;
  /** Uppercase coupon code, e.g. "SHIP10". */
  code: string;
  /** Human description, e.g. "10% off shipping". */
  d: string;
  /** Constraint line, e.g. "Min. order $50" or "First order only". */
  m: string;
  /** Expiry date label, e.g. "Oct 31, 2026". */
  e: string;
  /** Number of times the coupon has been used. */
  u: number;
  /** Raw discount value (percentage) that drives the edit form. */
  val: string;
  /** Original API record, used to seed the edit form with the full field set. */
  raw?: ApiCoupon;
}

/** Program-rule figures nested inside the loyalty overview response. */
export interface LoyaltyRules {
  /** Points awarded per completed delivery. */
  points_per_delivery: number;
  /** Points awarded per successful referral. */
  points_per_referral: number;
  /** Cash value of a single point, as a decimal string (e.g. "1.0000"). */
  point_value: string;
}

/**
 * Loyalty Program Overview KPIs.
 * GET /superadmin/promotion/loyalty/overview/ — returns a plain object.
 */
export interface LoyaltyOverview {
  points_issued: number;
  points_redeemed: number;
  outstanding_points: number;
  /** Total outstanding value as a decimal string (e.g. "1433.00"). */
  total_value: string;
  active_loyalty_users: number;
  rules: LoyaltyRules;
}

/**
 * Loyalty points configuration.
 * GET /superadmin/promotion/loyalty/config/ — returns a plain object.
 */
export interface LoyaltyConfig {
  id: number;
  points_per_delivery: number;
  points_per_referral: number;
  /** Cash value of a single point, as a decimal string (e.g. "1.0000"). */
  point_value: string;
  /** Pre-formatted timestamp, e.g. "June 19, 2026, 06:37 AM". */
  updated_at: string;
}

/**
 * Request body for POST /superadmin/promotion/loyalty/config/update/.
 * Mirrors the config minus the `id`/`updated_at` fields.
 */
export interface UpdateLoyaltyConfigPayload {
  points_per_delivery: number;
  points_per_referral: number;
  point_value: string;
}

/**
 * A coupon record as returned by GET /superadmin/promotion/coupons/.
 * Only the fields the UI consumes are typed strictly.
 */
export interface ApiCoupon {
  id: string;
  code: string;
  title: string;
  description: string;
  image: string | null;
  /** "percentage" | "fixed" | "free_shipping". */
  discount_type: string;
  /** Decimal string, e.g. "5.00". */
  discount_value: string;
  /** "delivery" | "order_total" | "items". */
  applies_to: string;
  /** Decimal string, e.g. "0.00". */
  min_purchase_amount: string;
  max_discount_amount: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  is_public: boolean;
  usage_limit: number | null;
  per_user_usage_limit: number | null;
  times_used: number;
  first_time_user_only: boolean;
}

/** DRF paginated envelope for the coupons list (plain `results` array). */
export interface ApiCouponListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ApiCoupon[];
}

/**
 * Query params for the coupon list. All optional — but omitting `limit` does
 * **not** mean "everything": `CustomPagination` defaults to 10 rows per page and
 * says so only through `count`.
 */
export interface GetCouponsParams {
  page?: number;
  limit?: number;
  /** Matches code or title. */
  search?: string;
  /** `"true"` / `"false"`; omit for both states. */
  isActive?: string;
}

/**
 * Request body for POST /superadmin/promotion/coupons/add/.
 * Built field-by-field from the coupon form (never spread raw form state).
 */
export interface CreateCouponPayload {
  code: string;
  title: string;
  description: string;
  image: string | null;
  discount_type: string;
  applies_to: string;
  discount_value: number;
  min_purchase_amount: number;
  valid_from: string;
  valid_to: string;
  usage_limit: number | null;
  per_user_usage_limit: number;
  is_public: boolean;
}

/**
 * Request body for the coupon update endpoint
 * (/superadmin/orders/coupons/update/{id}/). Mirrors the update contract:
 * date-only validity, an `is_active` flag, no `applies_to`, and a
 * blank-allowed `per_user_usage_limit`.
 */
export interface UpdateCouponPayload {
  code: string;
  title: string;
  description: string;
  image: string | null;
  discount_type: string;
  discount_value: number;
  min_purchase_amount: number;
  valid_from: string;
  valid_to: string;
  usage_limit: number | null;
  per_user_usage_limit: number | "";
  is_public: boolean;
  is_active: boolean;
}

/** A row in the Recent Reward Activity log (static mock — no endpoint yet). */
export interface Activity {
  sailor: string;
  activity: string;
  points: string;
  ref: string;
  date: string;
  /** Whether the points delta is a credit (green) or debit (red). */
  isPositive: boolean;
}

/* ── Deal of the Day ──────────────────────────────────────────────── */

/** A Deal of the Day row (flat shape the table renders). */
export interface Deal {
  /** Deal UUID. */
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  variantSku: string;
  /** Formatted deal price, e.g. "$200.00". */
  dealPrice: string;
  /** Raw numeric price, kept so the edit form can round-trip it. */
  dealPriceValue: number;
  /**
   * Formatted `original_price` — the **variant's** price, which the deal
   * discounts from and which the backend treats as authoritative. Without it a
   * deal row showed a price with nothing to compare it to.
   */
  originalPrice: string;
  /**
   * `discount_percentage`, as a display string ("25%"). The API computes it
   * from `variant.price` and `deal_price` when the field is omitted at create,
   * so this is the backend's own number rather than one recalculated here.
   */
  discountPercentage: string;
  /** First variant image, for the row thumbnail; "" when the variant has none. */
  imageUrl: string;
  termsAndConditions: string;
  /** Date-only strings as returned, e.g. "2026-06-02". */
  startTime: string;
  endTime: string;
  isActive: boolean;
}

/** Transformed deals list: total count + UI rows. */
export interface DealListResult {
  count: number;
  deals: Deal[];
}

/** Sort/filter params for the deals list. */
export interface GetDealsParams {
  page?: number;
  limit?: number;
  /** Matches variant SKU or product name. */
  search?: string;
  /**
   * One of the four computed buckets. The backend's own note says the filter
   * "mirrors the DealStatsView buckets, so a stat card can filter the list to
   * just that group" — which is exactly what the cards now do. An unknown value
   * is a 400, not an empty list.
   */
  status?: DealStatus | "";
  /** Product category UUID; a non-UUID is a 400. */
  category?: string;
  /** Pass "true"/"false" to filter by active state. */
  sortByIsActive?: string;
  sortByStartDate?: string;
  sortByEndDate?: string;
}

/**
 * Body for deal create/update. `product` and `variant` are both required — a
 * deal prices one specific SKU, not the product as a whole.
 */
export interface DealPayload {
  product: string;
  variant: string;
  /** Decimal string, e.g. "200.00". */
  deal_price: string;
  terms_and_conditions?: string;
  /** `YYYY-MM-DD`. */
  start_time: string;
  end_time: string;
}

/** Aggregates from `GET /superadmin/promotion/deals/stats/`. */
/**
 * Deal summary cards. **Five buckets, and these are their names on the wire** —
 * `active` and `upcoming` were being read and are not sent, so the Active and
 * Upcoming cards showed 0 no matter how many deals were running. `inactive` was
 * not read at all, so its bucket had no card.
 *
 * Each maps 1:1 to a `?status=` value on the list, which is what makes the cards
 * drillable.
 */
export interface DealStats {
  total?: number;
  /** `is_active` and now inside the window. */
  active_now?: number;
  /** `is_active` with a start time still in the future. */
  scheduled?: number;
  /** Window has closed, whatever `is_active` says. */
  expired?: number;
  /** Switched off by an admin. */
  inactive?: number;
}

/** The four `?status=` buckets; `total` is the unfiltered list. */
export type DealStatus = "active_now" | "scheduled" | "expired" | "inactive";

/* ── Bonus points ─────────────────────────────────────────────────── */

/** Which programme a bonus-point grant belongs to. */
export type BonusPointType = "referral" | "loyalty";

/** A bonus-point balance row. */
/**
 * One row of the bonus-points list: a **user** and their balances.
 *
 * There is no single `type` or `points` on the wire. The endpoint annotates each
 * user with `referral_points`, `loyalty_points` and `total_points` — three
 * numbers per person, not one typed row — which is the same reason the list has
 * no `?type=` filter.
 */
export interface BonusPoint {
  /** Row id — the API sends the user's id in both `id` and `user_id`. */
  id: string;
  userId: string;
  /** `first_name` + `last_name`; falls back to the email when both are blank. */
  userName: string;
  userEmail: string;
  referralPoints: number;
  loyaltyPoints: number;
  /** `total_points` — the sum the list is ordered by. */
  totalPoints: number;
}

/** Transformed bonus-points list. */
export interface BonusPointListResult {
  count: number;
  rows: BonusPoint[];
}

/**
 * Query params for the bonus-points list.
 *
 * **`type` is not among them.** The view reads `search` and `user_id` and
 * nothing else, so a `?type=` was accepted by the URL and ignored by the
 * backend — the tab's filter fired a request and got the same rows back. It is
 * also the wrong axis: a row is a *user*, carrying both a referral and a loyalty
 * balance, so a user with each would belong to both filters.
 */
export interface GetBonusPointsParams {
  page?: number;
  limit?: number;
  /** Matches first name, last name or email. */
  search?: string;
  /** A single user's row, by UUID. */
  userId?: string;
}

/** Body for `POST bonus-points/add/`. `points` is sent as a string by the API. */
export interface AddBonusPointsPayload {
  user_id: string;
  type: BonusPointType;
  points: string;
}

/** One entry in a user's bonus-point ledger. */
export interface BonusPointHistoryEntry {
  id: string;
  points: number;
  type: string;
  reason: string;
  createdAt: string;
}

/** Transformed bonus-point history. */
export interface BonusPointHistoryResult {
  count: number;
  entries: BonusPointHistoryEntry[];
}

/* ── Coupon assignments ───────────────────────────────────────────── */

/**
 * A coupon granted to one user. Assignment ids are **integers** here, unlike
 * the coupon UUIDs they point at.
 */
/**
 * One coupon granted to one sailor.
 *
 * The row carries `id` (integer), `coupon` + `coupon_code`, `user` +
 * `user_email` and `assigned_at` — **and nothing else**. There is no sailor
 * name, and no redemption flag: whether the coupon has been used lives on
 * `CouponUsage`, which this endpoint does not join. Both were being rendered
 * anyway, one as a dash and one as a green "Unused" badge on every row.
 */
export interface CouponAssignment {
  id: number | string;
  userId: string;
  userEmail: string;
  couponId: string;
  couponCode: string;
  /** Display-formatted grant time, from `assigned_at`. */
  assignedAt: string;
}

/** Transformed assignments list. */
export interface CouponAssignmentListResult {
  count: number;
  assignments: CouponAssignment[];
}

/** Query params for the assignments list. Both filters take a **UUID**; a
 *  non-UUID is a 400, not an empty list. */
export interface GetCouponAssignmentsParams {
  page?: number;
  limit?: number;
  couponId?: string;
  userId?: string;
}

/** Body for `POST coupons/assignments/add/`. */
export interface AddCouponAssignmentPayload {
  user: string;
  coupon: string;
}

/** A row of the coupon redemption report. */
/**
 * One coupon's usage, as the report returns it.
 *
 * **The report is not the coupon record.** It sends `discount` and `status` as
 * ready-made strings ("10%", "active") and `applicable_to` as prose ("All
 * users", "3 assigned users") — and it does **not** send `usage_limit` or
 * `is_active`. Those two were being read anyway, which printed "Unlimited" and
 * a green ACTIVE badge on every row regardless of the coupon.
 */
export interface CouponReportRow {
  couponId: string;
  code: string;
  title: string;
  /** Pre-formatted by the API, e.g. "10%" or "$5.00". */
  discount: string;
  /** Prose, e.g. "All users" / "3 assigned users". */
  applicableTo: string;
  timesUsed: number;
  /** Formatted `total_discount_given`, e.g. "$30.53". */
  totalDiscount: string;
  /** Formatted `revenue_impact` — order value the coupon was used against. */
  revenueImpact: string;
  /** The API's own word, e.g. "active" / "inactive". */
  status: string;
}

/** Paginated report result — the count is the whole report, not this page. */
export interface CouponReportResult {
  count: number;
  rows: CouponReportRow[];
}

/** Query params for the usage report. */
export interface GetCouponReportParams {
  page?: number;
  limit?: number;
  search?: string;
}
