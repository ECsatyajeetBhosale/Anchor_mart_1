/**
 * Flow 02 — Admin ship-agent directory types.
 *
 * A ship agent is a port-side contact (person/company) an order is delivered
 * through. Admins curate the *global* directory (`owner = null`) and may edit
 * any sailor-owned agent. The admin list payload differs from the sailor one:
 * it carries `owner`/`owner_email`/`created_by_email`/`orders_count` and
 * **omits `is_mine`** (the admin views pass no request context).
 */

/** A ship-agent row as returned by GET /superadmin/ship-agents/ (admin shape). */
export interface ShipAgent {
  id: string;
  name: string;
  mobile: string | null;
  country_code: string | null;
  email: string | null;
  company: string | null;
  /** true → global/admin-managed (`owner` is null); false → sailor-owned. */
  is_global: boolean;
  /** Owning sailor's user id, or null for a global agent. */
  owner: string | null;
  /** Owning sailor's email, or null for a global agent. */
  owner_email: string | null;
  /** Email of the admin/sailor who created the row. */
  created_by_email: string | null;
  /**
   * Count of all related orders — note: unfiltered by `is_deleted`, so it may
   * not match the admin orders list. Display only.
   */
  orders_count: number;
  /** Pre-formatted timestamp, e.g. "July 20, 2026, 03:45 PM". */
  created_at: string;
  updated_at: string;
}

/**
 * DRF paginated envelope for the ship-agents list. Unlike products/categories,
 * `results` is a **plain array** of agents (not wrapped in `{ message, data }`)
 * — the same shape as the orders endpoint.
 */
export interface ShipAgentListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ShipAgent[];
}

/**
 * Request body for create (POST create/) and update (PUT/PATCH update/).
 * Five inputs — `owner` is never sent: the admin API always creates globals.
 * The backend enforces the contact rule (mobile OR email required).
 */
export interface ShipAgentPayload {
  name: string;
  company: string;
  country_code: string;
  mobile: string;
  email: string;
}
