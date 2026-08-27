/**
 * Settings types — Help & FAQ management.
 *
 * User provisioning used to live here too; it moved to the account-management
 * feature (`types/user.types.ts`) when provisioning joined the deletion queue.
 *
 * Both FAQ endpoints return a plain DRF page (`results` is a flat array), not
 * the wrapped `results: { message, data }` envelope the catalog endpoints use.
 * Ids are integers here rather than UUIDs.
 */

export interface Faq {
  id: number;
  /** Type **name**, not its id — that is also what create/update expect back. */
  faq_type: string;
  question: string;
  answer: string;
  is_active: boolean;
  /** Pre-formatted timestamp, e.g. "June 22, 2026, 07:30 AM". */
  created_at: string;
  updated_at: string;
}

export interface FaqType {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

/** Plain DRF page — `results` is the array itself. */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type FaqListResponse = PaginatedResponse<Faq>;
export type FaqTypeListResponse = PaginatedResponse<FaqType>;

/** Request body for POST /superadmin/faq/create/. */
export interface AddFaqPayload {
  faq_type: string;
  question: string;
  answer: string;
}

/** Request body for PATCH /superadmin/faq/update/{id}/. */
export type UpdateFaqPayload = AddFaqPayload;

/** Request body for the FAQ-type add/update endpoints. */
export interface FaqTypePayload {
  name: string;
}

/* ── Order configuration ───────────────────────────────── */

/**
 * The order timing rules — `GET /superadmin/order-config/`.
 *
 * These six values used to live in the server's environment and needed a deploy
 * to change. There is exactly **one** record and it always exists, so this is a
 * settings form and not a list: nothing to create, nothing to select between,
 * nothing to delete.
 *
 * Every value is a whole number of hours. Fractional hours are not supported and
 * are rejected with a 400.
 */
export interface OrderConfig {
  id: string;
  /**
   * How long before the ship arrives cancellation closes.
   *
   * ⚠️ **Counted backwards from the ship's arrival**, not forwards from when the
   * order was placed. `36` means cancellation stays open until 36 hours before
   * arrival and then closes — it does *not* mean the sailor has 36 hours to
   * cancel. Read forwards, this gets set wrong, and it is the value that decides
   * who gets a refund.
   *
   * Range 0–720. Changing it takes effect **immediately on orders already
   * placed**, including paid ones.
   */
  cancel_lead_hours: number;
  /** Delivery deadline for express orders. Range 1–168. */
  sla_express_hours: number;
  /** Delivery deadline where the sailor chose fastest delivery. Range 1–168. */
  sla_fastest_hours: number;
  /** Delivery deadline for marine-emergency orders. Range 1–168. */
  sla_emergency_hours: number;
  /**
   * Fallback delivery time for an anchorage that has none of its own. Range
   * 0–168. Anchorages carrying their own value are unaffected.
   */
  default_anchorage_hours: number;
  /**
   * Width of the delivery estimate range a sailor sees ("8–14h") — the gap
   * between the two ends, not either end. Range 0–168.
   */
  eta_range_buffer_hours: number;
  /**
   * How long before the ship sails delivery must be complete. Default 6.
   *
   * ⚠️ **The highest-impact field on the page.** It is not a safety margin on
   * top of something else — for a regular order it *is* the entire deadline
   * (`departure − this`), and regular orders are the majority. It also caps the
   * three SLAs below: a 24h promise means nothing on a vessel sailing in ten
   * hours, so whichever is tighter wins.
   *
   * Raising it pulls every regular delivery in the system earlier; lowering it
   * pushes them later. Changes apply to orders already placed.
   */
  departure_safety_buffer_hours: number;
  /**
   * How long before the ship arrives adding items closes. Default 36.
   *
   * ⚠️ Shares its default with {@link cancel_lead_hours} and **nothing else** —
   * they were one field by accident and are now separate settings. Changing this
   * does not change when cancellation closes. Counted backwards from arrival,
   * like the cancellation window.
   */
  add_items_lead_hours: number;
  /**
   * How many times an unpaid order may be amended. Default 1. A count, not hours.
   */
  max_unpaid_order_amendments: number;
  /** Preformatted for display, e.g. "26 Aug 2026, 04:12 PM". Render as-is. */
  updated_at: string;
}

/** The editable fields, by name. `id` and `updated_at` are not editable. */
export type OrderConfigField =
  | "cancel_lead_hours"
  | "sla_express_hours"
  | "sla_fastest_hours"
  | "sla_emergency_hours"
  | "default_anchorage_hours"
  | "eta_range_buffer_hours"
  | "departure_safety_buffer_hours"
  | "add_items_lead_hours"
  | "max_unpaid_order_amendments";

/**
 * Body for `PATCH /superadmin/order-config/update/`.
 *
 * **Partial, and deliberately sent as a diff.** Omitted fields are left
 * untouched. Sending the whole form works, but the backend records which fields
 * moved and who moved them, so a full-form write logs one real change buried in
 * five no-ops — the diff is what keeps the audit trail worth reading.
 *
 * Values must be JSON **numbers**. A number input yields a string, and `"8"` is
 * a 400, not a coercion.
 */
export type UpdateOrderConfigPayload = Partial<Record<OrderConfigField, number>>;
