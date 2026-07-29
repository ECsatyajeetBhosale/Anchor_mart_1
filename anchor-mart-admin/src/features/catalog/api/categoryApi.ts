import { CATEGORY_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  AddCategoryPayload,
  Category,
  CategoryListResponse,
  CategoryStats,
  UpdateCategoryPayload,
} from "../types/category.types";

export interface GetCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export const categoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<CategoryListResponse, GetCategoriesParams | undefined>({
      query: (params) => ({
        url: CATEGORY_ENDPOINTS.GET_CATEGORIES,
        method: "GET",

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

    // Single-category detail (GET categories/get-category/{id}/), used by the
    // edit drawer to load the record fresh instead of trusting the table row.
    getCategory: builder.query<Category, string>({
      query: (id) => ({ url: CATEGORY_ENDPOINTS.GET_CATEGORY(id), method: "GET" }),
      providesTags: (_result, _error, id) => [{ type: "Categories", id }],
    }),

    getCategoryStats: builder.query<CategoryStats, void>({
      query: () => ({ url: CATEGORY_ENDPOINTS.GET_STATS, method: "GET" }),
      providesTags: [{ type: "Categories", id: "STATS" }],
    }),

    createCategory: builder.mutation<unknown, AddCategoryPayload>({
      query: (body) => ({
        url: CATEGORY_ENDPOINTS.ADD_CATEGORY,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Categories", id: "PARTIAL-LIST" },
        { type: "Categories", id: "STATS" },
      ],
    }),

    updateCategory: builder.mutation<unknown, { id: string; body: UpdateCategoryPayload }>({
      query: ({ id, body }) => ({
        url: CATEGORY_ENDPOINTS.UPDATE_CATEGORY(id),
        method: "PATCH",
        body,
      }),

      invalidatesTags: (_result, _error, { id }) => [
        { type: "Categories", id },
        { type: "Categories", id: "PARTIAL-LIST" },
        { type: "Categories", id: "STATS" },
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
        { type: "Categories", id: "STATS" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useGetCategoryStatsQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;
