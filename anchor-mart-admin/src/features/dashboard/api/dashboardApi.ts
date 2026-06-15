// src/features/dashboard/api/dashboardApi.ts
import { DASHBOARD_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  DashboardStatsParams,
  DashboardStatsResponse,
  LiveOrderDetailsResponse,
  LiveOrdersResponse,
} from "../types/dashboard.types";

/**
 * Build the shared dashboard filter query. Send EITHER the custom range OR
 * `period` — a complete range wins so the backend never receives both. Empty
 * keys are dropped by RTK Query so the URL stays clean.
 */
function toFilterParams(params: DashboardStatsParams) {
  return params.from_date && params.to_date
    ? { from_date: params.from_date, to_date: params.to_date }
    : { period: params.period };
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<DashboardStatsResponse, DashboardStatsParams>({
      query: (params) => ({
        url: DASHBOARD_ENDPOINTS.GET_STATS,
        method: "GET",
        params: toFilterParams(params),
      }),
      providesTags: [{ type: "Dashboard", id: "STATS" }],
    }),
    getLiveOrders: builder.query<LiveOrdersResponse, DashboardStatsParams>({
      query: (params) => ({
        url: DASHBOARD_ENDPOINTS.GET_LIVE_ORDERS,
        method: "GET",
        params: toFilterParams(params),
      }),
      providesTags: [{ type: "Orders", id: "DASHBOARD-LIVE" }],
    }),
    getLiveOrderDetails: builder.query<LiveOrderDetailsResponse, string>({
      query: (id) => ({
        url: DASHBOARD_ENDPOINTS.LIVE_ORDER_DETAIL(id),
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "Orders", id }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetDashboardStatsQuery, useGetLiveOrdersQuery, useGetLiveOrderDetailsQuery } =
  dashboardApi;
