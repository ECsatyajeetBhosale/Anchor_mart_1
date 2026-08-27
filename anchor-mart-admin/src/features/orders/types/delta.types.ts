/**
 * Flow 11 (Ship Location Change & Delta Surcharge) and Flow 12 (Cancellation &
 * Refund) — the admin-side money and location types.
 *
 * The admin order detail (`GET /superadmin/orders/orders/<id>/`) embeds both
 * `deltas[]` and `location_reports[]`, so the drawer renders the whole history
 * without calling the queue endpoints per order.
 */

/** Port summary carried on a location report. */
export interface LocationReportPort {
  id: string;
  name: string;
  code?: string;
}

/** Anchorage summary carried on a location report. */
export interface LocationReportAnchorage {
  id: string;
  name: string;
}

/**
 * `rebill` — filed at `payment_pending`; the admin applies it and re-prices via
 * update-bill. `delta` — filed once paid and in delivery; the admin prices it
 * into a `DeltaPayment`.
 */
export type LocationReportKind = "delta" | "rebill";

/**
 * `pending` is the only open state; the rest are resolved.
 *
 * `accepted` (2026-08-27) is **not** a synonym for `dismissed`, and mapping both
 * to "closed" is the specific mistake this split exists to end:
 *
 *  - `accepted`  — the move was applied, nothing was charged
 *  - `priced`    — the move was applied, a surcharge was raised
 *  - `dismissed` — the move was **rejected**; the order is still on the old berth
 *
 * Two of the three relocate the order and one does not, so they must never read
 * the same. Render {@link LocationReport.status_display} rather than switching on
 * this — the server writes the wording for exactly this reason.
 */
export type LocationReportStatus = "pending" | "priced" | "accepted" | "dismissed";

/** A sailor-reported move awaiting admin review (Flow 11 §2). */
export interface LocationReport {
  id: string;
  order?: string;
  order_number?: string;
  sailor_name?: string;
  kind: LocationReportKind;
  status: LocationReportStatus;
  port?: LocationReportPort | null;
  anchorage?: LocationReportAnchorage | null;
  shipping_address?: Record<string, unknown> | null;
  expected_arrival?: string | null;
  expected_departure?: string | null;
  is_fastest_delivery?: boolean;
  /**
   * Server-written wording for {@link status}, e.g. "Accepted (no charge)".
   * Preferred over switching on the raw status — it is on the payload precisely
   * so `accepted` and `dismissed` cannot be collapsed into one label by a client.
   */
  status_display?: string;
  /**
   * The **sailor's** own words on why the ship moved (≤255). This is the context
   * the charge-or-waive decision rests on, so it is shown next to the location
   * rather than tucked into a detail row.
   */
  note?: string;
  /**
   * The **admin's** explanation, required on both accept and raise-delta. It is
   * the difference between "you were charged $50" and "you were charged $50
   * because…", and it has to stay answerable months later.
   */
  review_reason?: string;
  dismiss_reason?: string;
  reviewed_at?: string | null;
  created_at?: string;
}

/** The new berth snapshotted onto a priced delta. */
export interface DeltaNewLocation {
  port_id?: string;
  port_name?: string;
  port_code?: string;
  anchorage_id?: string;
  anchorage_name?: string;
  expected_arrival?: string | null;
  expected_departure?: string | null;
  shipping_address?: Record<string, unknown> | null;
}

/**
 * `pending` → `initiated` → `completed` / `expired` / `withdrawn`.
 * **Open** = `pending | initiated` — that set is what holds final delivery.
 */
export type DeltaStatus = "pending" | "initiated" | "completed" | "expired" | "withdrawn";

/** A priced delivery surcharge (Flow 11 §3). Money fields are decimal strings. */
export interface DeltaPayment {
  id: string;
  order?: string;
  status: DeltaStatus;
  /** Baseline: base shipping + every COMPLETED delta (decision #3). */
  original_shipping?: string;
  /** `original_shipping + delta_amount`. */
  new_shipping?: string;
  /** The surcharge itself, not a new total. */
  delta_amount?: string;
  applied_coupon?: string | null;
  coupon_discount?: string;
  /** `delta_amount − coupon_discount`; what the sailor actually pays. */
  final_delta_amount?: string;
  new_location?: DeltaNewLocation | null;
  note?: string;
  due_at?: string | null;
  paid_at?: string | null;
  transaction_id?: string | null;
  created_at?: string;
}

