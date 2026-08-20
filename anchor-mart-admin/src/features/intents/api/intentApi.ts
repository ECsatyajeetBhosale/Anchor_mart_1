import type { AssignedAdmin } from "@/features/orders";
import { INTENT_ENDPOINTS, ORDER_ENDPOINTS } from "@/lib/apiEndpoints";
import { dateTimeText, shortDate } from "@/lib/dates";
import { baseApi } from "@/lib/fetchUtils";
import { readPartnerNeed } from "@/lib/partnerRequirement";
import { terminalReason } from "@/lib/terminalReason";
import { situationVariant } from "../lib/intentSituation";
import type {
  AvailabilityState,
  GetIntentStatsParams,
  GetIntentsParams,
  IntentApi,
  IntentApiItem,
  IntentData,
  IntentDetail,
  IntentDetailItem,
  IntentItem,
  IntentListResult,
  IntentLocationChange,
  IntentShippingAddress,
  IntentStats,
  ItemAvailability,
  RejectIntentPayload,
  RejectIntentResponse,
  RequestReverificationPayload,
  RequestReverificationResponse,
} from "../types/intent.types";

/** Coerces an unknown to a trimmed string; non-strings/numbers → "". */
function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

/** `?flag=` for a tri-state boolean: true / false / absent. */
function boolParam(value: boolean | undefined): string | undefined {
  return value === undefined ? undefined : String(value);
}

