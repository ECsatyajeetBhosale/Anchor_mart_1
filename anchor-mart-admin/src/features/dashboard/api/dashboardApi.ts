// src/features/dashboard/api/dashboardApi.ts
import { DASHBOARD_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  ActionRequiredResponse,
  ActivePartnersResponse,
  DashboardStatsParams,
  DashboardStatsResponse,
  LiveOrderDetailsResponse,
  LiveOrdersResponse,
  RevenueParams,
  RevenueResponse,
  TopProductsResponse,
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

/**
 * Build the revenue query. `granularity` is always sent; a complete custom
 * range adds `from_date` + `to_date`. Empty keys are dropped by RTK Query.
 */
function toRevenueParams(params: RevenueParams) {
  return params.from_date && params.to_date
    ? { granularity: params.granularity, from_date: params.from_date, to_date: params.to_date }
    : { granularity: params.granularity };
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
    getRevenue: builder.query<RevenueResponse, RevenueParams>({
      query: (params) => ({
        url: DASHBOARD_ENDPOINTS.GET_REVENUE,
        method: "GET",
        params: toRevenueParams(params),
      }),
      providesTags: [{ type: "Dashboard", id: "REVENUE" }],
    }),
    getTopProducts: builder.query<TopProductsResponse, DashboardStatsParams>({
      query: (params) => ({
        url: DASHBOARD_ENDPOINTS.GET_TOP_PRODUCTS,
        method: "GET",
        params: toFilterParams(params),
      }),
      providesTags: [{ type: "Dashboard", id: "TOP-PRODUCTS" }],
    }),
    // Endpoint takes no params — period/date filters are intentionally omitted.
    getActivePartners: builder.query<ActivePartnersResponse, void>({
      query: () => ({
        url: DASHBOARD_ENDPOINTS.GET_ACTIVE_PARTNERS,
        method: "GET",
      }),
      providesTags: [{ type: "Dashboard", id: "ACTIVE-PARTNERS" }],
    }),
    // Endpoint takes no params — period/date filters are intentionally omitted.
    getActionRequired: builder.query<ActionRequiredResponse, void>({
      query: () => ({
        url: DASHBOARD_ENDPOINTS.GET_ACTION_REQUIRED,
        method: "GET",
      }),
      providesTags: [{ type: "Dashboard", id: "ACTION-REQUIRED" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDashboardStatsQuery,
  useGetLiveOrdersQuery,
  useGetLiveOrderDetailsQuery,
  useGetRevenueQuery,
  useGetTopProductsQuery,
  useGetActivePartnersQuery,
  useGetActionRequiredQuery,
} = dashboardApi;
