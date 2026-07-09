import { EXPRESS_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type { ExpressOrderListResponse } from "../types/expressItem.types";

// Query parameters for fetching express orders.
export interface GetExpressItemsParams {
  page?: number;
  limit?: number;
  // Free-text search term, sent to the backend as `?search=...`.
  search?: string;
  // Order status filter, sent as `?status=<value>`. Omit for "all".
  status?: string;
}

export const expressApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExpressItems: builder.query<ExpressOrderListResponse, GetExpressItemsParams>({
      query: (params) => ({
        url: EXPRESS_ENDPOINTS.GET_EXPRESS_ITEMS,
        method: "GET",
        // DRF pagination uses `page_size` (not `limit`); empty params are omitted.
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
              ...result.results.map(({ id }) => ({ type: "ExpressItems" as const, id })),
              { type: "ExpressItems", id: "PARTIAL-LIST" },
            ]
          : [{ type: "ExpressItems", id: "PARTIAL-LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetExpressItemsQuery } = expressApi;
