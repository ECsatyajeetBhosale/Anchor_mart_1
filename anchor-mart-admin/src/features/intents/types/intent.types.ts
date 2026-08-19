import type { AssignedAdmin } from "@/features/orders";
import type { TypedStats } from "@/lib/stats";

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

/**
 * A requested line on the list row.
 *
 * **The availability fields are populated only while the order is at
 * `verification_submitted`.** Everywhere else they are `null` / `0` / `false`
 * by design: past that stage the truth lives in the released suggestions and
 * the sailor's answers, so re-surfacing a stale "out of stock" would be wrong.
 */
export interface IntentApiItem {
  /** The `OrderItem` id — what the suggest API takes as `order_item_id`. */
  id?: string;
  product_name?: string;
  sku?: string;
  quantity?: number;
  available_qty?: number | null;
  is_available?: boolean | null;
  shortfall?: number;
  needs_suggestion?: boolean;
  reason?: string | null;
}

/**
 * The delivery target — **the source of truth for where the partner goes**.
 *
 * Exactly these sixteen keys, **always present**, `null` when unknown, so no
 * key needs an existence check. Nothing at the row root duplicates them: since
 * 2026-08-19 there is no top-level `port`, `anchorage`, `vessel_name` or `imo`.
 *
 * `port_name` / `anchorage_name` are filled from the order's foreign keys
 * rather than from the stored address blob — 842 of 884 live snapshots never
 * recorded a port name, so reading the blob would blank the column on most
 * rows, and the FK wins anyway when the two disagree (a location change writes
 * both).
 */
export interface IntentShippingAddress {
  full_name: string | null;
  /** The delivery contact. Distinct from the account's own contact details. */
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
  /**
   * Always `imo_number` — never `imo`. The stored snapshots use both spellings
   * (`imo` on 864 orders, `imo_number` on 19) and the API reconciles them to
   * this one key, so the old two-name fallback is gone.
   */
  imo_number: string | null;
  deck: string | null;
  cabin_number: string | null;
  section: string | null;
  delivery_instructions: string | null;
}

/**
 * The delivery-move sub-flow, or `null` when there is nothing to act on.
 *
 * An **object, not a boolean**, and deliberately not the same signal as
 * `has_location_request` on the orders and express screens — that one is a bare
 * boolean covering the `report_pending` state alone. This carries the state
 * *and* the id the follow-up call needs, so the two are never aliased.
 *
 * A delta requires a completed initial payment, so `delta_*` belongs to the
 * orders screen and `report_*` is what this pre-payment screen normally shows.
 */
export interface IntentLocationChange {
  /**
   * - `delta_pending` — surcharge raised, awaiting the sailor's payment
   * - `delta_initiated` — the sailor started paying; do not raise another
   * - `report_pending` — a reported move needing an admin to price or dismiss it
   * - `report_dismissed` — dismissed; no change and no charge
   */
  state: "delta_pending" | "delta_initiated" | "report_pending" | "report_dismissed";
  /** Set on the `delta_*` states — the surcharge to withdraw or await. */
  delta_id: string | null;
  /** Set on the `report_*` states — the report to price or dismiss. */
  report_id: string | null;
  /** Decimal string, `delta_*` only. */
  amount: string | null;
}

/**
 * What a row's state *means*, where the status alone cannot say who owes the
 * next move. Two statuses split, and `situation` names the halves:
 *
 * | status | split by | situation |
 * |---|---|---|
 * | `intent_received` | `assigned_admin` null / set | `new` / `sourcing` |
 * | `pending_customer_response` | `substitutions_confirmed_at` null / set | `awaiting_customer` / `ready_to_bill` |
 *
 * Every other status reports itself, so `situation === status` almost always —
 * which is why a future split adds a key without breaking anything written
 * today. Each value is a valid `?status=` verbatim, so a badge drills through
 * with no mapping.
 *
 * `new`/`sourcing` is derived from **ownership, not progress**: claiming an
 * order moves it without the lifecycle changing at all.
 */
export type IntentSituation = "new" | "sourcing" | "awaiting_customer" | "ready_to_bill";

/**
 * Raw intent row from `GET /superadmin/orders/intents/`.
 *
 * The population is every live **non-express** order: express skips the funnel
 * entirely and has its own screen, which is why `?is_express=true` is a 400
 * here rather than an empty page.
 *
 * Renamed on 2026-08-19 (hard swaps, the old keys are gone): `sailor_name` →
 * `customer_name`, `sailor_email` → `customer_email`, and top-level `port` /
 * `anchorage` moved inside `shipping_address`.
 */
