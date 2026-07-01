import type { BadgeProps } from "@/components/ui/badge";

/** Badge colour variant used for a special-request status pill. */
export type SpecialRequestBadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * UI row model consumed by the special-requests table. Built from a
 * `SpecialRequestApi` row by the API transform; display strings are already
 * "-"-guarded so columns render the raw value directly.
 */
export interface SpecialRequest {
  /** Unique request id (UUID) — passed to the detail API as `product_id`. */
  id: string;
  /** Request reference (Order ID column). */
  r: string;
  /** Sailor name. */
  n: string;
  /** Sailor phone. */
  ph: string;
  /** Requested product name. */
  prod: string;
  /** Preferred brand. */
  brand: string;
  /** Requested quantity (number, or "-" when absent). */
  qty: number | string;
  /** Request date label. */
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
 * `GET /superadmin/special-requests/get-special-products/` (`results.data[]`).
 * Fields are optional/nullable so a partial payload degrades gracefully to "-".
 */
export interface SpecialRequestApi {
  id: string;
  reference?: string | null;
  sailor?: string | null;
  phone?: string | null;
  product?: string | null;
  brand?: string | null;
  qty?: number | null;
  requested?: string | null;
  status?: string | null;
  status_display?: string | null;
}

/** Query params for the special-requests list (search + status omitted when empty). */
export interface GetSpecialRequestsParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Raw API status value (e.g. "sourcing_confirmed"); omit for "all". */
  status?: string;
}

/** Transformed list result the page consumes: total count + UI rows. */
export interface SpecialRequestListResult {
  count: number;
  requests: SpecialRequest[];
}

/**
 * Special-request statistics returned by
 * `GET /superadmin/special-requests/special-request-stats/`.
 * Every field is optional so a partial/empty payload degrades gracefully to 0.
 */
export interface SpecialRequestStats {
  total_requests?: number;
  pending_review?: number;
  sourcing?: number;
  approved?: number;
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
 * `GET /superadmin/special-requests/get-special-interests/?product_id=<id>`.
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
  /** Raw status token (e.g. "approved") — used internally for the badge colour. */
  status?: string | null;
  /** Human-readable status label (e.g. "Approved") — shown in the UI. */
  status_display?: string | null;
  admin_response?: string | null;
  images?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}
