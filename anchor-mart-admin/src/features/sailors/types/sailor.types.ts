/**
 * Types for the Sailors module (`/superadmin/sailors/*`).
 *
 * The list endpoint follows the project's DRF pagination contract:
 *   { count, next, previous, results: { data: Sailor[] } }
 *
 * The backend returns the documented identity fields (first/last name, email,
 * country code, WhatsApp number, active flag). Fields that are surfaced in the
 * existing table but are not guaranteed by the API (ship, order/loyalty/cart
 * counts, join date, textual status) are typed optional and mapped defensively
 * so the approved UI keeps rendering regardless of which the backend sends.
 */

/** Nested ship object returned by the detail endpoint. */
export interface SailorShip {
  ship_name?: string | null;
  imo_number?: string | null;
  berth_number?: string | null;
  terminal?: string | null;
}

/** Nested contact object returned by the detail endpoint. */
export interface SailorContact {
  email?: string | null;
  country_code?: string | null;
  whatsapp_number?: string | null;
  number?: string | null;
  contact_no?: string | null;
  phone?: string | null;
}

/**
 * A sailor record. The list and detail endpoints disagree on shape:
 *   - list:   flat fields — `contact_no` (string), `ship` (string|null), `joined`
 *   - detail: nested objects — `contact` { … }, `ship` { ship_name, … }
 * Every field is optional/union-typed so one defensive mapper handles both and
 * never emits a non-primitive to the UI.
 */
export interface Sailor {
  id: string;
  email?: string | null;
  /** Textual status ("active" | "inactive" | "new" | "blocked" | …). */
  status?: string;
  role_label?: string;

  // ── List-endpoint fields ──────────────────────────────────
  full_name?: string;
  contact_no?: string | null;
  /** Already formatted by the backend, e.g. "Jun 19, 2026". */
  joined?: string;
  ship?: string | SailorShip | null;
  orders?: number;
  loyalty_pts?: number;
  cart_count?: number;
  wishlist_count?: number;

  // ── Detail-endpoint nested objects ────────────────────────
  contact?: string | SailorContact | null;

  // ── Detail / create-update fallbacks ──────────────────────
  first_name?: string;
  last_name?: string;
  country_code?: string;
  whatsapp_number?: string;
  is_active?: boolean;
  date_joined?: string;
  created_at?: string;
}

/** Nested list payload, mirroring the products `results.data` shape. */
export interface SailorListResponseData {
  message?: string;
  data: Sailor[];
}

/** Raw response from `GET sailors-list/`. */
export interface SailorListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SailorListResponseData;
}

/** Summary counts from `GET stats/` (no query params). */
export interface SailorStats {
  total_sailors?: number;
  active?: number;
  loyalty_points_issued?: number;
  referrals?: number;
}

/**
 * Payload for `POST admin/create-user/`.
 *
 * The endpoint is shared across every user type and the role decides which one
 * is created — a sailor is a `customer`, so the literal type keeps the other
 * roles (seller / admin / super_admin / delivery_partner) out of this call.
 */
export interface CreateSailorPayload {
  email: string;
  role: "customer";
  first_name: string;
  last_name: string;
  country_code: string;
  whatsapp_number: string;
}

/** Payload for `PATCH sailor/{id}/update/`. */
export interface UpdateSailorPayload {
  first_name: string;
  last_name: string;
  country_code: string;
  whatsapp_number: string;
  email: string;
}

/** Payload for `POST sailor/{id}/status/`. */
export interface ToggleSailorStatusPayload {
  is_active: boolean;
}

/** Badge colour variants used by the sailors table/status badge. */
export type StatusVariant = "success" | "neutral" | "info" | "danger" | "warning";

/**
 * UI row model consumed by the (approved) sailors table. The short keys are kept
 * exactly as the existing table renders them so no JSX has to change. `id` is the
 * backend identifier used for detail/update/delete/status calls.
 */
export interface SailorData {
  id: string;
  n: string;
  e: string;
  w: string;
  j: string;
  sh: string;
  o: number;
  p: number;
  ca: number;
  wi: number;
  st: string;
  sc: StatusVariant;
}

/** Query parameters for the sailors list endpoint. */
export interface GetSailorsParams {
  page?: number;
  limit?: number;
  search?: string;
  /** "active" | "inactive" | "new" | … ; omit for "all". */
  status?: string;
}
