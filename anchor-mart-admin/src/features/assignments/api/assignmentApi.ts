import { ASSIGNMENT_ENDPOINTS, PARTNER_ENDPOINTS } from "@/lib/apiEndpoints";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { baseApi } from "@/lib/fetchUtils";
import type { PartnerCapability } from "@/lib/partnerCapability";
import { isTimelineState } from "@/lib/timeline";
import type {
  ApiUnassignedOrder,
  ApiUnassignedOrdersResponse,
  AssignOrderPayload,
  AssignOrderResponse,
  AssignablePartner,
  Assignment,
  OrderAssignmentHistory,
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

/**
 * Map an active-assignment API row onto the flat shape the assignments table
 * renders. The response shape isn't pinned by an example in the collection, so
 * every field is read through `pick` across the plausible key spellings and
 * degrades to "-" rather than rendering `undefined`.
 */
function mapActiveAssignment(raw: unknown, index: number): Assignment {
  const orderId = pick(raw, "order_id", "order", "id");
  const orderNumber = pick(raw, "order_number", "order_no") || orderId;
  return {
    id: pick(raw, "id", "assignment_id") || orderId || `assignment-${index}`,
    orderId,
    enquiry: pick(raw, "enquiry", "enquiry_number", "order_number") || "-",
    partner: pick(raw, "partner_name", "partner", "delivery_partner_name") || "-",
    order: orderNumber || "-",
    shop: pick(raw, "shop", "shop_name", "port", "assigned_port") || "-",
    deliverTo: pick(raw, "deliver_to", "vessel", "ship_name", "customer_name") || "-",
    status: pick(raw, "status_display", "status") || "-",
    // The assignment's own status, kept separate from the order status above:
    // `assignment_status` is what distinguishes a verify job (`verifying` →
    // `verified`) from a delivery, and reading `status` for it would conflate
    // the two whenever the row carries both keys.
    assignmentStatus: pick(raw, "assignment_status"),
    // `deliver_by` is the SLA deadline — the closest thing to an ETA the API has.
    eta: pick(raw, "eta", "deliver_by", "expected_at") || "-",
  };
}

/**
 * Rows → `AssignablePartner[]`. Shared by both partner queries: `partner/list/`
 * and `assignable-partners/` render through the same `AdminPartnerSerializer`,
 * so one mapper serves both and they cannot drift apart.
 */
function toPartnerRows(res: unknown): AssignablePartner[] {
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
    email: pick(r, "email"),
    port: pick(r, "port", "assigned_port"),
    isAvailable: getProp(r, "is_available") !== false,
    // Absent means "Both" — the documented default for a payload predating
    // 2026-08-03. Reading a missing flag as `false` would show every
    // pre-existing partner as incapable of the work they already do.
    canVerify: getProp(r, "can_verify") !== false,
    canDeliver: getProp(r, "can_deliver") !== false,
  }));
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

    /**
     * Flow 28 API 14 — orders that currently hold a live partner assignment.
     * Handles both a plain array and the DRF `{ results }` / `{ results: { data } }`
     * envelopes, since the collection carries no sample response.
     */
    getActiveAssignments: builder.query<Assignment[], void>({
      query: () => ({
        url: ASSIGNMENT_ENDPOINTS.GET_ACTIVE_ASSIGNMENTS,
        method: "GET",
        // One full page. This used to ask for 100, which DRF quietly served as
        // 50 — the board then rendered that as if it were every active
        // assignment. It still shows only the first page; past 50 the rest are
        // not fetched, but the number asked for is now the number that can
        // arrive. `search`/`order_status` are supported server-side and unused.
        params: { page_size: API_MAX_PAGE_SIZE },
      }),
      transformResponse: (res: unknown): Assignment[] => {
        const results = getProp(res, "results");
        const rows =
          asArray(getProp(results, "data")) ??
          asArray(results) ??
          asArray(getProp(res, "data")) ??
          asArray(res) ??
          [];
        return rows.map(mapActiveAssignment);
      },
      providesTags: [{ type: "Assignments", id: "ACTIVE-LIST" }],
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
        // 100 was capped to 50 server-side; ask for what can actually arrive.
        params: { order_id: arg?.orderId || undefined, page_size: API_MAX_PAGE_SIZE },
      }),
      transformResponse: toPartnerRows,
      providesTags: (_r, _e, arg) => [
        { type: "Assignments", id: `ASSIGNABLE-${arg?.orderId ?? "ALL"}` },
      ],
    }),

    /**
     * Partners who hold a given capability — the picker source for every assign
     * surface.
     *
     * Uses `partner/list/`, whose `?can_verify=` / `?can_deliver=` filters exist
     * for exactly this ("the filter an admin needs *before* assigning:
     * `assign-order` refuses a partner who lacks the capability for that job, so
     * without it the list offers people the next screen will reject"). They are
     * independent booleans that AND together, and blank means *no filter* — so
     * `can_verify=true` is everyone who can verify, both-capable partners
     * included, which is what a verification picker wants.
     *
     * **Why not `assignable-partners/?order_id=`,** which derives the same
     * capability from the order's status: it *also* scopes to the order's port,
     * and partner port data is incomplete (most have no `assigned_port`, and
     * none is assigned to the ports orders are raised against), so that list
     * comes back empty. This endpoint gives the capability rule without the port
     * rule. Switch back when partner ports are populated — the port scope is a
     * real requirement, not one to design away.
     *
     * Availability is matched to `assignable-partners`' own base filter:
     * `is_active=true` server-side, then unavailable partners dropped here —
     * `partner/list/` has no `is_available` parameter of its own, and
     * `?status=available` would additionally exclude on-duty partners, which
     * would be a behaviour change rather than a like-for-like swap.
     *
     * Still a UX gate. `AdminAssignOrderSerializer` validates the capability on
     * the write and the `DeliveryAssignment` guard raises 403 behind it.
     */
    getPartnersByCapability: builder.query<AssignablePartner[], { capability: PartnerCapability }>({
      query: ({ capability }) => ({
        url: PARTNER_ENDPOINTS.GET_LIST,
        method: "GET",
        params: {
          is_active: "true",
          // Strictly parsed server-side — `?can_verify=maybe` is a 400, so only
          // ever send the literal "true".
          ...(capability === "verify" ? { can_verify: "true" } : { can_deliver: "true" }),
          page_size: API_MAX_PAGE_SIZE,
        },
      }),
      transformResponse: (res: unknown): AssignablePartner[] =>
        toPartnerRows(res).filter((p) => p.isAvailable),
      providesTags: (_r, _e, arg) => [{ type: "Assignments", id: `CAPABLE-${arg.capability}` }],
    }),

    /**
     * Flow 28 API 16 — the milestone ladder for one order. Replaces guessing a
     * position from the current status: these steps carry real timestamps and
     * the backend's own per-step verdict.
     *
     * That verdict arrives as `status` (`done` / `active` / `pending`) — see
     * `build_delivery_steps` in `orders/timeline.py`. It is passed through
     * untouched. This transform previously read `is_done`, which **this
     * endpoint never sends** (that field belongs to the dashboard's ladder), so
     * the `!!at` fallback silently took over and mis-stated the stage; see
     * `lib/timeline.ts` for the full account.
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
          // Guarded: the `history` fallback rows carry a `status` too, but
          // theirs is an order status, not a ladder verdict.
          const rawState = pick(raw, "status", "state");
          const state = isTimelineState(rawState) ? rawState : null;
          const done = getProp(raw, "is_done") ?? getProp(raw, "done") ?? getProp(raw, "completed");
          return {
            // `status` is this endpoint's completion verdict, not an identifier,
            // so it must NOT be used as the key — a raw history row keys off
            // its status instead, hence the ordering here.
            key: pick(raw, "key", "code") || pick(raw, "status") || `step-${idx}`,
            label: pick(raw, "label", "title", "status_display") || "—",
            at: at || null,
            status: state,
            // Kept as a mirror for any consumer still reading the flag. A
            // missing verdict means "done if it has a timestamp" — raw history
            // rows are records of things that already happened.
            is_done: state ? state === "done" : typeof done === "boolean" ? done : !!at,
            detail: pick(raw, "detail", "note", "description") || null,
          };
        });
        return { steps, terminalState: pick(body, "terminal_state", "terminalState") };
      },
      providesTags: (_r, _e, orderId) => [{ type: "Assignments", id: `TIMELINE-${orderId}` }],
    }),

    /**
     * Flow 28 API 13 — every assignment ever made on one order, newest first.
     * Closed rows (`reassigned`, `rejected`) are included, which is the point:
     * the active assignment alone doesn't explain how the order got here.
     */
    getOrderAssignments: builder.query<OrderAssignmentHistory[], string>({
      query: (orderId) => ({
        url: ASSIGNMENT_ENDPOINTS.ORDER_ASSIGNMENTS,
        method: "GET",
        params: { order_id: orderId },
      }),
      transformResponse: (res: unknown): OrderAssignmentHistory[] => {
        const results = getProp(res, "results");
        const rows =
          asArray(getProp(results, "data")) ??
          asArray(results) ??
          asArray(getProp(res, "data")) ??
          asArray(res) ??
          [];
        return rows.map((r, idx) => ({
          id: pick(r, "id") || `assignment-${idx}`,
          partnerName: pick(r, "partner_name", "partner", "name") || "-",
          partnerCode: pick(r, "partner_code", "code"),
          // Several shapes tried because this is not documented on the row; a
          // miss leaves it empty and the "message a previous partner" option
          // simply does not appear, rather than offering a call that would 400.
          partnerUserId:
            pick(r, "partner_user_id", "user_id") || pick(getProp(r, "partner"), "user_id", "id"),
          status: pick(r, "status"),
          statusDisplay: pick(r, "status_display", "status"),
          assignedBy: pick(r, "assigned_by_email", "assigned_by"),
          assignedAt: pick(r, "assigned_at", "created_at"),
          deliverBy: pick(r, "deliver_by"),
          isActive: getProp(r, "is_active") === true,
        }));
      },
      providesTags: (_r, _e, orderId) => [{ type: "Assignments", id: `HISTORY-${orderId}` }],
    }),

    // Flow 28 API 12 — assign (or reassign) an order to a delivery partner.
    assignOrder: builder.mutation<AssignOrderResponse, AssignOrderPayload>({
      query: (body) => ({
        url: ASSIGNMENT_ENDPOINTS.ASSIGN_ORDER,
        method: "POST",
        body,
      }),
      // Refresh the unassigned list AND the intent queue/stats — an intent-stage
      // assignment moves the order to `partner_verifying`. The express orders
      // list shows a partner column off the same orders, so it is invalidated
      // here rather than each caller refetching by hand.
      invalidatesTags: (_r, _e, { order_id }) => [
        // The orders list row and the detail drawer are the surfaces that name
        // the partner and carry the `needs_verifier_partner` /
        // `needs_delivery_partner` chip, and both read the Orders cache — which
        // this mutation used not to touch, so a real assignment left the row
        // showing the previous partner and its "Needs delivery partner" badge
        // until someone refreshed by hand. The stats deck moves too: assignment
        // transitions the order (order_confirmed → partner_assigned).
        { type: "Orders", id: order_id },
        { type: "Orders", id: "PARTIAL-LIST" },
        { type: "Orders", id: "STATS" },
        { type: "Assignments", id: "UNASSIGNED-LIST" },
        { type: "Assignments", id: "ACTIVE-LIST" },
        { type: "Assignments", id: `TIMELINE-${order_id}` },
        { type: "Assignments", id: `HISTORY-${order_id}` },
        { type: "Intents", id: order_id },
        { type: "Intents", id: "PARTIAL-LIST" },
        { type: "Intents", id: "STATS" },
        { type: "ExpressItems", id: order_id },
        { type: "ExpressItems", id: "PARTIAL-LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetUnassignedOrdersQuery,
  useGetActiveAssignmentsQuery,
  useGetAssignablePartnersQuery,
  useGetPartnersByCapabilityQuery,
  useGetOrderTimelineQuery,
  useGetOrderAssignmentsQuery,
  useAssignOrderMutation,
} = assignmentApi;
