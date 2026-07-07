import { REWARD_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type { LoyaltyOverview } from "../types/reward.types";

// Loyalty Program Overview KPIs. Read-only, no query params — the backend
// returns a plain object (not the DRF paginated/wrapped envelope).
export const loyaltyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLoyaltyOverview: builder.query<LoyaltyOverview, void>({
      query: () => ({ url: REWARD_ENDPOINTS.GET_LOYALTY_OVERVIEW, method: "GET" }),
      providesTags: [{ type: "Loyalty", id: "OVERVIEW" }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetLoyaltyOverviewQuery } = loyaltyApi;
