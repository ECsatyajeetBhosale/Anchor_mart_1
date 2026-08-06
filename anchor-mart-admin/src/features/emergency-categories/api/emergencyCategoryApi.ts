import { EMERGENCY_CATEGORY_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  AddEmergencyCategoryPayload,
  EmergencyCategory,
  EmergencyCategoryListResponse,
  EmergencyCategoryStats,
  UpdateEmergencyCategoryPayload,
} from "../types/emergencyCategory.types";

export interface GetEmergencyCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

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

    getEmergencyCategoryStats: builder.query<EmergencyCategoryStats, void>({
      query: () => ({ url: EMERGENCY_CATEGORY_ENDPOINTS.GET_STATS, method: "GET" }),
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
