import { REWARD_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  LoyaltyConfig,
  LoyaltyOverview,
  UpdateLoyaltyConfigPayload,
} from "../types/reward.types";

// Loyalty Program Overview KPIs. Read-only, no query params — the backend
// returns a plain object (not the DRF paginated/wrapped envelope).
export const loyaltyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLoyaltyOverview: builder.query<LoyaltyOverview, void>({
      query: () => ({ url: REWARD_ENDPOINTS.GET_LOYALTY_OVERVIEW, method: "GET" }),
      providesTags: [{ type: "Loyalty", id: "OVERVIEW" }],
    }),

    // Loyalty points configuration shown/edited by the "Configure Points" drawer.
    getLoyaltyConfig: builder.query<LoyaltyConfig, void>({
      query: () => ({ url: REWARD_ENDPOINTS.GET_LOYALTY_CONFIG, method: "GET" }),
      providesTags: [{ type: "Loyalty", id: "CONFIG" }],
    }),

    // Update the points config; refreshes both the config and the overview rules.
    updateLoyaltyConfig: builder.mutation<unknown, UpdateLoyaltyConfigPayload>({
      query: (body) => ({
        url: REWARD_ENDPOINTS.UPDATE_LOYALTY_CONFIG,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        { type: "Loyalty", id: "CONFIG" },
        { type: "Loyalty", id: "OVERVIEW" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetLoyaltyOverviewQuery,
  useGetLoyaltyConfigQuery,
  useUpdateLoyaltyConfigMutation,
} = loyaltyApi;
