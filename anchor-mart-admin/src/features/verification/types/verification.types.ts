// Domain types for the Product Verifications feature.
// The reports table is live (GET /superadmin/partner/verification-reports/).
// The item-detail panel still renders local mock data (no endpoint yet — see ./data).

/** Availability status for a single checked item. */
export type ItemStatus = "Available" | "Unavailable" | "Sub suggested";

/**
 * A verification report as returned by GET /superadmin/partner/verification-reports/.
 * Only the fields the UI consumes are typed strictly.
 */
export interface ApiVerificationReport {
  id: string;
  order_id: string;
  order_number: string;
  partner: string;
  total_items: number;
  available_items: number | null;
  unavailable_items: number | null;
  /** Machine status, e.g. "submitted". */
  status: string;
  /** Human status label, e.g. "Submitted". */
  status_display: string;
  submitted_at: string | null;
  reviewed_at: string | null;
}

/** DRF paginated envelope for the verification reports list (plain `results` array). */
export interface ApiVerificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ApiVerificationReport[];
}

/** A partner in-store verification report row (flat shape the table renders). */
export interface VerificationReport {
  /** Report UUID — the stable row key. */
  id: string;
  /** Parent order UUID. */
  orderId: string;
  /** Order / enquiry number, e.g. "AM-SUB-DEMO-B". */
  enquiry: string;
  /** Partner full name. */
  partner: string;
  /** Shop / store name (not provided by the reports API). */
  shop: string;
  /** Total items requested for the check. */
  totalItems: number;
  /** Items confirmed available (null while the check is in progress). */
  available: number | null;
  /** Items confirmed unavailable (null while the check is in progress). */
  unavailable: number | null;
  /** Report status label, e.g. "Submitted". */
  status: string;
  /** Raw status token (`submitted` / `reviewed`) — drives the review action. */
  statusCode: string;
  /** ISO timestamp of the partner's submission, or null. */
  submittedAt: string | null;
  /** ISO timestamp of the admin review, or null when not yet reviewed. */
  reviewedAt: string | null;
}

/**
 * Counters from `GET /superadmin/partner/verification-stats/` (Flow 06 API 4).
 * Optional so a partial payload degrades to 0 rather than blanking the cards.
 */
export interface ApiVerificationStats {
  /** Orders sitting at `verification_submitted`. */
  in_verification?: number;
  /** All reports whose `reviewed_at` falls today. */
  verified_today?: number;
  /** `is_available=false` lines on the latest report of queued orders. */
  unavailable_items?: number;
}

/**
 * One line inside a raw report from `GET /superadmin/partner/reports/`
 * (Flow 06 API 7 — the partner app's serializer).
 */
export interface ApiRawReportItem {
  id?: string;
  product_name?: string | null;
  variant_name?: string | null;
  requested_quantity?: number | null;
  available_quantity?: number | null;
  is_available?: boolean | null;
  shortfall?: number | null;
  remark?: string | null;
}

/**
 * A full report from `GET /superadmin/partner/reports/?order_id=`.
 *
 * Field semantics are inverted versus APIs 5/6: `status` is the **human label**
 * and `status_code` the raw token, and `submitted_at` is a display string rather
 * than ISO-8601. Do not feed these into a Date parser.
 */
export interface ApiRawReport {
  id: string;
  status?: string | null;
  status_code?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  partner?: string | null;
  items?: ApiRawReportItem[] | null;
}

/** A single item within an active verification check. */
export interface VerificationItem {
  name: string;
  /** Quantity label, e.g. "×1". */
  qty: string;
  /** Aisle / location label, or "—" when unknown. */
  aisle: string;
  status: ItemStatus;
}

/** Price-difference options for a suggested substitute. */
export type PriceDiff = "Same Price" | "Price Increase" | "Price Decrease";
