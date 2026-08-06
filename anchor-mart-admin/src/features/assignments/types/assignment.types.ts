// Domain types for the Order Assignments feature.
// Both boards are API-backed: active assignments come from Flow 28 API 14 and
// the unassigned queue from API 15.

/** An active delivery assignment row (Flow 28 API 14). */
export interface Assignment {
  /** Stable row key — the assignment id, falling back to the order id. */
  id: string;
  /**
   * The **order UUID**. Reassigning posts this as `order_id`, so it must be the
   * real id rather than the display number shown in the ORDER column.
   */
  orderId: string;
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
  /**
   * The **assignment's** own status (`assigned` · `verifying` · `verified` · …),
   * which is not the order status above. Since 2026-08-03 a verify job is
   * stamped `verifying` and then `verified`, so this is what tells a verify job
   * apart from a delivery — previously both were written as `assigned`.
   */
  assignmentStatus: string;
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

/** Request body for POST /superadmin/partner/assign-order/ (Flow 28 API 12). */
export interface AssignOrderPayload {
  order_id: string;
  delivery_partner_id: string;
  /** Optional admin override; the SLA policy computes it when omitted. */
  deliver_by?: string;
  /** `true` to reassign an order currently held by another partner. */
  confirm?: boolean;
}

/** A partner returned by the assignable-partners endpoint (Flow 28 API 11). */
export interface AssignablePartner {
  /** The id the assign-order API expects as `delivery_partner_id` (the user id). */
  deliveryPartnerId: string;
  /** Business partner code, e.g. "DP-00056". */
  code: string;
  name: string;
  port: string;
  isAvailable: boolean;
  /**
   * Capability (Flow 28). Independent booleans, not a role — and distinct from
   * `isAvailable`, which is the partner's own daily on/off-shift toggle.
   *
   * With `?order_id=` the server has already scoped the list to the capability
   * the order's phase needs, so these are shown to explain *why* a partner is
   * offered rather than to filter locally: the assignment write is the authority
   * and refuses a mismatch with a 400 (and a 403 behind it).
   */
  canVerify: boolean;
  canDeliver: boolean;
}

/**
 * One milestone on an order's ladder (Flow 28 API 16 · `order-timeline`).
 * Mirrors the `OrderTimelineItem` shape the shared `Timeline` component renders,
 * so a mapped step can be handed to it directly.
 */
export interface OrderTimelineStep {
  key: string;
  label: string;
  /** Display timestamp, or null when the step hasn't happened yet. */
  at: string | null;
  is_done: boolean;
  detail?: string | null;
}

/** The milestone ladder for one order, plus its terminal state when closed. */
export interface OrderTimeline {
  steps: OrderTimelineStep[];
  /** e.g. "cancelled" / "delivered" / "intent_rejected"; "" while in flight. */
  terminalState: string;
}

/**
 * One row of an order's assignment history (Flow 28 API 13). Closed rows are
 * included — a `reassigned` entry is how the trail explains a hand-over.
 */
export interface OrderAssignmentHistory {
  id: string;
  partnerName: string;
  partnerCode: string;
  status: string;
  statusDisplay: string;
  assignedBy: string;
  assignedAt: string;
  deliverBy: string;
  isActive: boolean;
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