export interface IntentApi {
  id: string;
  /**
   * Owning admin (Flow 27). The intent list serializer exposes this alongside
   * the order list and detail serializers; `null` when unassigned.
   */
  assigned_admin?: AssignedAdmin | null;
  order_number?: string;
  customer_name?: string;
  customer_email?: string;
  status?: string;
  /**
   * What the row's state *means* — see `IntentSituation` for the two splits.
   *
   * `status` stays the raw lifecycle value and never varies with this: the two
   * answer different questions, so neither is derived from the other. Every
   * other status reports itself here.
   *
   * Typed as a union **or** a plain string on purpose. Only the four values
   * this screen knows are named; anything else — including a status echoing
   * itself, or a split added later — must degrade to "read the status" rather
   * than to a wrong action or an unlabelled badge.
   */
  situation?: IntentSituation | string;
  /**
   * The label of `situation`, not of `status`. Render it verbatim and **never
   * string-match it** — colour and logic key off `situation`, then `status`.
   */
  status_display?: string;
  /** Equals `any(items[].needs_suggestion)` — the row-level shortage signal. */
  substitution_needed?: boolean;
  item_count?: number;
  items?: IntentApiItem[];
  /** The 16-key delivery target; the only source of vessel/port/anchorage. */
  shipping_address?: IntentShippingAddress;
  /**
   * Vessel dates. **Display strings, not ISO** — see `lib/dates.ts`; the
   * backend renders `"%B %d, %Y, %I:%M %p"` and a test fails if either goes
   * back to ISO.
   */
  ship_arrival_date?: string | null;
  expected_departure?: string | null;
  intent_received_at?: string | null;
  created_at?: string | null;
  /** `"0.00"` until the bill is created — an intent is not priced yet. */
  total_amount?: string;
  /**
   * Three **independent** delivery flags; the tightest SLA wins. `is_express`
   * (12h, a checkout tier) is always false on this screen. `is_emergency` (24h,
   * cargo type) and `is_fastest_delivery` (24h, the sailor's opt-in on any
   * order) cross-cut it — a regular order can be fastest-delivery, gaining a
   * hard deadline it would not otherwise have.
   */
  is_express?: boolean;
  is_emergency?: boolean;
  is_fastest_delivery?: boolean;
  /** The delivery-move sub-flow; `null` when there is nothing to act on. */
  location_change?: IntentLocationChange | null;
  /**
   * Why a terminated intent ended where it did. Both are plain columns on the
   * order and are sent by the list serializer, so `?status=intent_rejected` is
   * a worklist that explains itself in place.
   *
   * `""` / `null` means the backend recorded nothing — never filled in from the
   * status or anything else. Neither is the same event as the orders screen's
   * `failure_reason`, which records a failed delivery attempt.
   */
  rejection_reason?: string;
  cancellation_reason?: string;
  cancelled_at?: string | null;
  /**
   * Whether the intent still needs a partner, and of which kind — the backend's
   * canonical answer, and the one to read: never infer it from assignment
   * status. Optional only so an absent field is detectable; see
   * `lib/partnerRequirement`.
   */
  needs_verifier_partner?: boolean;
  needs_delivery_partner?: boolean;
}

/** UI row model consumed by the list table + review drawer. */
export interface IntentData {
  id: string;
  r: string; // order_number (display ref)
  s: string; // customer_name, falling back to customer_email
  it: string; // items summary text (with count)
  itemCount: number; // item_count
  reqItems: IntentItem[]; // mapped items for the drawer
  /** Vessel name, else IMO — the SHIP column. `shipping_address` is its only source. */
  sh: string;
  /** `shipping_address.port_name` — seeds the drawer summary until detail lands. */
  port: string;
  ar: string; // ship_arrival_date, shortened
  sy: string; // expected_departure, shortened
  sb: string; // created_at, else intent_received_at — as sent
  st: string; // status_display — the label of `situation`, shown verbatim
  status: string; // raw lifecycle status (filtering / badge colour)
  /**
   * The sub-state behind `status`, or "" when the row does not carry one.
   * Decides whether a `pending_customer_response` row can be billed.
   */
  situation: string;
  sc: IntentBadgeVariant; // badge variant derived from status
  total: string; // total_amount
  /** Owning admin, or null when unassigned — drives the Flow 27 ownership gate. */
  assignedAdmin: AssignedAdmin | null;
  /** Row-level Flow 06 signal: at `verification_submitted` with a short/unavailable line. */
  substitutionNeeded: boolean;
  /**
   * Delivery flags. Independent of each other — see `IntentApi`. `isExpress` is
   * always false on this screen and is kept only so the type badges stay one
   * shared component across screens.
   */
  isExpress: boolean;
  isEmergency: boolean;
  isFastest: boolean;
  /** The delivery-move state, or null when there is nothing outstanding. */
  locationChange: IntentLocationChange | null;
  /**
   * The backend's explanation for a terminated row (`lib/terminalReason`), and
   * when it was recorded. `""` when there is none — the row then shows its
   * status badge alone.
   */
  reason: string;
  reasonAt: string;
  /**
   * Straight from `needs_verifier_partner` / `needs_delivery_partner`. `null`
   * means the API omitted the field — never coerced to `false`, which would
   * silently claim nothing is outstanding.
   */
  needsVerifierPartner: boolean | null;
  needsDeliveryPartner: boolean | null;
}

