// src/features/catalog/api/categoryApi.ts
import { baseApi } from "@/lib/fetchUtils";
import { CATEGORY_ENDPOINTS } from "@/lib/apiEndpoints";
import type { CategoryListResponse } from "../types/category.types";

// Query parameters for fetching categories
export interface GetCategoriesParams {
  page?: number;
  limit?: number;
}

export const categoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<CategoryListResponse, GetCategoriesParams | void>({
      query: (params) => ({
        url: CATEGORY_ENDPOINTS.GET_CATEGORIES,
        method: "GET",
        params: params ? { page: params.page, limit: params.limit } : undefined,
      }),
      providesTags: (result) =>
        result?.results?.data
          ? [
              ...result.results.data.map(({ id }) => ({ type: "Categories" as const, id })),
              { type: "Categories", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Categories", id: "PARTIAL-LIST" }],
    }),
  }),
  overrideExisting: false,
});

// Export hooks for usage in components
export const { useGetCategoriesQuery } = categoryApi;
