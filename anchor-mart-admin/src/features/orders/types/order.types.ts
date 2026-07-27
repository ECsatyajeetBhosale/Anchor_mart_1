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

export interface OrderShippingAddress {
  imo: string;
  agent: string;
  contact: string;
  port_code: string;
  vessel_name: string;
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
  port_name?: string | null;
  anchorage_name?: string | null;
  payment_completed_at?: string | null;
  is_emergency?: boolean;
  partner_allocated?: boolean;
  partner_name?: string | null;
  has_location_request?: boolean;

  // --- Nested fields returned by the DETAIL endpoint ---------------------
  // Optional so the list rows (which omit them) still type-check.
  user?: string;
  user_email?: string;
  customer?: OrderCustomer | null;
  shipping_address?: OrderShippingAddress | null;
  port?: OrderPort | null;
  anchorage?: OrderAnchorage | null;
  subtotal?: string;
  shipping_fee?: string;
  tax_amount?: string;
  discount_amount?: string;
  total_amount: string;
  applied_coupon?: string | null;
  coupon_used?: boolean;
  payment_method?: string;
  payment_method_display?: string;
  payment_status?: string;
  payment_status_display?: string;
  transaction_id?: string | null;
  is_express?: boolean;
  is_fastest_delivery?: boolean;
  ship_arrival_date?: string | null;
  expected_stay?: string | null;
  notes?: string;
  items?: OrderItem[];
  items_count?: number;
  total_quantity?: number;
  active_assignment?: OrderAssignment | null;
  assignments?: OrderAssignment[];
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
