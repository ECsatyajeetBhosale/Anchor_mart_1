// src/features/catalog/api/categoryApi.ts
import { CATEGORY_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  AddCategoryPayload,
  CategoryListResponse,
  UpdateCategoryPayload,
} from "../types/category.types";

// Query parameters for fetching categories
export interface GetCategoriesParams {
  page?: number;
  limit?: number;
  // Free-text search term, sent to the backend as `?search=...`. Omitted when empty.
  search?: string;
  // Status filter, sent as `?is_active=True|False`. Omit for "all".
  isActive?: boolean;
}

export const categoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<CategoryListResponse, GetCategoriesParams | undefined>({
      query: (params) => ({
        url: CATEGORY_ENDPOINTS.GET_CATEGORIES,
        method: "GET",
        // DRF pagination expects `page_size`, not `limit`; empty params are
        // omitted; Django expects capitalized booleans for `is_active`.
        params: params
          ? {
              page: params.page,
              page_size: params.limit,
              search: params.search || undefined,
              is_active:
                params.isActive === undefined ? undefined : params.isActive ? "True" : "False",
            }
          : undefined,
      }),
      providesTags: (result) =>
        result?.results?.data
          ? [
              ...result.results.data.map(({ id }) => ({ type: "Categories" as const, id })),
              { type: "Categories", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Categories", id: "PARTIAL-LIST" }],
    }),

    createCategory: builder.mutation<unknown, AddCategoryPayload>({
      query: (body) => ({
        url: CATEGORY_ENDPOINTS.ADD_CATEGORY,
        method: "POST",
        body,
      }),
      // Invalidate the list so the new category shows up without a manual refresh.
      invalidatesTags: [{ type: "Categories", id: "PARTIAL-LIST" }],
    }),

    updateCategory: builder.mutation<unknown, { id: string; body: UpdateCategoryPayload }>({
      query: ({ id, body }) => ({
        url: CATEGORY_ENDPOINTS.UPDATE_CATEGORY(id),
        method: "PATCH",
        body,
      }),
      // Refetch the updated category and the list so the table reflects changes.
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Categories", id },
        { type: "Categories", id: "PARTIAL-LIST" },
      ],
    }),

    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: CATEGORY_ENDPOINTS.DELETE_CATEGORY(id),
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Categories", id },
        { type: "Categories", id: "PARTIAL-LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks for usage in components
export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;