/* ------------------------------------------------------------------ */
/* Intent detail — full order detail fetched on drawer open             */
/* ------------------------------------------------------------------ */

/**
 * The partner's current verification answer for one line, or `null` when nobody
 * has verified it yet.
 *
 * Resolved by the backend **per item, newest line first** — verification is a
 * loop, so an item reported missing can later be found. This is the single
 * authoritative source; `availability_reports[]` is history and must not be used
 * to derive the current state.
 */
export interface ItemAvailability {
  is_available: boolean;
  available_qty: number;
  /**
   * What was requested **at the time of that verification** — deliberately not
   * `items[].quantity`, which an unpaid order can change afterwards. Comparing
   * against the item's current quantity would report a shortfall that was never
   * measured.
   */
  requested_qty: number;
  /** `""` when there is no note — not `null`. */
  note: string;
  reported_at: string | null;
}

/** The four states an item can be in, derived only from `availability`. */
export type AvailabilityState = "unverified" | "available" | "short" | "unavailable";

/** A line item with pricing (from the order detail API). */
export interface IntentDetailItem {
  id: string;
  name: string;
  sku: string;
  qty: number;
  unitPrice: string;
  subtotal: string;
  /** Raw availability object, straight from the API. `null` = unverified. */
  availability: ItemAvailability | null;
  /** Derived presentation state — the only thing the badge reads. */
  availabilityState: AvailabilityState;
  /** `requested_qty - available_qty` when short, else 0. */
  shortBy: number;
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
  /** From `anchorage.anchorage_code` — `shipping_address.anchorage_code` is
   *  blank on app-created orders. */
  anchorageCode: string;
  shipArrivalDate: string;
  expectedDeparture: string;
  /**
   * The backend's live `estimated_subtotal` — what the sailor will be charged
   * before a bill exists.
   *
   * Read, never recomputed. `subtotal` is a stored column written by
   * `sync_order_subtotal` at confirm-substitutions or create-bill, so on a
   * pre-bill intent it is a real `"0.00"`, not an approximation. This one is
   * `compute_subtotal()` on read and **includes accepted substitutes** — the
   * part any client-side sum over `items[]` necessarily misses, since the
   * substitutes live in their own collection.
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
  /** The business placement event (`placed_at`), not the record's creation. */
  placedAt: string;
  createdAt: string;
  notes: string;
  isExpress: boolean;
  isEmergency: boolean;
  /** Port UUID for the variant picker (Flow 06 API 10); "" when unresolved. */
  portId: string;
  /** Row-level Flow 06 signal: at `verification_submitted` with a short/unavailable line. */
  substitutionNeeded: boolean;
  /**
   * The backend's explanation for a terminated intent (`lib/terminalReason`),
   * shown in the lifecycle rail's closed-order notice. `""` when none.
   */
  terminalReason: string;
  terminalReasonAt: string;
  /** See {@link IntentData.needsVerifierPartner}. */
  needsVerifierPartner: boolean | null;
  needsDeliveryPartner: boolean | null;
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
  | "bill" // everything available, or substitutions confirmed — raise the bill
  | "waiting_customer" // pending_customer_response, sailor has not answered
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

/**
 * Body of `POST order/{id}/request-reverification/` (§4.3b) — send a report back
 * to the partner. `reason` is required; the partner is told what to re-check.
 */
export interface RequestReverificationPayload {
  orderId: string;
  reason: string;
}

/** Success body of the re-verification endpoint. */
export interface RequestReverificationResponse {
  message?: string;
  order_id?: string;
  /** Always `partner_verifying` on success. */
  status?: string;
  /** The partner it went back to, by email. */
  partner?: string;
}

/** Success body of the reject-intent endpoint. */
export interface RejectIntentResponse {
  message: string;
  order_id: string;
  status: string;
}

/**
 * Query params for the intents list (search + status are omitted when empty).
 *
 * **No `isExpress`.** The endpoint rejects `?is_express=true` with a 400 —
 * express orders never reach this screen, so the filter could only ever match
 * nothing — and `false` is an inert no-op. Neither is worth a parameter that
 * could be set by mistake.
 *
 * **No date window either.** The orders screen filters on
 * `payment_completed_at`, which by definition has not happened yet for an
 * intent, so the same parameter name would mean two different things.
 */
export interface GetIntentsParams {
  page?: number;
  /** Clamped server-side to 50, silently — read `results.length`, not this. */
  limit?: number;
  /** Order number, or the sailor's first/last name or email. */
  search?: string;
  /**
   * A raw status (`intent_received`), or one of the derived keys the endpoint
   * resolves — `in_verification`, `awaiting_customer`, `ready_to_bill`,
   * `cancelled`. Omit for the default open funnel. An unknown value is a 400
   * that lists the valid set.
   */
  status?: string;
  /** `true` = marine emergency, `false` = regular. `false` is a real filter
   *  that must survive the usual `|| undefined` idiom. */
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
  isEmergency?: boolean;
}

/** Transformed list result the page consumes: total count + UI rows. */
export interface IntentListResult {
  count: number;
  intents: IntentData[];
}

/**
 * The buckets `status_counts` carries on `GET /superadmin/orders/intents/stats/`.
 *
 * These are the endpoint's own tokens, not order statuses. `new` and `sourcing`
 * are the two halves of `intent_received` (unclaimed / claimed) and
 * `verification` covers the two verification statuses. Same-named tokens on the
 * orders and express payloads count something else entirely — `new` is
 * `order_confirmed` there — so never read one screen's figure for another's.
 *
 * `pending` was removed on 2026-08-19 along with the `pending_intent` filter:
 * the status has no writer and no live rows.
 */
export type IntentStatusKey =
  | "new"
  | "sourcing"
  | "verification"
  | "substitution_needed"
  /** Sub-buckets *inside* `substitution_needed`, not peers of it:
   *  `awaiting_customer + ready_to_bill == substitution_needed`. */
  | "awaiting_customer"
  | "ready_to_bill"
  | "awaiting_payment"
  /** Terminal, and outside `total` — these left the funnel. */
  | "rejected"
  | "cancelled";

/** Order-type chips. A clean partition since 2026-08-17: `regular + emergency == all`. */
export type IntentTypeKey = "all" | "emergency" | "regular";

/**
 * Intent statistics from `GET /superadmin/orders/intents/stats/`, in the
 * response's own shape: `total`, a `status_counts` map, and `type_counts`.
 *
 * Not flattened onto invented names like `total_intents` / `new_intents`. The
 * card *labels* are contextual ("Total Intents"), but the property read stays
 * `total`, so a reader can put this type beside the API response and see one
 * structure rather than two vocabularies to reconcile.
 *
 * Every field is optional: a partial payload degrades to a dash-or-zero per
 * card rather than blanking the deck.
 */
export interface IntentStats extends TypedStats<IntentStatusKey, IntentTypeKey> {
  /**
   * Throughput, not a funnel state: intents that *left* this screen today by
   * being paid. It belongs to no total, which is why it sits outside
   * `status_counts` on the wire and outside the card deck on screen.
   */
  confirmed_today?: number;
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
/** The sailor's verdict on a released suggestion. */
export type SuggestionDecision = "pending" | "accepted" | "rejected";

/**
 * One replacement the desk has staged or released (API 9).
 *
 * **`decision` and `released` answer different questions** and neither may be
 * inferred from the other: `released` is whether the *admin* sent it, `decision`
 * is what the *sailor* said about it. Reading one where the other belongs is
 * how a rejected suggestion came to render as "Released" in green.
 */
export interface StagedSuggestion {
  /** Integer id on the wire, kept as a string for React keys. */
  suggestionId: string;
  /** Joins to `items[]` / the verification lines for the ORIGINAL product name. */
  orderItemId: string;
  /** The SUGGESTED product. The original is not on this row. */
  suggestedName: string;
  suggestedSku: string;
  quantity: number;
  unitPrice: string;
  /** The sailor's verdict; `"pending"` until they answer. */
  decision: SuggestionDecision;
  /** Whether the admin has sent it to the sailor. */
  released: boolean;
  /**
   * True while a catalog pick still needs a partner to confirm it is physically
   * available. Releasing the order 409s until every such line is confirmed, so
   * this is what to surface *before* the admin tries.
   */
  needsPartnerConfirmation: boolean;
  /** When a partner confirmed it; "" while outstanding. */
  partnerConfirmedAt: string;
  /** `admin` picked it from the catalog, or `delivery_partner` proposed it. */
  suggestedByRole: string;
  /** The partner's photo of what they are holding; "" for a catalog pick. */
  imageUrl: string;
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