/** Coerces an unknown to a number; non-numbers → 0. */
function num(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

/** Safe property read off an unknown value. */
function getProp(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

/** Returns the value when it's an array, otherwise null. */
function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

/** Unwraps a `{ data }` envelope used by some stats responses. */
function unwrap<T>(res: unknown): T {
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

/** Title-cases a raw status token as a fallback label (e.g. "in_sourcing" → "In Sourcing"). */
function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Formats an ISO date for the **detail** read only.
 *
 * The list and the detail are two different contracts: since 2026-08-19 the
 * four admin *lists* send display strings (`lib/dates.ts` reads those), while
 * `GET orders/{id}/` still sends ISO. Keeping one formatter per contract is
 * what stops a change on either side from quietly corrupting the other.
 */
function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Maps the owner descriptor, tolerating a partial payload. `name` falls back to
 * the email, mirroring the backend's own `_assigned_admin_brief` behaviour.
 * Returns null unless there is at least an id or an email to identify them by.
 */
function mapAssignedAdmin(value: unknown): AssignedAdmin | null {
  if (!value || typeof value !== "object") return null;
  const id = str(getProp(value, "id"));
  const email = str(getProp(value, "email"));
  if (!id && !email) return null;
  return { id, email, name: str(getProp(value, "name")) || email };
}

/** Reads the per-item availability object, or null when unverified. */
function mapAvailability(value: unknown): ItemAvailability | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.is_available !== "boolean") return null;
  return {
    is_available: v.is_available,
    available_qty: num(v.available_qty),
    // NOT `items[].quantity`: an unpaid order can change its quantity after
    // verification, so the two legitimately differ. Comparing against the
    // current quantity would report a shortfall nobody measured.
    requested_qty: num(v.requested_qty),
    note: str(v.note),
    reported_at: str(v.reported_at) || null,
  };
}

/**
 * The four presentation states, exactly as the backend defines them:
 *
 *   null                                       → unverified
 *   is_available && available >= requested     → available
 *   is_available && available <  requested     → short  (by requested - available)
 *   !is_available                              → unavailable
 */
function availabilityState(a: ItemAvailability | null): {
  state: AvailabilityState;
  shortBy: number;
} {
  if (!a) return { state: "unverified", shortBy: 0 };
  if (!a.is_available) return { state: "unavailable", shortBy: 0 };
  const shortBy = a.requested_qty - a.available_qty;
  return shortBy > 0 ? { state: "short", shortBy } : { state: "available", shortBy: 0 };
}

/**
 * Maps a raw API item into the row/drawer item model, including Flow 06 signals.
 *
 * The availability fields only carry meaning at `verification_submitted`; at
 * every other status they arrive null/zero and this produces an unverified
 * line, which is what the row should show.
 */
function mapItem(item: IntentApiItem, index: number): IntentItem {
  const name = str(item.product_name) || "Item";
  const qty = num(item.quantity) || 1;
  const availableQty = typeof item.available_qty === "number" ? item.available_qty : null;
  /**
   * Has this line actually been verified?
   *
   * The list serializer emits placeholders outside `verification_submitted`, and
   * they are **not consistent with each other**: `available_qty` and
   * `is_available` come back `null` (honestly unknown) while `shortfall` is
   * hardcoded `0` (a definite claim that nothing is short). `is_available` is
   * the trustworthy one, so it decides whether the other two mean anything.
   */
  const verified = typeof item.is_available === "boolean";
  /**
   * Derived, or absent — never the backend's placeholder.
   *
   * This used to prefer `item.shortfall` whenever it was a number, which is
   * exactly when the fabricated `0` arrives: the derivation below was skipped
   * precisely in the case it existed to cover, and `needsSuggestion` then
   * computed `false` for a line nobody had looked at. An unverified line now
   * reports `0` because there is no measurement, not because there is no
   * shortfall — and `needsSuggestion` no longer reads it as evidence.
   */
  const shortfall = !verified
    ? 0
    : typeof item.shortfall === "number"
      ? item.shortfall
      : availableQty !== null
        ? Math.max(0, qty - availableQty)
        : 0;
  return {
    id: str(item.id) || `${name}-${index}`,
    // The suggest API's `order_item_id` is this line's own id.
    orderItemId: str(item.id),
    name,
    qty,
    available: typeof item.is_available === "boolean" ? item.is_available : null,
    availableQty,
    shortfall,
    // `shortfall > 0` only counts on a verified line; on an unverified one the
    // figure is not a measurement. The other two clauses are already safe —
    // `=== true` and `=== false` both reject null.
    needsSuggestion:
      item.needs_suggestion === true || item.is_available === false || (verified && shortfall > 0),
    reason: str(item.reason),
  };
}

/**
 * Reads the delivery-move object, or null when there is nothing outstanding.
 *
 * The `state` is validated against the four the API defines rather than cast:
 * every branch of the UI keys off it, and an unrecognised one should render
 * nothing rather than an unlabelled badge.
 */
const LOCATION_CHANGE_STATES = new Set<IntentLocationChange["state"]>([
  "delta_pending",
  "delta_initiated",
  "report_pending",
  "report_dismissed",
]);

function mapLocationChange(value: unknown): IntentLocationChange | null {
  const state = str(getProp(value, "state")) as IntentLocationChange["state"];
  if (!LOCATION_CHANGE_STATES.has(state)) return null;
  return {
    state,
    delta_id: str(getProp(value, "delta_id")) || null,
    report_id: str(getProp(value, "report_id")) || null,
    amount: str(getProp(value, "amount")) || null,
  };
}

/** Maps a raw API intent row into the UI row model used by the table + drawer. */
export function toIntentData(intent: IntentApi): IntentData {
  // Always present per the contract; `?? {}` only guards a truncated payload.
  const sa = intent.shipping_address ?? ({} as IntentShippingAddress);
  const reqItems = (intent.items ?? []).map(mapItem);
  const itemCount = num(intent.item_count) || reqItems.length;

  const names = reqItems.map((i) => i.name).filter(Boolean);
  const it = names.length
    ? `${names.join(", ")}${itemCount ? ` (${itemCount})` : ""}`
    : itemCount
      ? `${itemCount} item${itemCount === 1 ? "" : "s"}`
      : "—";

  const status = str(intent.status);
  const situation = str(intent.situation);
  // Which of the two reason columns applies is decided in one shared place, so
  // this list and the Orders list can't answer the same question differently.
  const reason = terminalReason({
    status,
    rejection_reason: intent.rejection_reason,
    cancellation_reason: intent.cancellation_reason,
    cancelled_at: intent.cancelled_at,
  });

  return {
    id: str(intent.id),
    r: str(intent.order_number) || str(intent.id),
    s: str(intent.customer_name) || str(intent.customer_email) || "—",
    it,
    itemCount,
    reqItems,
    // Vessel, else IMO. `shipping_address` is the only source for either — the
    // row root carries no vessel name and no `imo`.
    sh: str(sa.vessel_name) || str(sa.imo_number) || "—",
    port: str(sa.port_name),
    // Dates arrive display-formatted; `shortDate` reads them, never parses.
    ar: shortDate(intent.ship_arrival_date),
    sy: shortDate(intent.expected_departure),
    // `intent_received_at` is the same instant as `created_at` on a fresh
    // intent, so it stands in only when the record's own timestamp is missing.
    sb: dateTimeText(str(intent.created_at) || str(intent.intent_received_at)),
    // The label of `situation` where the row has one, so a settled basket reads
    // "Ready to Bill" rather than the status it shares with an unanswered one.
    st: str(intent.status_display) || titleCase(status) || "—",
    status,
    situation,
    // Coloured from the SITUATION, falling back to the status. Colouring by
    // status alone would render both halves of a split identically — and
    // `sourcing` exists as a raw status too, so two differently-coloured
    // "Sourcing" badges would sit in one filtered list.
    sc: situationVariant(situation, status),
    total: str(intent.total_amount),
    assignedAdmin: mapAssignedAdmin(intent.assigned_admin),
    substitutionNeeded:
      intent.substitution_needed === true || reqItems.some((i) => i.needsSuggestion),
    isExpress: intent.is_express === true,
    isEmergency: intent.is_emergency === true,
    isFastest: intent.is_fastest_delivery === true,
    locationChange: mapLocationChange(intent.location_change),
    reason: reason.text,
    reasonAt: reason.at,
    // Straight passthrough — the backend owns this answer entirely.
    needsVerifierPartner: readPartnerNeed(intent.needs_verifier_partner),
    needsDeliveryPartner: readPartnerNeed(intent.needs_delivery_partner),
  };
}

/**
 * Extracts the rows + total from the DRF list envelope. This endpoint returns
 * the standard `{ count, next, previous, results: [...] }` shape, but we stay
 * defensive about a few variants seen across this backend.
 */
function extractList(res: unknown): { count: number; rows: IntentApi[] } {
  const results = getProp(res, "results");
  const rows =
    asArray(results) ??
    asArray(getProp(results, "data")) ??
    asArray(getProp(res, "data")) ??
    asArray(res) ??
    [];
  const countRaw = getProp(res, "count") ?? getProp(results, "count");
  const count = typeof countRaw === "number" ? countRaw : rows.length;
  return { count, rows: rows as IntentApi[] };
}

export const intentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getIntents: builder.query<IntentListResult, GetIntentsParams>({
      query: (params) => ({
        url: INTENT_ENDPOINTS.GET_INTENTS,
        method: "GET",
        // DRF pagination uses `page_size`. Search/status are omitted when empty
        // so the URL stays clean and the backend returns the full list.
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          status: params.status || undefined,
          // No `is_express`: the endpoint 400s on `true` (express never reaches
          // this screen) and `false` is inert, so neither is worth sending.
          is_emergency: boolParam(params.isEmergency),
        },
      }),
      transformResponse: (res: unknown): IntentListResult => {
        const { count, rows } = extractList(res);
        return { count, intents: rows.map(toIntentData) };
      },
      providesTags: (result) =>
        result?.intents
          ? [
              ...result.intents.map(({ id }) => ({ type: "Intents" as const, id })),
              { type: "Intents", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Intents", id: "PARTIAL-LIST" }],
    }),

    /**
     * Card counters. Takes the screen's scope filters: the endpoint honours
     * `?search`, `?is_express` and `?is_emergency`, and was previously called
     * with none of them — so filtering the list left every card unchanged.
     */
    getIntentStats: builder.query<IntentStats, GetIntentStatsParams>({
      query: (params) => ({
        url: INTENT_ENDPOINTS.GET_STATS,
        method: "GET",
        params: {
          search: params.search || undefined,
          is_emergency: boolParam(params.isEmergency),
        },
      }),
      transformResponse: (res: unknown): IntentStats => unwrap<IntentStats>(res) ?? {},
      providesTags: [{ type: "Intents", id: "STATS" }],
    }),

    /**
     * Flow 05 API 6 — reject an intent (terminal). `reason` is required; the
     * order must be claimed by the caller (Flow 27 gate returns 409 unclaimed /
     * 403 wrong owner). On success the order moves to `intent_rejected` and the
     * sailor is notified. Invalidates the list + stats so both refresh.
     */
    rejectIntent: builder.mutation<RejectIntentResponse, RejectIntentPayload>({
      query: ({ orderId, reason }) => ({
        url: ORDER_ENDPOINTS.REJECT_INTENT(orderId),
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_res, _err, { orderId }) => [
        { type: "Intents", id: orderId },
        { type: "Intents", id: "PARTIAL-LIST" },
        { type: "Intents", id: "STATS" },
      ],
    }),

    /**
     * §4.3b — send a submitted report back to the partner to re-check.
     *
     * For when the desk does not trust the report: the partner checked the
     * wrong shelf, or stock arrived since. The new report supersedes the old
     * one automatically, so nothing is cleared first. `reason` is required and
     * tells the partner what to look at.
     *
     * Moves the order to `partner_verifying`, so the list, the row and the
     * cards all change — all three are invalidated.
     */
    requestReverification: builder.mutation<
      RequestReverificationResponse,
      RequestReverificationPayload
    >({
      query: ({ orderId, reason }) => ({
        url: ORDER_ENDPOINTS.REQUEST_REVERIFICATION(orderId),
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_res, _err, { orderId }) => [
        { type: "Intents", id: orderId },
        { type: "Intents", id: "PARTIAL-LIST" },
        { type: "Intents", id: "STATS" },
      ],
    }),

    /**
     * Fetch full order detail for the intent review drawer. Uses the shared
     * order detail endpoint (`GET /superadmin/orders/orders/{id}/`) because the
     * intent list only returns summary data. The full payload includes items
     * with pricing, shipping address, payment, assignment, and notes.
     */
    getIntentDetail: builder.query<IntentDetail, string>({
      query: (id) => ({
        url: ORDER_ENDPOINTS.ORDER_DETAIL(id),
        method: "GET",
      }),
      transformResponse: (res: unknown): IntentDetail => {
        // The detail endpoint may wrap in { data } or return flat.
        const o = (getProp(res, "data") ?? res) as Record<string, unknown>;
        const customer = o.customer as Record<string, unknown> | null | undefined;
        const shipping = o.shipping_address as Record<string, unknown> | null | undefined;
        const port = o.port as Record<string, unknown> | null | undefined;
        const anchorage = o.anchorage as Record<string, unknown> | null | undefined;
        const assignment = o.active_assignment as Record<string, unknown> | null | undefined;

        // Availability comes from `items[].availability` and nothing else.
        //
        // The backend resolves it per item, newest line first, because
        // verification is a loop — an item reported missing can later be found.
        // A previous version merged `availability_reports[0].lines[]` instead,
        // which is report-level newest, not item-level: an item re-verified in a
        // later report that did not re-list every line read as unverified.
        // `availability_reports[]` remains in the payload as history and must
        // not be used to derive current state.
        const items: IntentDetailItem[] = (asArray(o.items as unknown) ?? []).map(
          (raw: unknown, idx: number) => {
            const r = raw as Record<string, unknown>;
            const variant = r.variant as Record<string, unknown> | null | undefined;
            const availability = mapAvailability(r.availability);
            const { state, shortBy } = availabilityState(availability);
            return {
              id: str(r.id) || `item-${idx}`,
              orderItemId: str(r.id),
              name: str(r.product_name) || str(variant?.product_name) || "Item",
              sku: str(r.sku) || str(variant?.sku),
              qty: num(r.quantity) || 1,
              unitPrice: str(r.unit_price),
              subtotal: str(r.subtotal),
              availability,
              availabilityState: state,
              shortBy,
              // A line needs a replacement when the partner could not fully
              // supply it — unavailable, or available but short.
              needsSuggestion: state === "unavailable" || state === "short",
            };
          },
        );

        const adminRaw = o.assigned_admin;
        const assignedAdmin = mapAssignedAdmin(adminRaw);

        const statusRaw = str(o.status);
        const needsSub = o.substitution_needed === true || items.some((i) => i.needsSuggestion);
        // A closed intent explains itself in the rail's terminal notice. The
        // failure branch reads the assignment, which is where the partner's
        // words live — the detail payload has no top-level `failure_reason`.
        const closedReason = terminalReason({
          status: statusRaw,
          rejection_reason: str(o.rejection_reason),
          cancellation_reason: str(o.cancellation_reason),
          cancelled_at: str(o.cancelled_at),
          failure_reason: str(assignment?.failure_reason),
          failed_at: str(assignment?.failed_at),
        });

        return {
          id: str(o.id),
          orderNumber: str(o.order_number) || str(o.id),
          status: statusRaw,
          statusDisplay: str(o.status_display) || titleCase(statusRaw),
          // Customer
          sailorName:
            `${str(customer?.first_name)} ${str(customer?.last_name)}`.trim() ||
            str(customer?.full_name) ||
            str(o.customer_name) ||
            str(o.customer_email) ||
            "—",
          sailorEmail: str(customer?.email) || str(o.customer_email) || str(o.user_email),
          // `shipping_address.phone` is the field. Reading `contact` — the shape
          // seeded orders use — meant every app-created order showed "No phone
          // on file" with the number present in the response.
          sailorPhone: str(customer?.whatsapp_number) || str(shipping?.phone),
          // Vessel & shipping
          vesselName: str(shipping?.vessel_name),
          imo: str(shipping?.imo) || str(shipping?.imo_number),
          portName: str(port?.port_name) || str(o.port_name),
          portCode: str(port?.port_code),
          anchorageName:
            str(anchorage?.anchorage_name) || str(o.anchorage_name) || str(port?.port_name) || "—",
          // From the anchorage object — `shipping_address.anchorage_code` is
          // blank on app-created orders.
          anchorageCode: str(anchorage?.anchorage_code),
          shipArrivalDate: formatDate(str(o.ship_arrival_date)),
          expectedDeparture: formatDate(str(o.expected_departure)),
          // Items
          items,
          itemCount: num(o.item_count) || num(o.items_count) || items.length,
          // Pricing. `estimated_subtotal` is the backend's own live figure and
          // is read, never recomputed: it includes accepted substitutes, which
          // live in their own collection and so are missing from any sum over
          // `items[]`. `subtotal` beside it is a stored column and a real
          // "0.00" until create-bill writes it.
          estimatedSubtotal: str(o.estimated_subtotal),
          subtotal: str(o.subtotal),
          shippingFee: str(o.shipping_fee),
          tax: str(o.tax_amount),
          discount: str(o.discount_amount),
          // Both of these used to be dropped, and both are summands of
          // `total_amount`: the breakdown could not add up to its own total.
          // `platform_fee` is one of the three fees the admin types into Create
          // Bill; `loyalty_discount` is the sailor's points, which Flow 08 keeps
          // separate from the coupon `discount_amount`.
          platformFee: str(o.platform_fee),
          loyaltyDiscount: str(o.loyalty_discount),
          loyaltyPoints: num(o.loyalty_points_redeemed),
          total: str(o.total_amount),
          // Payment
          paymentStatus: str(o.payment_status_display) || str(o.payment_status),
          paymentMethod: str(o.payment_method_display) || str(o.payment_method),
          coupon: str(o.applied_coupon),
          // Delivery partner
          partnerName: str(assignment?.partner_name) || str(o.partner_name) || "",
          partnerStatus: str(assignment?.status_display) || str(assignment?.status),
          // Ownership
          assignedAdmin,
          // Metadata
          // The business placement event. `created_at` is the record's technical
          // creation time and is kept separate rather than substituted.
          placedAt: formatDate(str(o.placed_at)),
          createdAt: formatDate(str(o.created_at)),
          notes: str(o.notes),
          isExpress: o.is_express === true,
          isEmergency: o.is_emergency === true,
          portId: str(port?.id) || str(o.port_id),
          substitutionNeeded: needsSub,
          terminalReason: closedReason.text,
          terminalReasonAt: closedReason.at,
          needsVerifierPartner: readPartnerNeed(o.needs_verifier_partner),
          needsDeliveryPartner: readPartnerNeed(o.needs_delivery_partner),
        };
      },
      providesTags: (_r, _e, id) => [{ type: "Intents", id }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetIntentsQuery,
  useGetIntentStatsQuery,
  useRejectIntentMutation,
  useRequestReverificationMutation,
  useGetIntentDetailQuery,
} = intentApi;