/** Statuses that still hold delivery — the order can't be handed over. */
export const OPEN_DELTA_STATUSES = new Set<DeltaStatus>(["pending", "initiated"]);

/* ------------------------------------------------------------------ */
/* Flow 12 — refunds                                                   */
/* ------------------------------------------------------------------ */

/** One settled delta that a full refund would also return. */
export interface DeltaRefundLine {
  delta_id: string;
  amount: string;
}

/**
 * Flow 12 §3 — a pure preview of what §4 would refund. `allowed` is whether the
 * refund would proceed **as-is**; when false, `reason` says why and the amounts
 * still show what *would* be returned.
 */
export interface RefundQuote {
  allowed: boolean;
  reason?: string;
  /** e.g. "before pickup — full refund"; "" when denied. */
  policy?: string;
  initial_refund?: string;
  delta_refunds?: DeltaRefundLine[];
  total_refund?: string;
}

/**
 * Flow 12 §4. Omit `amount` for a full refund; include it for a partial one
 * (`partially_delivered` orders only), which also requires an idempotency key.
 */
export interface RefundOrderPayload {
  orderId: string;
  reason: string;
  /** Forces a full refund past the auto-approval window. */
  override?: boolean;
  /** Decimal string > 0 and ≤ the remaining refundable amount. */
  amount?: string;
  /**
   * Required for a partial refund. Same key + same body replays the stored
   * result; same key + a different body is a 409; a new key issues a further
   * refund. Generated per submission by the caller.
   */
  idempotencyKey?: string;
}

/** Success body of a refund — fields vary by mode (full vs partial). */
export interface RefundOrderResponse {
  message?: string;
  order_id?: string;
  status?: string;
  /** Full refund. */
  total_refund?: string;
  policy?: string;
  /** Partial refund. */
  refunded?: string;
  total_refunded_on_payment?: string;
}

/* ------------------------------------------------------------------ */
/* Request bodies — Flow 11 admin writes                               */
/* ------------------------------------------------------------------ */

/** Flow 11 §3 — price the pending `delta` report. */
export interface RaiseDeltaPayload {
  orderId: string;
  /** Decimal string > 0 (min 0.01). The surcharge, not a new total. */
  delta_amount: string;
  /** Required; shown to the customer and recorded on the order history. */
  note: string;
}

/**
 * §4.2 — accept a report without charging. The reason is **required** and a lone
 * space is rejected server-side, so it is validated as non-blank before sending.
 */
export interface AcceptLocationReportPayload {
  orderId: string;
  reportId: string;
  /** Required, non-blank, ≤255. */
  reason: string;
}

/**
 * What `accept`, `raise-delta` and `apply` all return alongside their own body.
 *
 * `partner_reallocation_suggested: true` means **the berth changed and a partner
 * is already out on this job**. Reassignment always worked; nothing ever said it
 * was needed, which is how a partner ends up delivering to a berth the ship has
 * left. It is deliberately surfaced as an inline prompt rather than a toast —
 * a toast is gone before it is read.
 */
export interface LocationActionResult {
  partner_reallocation_suggested?: boolean;
}

/** Flow 11 §4 — **reject** a report of either kind. The order does not move. */
export interface DismissLocationReportPayload {
  orderId: string;
  reportId: string;
  /** Optional, ≤255 chars. */
  reason?: string;
}

/** A report row plus the reallocation hint the write returns with it. */
export type LocationReportResult = LocationReport & LocationActionResult;

/** A priced delta plus the reallocation hint the write returns with it. */
export type DeltaPaymentResult = DeltaPayment & LocationActionResult;

/** Flow 11 §5 — apply a `rebill` report. No body. */
export interface ApplyLocationReportPayload {
  orderId: string;
  reportId: string;
}

/** Flow 11 §13 — withdraw an open delta. */
export interface WithdrawDeltaPayload {
  orderId: string;
  deltaId: string;
  /** Optional, ≤255 chars. */
  reason?: string;
}
