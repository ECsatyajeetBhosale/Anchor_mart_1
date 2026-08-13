import type { BadgeProps } from "@/components/ui/badge";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";

/**
 * A delivery partner row. Static mock shape (no partners API yet) mirroring the
 * AnchorMart-1 design. Field names are kept terse to match the existing data.
 */
export interface PartnerData {
  /** Full name. */
  n: string;
  /** Partner id (e.g. "DP-00124") — also the table row key. */
  id: string;
  /** Backing user id (UUID) — sent to the detail API as `user_id`. */
  userId: string;
  /** Partner user id — sent to the assign-order API as `delivery_partner_id`. */
  deliveryPartnerId: string;
  /** Port zone. */
  p: string;
  /** Joined date label (e.g. "Mar 2023"). */
  j: string;
  /** Status label (On Duty / Available / Inactive). */
  s: string;
  /** Active order count (number, or "-" when absent). */
  c: number | string;
  /** This week's earnings (formatted, e.g. "$84.50"). */
  w: string;
  /** Total deliveries. */
  t: number;
  /** Rating (e.g. "4.9"). */
  r: string;
  /** Contact email. */
  email: string;
  /** Contact phone. */
  phone: string;
  /** Vehicle type. */
  vehicle: string;
  /**
   * Capability (Flow 28). Two **independent** booleans, not a two-value enum —
   * a partner verifies, delivers, or does both. "Both" is the default and the
   * common case, and `false`/`false` is impossible (the backend 400s on it).
   *
   * Absent on a payload predating 2026-08-03, which is why they default to
   * `true`: reading a missing flag as "not capable" would strip every existing
   * partner of the work they already do.
   */
  canVerify: boolean;
  canDeliver: boolean;
}

/** Badge colour variant for a partner status pill. */
export type PartnerBadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * Raw delivery-partner row from `GET /superadmin/partner/list/` (`results.data[]`).
 * Fields are optional/nullable so a partial payload degrades gracefully to "-".
 */
export interface PartnerApi {
  id: string;
  user_id?: string | null;
  partner_id?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  country_code?: string | null;
  whatsapp_number?: string | null;
  assigned_port?: string | null;
  port?: string | null;
  is_available?: boolean | null;
  is_active?: boolean | null;
  joined?: string | null;
  total_deliveries?: number | null;
  on_duty?: boolean | null;
  /** Capability flags. Absent on a payload predating 2026-08-03 — treat as true. */
  can_verify?: boolean | null;
  can_deliver?: boolean | null;
}

/**
 * Request body for `POST /superadmin/partner/create/`.
 *
 * The capability flags both default to `true` server-side, and **at least one
 * must be true** — sending both `false` is a 400 ("no capability").
 */
export interface CreatePartnerPayload {
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  country_code: string;
  whatsapp_number: string;
  can_verify: boolean;
  can_deliver: boolean;
  /** Home port UUID, or `null` for unassigned. */
  assigned_port: string | null;
}

/** Request body for `PATCH /superadmin/partner/partner_detail_update/`. */
export interface UpdatePartnerPayload extends CreatePartnerPayload {
  user_id: string;
}

/**
 * The extra `capability_change` key an update response carries **only when the
 * request revoked a capability** (`true` → `false`), added 2026-08-03. Granting
 * one, or editing any other field, leaves the response shape untouched.
 */
export interface CapabilityChange {
  /** Which flag(s) this request turned off. */
  revoked: string[];
  /** **Exact** count of the partner's active assignments in the revoked phase — `0` is a real answer. */
  inFlightCount: number;
  /** True when `orders` was capped at 20 rows; the count stays exact regardless. */
  truncated: boolean;
  orders: CapabilityChangeOrder[];
  /** Ready-to-display copy from the server. Surface it verbatim. */
  message: string;
}

/** One order the revoke did **not** stop, so the UI can offer a reassign shortcut. */
export interface CapabilityChangeOrder {
  orderId: string;
  orderNumber: string;
  status: string;
  statusDisplay: string;
  assignmentStatus: string;
}

/** Transformed list result the page consumes: total count + UI rows. */
export interface PartnerListResult {
  count: number;
  partners: PartnerData[];
}

/**
 * Query for `GET /superadmin/partner/list/`. Every field is server-side —
 * `AdminPartnerList` reads all three.
 */
