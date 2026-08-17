import { EMERGENCY_CATEGORY_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  AddEmergencyCategoryPayload,
  EmergencyCategory,
  EmergencyCategoryListResponse,
  EmergencyCategoryStats,
  UpdateEmergencyCategoryPayload,
} from "../types/emergencyCategory.types";

/**
 * Query params for the emergency categories list.
 *
 * **These four and no others** — no `has_products`, `ordering` or `scope`.
 * Ordering is fixed **name ascending**. Pagination is the shared
 * `CustomPagination`: default 10, `page_size` clamped to 50, junk falls back to
 * 10, and a page past the end is a **404** `{"detail": "Invalid page."}`.
 */
export interface GetEmergencyCategoriesParams {
  page?: number;
  limit?: number;
  /** Matches `name` only, case-insensitively — not `description`. */
  search?: string;
  isActive?: boolean;
}

/**
 * Query params for the emergency `categories/stats/` — **exactly the list's two
 * filters**, which it applies through the same shared function the list uses.
 * A junk `is_active` 400s here as it does on the list, so both must be given the
 * same validated values.
 */
export type GetEmergencyCategoryStatsParams = Pick<
  GetEmergencyCategoriesParams,
  "search" | "isActive"
>;

export const emergencyCategoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmergencyCategories: builder.query<
      EmergencyCategoryListResponse,
      GetEmergencyCategoriesParams | undefined
    >({
      query: (params) => ({
        url: EMERGENCY_CATEGORY_ENDPOINTS.GET_CATEGORIES,
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
              ...result.results.data.map(({ id }) => ({
                type: "EmergencyCategories" as const,
                id,
              })),
              { type: "EmergencyCategories", id: "PARTIAL-LIST" },
            ]
          : [{ type: "EmergencyCategories", id: "PARTIAL-LIST" }],
    }),

    // Single-category detail (GET emergency-spares/categories/{id}/). The page
    // opens the edit drawer straight from the row like the regular Categories
    // page, so this is exposed for direct detail fetches when needed.
    getEmergencyCategory: builder.query<EmergencyCategory, string>({
      query: (id) => ({ url: EMERGENCY_CATEGORY_ENDPOINTS.GET_CATEGORY(id), method: "GET" }),
      providesTags: (_result, _error, id) => [{ type: "EmergencyCategories", id }],
    }),

    /**
     * KPI counts, **given the table's own filters**.
     *
     * Took no arguments and sent none until 2026-08-17, so the cards described
     * the whole marine taxonomy while the table showed a filtered slice. One
     * filter object now serves the list and the cards, so they cannot disagree.
     */
    getEmergencyCategoryStats: builder.query<
      EmergencyCategoryStats,
      GetEmergencyCategoryStatsParams
    >({
      query: (params) => ({
        url: EMERGENCY_CATEGORY_ENDPOINTS.GET_STATS,
        method: "GET",
        params: params
          ? {
              search: params.search || undefined,
              is_active:
                params.isActive === undefined ? undefined : params.isActive ? "True" : "False",
            }
          : undefined,
      }),
      providesTags: [{ type: "EmergencyCategories", id: "STATS" }],
    }),

    createEmergencyCategory: builder.mutation<unknown, AddEmergencyCategoryPayload>({
      query: (body) => ({
        url: EMERGENCY_CATEGORY_ENDPOINTS.ADD_CATEGORY,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "EmergencyCategories", id: "PARTIAL-LIST" },
        { type: "EmergencyCategories", id: "STATS" },
      ],
    }),

    updateEmergencyCategory: builder.mutation<
      unknown,
      { id: string; body: UpdateEmergencyCategoryPayload }
    >({
      query: ({ id, body }) => ({
        url: EMERGENCY_CATEGORY_ENDPOINTS.UPDATE_CATEGORY(id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "EmergencyCategories", id },
        { type: "EmergencyCategories", id: "PARTIAL-LIST" },
        { type: "EmergencyCategories", id: "STATS" },
      ],
    }),

    /**
     * Soft-delete a marine category (Flow 29b §12).
     *
     * Shares the base class with the general-catalog delete, so it cascades the
     * same way: live spares in the category are **deactivated** and stop being
     * orderable. `deactivated_products` reports how many — always present, `0`
     * for an empty category.
     */
    deleteEmergencyCategory: builder.mutation<
      { message?: string; deactivated_products?: number },
      string
    >({
      query: (id) => ({
        url: EMERGENCY_CATEGORY_ENDPOINTS.DELETE_CATEGORY(id),
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "EmergencyCategories", id },
        { type: "EmergencyCategories", id: "PARTIAL-LIST" },
        { type: "EmergencyCategories", id: "STATS" },
        // The cascade deactivates spares, so their list and counters move too.
        { type: "Spares", id: "PARTIAL-LIST" },
        { type: "Spares", id: "STATS" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetEmergencyCategoriesQuery,
  useGetEmergencyCategoryQuery,
  useGetEmergencyCategoryStatsQuery,
  useCreateEmergencyCategoryMutation,
  useUpdateEmergencyCategoryMutation,
  useDeleteEmergencyCategoryMutation,
} = emergencyCategoryApi;
