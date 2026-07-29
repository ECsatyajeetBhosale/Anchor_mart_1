/**
 * Types for the Sailors module (`/superadmin/sailors/*`).
 *
 * The list endpoint returns **plain DRF pagination** — `results` is a flat
 * array, not the `results: { data: [...] }` envelope the products/catalog
 * endpoints use:
 *
 * ```json
 * { "count": 26, "next": "…?page=2", "previous": null,
 *   "results": [ { "id", "full_name", "email", "contact_no", "joined", "ship",
 *                  "orders", "loyalty_pts", "cart_count", "wishlist_count",
 *                  "status", "is_active" } ] }
 * ```
 *
 * The detail endpoint disagrees on shape (nested `contact` / `ship` objects),
 * so the mapper stays defensive and one model serves both.
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
  /** Lifecycle status: "new" | "active" | "inactive" (the `?status=` values). */
  status?: string;
  /** Account flag written by the block toggle. `false` = blocked. */
  is_active?: boolean;
  role_label?: string;

  // ── List-endpoint fields (all confirmed present) ───────────
  full_name?: string;
  contact_no?: string | null;
  /** Already formatted by the backend, e.g. "Jul 27, 2026". */
  joined?: string;
  /** `null` on the list; a nested object on the detail read. */
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
  date_joined?: string;
  created_at?: string;
}

/** Raw response from `GET sailors-list/` — standard DRF, `results` is an array. */
export interface SailorListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Sailor[];
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
  /**
   * The raw `is_active` flag, kept separate from the display status `st`.
   *
   * `st` is a *label* ("New" / "Active" / "Inactive") driven by the lifecycle
   * `status`, so it can read "New" on an account that is perfectly active.
   * Anything deciding whether the account is blocked — the edit drawer's
   * toggle, above all — must read this, never compare `st` to "Active".
   */
  active: boolean;
}

/** Query parameters for the sailors list endpoint. */
export interface GetSailorsParams {
  page?: number;
  limit?: number;
  search?: string;
  /** "active" | "inactive" | "new" | … ; omit for "all". */
  status?: string;
}
