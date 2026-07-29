import type { BadgeProps } from "@/components/ui/badge";

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
}

/** Request body for `POST /superadmin/partner/create/`. */
export interface CreatePartnerPayload {
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  country_code: string;
  whatsapp_number: string;
}

/** Request body for `PATCH /superadmin/partner/partner_detail_update/`. */
export interface UpdatePartnerPayload extends CreatePartnerPayload {
  user_id: string;
}

/** Transformed list result the page consumes: total count + UI rows. */
export interface PartnerListResult {
  count: number;
  partners: PartnerData[];
}

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
