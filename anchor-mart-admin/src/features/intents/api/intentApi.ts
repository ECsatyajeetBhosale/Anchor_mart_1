import type { AssignedAdmin } from "@/features/orders";
import { INTENT_ENDPOINTS, ORDER_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  GetIntentsParams,
  IntentApi,
  IntentApiItem,
  IntentBadgeVariant,
  IntentData,
  IntentItem,
  IntentListResult,
  IntentStats,
  RejectIntentPayload,
  RejectIntentResponse,
} from "../types/intent.types";

/** Coerces an unknown to a trimmed string; non-strings/numbers → "". */
function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
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

/** Maps a raw API status token to its badge colour variant. */
const STATUS_VARIANT: Record<string, IntentBadgeVariant> = {
  intent_received: "info",
  intent_rejected: "danger",
  partner_verifying: "info",
  payment_pending: "warning",
  pending_customer_response: "warning",
  pending_intent: "neutral",
  sourcing: "teal",
  verification_submitted: "teal",
};

function statusVariant(status: string): IntentBadgeVariant {
  return STATUS_VARIANT[status] ?? "neutral";
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
    sy: str(intent.expected_stay) || "—",
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

    getIntentStats: builder.query<IntentStats, void>({
      // Stats is a plain GET — no query params are sent with it.
      query: () => ({ url: INTENT_ENDPOINTS.GET_STATS, method: "GET" }),
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
  }),
  overrideExisting: false,
});

export const { useGetIntentsQuery, useGetIntentStatsQuery, useRejectIntentMutation } = intentApi;
