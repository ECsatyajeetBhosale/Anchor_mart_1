import { EXPRESS_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type { ExpressItemListResponse } from "../types/expressItem.types";

// Query parameters for fetching express items (mirrors the products query).
export interface GetExpressItemsParams {
  page?: number;
  limit?: number;
  // Free-text search term, sent to the backend as `?search=...`.
  search?: string;
  // Status filter, sent as `?is_active=True|False`. Omit for "all".
  isActive?: boolean;
}

export const expressApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExpressItems: builder.query<ExpressItemListResponse, GetExpressItemsParams>({
      query: (params) => ({
        url: EXPRESS_ENDPOINTS.GET_EXPRESS_ITEMS,
        method: "GET",
        // DRF pagination uses `page_size` (not `limit`); `search` is omitted when
        // empty; Django expects capitalized booleans for `is_active`.
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          is_active: params.isActive === undefined ? undefined : params.isActive ? "True" : "False",
        },
      }),
      providesTags: (result) =>
        result?.results.data
          ? [
              ...result.results.data.map(({ id }) => ({ type: "ExpressItems" as const, id })),
              { type: "ExpressItems", id: "PARTIAL-LIST" },
            ]
          : [{ type: "ExpressItems", id: "PARTIAL-LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetExpressItemsQuery } = expressApi;
