import type { BadgeProps } from "@/components/ui/badge";

/** Badge colour variant used for a special-request status pill. */
export type SpecialRequestBadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * The five statuses in the Flow 13 state machine
 * (`pending → sourcing_confirmed ⇄ quote_sent → accepted / rejected`).
 *
 * This is also the exact set the list API's `?status` accepts — anything else
 * is a 400 (*"Invalid status. Must be one of […]"*), so the page validates the
 * URL param against `SPECIAL_REQUEST_STATUS_KEYS` before querying.
 */
export type SpecialRequestStatus =
  | "pending"
  | "sourcing_confirmed"
  | "quote_sent"
  | "accepted"
  | "rejected";

/** The accepted `?status` values, in canonical lifecycle order. */
export const SPECIAL_REQUEST_STATUS_KEYS: SpecialRequestStatus[] = [
  "pending",
  "sourcing_confirmed",
  "quote_sent",
  "accepted",
  "rejected",
];

/**
 * UI row model consumed by the special-requests table. Built from a
 * `SpecialRequestApi` row by the API transform; display strings are already
 * "-"-guarded so columns render the raw value directly.
 */
export interface SpecialRequest {
  /** Unique request id (UUID) — passed to the detail API as `product_id`. */
  id: string;
  /** Request reference, e.g. "SR202607140003". */
  r: string;
  /** Sailor identity — the API sends an email here, not a display name. */
  n: string;
  /** Sailor phone (nullable on the API — renders "-" when absent). */
  ph: string;
  /** Requested product name. */
  prod: string;
  /** Preferred brand. */
  brand: string;
  /** Requested quantity (number, or "-" when absent). */
  qty: number | string;
  /** Request date label (pre-formatted by the API, e.g. "July 14, 2026, 09:41 AM"). */
  dt: string;
  /** Status label (`status_display`) shown in the badge. */
  st: string;
  /** Raw status token (used internally for filtering / badge colour). */
  status: string;
  /** Badge variant for the status. */
  sc: SpecialRequestBadgeVariant;
  /**
   * The sailor has asked for different delivery details and is waiting on a
   * re-quote. A subset of `sourcing_confirmed`, and the row-level counterpart of
   * the `awaiting_rebill` stat — without it the card names a worklist the table
   * cannot identify.
   */
  rebillRequested: boolean;
}

/**
 * Raw special-request row from
 * `GET /superadmin/special-requests/get-all-special-requests/` (`results.data[]`).
 * Fields are optional/nullable so a partial payload degrades gracefully to "-".
 */
export interface SpecialRequestApi {
  id: string;
  reference?: string | null;
  /** Sailor's email — the list endpoint sends no first/last name. */
  sailor?: string | null;
  /** Nullable on the API; currently unpopulated on every row. */
  phone?: string | null;
  product_name?: string | null;
  brand?: string | null;
  primary_image?: string | null;
  quantity?: number | null;
  max_budget?: string | null;
  currency?: string | null;
  status?: string | null;
  status_display?: string | null;
  is_fastest_delivery?: boolean | null;
  quoted_price?: string | null;
  fast_delivery_charge?: string | null;
  /** A delivery change is staged and awaiting the admin's re-quote. */
  rebill_requested?: boolean | null;
  /** Pre-formatted timestamp, e.g. "July 14, 2026, 09:41 AM". */
  created_at?: string | null;
  updated_at?: string | null;
}

/** Query params for the special-requests list (search + status omitted when empty). */
export interface GetSpecialRequestsParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Must be one of `SPECIAL_REQUEST_STATUS_KEYS`; omit for "all". */
  status?: string;
}

/**
 * Query params for the stats endpoint.
 *
 * **`search` only.** The endpoint deliberately ignores `?status`, exactly like
 * the order and intent dashboards: the five counts *are* the status breakdown,
 * so applying the table's status filter would zero four cards and leave the
 * fifth restating the row count. Filtering to *Pending* and reading
 * `total 12 · pending 2` above 2 rows is the contract working.
 */
export interface GetSpecialRequestStatsParams {
  search?: string;
}

/** Transformed list result the page consumes: total count + UI rows. */
export interface SpecialRequestListResult {
  count: number;
  requests: SpecialRequest[];
}

/**
 * Special-request statistics returned by
 * `GET /superadmin/special-requests/special-request-stats/` — a flat count per
 * status. Every field is optional so a partial/empty payload degrades to 0.
 */
export interface SpecialRequestStats {
  total_requests?: number;
  pending?: number;
  sourcing_confirmed?: number;
  quote_sent?: number;
  accepted?: number;
  rejected?: number;
  /**
   * Requests whose sailor has asked for delivery changes and is waiting on a
   * re-quote — the "needs an admin right now" figure.
   *
   * **Cross-cutting, never an addend.** These sit inside `sourcing_confirmed`,
   * so it is rendered as a sub-line of that card rather than a seventh one;
   * adding it to the total would count the same requests twice.
   */
  awaiting_rebill?: number;
}

/**
 * Body for `POST …/<id>/generate-bill/` (Flow 13 API 10). Decimals go over the
 * wire as strings, matching the collection's example payload.
 */
export interface GenerateBillPayload {
  product_name: string;
  /**
   * The admin's own description of what they sourced. Writes
   * `quote_description`, a field of its own — the deprecated `description` alias
   * used to write onto the **sailor's** text, so quoting overwrote the request
   * it was answering. Omitting the key leaves the previous quote unchanged,
   * which is what a re-quote wants.
   */
  quote_description?: string;
  quoted_price: string;
  fast_delivery_charge: string;
  admin_response: string;
  /**
   * Override only — **omitted unless the admin actually changes it**. The detail
   * now returns `category`, so the form can tell "already filed" from "needs
   * one"; it used to send this on every quote because it could not, which meant
   * a re-quote could silently re-file the request.
   */
  category_id?: string;
}

