import { ORDER_ENDPOINTS } from "@/lib/apiEndpoints";
import { asArray, asNumber, asString, getProp, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import type { TypedStats } from "@/lib/stats";
import type {
  AdminCart,
  AdminCartListResult,
  Order,
  OrderListResponse,
} from "../types/order.types";

/**
 * Query parameters for the admin orders list (Flow 11 §17). Every filter is
 * applied server-side — the screen must never narrow a page client-side, since
 * that silently lies about the rows on other pages.
 */
export interface GetOrdersParams {
  page?: number;
  limit?: number;
  // Free-text search term, sent to the backend as `?search=...`.
  search?: string;
  /** Raw post-payment status key (e.g. "delivered"). Omit for "all". */
  status?: string;
  /** Inclusive `YYYY-MM-DD` bounds on the order date. */
  dateFrom?: string;
  dateTo?: string;
  /** Filter to one delivery partner's orders. */
  partnerId?: string;
  /**
   * Order-type filters. Independent booleans that AND together, and **not**
   * mutually exclusive — an order may be both express and emergency (9 are, in
   * the current dataset), so these are queries rather than slices of a
   * partition. "Regular" is expressed as `false` on both, not as a value of its
   * own. `undefined` means no filter; `false` is a real filter and must survive
   * the usual `|| undefined` idiom.
   */
  isExpress?: boolean;
  isEmergency?: boolean;
}

/**
 * Scope filters for the stats cards. Deliberately excludes `status`: that picks
 * one bucket, and the cards exist to break the population down *by* bucket, so
 * the endpoint ignores it by design.
 */
export interface GetOrderStatsParams {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  partnerId?: string;
  isExpress?: boolean;
  isEmergency?: boolean;
}

/** `?flag=` for a tri-state boolean: true / false / absent. */
function boolParam(value: boolean | undefined): string | undefined {
  return value === undefined ? undefined : String(value);
}

/**
 * The buckets `status_counts` carries on `GET /superadmin/orders/orders/stats/`.
 *
 * The endpoint's own tokens, and its own populations: `new` is `order_confirmed`
 * (paid, not yet assigned) and `in_progress` covers assigned → collected → at
 * port → at berth → partially delivered. The intents payload also has a `new`
 * and it counts something else entirely — the two are never compared.
 *
 * `refunded` is the terminal status, not "has a refund against it": a partially
 * refunded order keeps its delivery status and counts under `delivered`.
 */
export type OrderStatusKey =
  | "new"
  | "in_progress"
  | "delivered"
  | "delivery_failed"
  | "cancelled"
  | "refunded";

/** Order-type chips — a clean partition: `regular + emergency == all`. */
export type OrderTypeKey = "all" | "emergency" | "regular";

/**
 * Order statistics from `GET /superadmin/orders/orders/stats/`, in the
 * response's own shape: `total`, `status_counts`, `type_counts`.
 *
 * Typed field by field rather than through an index signature. The previous
 * `[key: string]: number | …` accepted any name at all, which is precisely how
 * the cards went on compiling — and rendering zeros — while reading field names
 * the endpoint had stopped sending.
 *
 * `total` is the backend's aggregate and is never recomputed from the buckets.
 *
 * `type_counts` is computed over a population the type filter has **not**
 * touched, so selecting Emergency does not zero the other options; the other
 * scope filters (search, date, partner) still apply.
 */
export type OrderStats = TypedStats<OrderStatusKey, OrderTypeKey>;

/**
 * Body of `POST /superadmin/orders/order/<id>/cancel/` (Flow 12 §2).
 * `reason` is **required** — a missing or blank one is a 400. It is stored
 * truncated to 50 characters.
 */
export interface CancelOrderPayload {
  orderId: string;
  reason: string;
}

/** Success body of the cancel endpoint (Flow 12 §2). */
export interface CancelOrderResponse {
  message?: string;
  order_id?: string;
  status?: string;
}

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query<OrderListResponse, GetOrdersParams>({
      query: (params) => ({
        url: ORDER_ENDPOINTS.GET_ORDERS,
        method: "GET",
        // DRF pagination uses `page_size` (not `limit`); `search`/`status` are
        // omitted when empty so the backend returns the unfiltered list.
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          status: params.status || undefined,
          date_from: params.dateFrom || undefined,
          date_to: params.dateTo || undefined,
          partner_id: params.partnerId || undefined,
          is_express: boolParam(params.isExpress),
          is_emergency: boolParam(params.isEmergency),
        },
      }),
      providesTags: (result) =>
        result?.results
          ? [
              ...result.results.map(({ id }) => ({ type: "Orders" as const, id })),
              { type: "Orders", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Orders", id: "PARTIAL-LIST" }],
    }),

    /**
     * Flow 11 §14 — the full admin order record.
     *
     * The list serializer is a summary: it carries `item_count` but no `items`,
     * and rarely the `assigned_admin` the ownership gate needs. The detail read
     * returns the whole order, and **embeds `deltas[]` and `location_reports[]`**
     * so the delta/location history renders without extra calls.
     */
    getOrderDetail: builder.query<Order, string>({
      query: (orderId) => ({ url: ORDER_ENDPOINTS.ORDER_DETAIL(orderId), method: "GET" }),
      // Flat or `{ data }`-wrapped, depending on the endpoint.
      transformResponse: (res: unknown): Order => {
        if (res && typeof res === "object" && "data" in res) {
          return (res as { data: Order }).data;
        }
        return res as Order;
      },
      providesTags: (_result, _error, orderId) => [{ type: "Orders", id: orderId }],
    }),

    /**
     * Flow 10 API 10 — the picking-slip PDF for any order.
     *
     * Streams a binary attachment, so the response is read as a **blob**: the
     * default JSON handler would throw on it. Generated per request, so it is
     * never cached — hence `keepUnusedDataFor: 0` and a lazy trigger rather
     * than a subscription.
     *
     * ⚠️ **`Accept` must not name the PDF type.** DRF runs content negotiation
     * before the view, against its *registered renderers* — which are JSON (and
     * the browsable API), never `application/pdf`. Asking for
     * `Accept: application/pdf` therefore fails negotiation outright and
     * returns **406 "Could not satisfy the request Accept header."** without the
     * view ever running. A wildcard Accept matches the first renderer,
     * negotiation passes, and the view's own `FileResponse` streams the PDF
     * with its own Content-Type — the renderer is bypassed entirely.
     *
     * `prepareHeaders` only defaults `Accept` when it is absent, so setting it
     * here is what keeps `application/json` off this request.
     */
    getOrderSlip: builder.query<Blob, string>({
      query: (orderId) => ({
        url: ORDER_ENDPOINTS.ORDER_SLIP(orderId),
        method: "GET",
        headers: { Accept: "*/*" },
        /**
         * The handler runs for failures too, and a failed slip request returns
         * a JSON error body rather than a PDF. Blob-ing that would park a
         * non-serializable value in `error.data` (Redux warns) and hide the
         * server's message from `getApiMessage`, so errors are read as text and
         * parsed back into a plain object. Only a successful response is a blob.
         */
        responseHandler: async (response) => {
          if (!response.ok) {
            const text = await response.text();
            try {
              return JSON.parse(text);
            } catch {
              return { detail: text };
            }
          }
          return response.blob();
        },
      }),
      /**
       * Second line of defence. `responseHandler` above already keeps blobs out
       * of the error path, but this runs on whatever actually reaches the store
       * — so a Blob can never be persisted even if the handler is changed or a
       * transport quirk routes around it. Redux's serializable check flags any
       * that slip through, and the value would also hide the server's message.
       */
      transformErrorResponse: async (error: unknown) => {
        const data = (error as { data?: unknown })?.data;
        if (!(data instanceof Blob)) return error;
        const text = await data.text();
        try {
          return { ...(error as object), data: JSON.parse(text) };
        } catch {
          return { ...(error as object), data: { detail: text } };
        }
      },
      keepUnusedDataFor: 0,
    }),

    /** Flow 11 §16 — post-payment KPI counters. Takes no query params. */
    /**
     * Card counters. Takes the screen's scope filters — the endpoint honours
     * `date_from` / `date_to` / `partner_id` / `is_express` / `is_emergency` /
     * `search`, and used to be called with none of them, so a filtered table sat
     * under totals for the whole population.
     */
    getOrderStats: builder.query<OrderStats, GetOrderStatsParams>({
      query: (params) => ({
        url: ORDER_ENDPOINTS.GET_ORDER_STATS,
        method: "GET",
        params: {
          search: params.search || undefined,
          date_from: params.dateFrom || undefined,
          date_to: params.dateTo || undefined,
          partner_id: params.partnerId || undefined,
          is_express: boolParam(params.isExpress),
          is_emergency: boolParam(params.isEmergency),
        },
      }),
      // Some stats endpoints on this backend wrap in `{ data }`; unwrap if so.
      transformResponse: (res: unknown): OrderStats => {
        if (res && typeof res === "object" && "data" in res) {
          return ((res as { data?: OrderStats }).data ?? {}) as OrderStats;
        }
        return (res ?? {}) as OrderStats;
      },
      providesTags: [{ type: "Orders", id: "STATS" }],
    }),

    /**
     * Flow 12 §2 — cancel a **pre-payment** order (the sailor ghosted). A paid
     * order is never cancelled here; it is refunded instead (Flow 12 §4).
     *
     * `reason` is required. Gated by Flow 27 ownership: 409 unclaimed, 403
     * another admin's order, and 409 again when the order is already paid
     * ("use the refund flow"). Surface all of them via `getApiMessage`.
     *
     * Moves the order to CANCELLED, so both the orders and intents lists are
     * invalidated to refresh status everywhere.
     */
    cancelOrder: builder.mutation<CancelOrderResponse, CancelOrderPayload>({
      query: ({ orderId, reason }) => ({
        url: ORDER_ENDPOINTS.CANCEL_ORDER(orderId),
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: "Orders", id: orderId },
        { type: "Orders", id: "PARTIAL-LIST" },
        { type: "Orders", id: "STATS" },
        { type: "Intents", id: orderId },
        { type: "Intents", id: "PARTIAL-LIST" },
      ],
    }),
    /**
     * Sailor carts still awaiting checkout.
     *
     * Undocumented by the flow set, but the live response is a **bare array** of
     * `{ id, user, user_email, items[] }`, where each item carries `quantity`
     * and a nested `variant_details`. It sends no `count`/`next` and ignores
     * pagination params, so the whole list arrives at once and the card pages
     * through it locally.
     *
     * Nothing here is aggregated server-side — no name, no total, no cart
     * timestamp — so the row-level figures below are derived from `items`.
     */
    getCarts: builder.query<AdminCartListResult, void>({
      query: () => ({ url: ORDER_ENDPOINTS.GET_CARTS, method: "GET" }),
      transformResponse: (res: unknown): AdminCartListResult => {
        const { count, items: rows } = unwrapList(res);

        const carts: AdminCart[] = rows.map((row, index) => {
          const items = asArray(getProp(row, "items")) ?? [];

          let unitCount = 0;
          let total = 0;
          let blockedCount = 0;
          const skus: string[] = [];
          // A cart with no lines shouldn't claim to be express.
          let expressLines = 0;

          for (const item of items) {
            const quantity = asNumber(getProp(item, "quantity"));
            const variant = getProp(item, "variant_details");

            unitCount += quantity;
            // `price` is a decimal string ("30.00"), read live off the variant.
            total += quantity * asNumber(getProp(variant, "price"));

            const sku = asString(getProp(variant, "sku"));
            if (sku) skus.push(sku);

            if (getProp(variant, "is_express") === true) expressLines += 1;

            // `is_sourceable` is the effective product-AND-variant badge; a dead
            // or unsourceable line is what makes checkout 400.
            const orderable =
              getProp(variant, "is_active") !== false &&
              getProp(variant, "is_sourceable") !== false;
            if (!orderable) blockedCount += 1;
          }

          return {
            id: asString(getProp(row, "id")) || `cart-${index}`,
            email: asString(getProp(row, "user_email")),
            userId: asString(getProp(row, "user")),
            unitCount,
            total: `$${total.toFixed(2)}`,
            skus,
            blockedCount,
            isExpress: items.length > 0 && expressLines === items.length,
          };
        });

        return { count, carts };
      },
      providesTags: [{ type: "Orders", id: "CARTS" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetOrdersQuery,
  useGetOrderDetailQuery,
  useGetOrderStatsQuery,
  useGetCartsQuery,
  useLazyGetOrderSlipQuery,
  useCancelOrderMutation,
} = ordersApi;
