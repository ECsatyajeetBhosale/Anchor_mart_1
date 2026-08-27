// Type contracts for the orders API (GET /superadmin/orders/orders/).
// Only the fields the UI consumes are typed strictly; the rest are kept optional
// so the table keeps working if the backend adds/removes peripheral data.

import type { ShipAgent } from "@/features/ship-agents";
import type { DeltaPayment, LocationReport } from "./delta.types";
import type { AssignedAdmin } from "./ownership.types";

/**
 * Frozen copy of the bound ship agent written onto the order at bind time
 * (`ship_agent_snapshot`, 6 keys). Survives even if the agent is later
 * soft-deleted — prefer it for display when `ship_agent` is null but a snapshot
 * exists. See Flow 02 · API 17.
 */
export interface OrderShipAgentSnapshot {
  id: string;
  name: string;
  mobile: string | null;
  country_code: string | null;
  email: string | null;
  company: string | null;
}

export interface OrderCustomer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  country_code: string | null;
  whatsapp_number: string | null;
  role: string;
  is_active: boolean;
}

/**
 * The delivery target — the same fixed 16-key object the intents screen gets,
 * always present, `null` when unknown, so no key needs an existence check.
 *
 * It replaced a free-form blob with seven different shapes across live data.
 * Two consequences: `imo` is gone (always `imo_number`), and `contact` is gone
 * (always `phone`). Nothing at the row root duplicates any of it — the list
 * carries no top-level `port_name` or `anchorage_name` any more, so this is the
 * only source of location on a list row.
 *
 * Structurally identical to `IntentShippingAddress`. They are declared once per
 * feature rather than shared because the two screens' rows are otherwise
 * different contracts; if the express row merge lands in step 3 that is the
 * moment to hoist one shared type.
 */
export interface OrderShippingAddress {
  full_name: string | null;
  /** The delivery contact — not the account's own. */
  phone: string | null;
  email: string | null;
  port_name: string | null;
  port_code: string | null;
  anchorage_name: string | null;
  anchorage_code: string | null;
  country: string | null;
  city: string | null;
  zip_code: string | null;
  vessel_name: string | null;
  /** Always `imo_number` — the old `imo` spelling is reconciled away server-side. */
  imo_number: string | null;
  deck: string | null;
  cabin_number: string | null;
  section: string | null;
  delivery_instructions: string | null;
}

export interface OrderPort {
  id: string;
  port_code: string;
  port_name: string;
  country: string;
  region: string;
}

export interface OrderAnchorage {
  id: string;
  anchorage_name: string;
  anchorage_code: string;
}

export interface OrderItemVariant {
  id: string;
  sku: string;
  price: string;
  attributes: Record<string, unknown>;
  is_express_item: boolean;
  admin_sourceable: boolean;
  product_id: string;
  product_name: string;
}

export interface OrderItem {
  id: string;
  variant: OrderItemVariant;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: string;
  subtotal: number;
  is_sourcable: boolean;
  is_replaced: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderAssignment {
  id: string;
  partner_email: string;
  partner_name: string;
  partner_code: string;
  status: string;
  status_display: string;
  assigned_by_email: string;
  deliver_by: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  is_active: boolean;
  /** Partner's own words when they declined the assignment; `""` when they didn't. */
  rejection_reason?: string;
  rejected_at?: string | null;
  /**
   * Partner's own words when they reported the delivery failed; `""` when it
   * didn't fail. Paired with `failed_at`. The assignment deliberately stays
   * active after a failure — the admin reassigns or refunds — so this is a
   * record of what happened, not a closure.
   */
  failure_reason?: string;
  failed_at?: string | null;
}

/**
 * One gateway charge attempt. A card that was declined twice before succeeding
 * produces three of these; `Payment.failure_reason` only ever holds the last
 * decline, so this array is the only place the earlier ones survive.
 */
export interface OrderPaymentAttempt {
  id: string;
  outcome: string;
  amount: string;
  currency: string;
  /** Gateway's machine code — `""` on a successful attempt. */
  failure_code: string;
  /** Gateway's human-readable decline message — `""` on a successful attempt. */
  failure_message: string;
  created_at: string;
}

/** A payment on the order (initial bill or a delta), with its attempt history. */
export interface OrderPayment {
  id: string;
  kind: string;
  kind_display: string;
  amount: string;
  currency: string;
  status: string;
  status_display: string;
  /** The LAST decline only — read `attempts[]` for the full sequence. */
  failure_reason: string;
  paid_at: string | null;
  attempts?: OrderPaymentAttempt[];
  attempt_count?: number;
  failed_attempt_count?: number;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  status_display: string;

