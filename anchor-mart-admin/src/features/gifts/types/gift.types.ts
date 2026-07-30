/**
 * Flow 20 — Surprise Gift Program (admin surfaces).
 *
 * Platform advertising, not a loyalty mechanic: when several sailors on one
 * vessel order during a call, an admin may — entirely at their discretion —
 * send one of them a wrapped, named gift. Word travels on the ship. That is the
 * whole business case: reach, not reward.
 *
 * **The system tracks *whether*, never *what*.** The gift is a physical item
 * prepared off-system, so there is no variant, SKU, quantity, price or line
 * item at any layer — only a flag and an audit trail. No payload here carries
 * an item of any kind, and none should be added.
 */

/** `GET /superadmin/gifts/config/` — the two fields that actually do something. */
export interface GiftConfig {
  /** Master switch (default false). Off = every goods-moving write 409s. */
  is_enabled: boolean;
  /**
   * Live giftable orders a vessel needs before the whole-ship button unlocks
   * (default 2). Must be **≥ 2** — the scheme is defined as *several sailors on
   * one vessel*.
   */
  min_orders: number;
}

/** Body of the config update. Both PUT and PATCH are partial — send any subset. */
export interface UpdateGiftConfigPayload {
  is_enabled?: boolean;
  min_orders?: number;
}

/** A port a ship has at least one live giftable order at. */
export interface GiftShipPort {
  id: string;
  port_name: string;
}

/** One row of the ship-browse screen (`GET /superadmin/gifts/ships/`). */
export interface GiftShip {
  /** Normalised 7-digit IMO — the row key and the path segment for detail. */
  imo_number: string;
  vessel_name: string;
  ports: GiftShipPort[];
  /**
   * Orders vs distinct sailors. Both are shown because they differ often: one
   * sailor placing four orders is not a crew, and the admin needs to see that
   * before clicking. `min_orders` gates on **orders**; the per-sailor rule
   * already prevents the harm.
   */
  order_count: number;
  sailor_count: number;
  gifted_sailor_count: number;
  /** Display badge only — gates nothing. */
  total_value: string;
  earliest_arrival: string | null;
  latest_departure: string | null;
  /**
   * The **master switch, not a per-ship verdict** — every ship in a response
   * carries the same value, and the only way to get `false` is
   * `GiftConfig.is_enabled = false`. It rides this payload so the screen can
   * disable buttons without a second call to `/gifts/config/`.
   *
   * Renamed from `is_bulk_eligible`: that name read as "all this ship's orders
   * can be gifted", which is wrong twice — sub-minimum ships never appear at
   * all, and the bulk action grants one gift per **sailor**, not per order.
   */
  program_enabled: boolean;
  /**
   * This crew was gifted on a **previous call** — a gift that stuck in an
   * already-closed group. Deliberately excludes the current call, which
   * `gifted_sailor_count` already reports, and a revoked or voided gift is not
   * history: it never reached anyone, so it is a correction, not a record.
   */
  has_gift_history: boolean;
  is_dismissed: boolean;
}

/** Handover state of a granted gift. Renamed from `status` on 2026-07-28. */
export type GiftHandoverStatus = "pending" | "delivered" | "revoked" | "void";

/** Which grant path produced the gift. */
export type GiftSource = "bulk" | "manual";

/** A gift as it appears nested on a sailor in the ship detail. */
export interface SailorGift {
  id: string;
  /**
   * Tracks exactly one thing — whether the delivery partner has physically
   * handed the parcel over. Not approval or payment state.
   */
  handover_status: GiftHandoverStatus;
  /** The order carrying the gift; may no longer be in the live list. */
  carrier_order_id: string | null;
  carrier_order_number: string | null;
  source: GiftSource;
  granted_by_name: string | null;
  granted_at: string | null;
}

/** One of a sailor's orders on the vessel. */
export interface GiftShipOrder {
  id: string;
  order_number: string;
  total_amount: string;
  status: string;
  ship_arrival_date: string | null;
  expected_departure: string | null;
  port_name: string | null;
  anchorage_name: string | null;
  /** Whether *this* order is the one carrying the sailor's gift. */
  is_gift_carrier: boolean;
}

/**
 * A sailor on the vessel, with their orders nested underneath.
 *
 * This nesting is the point of the screen: an admin must never be shown four
 * order rows for one person and be able to gift each of them.
 */
export interface GiftShipSailor {
  user_id: string;
  sailor_name: string;
  order_count: number;
  total_value: string;
  /**
   * The sailor's gift in the **current open group**, looked up by recipient —
   * not by carrier order — so it still shows after the carrier order leaves the
   * live set. Never more than one. A `revoked` or `void` gift reads as `null`:
   * they are giftable again.
   */
  gift: SailorGift | null;
  /**
   * Gifts this sailor received on this IMO in **earlier, closed** groups. A
   * judgment aid for repeat crews — it blocks nothing.
   */
  previously_gifted_count: number;
  orders: GiftShipOrder[];
}

/** `GET /superadmin/gifts/ships/<imo_number>/` — the screen the redesign exists for. */
export interface GiftShipDetail {
  imo_number: string;
  vessel_name: string;
  order_count: number;
  sailor_count: number;
  gifted_sailor_count: number;
  program_enabled: boolean;
  is_dismissed: boolean;
  sailors: GiftShipSailor[];
}

/** Response of the whole-ship grant (§3). */
export interface GrantShipResult {
  message: string;
  /** May be **0** when everyone already holds one — the message says so. */
  sailors_gifted: number;
  sailors_skipped: number;
  /** The full ship detail, so the screen can repaint without a refetch. */
  data: GiftShipDetail | null;
}

/** Filters for the ship-browse screen. */
export interface GetGiftShipsParams {
  page?: number;
  limit?: number;
  /** Vessel name (icontains) or IMO (exact). */
  search?: string;
  portId?: string;
  /** `none` | `partial` | `all` — by gifted-sailor ratio. Anything else → 400. */
  giftStatus?: string;
  arrivalFrom?: string;
  arrivalTo?: string;
  includeDismissed?: boolean;
  /** `arrival` (default) | `-arrival` | `-order_count`. */
  ordering?: string;
}
