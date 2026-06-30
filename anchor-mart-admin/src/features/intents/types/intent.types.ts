/** Badge colour variants used for an intent's status pill. */
export type IntentBadgeVariant = "warning" | "info" | "teal" | "danger" | "neutral" | "success";

/** A single requested item (mapped for the review drawer). */
export interface IntentItem {
  /** Stable key for rendering (API id, else a derived name+index). */
  id: string;
  name: string;
  qty: number;
  /** true = available, false = unavailable, null = unknown/checking. */
  available: boolean | null;
}

/** Raw requested item as returned by the list API (partial/defensive shape). */
export interface IntentApiItem {
  id?: string;
  product_name?: string;
  name?: string;
  title?: string;
  item_name?: string;
  quantity?: number;
  qty?: number;
  is_available?: boolean | null;
}

/** Nested shipping address on an intent row. */
export interface IntentShippingAddress {
  imo?: string;
  contact?: string;
  port_name?: string;
  vessel_name?: string;
  anchorage_name?: string;
}

/** Raw intent row from `GET /superadmin/orders/intents/`. */
export interface IntentApi {
  id: string;
  order_number?: string;
  sailor_name?: string;
  sailor_email?: string;
  status?: string;
  status_display?: string;
  substitution_needed?: boolean;
  item_count?: number;
  items?: IntentApiItem[];
  shipping_address?: IntentShippingAddress;
  port?: string;
  anchorage?: string;
  ship_arrival_date?: string;
  expected_stay?: string;
  intent_received_at?: string;
  total_amount?: string;
  created_at?: string;
}

/** UI row model consumed by the list table + review drawer. */
export interface IntentData {
  id: string;
  r: string; // order_number (display ref)
  s: string; // sailor_name
  email: string; // sailor_email
  it: string; // items summary text (with count)
  itemCount: number; // item_count
  reqItems: IntentItem[]; // mapped items for the drawer
  sh: string; // ship / vessel summary
  vessel: string;
  port: string;
  ar: string; // formatted ship arrival date
  sy: string; // expected_stay
  sb: string; // submitted (created_at)
  st: string; // status_display (badge label)
  status: string; // raw status (filtering / logic)
  sc: IntentBadgeVariant; // badge variant derived from status
  imo: string;
  terminal: string; // anchorage
  contact: string;
  total: string; // total_amount
}

/** Query params for the intents list (search + status are omitted when empty). */
export interface GetIntentsParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Raw API status value (e.g. "intent_received"); omit for "all". */
  status?: string;
}

/** Transformed list result the page consumes: total count + UI rows. */
export interface IntentListResult {
  count: number;
  intents: IntentData[];
}

/**
 * Intent statistics returned by `GET /superadmin/orders/intents/stats/`.
 * Every field is optional so a partial/empty payload degrades gracefully to 0.
 */
export interface IntentStats {
  total_intents?: number;
  new_intents?: number;
  pending_intent?: number;
  in_sourcing?: number;
  in_verification?: number;
  substitution_needed?: number;
  awaiting_customer?: number;
  ready_to_bill?: number;
  awaiting_payment?: number;
  confirmed_today?: number;
  rejected?: number;
}
