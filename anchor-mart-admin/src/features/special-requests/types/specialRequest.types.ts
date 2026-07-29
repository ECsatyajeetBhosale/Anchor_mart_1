import type { BadgeProps } from "@/components/ui/badge";

/** Badge colour variant used for a special-request status pill. */
export type SpecialRequestBadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * The five statuses in the Flow 13 state machine
 * (`pending → sourcing_confirmed ⇄ quote_sent → accepted / rejected`).
 *
 * This is also the exact set the list API's `?status` accepts — anything else
 * is a 400 (*"Invalid status. Must be one of […]"*), so the page validates the
 * URL param against `SPECIAL_REQUEST_STATUS_KEYS` before querying.
 */
export type SpecialRequestStatus =
  | "pending"
  | "sourcing_confirmed"
  | "quote_sent"
  | "accepted"
  | "rejected";

/** The accepted `?status` values, in canonical lifecycle order. */
export const SPECIAL_REQUEST_STATUS_KEYS: SpecialRequestStatus[] = [
  "pending",
  "sourcing_confirmed",
  "quote_sent",
  "accepted",
  "rejected",
];

/**
 * UI row model consumed by the special-requests table. Built from a
 * `SpecialRequestApi` row by the API transform; display strings are already
 * "-"-guarded so columns render the raw value directly.
 */
export interface SpecialRequest {
  /** Unique request id (UUID) — passed to the detail API as `product_id`. */
  id: string;
  /** Request reference, e.g. "SR202607140003". */
  r: string;
  /** Sailor identity — the API sends an email here, not a display name. */
  n: string;
  /** Sailor phone (nullable on the API — renders "-" when absent). */
  ph: string;
  /** Requested product name. */
  prod: string;
  /** Preferred brand. */
  brand: string;
  /** Requested quantity (number, or "-" when absent). */
  qty: number | string;
  /** Request date label (pre-formatted by the API, e.g. "July 14, 2026, 09:41 AM"). */
  dt: string;
  /** Status label (`status_display`) shown in the badge. */
  st: string;
  /** Raw status token (used internally for filtering / badge colour). */
  status: string;
  /** Badge variant for the status. */
  sc: SpecialRequestBadgeVariant;
}

/**
 * Raw special-request row from
 * `GET /superadmin/special-requests/get-all-special-requests/` (`results.data[]`).
 * Fields are optional/nullable so a partial payload degrades gracefully to "-".
 */
export interface SpecialRequestApi {
  id: string;
  reference?: string | null;
  /** Sailor's email — the list endpoint sends no first/last name. */
  sailor?: string | null;
  /** Nullable on the API; currently unpopulated on every row. */
  phone?: string | null;
  product_name?: string | null;
  brand?: string | null;
  primary_image?: string | null;
  quantity?: number | null;
  max_budget?: string | null;
  currency?: string | null;
  status?: string | null;
  status_display?: string | null;
  is_fastest_delivery?: boolean | null;
  quoted_price?: string | null;
  fast_delivery_charge?: string | null;
  /** Pre-formatted timestamp, e.g. "July 14, 2026, 09:41 AM". */
  created_at?: string | null;
  updated_at?: string | null;
}

/** Query params for the special-requests list (search + status omitted when empty). */
export interface GetSpecialRequestsParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Must be one of `SPECIAL_REQUEST_STATUS_KEYS`; omit for "all". */
  status?: string;
}

/** Transformed list result the page consumes: total count + UI rows. */
export interface SpecialRequestListResult {
  count: number;
  requests: SpecialRequest[];
}

/**
 * Special-request statistics returned by
 * `GET /superadmin/special-requests/special-request-stats/` — a flat count per
 * status. Every field is optional so a partial/empty payload degrades to 0.
 */
export interface SpecialRequestStats {
  total_requests?: number;
  pending?: number;
  sourcing_confirmed?: number;
  quote_sent?: number;
  accepted?: number;
  rejected?: number;
}

/**
 * Body for `POST …/<id>/generate-bill/` (Flow 13 API 10). Decimals go over the
 * wire as strings, matching the collection's example payload. `description`
 * and `category_id` are omitted when blank.
 */
export interface GenerateBillPayload {
  product_name: string;
  description?: string;
  quoted_price: string;
  fast_delivery_charge: string;
  admin_response: string;
  /**
   * Required in practice: the API answers `category_id: This field is required
   * (the request has no category).` whenever the request carries none, and the
   * detail payload exposes no category field to distinguish the cases.
   */
  category_id: string;
}

/** Body for `POST …/<id>/reject/` (Flow 13 API 11) — the reason is required. */
export interface RejectSpecialRequestPayload {
  admin_response: string;
}

/** Body for `POST …/<id>/allow-changes/` (Flow 13 API 12) — `additional` is 1–10. */
export interface AllowChangesPayload {
  additional: number;
}

/** Nested sailor object on a special-request detail. */
export interface SpecialRequestUser {
  id?: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
  date_of_birth?: string | null;
}

/**
 * Full special-request detail returned by
 * `GET /superadmin/special-requests/get-special-requests/?product_id=<id>`.
 * Fields are optional/nullable so a partial payload degrades gracefully to "-".
 */
export interface SpecialRequestDetail {
  id: string;
  reference?: string | null;
  user?: SpecialRequestUser | null;
  product_name?: string | null;
  brand?: string | null;
  description?: string | null;
  quantity?: number | null;
  max_budget?: string | null;
  currency?: string | null;
  /** Raw status token (e.g. "accepted") — used internally for the badge colour. */
  status?: string | null;
  /** Human-readable status label (e.g. "Accepted") — shown in the UI. */
  status_display?: string | null;
  admin_response?: string | null;
  /** Free-text note the sailor added to the request. */
  customer_note?: string | null;
  /** Whether the sailor opted into the fastest-delivery upsell. */
  is_fastest_delivery?: boolean | null;
  /** Admin-set quote for the item (string decimal), or null before quoting. */
  quoted_price?: string | null;
  /** Charge applied for fast delivery (string decimal), or null. */
  fast_delivery_charge?: string | null;
  /** Requested ship arrival, ISO-8601 (e.g. "2026-07-28T00:00:00Z"). */
  ship_arrival_date?: string | null;
  /** Sailor's expected departure, ISO-8601; frequently null. */
  expected_departure?: string | null;
  /** Whether a rebill (delivery-change) was requested for this item. */
  rebill_requested?: boolean | null;
  /** Rebill attempts used / allowed (cap defaults to 2, raised via allow-changes). */
  rebill_count?: number | null;
  rebill_cap?: number | null;
  /** Primary image URL (first of `images`). */
  primary_image?: string | null;
  images?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}
