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
  /**
   * Absolute UTC datetime the vessel is expected to DEPART. The backend's
   * `expected_stay` free-text duration was dropped in migrations 0053/0054 and
   * replaced by this; reading the old name yielded `undefined` on every row, so
   * the Stay column rendered its em-dash fallback for every order ever shown.
   */
  expected_departure?: string;
  intent_received_at?: string;
  total_amount?: string;
  created_at?: string;
  /** Order type. Independent flags — an intent may be both. */
  is_express?: boolean;
  is_emergency?: boolean;
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
  sy: string; // formatted expected_departure
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
  /** Order type. Independent flags — an intent may be both. */
  isExpress: boolean;
  isEmergency: boolean;
}

/* ------------------------------------------------------------------ */
/* Intent detail — full order detail fetched on drawer open             */
/* ------------------------------------------------------------------ */

/** A line item with pricing (from the order detail API). */
export interface IntentDetailItem {
  id: string;
  name: string;
  sku: string;
  qty: number;
  unitPrice: string;
  subtotal: string;
  /** true = available, false = unavailable, null = unknown/checking. */
  available: boolean | null;
  availableQty: number | null;
  shortfall: number;
  needsSuggestion: boolean;
  /** The `OrderItem` id — required by the suggest API (Flow 06 API 11). */
  orderItemId: string;
}

/**
 * Rich detail model fetched via `GET /superadmin/orders/orders/{id}/` when the
 * review drawer opens. Supplements the list-level `IntentData` with everything
 * the admin needs to review, approve, or reject an intent.
 */
export interface IntentDetail {
  id: string;
  orderNumber: string;
  status: string;
  statusDisplay: string;
  // Customer
  sailorName: string;
  sailorEmail: string;
  sailorPhone: string;
  // Vessel & shipping
  vesselName: string;
  imo: string;
  portName: string;
  portCode: string;
  anchorageName: string;
  shipArrivalDate: string;
  expectedDeparture: string;
  /**
   * Indicative basket value derived from the line items, for orders that have
   * no bill yet (the backend's own `subtotal`/`total_amount` are a real 0 until
   * Create Bill runs). Empty string when nothing could be computed.
   */
  estimatedSubtotal: string;
  // Items (full detail with pricing)
  items: IntentDetailItem[];
  itemCount: number;
  // Pricing
  subtotal: string;
  shippingFee: string;
  tax: string;
  discount: string;
  total: string;
  // Payment
  paymentStatus: string;
  paymentMethod: string;
  coupon: string;
  // Delivery partner
  partnerName: string;
  partnerStatus: string;
  // Ownership
  assignedAdmin: AssignedAdmin | null;
  // Metadata
  createdAt: string;
  notes: string;
  isExpress: boolean;
  isEmergency: boolean;
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
  /**
   * Order-type filters. Independent booleans that are **not** mutually
   * exclusive — an order may be both — so these are queries, not slices of a
   * partition. "Regular" is `false` on both. `undefined` means no filter, and
   * `false` is a real filter that must survive the usual `|| undefined` idiom.
   */
  isExpress?: boolean;
  isEmergency?: boolean;
}

/**
 * Scope filters for the stat cards. No `status` (the cards break the population
 * down *by* status) and deliberately no date window — the orders screen filters
 * on `payment_completed_at`, which by definition has not happened yet for an
 * intent, so the same parameter would mean two different things.
 */
export interface GetIntentStatsParams {
  search?: string;
  isExpress?: boolean;
  isEmergency?: boolean;
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
  /** Intents stopped before payment — a paid cancellation is a refund and
   *  belongs to the orders screen. Together the two cover every one exactly once. */
  cancelled?: number;
  /**
   * Counts for the order-type chips, over the open funnel with the type filter
   * removed — so selecting a type does not zero the other options. `search`
   * still applies. `type_counts.all == total_intents`.
   */
  type_counts?: IntentTypeCounts;
}

/** Chip counts. `express` and `emergency` overlap; `both` is that overlap. */
export interface IntentTypeCounts {
  all?: number;
  express?: number;
  emergency?: number;
  both?: number;
  regular?: number;
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

/**
 * Request body for staging an existing variant (API 11).
 * `quantity` is sent as a string to match the documented request sample
 * (`"quantity": "3"`); DRF coerces it to an integer.
 */
export interface StageSuggestionPayload {
  order_item_id: string;
  variant_id: string;
  quantity: string;
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
 * Body of `PATCH /superadmin/payments/update-bill/` (Flow 07 API 2). Same shape
 * as create-bill; omitted fees keep their current value. Only valid while the
 * order is `payment_pending` — `create-bill` 409s on a second call, so this is
 * the only way to re-price a bill.
 */
export type UpdateBillPayload = CreateBillPayload;

/** Success body of update-bill — same shape as create-bill. */
export type UpdateBillResponse = CreateBillResponse;

/**
 * Body of `POST /superadmin/payments/generate-link/` (Flow 07 API 3). Same fee
 * shape as create-bill — `GeneratePaymentLinkSerializer` accepts the breakdown
 * only, never a subtotal.
 */
export type GeneratePaymentLinkPayload = CreateBillPayload;

/**
 * Success body of generate-link. The endpoint answers **201** when it minted a
 * fresh Stripe Checkout session and **200** when it reused an open, same-amount
 * one — `reused` carries that distinction into the body, since RTK Query
 * doesn't expose the status code on a successful `unwrap()`.
 *
 * `expires_at` is an ISO timestamp clamped strictly under Stripe's 24h ceiling.
 */
export interface GeneratePaymentLinkResponse {
  message: string;
  reused: boolean;
  order_id: string;
  order_number: string;
  amount: string;
  checkout_url: string;
  expires_at: string;
}

/**
 * Request body for creating + suggesting a brand-new product (API 12).
 * `quantity` and `base_price` are strings, matching the documented sample.
 * `attributes` is a free-form JSON object and `images` a list of stored paths
 * (e.g. `variant_images/…`), both optional.
 */
export interface SuggestNewProductPayload {
  order_item_id: string;
  quantity: string;
  category: string;
  name: string;
  base_price: string;
  sku: string;
  description?: string;
  note?: string;
  attributes?: Record<string, unknown>;
  images?: string[];
  catalog_type?: string;
  admin_sourceable?: boolean;
}
