import { ORDER_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type { OrderListResponse } from "../types/order.types";

// Query parameters for fetching orders (mirrors the products/express query).
export interface GetOrdersParams {
  page?: number;
  limit?: number;
  // Free-text search term, sent to the backend as `?search=...`.
  search?: string;
  // Raw backend status code (e.g. "delivered", "in_progress"). Omit for "all".
  status?: string;
}

/**
 * Success body of the cancel endpoint. The exact shape is documented in Flow 12
 * (not this doc), so only `message` is relied on — surfaced via `getApiMessage`.
 */
export interface CancelOrderResponse {
  message?: string;
  order_id?: string;
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
     * Cancel a pre-payment order (Flow 27 gate-enforced; full contract in
     * Flow 12). `POST /superadmin/orders/order/<id>/cancel/`, no body.
     *
     * Runs through the Flow 27 ownership gate — a 409 means the order is
     * unclaimed (claim it first) or another admin owns it; surface it via
     * `getApiMessage`. Moves the order to CANCELLED, so both the orders and
     * intents lists are invalidated to refresh status everywhere.
     */
    cancelOrder: builder.mutation<CancelOrderResponse, string>({
      query: (orderId) => ({
        url: ORDER_ENDPOINTS.CANCEL_ORDER(orderId),
        method: "POST",
      }),
      invalidatesTags: (_result, _error, orderId) => [
        { type: "Orders", id: orderId },
        { type: "Orders", id: "PARTIAL-LIST" },
        { type: "Intents", id: orderId },
        { type: "Intents", id: "PARTIAL-LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const { useGetOrdersQuery, useCancelOrderMutation } = ordersApi;
