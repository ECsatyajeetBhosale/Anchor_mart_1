import { ASSIGNMENT_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  ApiUnassignedOrder,
  ApiUnassignedOrdersResponse,
  AssignOrderPayload,
  AssignablePartner,
  OrderTimeline,
  OrderTimelineStep,
  UnassignedOrder,
} from "../types/assignment.types";

/** Safe property read off an unknown value. */
function getProp(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}
/** Returns the value when it's an array, otherwise null. */
function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}
/** First present key off an object, coerced to a trimmed string; else "". */
function pick(obj: unknown, ...keys: string[]): string {
  for (const k of keys) {
    const v = getProp(obj, k);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

/** Format the API's decimal string amount as `$1000.00`, falling back to "-". */
function formatAmount(amount: string): string {
  const value = Number(amount);
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : "-";
}

/**
 * Map an unassigned-order API row onto the flat shape the
 * `UnassignedOrdersCard` renders. Keeps the UI untouched — only the data
 * source changes. The API has no priority field, so rows default to "Normal".
 */
function mapUnassignedOrder(o: ApiUnassignedOrder): UnassignedOrder {
  return {
    id: o.order_number || o.id,
    orderId: o.id,
    sailor: o.customer_name || "-",
    items: o.status_display || "-",
    port: formatAmount(o.total_amount),
    priority: "Normal",
  };
}

export const assignmentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Orders awaiting partner assignment. Returns the mapped UI rows directly.
    getUnassignedOrders: builder.query<UnassignedOrder[], void>({
      query: () => ({ url: ASSIGNMENT_ENDPOINTS.GET_UNASSIGNED_ORDERS, method: "GET" }),
      transformResponse: (res: ApiUnassignedOrdersResponse) =>
        (res?.results ?? []).map(mapUnassignedOrder),
      providesTags: [{ type: "Assignments", id: "UNASSIGNED-LIST" }],
    }),

    // Flow 28 API 11 — assignable partners. Passing `orderId` scopes the list to
    // the order's port and the capability its phase needs; omitting it returns
    // ALL available partners, capability-unfiltered. Callers currently omit it,
    // because the scoped list is empty until partner port/capability data is
    // complete — the assign write enforces the rule regardless.
    getAssignablePartners: builder.query<AssignablePartner[], { orderId?: string }>({
      query: (arg) => ({
        url: ASSIGNMENT_ENDPOINTS.ASSIGNABLE_PARTNERS,
        method: "GET",
        params: { order_id: arg?.orderId || undefined, page_size: 100 },
      }),
      transformResponse: (res: unknown): AssignablePartner[] => {
        const results = getProp(res, "results");
        const rows =
          asArray(getProp(results, "data")) ??
          asArray(results) ??
          asArray(getProp(res, "data")) ??
          asArray(res) ??
          [];
        return rows.map((r) => ({
          // assign-order keys on the user id, like every other partner endpoint.
          deliveryPartnerId: pick(r, "user_id", "delivery_partner_id", "id"),
          code: pick(r, "partner_id", "code"),
          name: pick(r, "name", "full_name", "email") || "-",
          port: pick(r, "port", "assigned_port"),
          isAvailable: getProp(r, "is_available") !== false,
        }));
      },
      providesTags: (_r, _e, arg) => [
        { type: "Assignments", id: `ASSIGNABLE-${arg?.orderId ?? "ALL"}` },
      ],
    }),

    /**
     * Flow 28 API 16 — the milestone ladder for one order. Replaces guessing a
     * position from the current status: these steps carry real timestamps and
     * `is_done` flags. Field names are read defensively because the response
     * shape isn't pinned by an example in the collection.
     */
    getOrderTimeline: builder.query<OrderTimeline, string>({
      query: (orderId) => ({
        url: ASSIGNMENT_ENDPOINTS.ORDER_TIMELINE,
        method: "GET",
        params: { order_id: orderId },
      }),
      transformResponse: (res: unknown): OrderTimeline => {
        const body = getProp(res, "data") ?? res;
        // `steps` is the documented key; fall back to the raw history dump.
        const rows = asArray(getProp(body, "steps")) ?? asArray(getProp(body, "history")) ?? [];
        const steps = rows.map((raw, idx): OrderTimelineStep => {
          const at = pick(raw, "at", "timestamp", "changed_at", "created_at");
          const done = getProp(raw, "is_done") ?? getProp(raw, "done") ?? getProp(raw, "completed");
          return {
            key: pick(raw, "key", "code", "status") || `step-${idx}`,
            label: pick(raw, "label", "title", "status_display", "status") || "—",
            at: at || null,
            // A missing flag means "done if it has a timestamp" — history rows
            // are records of things that already happened.
            is_done: typeof done === "boolean" ? done : !!at,
            detail: pick(raw, "detail", "note", "description") || null,
          };
        });
        return { steps, terminalState: pick(body, "terminal_state", "terminalState") };
      },
      providesTags: (_r, _e, orderId) => [{ type: "Assignments", id: `TIMELINE-${orderId}` }],
    }),

    // Flow 28 API 12 — assign (or reassign) an order to a delivery partner.
    assignOrder: builder.mutation<unknown, AssignOrderPayload>({
      query: (body) => ({
        url: ASSIGNMENT_ENDPOINTS.ASSIGN_ORDER,
        method: "POST",
        body,
      }),
      // Refresh the unassigned list AND the intent queue/stats — an intent-stage
      // assignment moves the order to `partner_verifying`.
      invalidatesTags: (_r, _e, { order_id }) => [
        { type: "Assignments", id: "UNASSIGNED-LIST" },
        { type: "Assignments", id: `TIMELINE-${order_id}` },
        { type: "Intents", id: order_id },
        { type: "Intents", id: "PARTIAL-LIST" },
        { type: "Intents", id: "STATS" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetUnassignedOrdersQuery,
  useGetAssignablePartnersQuery,
  useGetOrderTimelineQuery,
  useAssignOrderMutation,
} = assignmentApi;