  // --- Flat fields returned by the LIST endpoint -------------------------
  // The list serializer returns a lightweight, flattened row (not the nested
  // objects below). These are the fields the table actually renders.
  customer_name?: string;
  customer_email?: string;
  item_count?: number;
  /**
   * When the money landed — the sort axis for this screen, and what
   * `?date_from` / `?date_to` filter on. Always set here by definition.
   */
  payment_completed_at?: string | null;
  is_emergency?: boolean;
  is_fastest_delivery?: boolean;
  /**
   * Money still owed on this order, as a decimal string — annotated onto the
   * list queryset, so it costs one query per page rather than one per row.
   *
   * **`"0.00"` unless delivery has concluded.** On `partially_delivered` it is
   * the exact partial-refund amount; on `delivery_failed` it is the whole order,
   * since a full refund is the policy there. Everywhere else it is zero: an
   * in-flight order's outstanding value is not a debt, and rendering it as one
   * would put a refund figure on a perfectly healthy row.
   */
  undelivered_value?: string;
  /**
   * The sailor owes an unpaid delivery surcharge, so the partner's handover is
   * **blocked** — not a background charge. Distinct from `has_location_request`,
   * which says a move was *reported*: an order can be either without the other,
   * and this is the one that stops the goods moving.
   */
  delivery_on_hold?: boolean;
  /**
   * Kept for compatibility and history only. **Neither answers whether a
   * delivery partner is assigned**: an order whose one active assignment is a
   * finished verification reports `partner_allocated: true` while still needing
   * someone to bring the goods to the vessel. Use `needs_delivery_partner`.
   */
  partner_allocated?: boolean;
  partner_name?: string | null;
  has_location_request?: boolean;
  /**
   * The vessel's stay window — on the **list** row since 2026-08-19, because it
   * is the deadline a partial delivery races: resumable while the ship is
   * alongside, permanently incomplete once it has sailed.
   */
  expected_departure?: string | null;
  /**
   * Whether the order still needs a partner, and of which kind — the backend's
   * canonical answer (`orders/assignment_lifecycle.partner_requirements`). At
   * most one is ever true, and both are false for an order awaiting payment or
   * already terminal.
   *
   * Sent by both list serializers and the detail one. Optional here only so an
   * absent field is *detectable*: `lib/partnerRequirement` reports it rather
   * than reading it as `false`.
   */
  needs_verifier_partner?: boolean;
  needs_delivery_partner?: boolean;
  /**
   * Why a terminated row ended where it did. All three are sent by the LIST
   * serializer as well as the detail one, so a worklist row explains itself
   * without a second request.
   *
   * `""` (and `null` for the timestamp) means the backend recorded nothing —
   * which is not the same as "no reason exists", and is never filled in from
   * the status, the timeline or anything else.
   */
  failure_reason?: string;
  cancellation_reason?: string;
  cancelled_at?: string | null;

