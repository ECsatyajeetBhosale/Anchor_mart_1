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
  }),
  overrideExisting: false,
});

export const { useGetOrdersQuery } = ordersApi;
