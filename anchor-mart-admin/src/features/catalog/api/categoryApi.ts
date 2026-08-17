import { CATEGORY_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  AddCategoryPayload,
  Category,
  CategoryListResponse,
  CategoryStats,
  UpdateCategoryPayload,
} from "../types/category.types";

/**
 * Query params for `get-categories/`.
 *
 * **These four and no others** — there is no `has_products` or `ordering`
 * filter, and no `catalog_type` / `scope` either: catalog filtering lives on the
 * separate `get-categories-by-catalog-type/` route. Ordering is fixed **name
 * ascending**, which differs from `get-products/`'s `-created_at`; do not assume
 * a shared default.
 *
 * Pagination matches products exactly (same `CustomPagination`): default 10,
 * `page_size` clamped to 50, junk or 0 falls back to 10, and a page past the end
 * is a **404** `{"detail": "Invalid page."}` rather than an empty page.
 */
export interface GetCategoriesParams {
  page?: number;
  limit?: number;
  /** Matches `name` only, case-insensitively — not `description`. */
  search?: string;
  isActive?: boolean;
}

/**
 * Query params for `category-stats/` — **exactly the list's two filters**.
 *
 * Both endpoints call the same `_apply_category_filters`, so they cannot drift;
 * the corollary is that a junk `is_active` 400s here just as it does on the
 * list. Pass both the same validated values, or the cards will fail on a filter
 * the table accepted.
 */
export type GetCategoryStatsParams = Pick<GetCategoriesParams, "search" | "isActive">;

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

    /**
     * KPI counts for the screen, **given the table's own filters**.
     *
     * This took no arguments until 2026-08-17 and sent none, so the cards
     * described the whole taxonomy while the table showed a filtered slice —
     * the same defect `product-stats/` had before it learned to filter, on this
     * side rather than the backend's. Encoded the same way as products: one
     * filter object serves the list and the cards, so they cannot disagree.
     */
    getCategoryStats: builder.query<CategoryStats, GetCategoryStatsParams>({
      query: (params) => ({
        url: CATEGORY_ENDPOINTS.GET_STATS,
        method: "GET",
        params: params
          ? {
              search: params.search || undefined,
              // Same capitalised-boolean encoding as the list; omit for "all".
              is_active:
                params.isActive === undefined ? undefined : params.isActive ? "True" : "False",
            }
          : undefined,
      }),
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