export interface GetPartnersParams {
  page?: number;
  /**
   * Rows per page. Left unset it uses {@link PARTNER_PAGE_SIZE}; values above
   * 50 are silently reduced to 50 by `CustomPagination`, never rejected.
   */
  limit?: number;
  /** Matched against `partner_id`, `email`, `first_name`, `last_name`. */
  search?: string;
  /** One of `available | on_duty | inactive`. Omit for no status filter. */
  status?: string;
}

/**
 * Rows per page on the partner list. Set to the API's own ceiling so a full page
 * is one request — see {@link API_MAX_PAGE_SIZE} for why asking for more back-fires.
 */
export const PARTNER_PAGE_SIZE = API_MAX_PAGE_SIZE;

/**
 * `GET /superadmin/partner/stats/` (Flow 28 API 3) — exactly two counters, no
 * filters. Optional so a partial payload degrades to 0 rather than blanking a card.
 *
 * Note this is the whole performance surface for Build A: the richer per-partner
 * KPI endpoints (`partner/kpis/`, `partner/kpi-detail/`) are marked
 * "Do not implement — Build-2" in flow 28 and are deliberately not wired.
 */
export interface PartnerStats {
  total_partners?: number;
  /** In-progress assignments across all partners. */
  active_deliveries?: number;
}

/**
 * The seven outcomes `GET /superadmin/partner/history/` accepts as `?outcome=`.
 * Anything else is a 400, so the filter offers exactly this set.
 */
export const PARTNER_HISTORY_OUTCOMES = [
  "delivered",
  "failed",
  "verified",
  "in_progress",
  "rejected",
  "reassigned",
  "cancelled",
] as const;

export type PartnerHistoryOutcome = (typeof PARTNER_HISTORY_OUTCOMES)[number];

/**
 * One job in a partner's history (`results.data[]`).
 *
 * `rejected` / `reassigned` / `cancelled` rows do **not** say whether the job
 * was a verification or a delivery — those three statuses overwrite
 * `verifying` / `verified`. Do not derive a job kind from `status`.
 */
export interface PartnerHistoryRow {
  assignment_id: string;
  order_id: string;
  order_number: string;
  order_status: string;
  order_status_display: string;
  outcome: string;
  outcome_display: string;
  status: string;
  assigned_at: string | null;
  first_action_at: string | null;
  picked_up_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  deliver_by: string | null;
  /**
   * `true` / `false` / **`null`**. Only express / emergency / fastest orders
   * carry a `deliver_by`; for everything else punctuality is not a question
   * with an answer. Rendering `null` as "late" would mark every normal
   * delivery a failure.
   */
  on_time: boolean | null;
  rejection_reason: string;
  rating: number | null;
}

/**
 * Period-scoped rollup shown above the list.
 *
 * **Computed before `?outcome=` is applied**, so narrowing the list never makes
 * the header contradict it.
 */
export interface PartnerHistorySummary {
  total_jobs: number;
  delivered: number;
  failed: number;
  verified: number;
  in_progress: number;
  rejected: number;
  reassigned: number;
  cancelled: number;
  /** `null`, not `0`, with no samples — an untested partner is missing data, not a failing one. */
  delivery_success_rate: number | null;
  on_time_rate: number | null;
  sla_bound_deliveries: number;
}

/**
 * Who the history belongs to. The capability flags ride here so the reader
 * knows what kind of partner they are looking at; they do not reshape the rows,
 * and history is never filtered by *current* capability.
 */
export interface PartnerHistoryHeader {
  user_id: string;
  partner_id: string;
  name: string;
  email: string;
  port: string;
  can_verify: boolean;
  can_deliver: boolean;
  is_available: boolean;
  is_active: boolean;
}

/** Transformed history response the drawer consumes. */
export interface PartnerHistoryResult {
  count: number;
  /** Echo of the applied window, e.g. "all" / "today" / "week" / "month". */
  period: string;
  partner: PartnerHistoryHeader | null;
  summary: PartnerHistorySummary | null;
  rows: PartnerHistoryRow[];
}

/** Query params for `GET /superadmin/partner/history/`. */
export interface GetPartnerHistoryParams {
  /** Required. The partner's **user** id, not their `DP-` partner id. */
  userId: string;
  /** One of {@link PARTNER_HISTORY_OUTCOMES}; blank means every outcome. */
  outcome?: string;
  /** `today` · `week` · `month`. Blank means all time. */
  period?: string;
  /** Matches the order number only. */
  search?: string;
  page?: number;
  limit?: number;
}
