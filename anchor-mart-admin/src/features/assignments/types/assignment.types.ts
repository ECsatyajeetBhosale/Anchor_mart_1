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
  /** Order number, e.g. "#AM2467". */
  id: string;
  /** Sailor name. */
  sailor: string;
  /** Items summary, e.g. "Express items ×6". */
  items: string;
  /** Pickup port / terminal. */
  port: string;
  priority: "High" | "Normal";
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