  // --- Nested fields returned by the DETAIL endpoint ---------------------
  // Optional so the list rows (which omit them) still type-check.
  user?: string;
  user_email?: string;
  customer?: OrderCustomer | null;
  shipping_address?: OrderShippingAddress | null;
  port?: OrderPort | null;
  anchorage?: OrderAnchorage | null;
  /**
   * Money fields. All of these stay `"0.00"` until the admin generates a bill:
   * `apply_fees` writes the fee fields and `recompute_order_totals` produces
   * `total_amount` (Flow 07). Before that an order can hold priced items while
   * every order-level figure still reads zero — which is expected, not a bug.
   */
  subtotal?: string;
  shipping_fee?: string;
  tax_amount?: string;
  platform_fee?: string;
  discount_amount?: string;
  /** Discount granted by redeemed loyalty points. */
  loyalty_discount?: string;
  loyalty_points_redeemed?: number;
  total_amount: string;
  applied_coupon?: string | null;
  coupon_used?: boolean;
  payment_method?: string;
  payment_method_display?: string;
  payment_status?: string;
  payment_status_display?: string;
  transaction_id?: string | null;
  is_express?: boolean;
  ship_arrival_date?: string | null;
  /**
   * The delivery deadline for this order (§1.1, 2026-08-27).
   *
   * Now present on **every** order, not just the fast tiers: a regular order's
   * deadline is `departure − departure_safety_buffer_hours`, and the departure
   * cap applies to all four kinds. Any copy saying "standard orders have no
   * deadline" is wrong.
   *
   * `null` no longer means "regular order". It means the order has **neither** a
   * departure **nor** a fast tier — rare, and a data problem rather than a
   * category. It is still not "0h left".
   *
   * It is also **live** (§1.2): recomputed whenever the berth, arrival,
   * departure, fastest-delivery flag or payment changes. Never cache it across
   * screens, and re-read it after any location change.
   */
  deliver_by?: string | null;
  /**
   * §4.4 — the vessel sails before the delivery could physically be made.
   *
   * It needs its own flag precisely because `deliver_by` is clamped so it is
   * never issued already-expired: without this, an impossible job is
   * indistinguishable from a merely tight one. Shown **before** assignment —
   * handing a partner an unreachable deadline damages their on-time record for
   * something they never had a chance at.
   */
  delivery_window_infeasible?: boolean;
  notes?: string;
  items?: OrderItem[];
  items_count?: number;
  total_quantity?: number;
  active_assignment?: OrderAssignment | null;
  assignments?: OrderAssignment[];
  /** Detail read only — every payment on the order, each with its attempts. */
  payments?: OrderPayment[];
  /** Admin's reason for rejecting the intent (detail read only); `""` otherwise. */
  rejection_reason?: string;
  // --- Flow 27 ownership + Flow 02 ship-agent (API 17) --------------------
  /** The accountable admin (Flow 27); null when unclaimed. */
  assigned_admin?: AssignedAdmin | null;
  /** Currently bound ship agent (admin read body); null when none. */
  ship_agent?: ShipAgent | null;
  /** Frozen contact copy written at bind time; survives agent soft-delete. */
  ship_agent_snapshot?: OrderShipAgentSnapshot | null;
  // --- Flow 11 (embedded on the detail read only) -------------------------
  /** Every delivery surcharge raised on this order, newest first. */
  deltas?: DeltaPayment[];
  /** Every location change the sailor reported, with its review outcome. */
  location_reports?: LocationReport[];
  created_at: string;
  updated_at?: string;
}

/**
 * DRF paginated envelope for orders. Unlike products/express, `results` is a
 * plain array (not wrapped in `{ message, data }`).
 */
export interface OrderListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Order[];
}

/**
 * A sailor cart that has not converted into an order, from
 * `GET /superadmin/orders/carts/`.
 *
 * The endpoint has no flow-document contract, but its live shape is a bare array
 * of `{ id, user, user_email, items[] }` — each item carrying `quantity` and a
 * nested `variant_details`. Nothing is aggregated server-side: there is no name,
 * no total and no cart timestamp, so every figure below is derived from `items`
 * by the API transform.
 */
export interface AdminCart {
  /** Cart id — the row key. */
  id: string;
  /**
   * The sailor's email — the only identity the payload carries. `user` is a
   * bare UUID and no name field is returned at any level, so there is no
   * "customer name" to show.
   */
  email: string;
  /** Sailor's user id. */
  userId: string;
  /**
   * Summed `quantity` across every line — the number of physical units.
   *
   * The distinct-line count is deliberately not carried: the items column
   * lists the SKUs, so a line count would only restate them.
   */
  unitCount: number;
  /**
   * Cart value, computed here as Σ(quantity × variant price).
   *
   * The API sends no total, and `CartItem` has no price column by design
   * (Flow 04) — the price is read live off the variant on every read, so an
   * admin price change shows up immediately with no stale-price banner. That
   * makes this a faithful reflection of the cart, not a guess.
   */
  total: string;
  /** SKUs on the cart, for the items column. */
  skus: string[];
  /**
   * Lines whose variant can no longer be ordered.
   *
   * Flow 04 F-02/F-03: the cart deliberately does **not** re-check availability
   * on read or update, so a dead line looks healthy to the sailor right up until
   * checkout returns a blocking 400. Surfacing the count here is what explains a
   * stalled basket.
   */
  blockedCount: number;
  /**
   * Every line is express. A cart never mixes catalog types (Flow 04), and
   * express carts check out straight to Stripe (Flow 09) rather than through the
   * intent funnel, so it's worth calling out.
   *
   * Note this only separates express from everything else — `variant_details`
   * carries no `catalog_type`, so regular and marine-emergency are
   * indistinguishable in this payload.
   */
  isExpress: boolean;
}

/** Transformed carts result: total count + UI rows. */
export interface AdminCartListResult {
  count: number;
  carts: AdminCart[];
}
