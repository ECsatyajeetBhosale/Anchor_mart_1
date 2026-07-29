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
