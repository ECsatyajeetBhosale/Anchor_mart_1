// src/features/dashboard/api/dashboardApi.ts
import { DASHBOARD_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type { DashboardStatsParams, DashboardStatsResponse } from "../types/dashboard.types";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<DashboardStatsResponse, DashboardStatsParams>({
      query: (params) => ({
        url: DASHBOARD_ENDPOINTS.GET_STATS,
        method: "GET",
        // Send EITHER `period` OR the custom range — a custom range wins so the
        // backend never receives both. Empty/undefined keys are dropped by RTK
        // Query so the URL stays clean.
        params:
          params.from_date && params.to_date
            ? { from_date: params.from_date, to_date: params.to_date }
            : { period: params.period },
      }),
      providesTags: [{ type: "Dashboard", id: "STATS" }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetDashboardStatsQuery } = dashboardApi;
