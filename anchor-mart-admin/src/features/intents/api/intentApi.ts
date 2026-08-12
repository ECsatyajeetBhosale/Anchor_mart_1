import type { AssignedAdmin } from "@/features/orders";
import { INTENT_ENDPOINTS, ORDER_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import { ORDER_STATUS_BY_KEY } from "@/lib/orderStatuses";
import type {
  AvailabilityState,
  GetIntentStatsParams,
  GetIntentsParams,
  IntentApi,
  IntentApiItem,
  IntentBadgeVariant,
  IntentData,
  IntentDetail,
  IntentDetailItem,
  IntentItem,
  IntentListResult,
  IntentStats,
  ItemAvailability,
  RejectIntentPayload,
  RejectIntentResponse,
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

/**
 * Maps a raw API status token to its badge colour variant, sourced from the
 * canonical status reference (`src/lib/orderStatuses.ts`) so the table badges,
 * the status legend, and every other surface stay in sync.
 */
function statusVariant(status: string): IntentBadgeVariant {
  return (ORDER_STATUS_BY_KEY[status]?.variant as IntentBadgeVariant) ?? "neutral";
}

/** Title-cases a raw status token as a fallback label (e.g. "in_sourcing" → "In Sourcing"). */
function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Formats an ISO date consistently with the rest of the app; blanks → "—". */
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

/** Maps a raw API item into the drawer item model, including Flow 06 signals. */
function mapItem(item: IntentApiItem, index: number): IntentItem {
  const name =
    str(item.product_name) || str(item.name) || str(item.title) || str(item.item_name) || "Item";
  const qty = num(item.quantity ?? item.qty ?? item.requested_qty) || 1;
  const availableQty = typeof item.available_qty === "number" ? item.available_qty : null;
  // Derive the shortfall when the backend doesn't send it explicitly.
  const shortfall =
    typeof item.shortfall === "number"
      ? item.shortfall
      : availableQty !== null
        ? Math.max(0, qty - availableQty)
        : 0;
  return {
    id: str(item.id) || str(item.order_item_id) || `${name}-${index}`,
    orderItemId: str(item.order_item_id) || str(item.id),
    name,
    qty,
    available: typeof item.is_available === "boolean" ? item.is_available : null,
    availableQty,
    shortfall,
    needsSuggestion: item.needs_suggestion === true || item.is_available === false || shortfall > 0,
    reason: str(item.reason) || str(item.note),
  };
}

/** Maps a raw API intent row into the UI row model used by the table + drawer. */
export function toIntentData(intent: IntentApi): IntentData {
  const sa = intent.shipping_address ?? {};
  const reqItems = (intent.items ?? []).map(mapItem);
  const itemCount = num(intent.item_count) || reqItems.length;

  const names = reqItems.map((i) => i.name).filter(Boolean);
  const it = names.length
    ? `${names.join(", ")}${itemCount ? ` (${itemCount})` : ""}`
    : itemCount
      ? `${itemCount} item${itemCount === 1 ? "" : "s"}`
      : "—";

  const status = str(intent.status);
  const vessel = str(sa.vessel_name);
  const imo = str(sa.imo_number) || str(sa.imo);

  return {
    id: str(intent.id),
    r: str(intent.order_number) || str(intent.id),
    s: str(intent.sailor_name) || str(intent.sailor_email) || "—",
    email: str(intent.sailor_email),
    it,
    itemCount,
    reqItems,
    sh: vessel || imo || "—",
    vessel,
    port: str(intent.port) || str(sa.port_name),
    ar: formatDate(intent.ship_arrival_date),
    sy: formatDate(intent.expected_departure),
    // created_at is already a display-formatted string from the backend;
    // fall back to formatting the ISO intent_received_at when it's absent.
    sb: str(intent.created_at) || formatDate(intent.intent_received_at),
    st: str(intent.status_display) || titleCase(status) || "—",
    status,
    sc: statusVariant(status),
    imo,
    terminal:
      str(intent.anchorage) ||
      str(sa.anchorage_name) ||
      str(intent.port) ||
      str(sa.port_name) ||
      "—",
    contact: str(sa.phone) || str(sa.contact),
    total: str(intent.total_amount),
    assignedAdmin: mapAssignedAdmin(intent.assigned_admin),
    portId: str(intent.port_id) || str(sa.port_id),
    substitutionNeeded:
      intent.substitution_needed === true || reqItems.some((i) => i.needsSuggestion),
    isExpress: intent.is_express === true,
    isEmergency: intent.is_emergency === true,
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
          is_express: boolParam(params.isExpress),
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
          is_express: boolParam(params.isExpress),
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

        // Indicative order value before a bill exists.
        //
        // `create_order` writes `subtotal = 0` and `total_amount = 0`; the real
        // figures are only computed by `sync_order_subtotal` when the admin
        // creates the bill. So a pre-bill order shows priced line items above a
        // $0.00 breakdown — every row honest, the screen self-contradictory.
        //
        // Mirrors the backend's `compute_subtotal`: Σ (available qty × unit
        // price), capped at the requested quantity. **Accepted substitutions
        // are not included** — they live in a separate collection — so this is
        // an estimate of the original basket, not a prediction of the bill.
        const estimatedSubtotal = items.reduce((sum, item) => {
          const unit = Number.parseFloat(item.unitPrice);
          if (!Number.isFinite(unit)) return sum;
          // Unverified lines count at their ordered quantity; verified ones at
          // what the partner actually found. An unavailable line contributes
          // nothing, since `available_qty` is what can be supplied.
          const billableQty = item.availability
            ? Math.min(item.availability.available_qty, item.qty)
            : item.qty;
          return sum + unit * billableQty;
        }, 0);

        const statusRaw = str(o.status);
        const needsSub = o.substitution_needed === true || items.some((i) => i.needsSuggestion);

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
          // Pricing
          estimatedSubtotal: estimatedSubtotal > 0 ? estimatedSubtotal.toFixed(2) : "",
          subtotal: str(o.subtotal),
          shippingFee: str(o.shipping_fee),
          tax: str(o.tax_amount),
          discount: str(o.discount_amount),
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
  useGetIntentDetailQuery,
} = intentApi;
