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

    /**
     * Categories scoped to one catalog. Needed by the set-catalog-type flow:
     * moving a product into `marine_emergency` requires a category that belongs
     * to that catalog, and the general list would offer the wrong ones.
     */
    getCategoriesByCatalogType: builder.query<Category[], { catalogType: string; search?: string }>(
      {
        query: ({ catalogType, search }) => ({
          url: CATEGORY_ENDPOINTS.GET_BY_CATALOG_TYPE,
          method: "GET",
          params: { catalog_type: catalogType, search: search || undefined },
        }),
        transformResponse: (res: unknown): Category[] => {
          const prop = (v: unknown, k: string): unknown =>
            v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined;
          const arr = (v: unknown): unknown[] | null => (Array.isArray(v) ? v : null);
          const results = prop(res, "results");
          const rows =
            arr(prop(results, "data")) ?? arr(results) ?? arr(prop(res, "data")) ?? arr(res) ?? [];
          return rows as Category[];
        },
        providesTags: (_r, _e, { catalogType }) => [
          { type: "Categories", id: `CATALOG-${catalogType}` },
        ],
      },
    ),

    /**
     * Soft-delete a category (Flow 29 §7).
     *
     * **This cascades.** Deleting a category deactivates its live products
     * (`is_active=False`, not a further soft-delete, so it is reversible from
     * the product screen), and those products stop being orderable immediately
     * because `is_orderable()` checks `product.is_active`.
     *
     * The response reports how many in `deactivated_products` — always present,
     * `0` for an empty category. It is read rather than discarded: an admin who
     * tidies a category needs to know they just pulled twelve products off the
     * catalog, and the count is the only place that is said.
     */
    deleteCategory: builder.mutation<{ message?: string; deactivated_products?: number }, string>({
      query: (id) => ({
        url: CATEGORY_ENDPOINTS.DELETE_CATEGORY(id),
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Categories", id },
        { type: "Categories", id: "PARTIAL-LIST" },
        { type: "Categories", id: "STATS" },
        // The cascade deactivates products, so their list and counters move too.
        { type: "Products", id: "PARTIAL-LIST" },
        { type: "Products", id: "STATS" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useGetCategoryStatsQuery,
  useGetCategoriesByCatalogTypeQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;