/** Body for `POST …/<id>/reject/` (Flow 13 API 11) — the reason is required. */
export interface RejectSpecialRequestPayload {
  admin_response: string;
}

/** Body for `POST …/<id>/allow-changes/` (Flow 13 API 12) — `additional` is 1–10. */
export interface AllowChangesPayload {
  additional: number;
}

/** A named place on the detail — `port` and `anchorage` share this shape. */
export interface SpecialRequestPlace {
  id?: string | null;
  name?: string | null;
  code?: string | null;
}

/** The catalog category the request is filed under. `scope` is always general here. */
export interface SpecialRequestCategory {
  id?: string | null;
  name?: string | null;
  scope?: string | null;
}

/**
 * The order this request became. `null` until the sailor pays — the request's
 * own `reference` (`SR…`) is not an order number.
 */
export interface SpecialRequestOrderRef {
  id?: string | null;
  order_number?: string | null;
  status?: string | null;
  payment_status?: string | null;
}

/** Delivery address — the same object that becomes the order's address at pay time. */
export interface SpecialRequestAddress {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  vessel_name?: string | null;
  imo_number?: string | null;
  deck?: string | null;
  cabin_number?: string | null;
  section?: string | null;
  delivery_instructions?: string | null;
  port_name?: string | null;
  anchorage_name?: string | null;
  anchorage_code?: string | null;
}

/**
 * The delivery change the sailor has staged and is waiting on a re-quote for.
 *
 * **Only the keys they actually changed appear**, and it is `null` whenever
 * `rebill_requested` is false. The detail's own top-level fields still hold the
 * *current* values — generate-bill folds these in as it re-quotes — so the two
 * together are a before/after diff, which is how the drawer renders them.
 */
export interface PendingDeliveryChanges {
  shipping_address?: SpecialRequestAddress | null;
  port?: SpecialRequestPlace | null;
  anchorage?: SpecialRequestPlace | null;
  ship_arrival_date?: string | null;
  expected_departure?: string | null;
}

/** Nested sailor object on a special-request detail. */
export interface SpecialRequestUser {
  id?: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
  date_of_birth?: string | null;
}

/**
 * Full special-request detail returned by
 * `GET /superadmin/special-requests/get-special-requests/?product_id=<id>`.
 * Fields are optional/nullable so a partial payload degrades gracefully to "-".
 */
export interface SpecialRequestDetail {
  id: string;
  reference?: string | null;
  user?: SpecialRequestUser | null;
  /** Which client the sailor submitted from (`app` / `web`). */
  platform?: string | null;
  product_name?: string | null;
  brand?: string | null;
  /**
   * **The sailor's own words**, and no admin action ever writes it. Before the
   * 2026-08-14 split, generate-bill wrote its quote text here — so on requests
   * quoted before that date this may hold either party's text, with nothing on
   * the row to say which. No backfill was run precisely because the two are
   * indistinguishable; see `quote_description`.
   */
  description?: string | null;
  /** Also the sailor's, submitted alongside `description`. */
  notes?: string | null;
  /**
   * **The admin's** description of what they sourced, written at generate-bill.
   * `""` on every request quoted before 2026-08-14 — render the quote box only
   * when this is non-empty rather than falling back to `description`, which
   * would attribute the sailor's words to the admin.
   */
  quote_description?: string | null;
  category?: SpecialRequestCategory | null;
  quantity?: number | null;
  max_budget?: string | null;
  currency?: string | null;
  /** Raw status token (e.g. "accepted") — used internally for the badge colour. */
  status?: string | null;
  /** Human-readable status label (e.g. "Accepted") — shown in the UI. */
  status_display?: string | null;
  admin_response?: string | null;
  /** Free-text note the sailor added to the request. */
  customer_note?: string | null;
  /** Whether the sailor opted into the fastest-delivery upsell. */
  is_fastest_delivery?: boolean | null;
  /** Admin-set quote for the item (string decimal), or null before quoting. */
  quoted_price?: string | null;
  /** Charge applied for fast delivery (string decimal), or null. */
  fast_delivery_charge?: string | null;
  /** Requested ship arrival, ISO-8601 (e.g. "2026-07-28T00:00:00Z"). */
  ship_arrival_date?: string | null;
  /** Sailor's expected departure, ISO-8601; frequently null. */
  expected_departure?: string | null;
  /** Where the goods are going — the same object the order inherits at pay time. */
  shipping_address?: SpecialRequestAddress | null;
  port?: SpecialRequestPlace | null;
  anchorage?: SpecialRequestPlace | null;
  /** The order this became; `null` until the sailor pays. */
  order?: SpecialRequestOrderRef | null;
  /** Whether a rebill (delivery-change) was requested for this item. */
  rebill_requested?: boolean | null;
  /** Rebill attempts used / allowed (cap defaults to 2, raised via allow-changes). */
  rebill_count?: number | null;
  rebill_cap?: number | null;
  /** What the sailor staged; `null` when `rebill_requested` is false. */
  pending_delivery_changes?: PendingDeliveryChanges | null;
  /** Primary image URL (first of `images`). */
  primary_image?: string | null;
  /**
   * Legacy flat list — **both uploaders mixed together**, so it cannot say who
   * attached what. Kept only for compatibility; prefer the split pair below.
   */
  images?: string[] | null;
  /** `[]` when empty here, unlike the customer detail's `null`. */
  images_by_customer?: string[] | null;
  images_by_admin?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}
