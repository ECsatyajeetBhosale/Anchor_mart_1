import type { AssignedAdmin } from "@/features/orders";

/** Badge colour variants used for an intent's status pill. */
export type IntentBadgeVariant = "warning" | "info" | "teal" | "danger" | "neutral" | "success";

/** A single requested item (mapped for the review drawer). */
export interface IntentItem {
  /** Stable key for rendering (API id, else a derived name+index). */
  id: string;
  /** The `OrderItem` id — required by the suggest API (Flow 06 API 11). */
  orderItemId: string;
  name: string;
  qty: number;
  /** true = available, false = unavailable, null = unknown/checking. */
  available: boolean | null;
  /** Verified quantity available at the dock (Flow 06); null = not yet verified. */
  availableQty: number | null;
  /** Shortfall = requested − available (>0 when available-but-short). */
  shortfall: number;
  /** Backend's explicit "this line needs a replacement" flag. */
  needsSuggestion: boolean;
  /** Partner/admin note explaining unavailability. */
  reason: string;
}

/** Raw requested item as returned by the list API (partial/defensive shape). */
export interface IntentApiItem {
  id?: string;
  order_item_id?: string;
  product_name?: string;
  name?: string;
  title?: string;
  item_name?: string;
  quantity?: number;
  qty?: number;
  requested_qty?: number;
  is_available?: boolean | null;
  available_qty?: number;
  shortfall?: number;
  needs_suggestion?: boolean;
  reason?: string;
  note?: string;
}

/** Nested shipping address on an intent row. */
export interface IntentShippingAddress {
  imo?: string;
  /** The API's actual IMO field name. */
  imo_number?: string;
  contact?: string;
  /** The API's actual contact field name. */
  phone?: string;
  port_id?: string;
  port_name?: string;
  vessel_name?: string;
  anchorage_name?: string;
}

/** Raw intent row from `GET /superadmin/orders/intents/`. */
export interface IntentApi {
  id: string;
  /**
   * Owning admin (Flow 27). The intent list serializer exposes this alongside
   * the order list and detail serializers; `null` when unassigned.
   */
  assigned_admin?: AssignedAdmin | null;
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
  /** Port UUID — needed by the variant picker (Flow 06 API 10). */
  port_id?: string;
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
  /** Owning admin, or null when unassigned — drives the Flow 27 ownership gate. */
  assignedAdmin: AssignedAdmin | null;
  /** Port UUID for the variant picker (Flow 06 API 10); "" when unresolved. */
  portId: string;
  /** Row-level Flow 06 signal: at `verification_submitted` with a short/unavailable line. */
  substitutionNeeded: boolean;
}

/**
 * What the admin should do next for an intent, derived from status + signals.
 * Drives the drawer's primary action and the queue's action hint.
 */
export type IntentAction =
  | "claim" // unassigned — claim before acting
  | "assign" // intent_received (owned) — assign a partner to verify
  | "waiting_partner" // partner_verifying — nothing to do yet
  | "suggest" // verification_submitted + substitution needed — suggest replacements
  | "bill" // verification_submitted, all available — generate payment link
  | "waiting_customer" // pending_customer_response — waiting on sailor
  | "awaiting_payment" // payment_pending — link sent
  | "rejected" // intent_rejected — terminal
  | "none";

/**
 * Body of `POST /superadmin/orders/order/<id>/reject-intent/` (Flow 05 API 6).
 * `reason` is required — it is quoted back to the sailor in their notification.
 */
export interface RejectIntentPayload {
  orderId: string;
  reason: string;
}

/** Success body of the reject-intent endpoint. */
export interface RejectIntentResponse {
  message: string;
  order_id: string;
  status: string;
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

/* ------------------------------------------------------------------ */
/* Flow 06 — Stock Verification & Substitution (admin substitution)   */
/* ------------------------------------------------------------------ */

/** A verified report line for one order item (from verification-detail, API 6). */
export interface VerificationLine {
  orderItemId: string;
  name: string;
  sku: string;
  requestedQty: number;
  availableQty: number | null;
  isAvailable: boolean | null;
  shortfall: number;
  needsSuggestion: boolean;
  note: string;
}

/** Report + partner context for an order under verification (API 6). */
export interface VerificationDetail {
  partnerName: string;
  submittedAt: string;
  portId: string;
  lines: VerificationLine[];
}

/** A selectable replacement variant from the picker (API 10). */
export interface SuggestionVariant {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  price: string;
  image: string;
}

/** A staged or released suggestion for an order (API 9). */
export interface StagedSuggestion {
  suggestionId: string;
  orderItemId: string;
  originalName: string;
  suggestedName: string;
  suggestedSku: string;
  quantity: number;
  unitPrice: string;
  status: string;
  released: boolean;
}

/** Request body for staging an existing variant (API 11). */
export interface StageSuggestionPayload {
  order_item_id: string;
  variant_id: string;
  quantity: number;
  note?: string;
}

/** Request body for releasing all staged suggestions (API 13). */
export interface ReleaseSuggestionsPayload {
  order_id: string;
}

/* ------------------------------------------------------------------ */
/* Flow 07 — Order Billing & Payment (create-bill)                    */
/* ------------------------------------------------------------------ */

/**
 * Request body for `POST /superadmin/payments/create-bill/` (Flow 07 API 1).
 * Fees are optional decimals (as strings) ≥ 0; the subtotal is system-computed
 * from the order's products and must NOT be sent.
 */
export interface CreateBillPayload {
  order_id: string;
  shipping_fee?: string;
  tax_amount?: string;
  platform_fee?: string;
}

/** Success body of create-bill — the order moves to `payment_pending`. */
export interface CreateBillResponse {
  message: string;
  order_id: string;
  order_number: string;
  status: string;
  amount: string;
}

/**
 * Request body for creating + suggesting a brand-new product (API 12). Wired
 * for completeness; the create-product form is a follow-up (Products territory).
 */
export interface SuggestNewProductPayload {
  order_item_id: string;
  quantity: number;
  category: string;
  name: string;
  base_price: string;
  sku: string;
  description?: string;
  note?: string;
  catalog_type?: string;
  admin_sourceable?: boolean;
}
