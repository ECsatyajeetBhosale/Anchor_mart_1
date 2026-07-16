// Domain types for the Order Assignments feature.
// NOTE: no backend endpoint yet — the page renders local mock data (see ./data).
// Shapes are kept API-friendly so wiring RTK Query later is a drop-in replacement.

/** An active delivery assignment row. */
export interface Assignment {
  /** Stable row key (the order number). */
  id: string;
  /** Enquiry code, e.g. "ENQ-0042". */
  enquiry: string;
  /** Assigned partner full name. */
  partner: string;
  /** Order number, e.g. "#AM2461". */
  order: string;
  /** Shop / store name. */
  shop: string;
  /** Delivery destination, e.g. "MSC Marvela·B7". */
  deliverTo: string;
  /** Status label, e.g. "Delivering" | "Verifying" | "New". */
  status: string;
  /** ETA label, e.g. "12:02 PM". */
  eta: string;
}

/** An order awaiting partner assignment. */
export interface UnassignedOrder {
  /** Order number, e.g. "#AM2467" (shown in the UI, also the row key). */
  id: string;
  /** Order record UUID — sent to the assign-order API as `order_id`. */
  orderId: string;
  /** Sailor name. */
  sailor: string;
  /** Items summary, e.g. "Express items ×6". */
  items: string;
  /** Pickup port / terminal. */
  port: string;
  priority: "High" | "Normal";
}

/**
 * An unassigned order as returned by GET /superadmin/partner/unassigned-orders/.
 * The list is a plain DRF paginated array (not the wrapped `results.data` envelope).
 */
export interface ApiUnassignedOrder {
  id: string;
  order_number: string;
  customer_name: string;
  /** Machine status, e.g. "payment_pending". */
  status: string;
  /** Human status label, e.g. "Payment Pending". */
  status_display: string;
  /** Decimal string, e.g. "1000.00". */
  total_amount: string;
  /** Pre-formatted timestamp, e.g. "July 07, 2026, 09:29 AM". */
  created_at: string;
}

/** DRF paginated envelope for the unassigned-orders list (plain `results` array). */
export interface ApiUnassignedOrdersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ApiUnassignedOrder[];
}

/** Request body for POST /superadmin/partner/assign-order/. */
export interface AssignOrderPayload {
  order_id: string;
  delivery_partner_id: string;
  /** Delivery date as `YYYY-MM-DD`. */
  deliver_by: string;
  /** `false` for an initial assignment; `true` to confirm a reassignment. */
  confirm: boolean;
}

/** A delivery partner available for assignment. */
export interface AvailablePartner {
  /** Partner code, e.g. "DP-00056". */
  id: string;
  name: string;
  /** Location or workload note, e.g. "Singapore" or "2 active orders". */
  location: string;
  status: "Free" | "Busy";
  /** Grouped under the "Busy (can take more)" divider when true. */
  busy?: boolean;
}
