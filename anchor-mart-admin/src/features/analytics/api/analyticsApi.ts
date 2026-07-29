import { ANALYTICS_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";

import type {
  AnalyticsParams,
  AnalyticsProductParams,
  AnalyticsSummaryResponse,
  OrdersByCategoryResponse,
  ProductSalesResponse,
  SalesTrendResponse,
} from "../types/analytics.types";

/**
 * Build the shared analytics filter query. Send EITHER the custom range OR
 * `period` — a complete range wins so the backend never receives both. Empty
 * keys are dropped by RTK Query so the URL stays clean.
 */
function toFilterParams(params: AnalyticsParams) {
  return params.from_date && params.to_date
    ? { from_date: params.from_date, to_date: params.to_date }
    : { period: params.period };
}

/** Product-sales filter query — adds the optional `product_id` selector. */
function toProductParams(params: AnalyticsProductParams) {
  const base = toFilterParams(params);
  return params.product_id ? { ...base, product_id: params.product_id } : base;
}

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsSummary: builder.query<AnalyticsSummaryResponse, AnalyticsParams>({
      query: (params) => ({
        url: ANALYTICS_ENDPOINTS.GET_SUMMARY,
        method: "GET",
        params: toFilterParams(params),
      }),
      providesTags: [{ type: "Analytics", id: "SUMMARY" }],
    }),
    getSalesTrend: builder.query<SalesTrendResponse, AnalyticsParams>({
      query: (params) => ({
        url: ANALYTICS_ENDPOINTS.GET_SALES_TREND,
        method: "GET",
        params: toFilterParams(params),
      }),
      providesTags: [{ type: "Analytics", id: "SALES-TREND" }],
    }),
    getOrdersByCategory: builder.query<OrdersByCategoryResponse, AnalyticsParams>({
      query: (params) => ({
        url: ANALYTICS_ENDPOINTS.GET_ORDERS_BY_CATEGORY,
        method: "GET",
        params: toFilterParams(params),
      }),
      providesTags: [{ type: "Analytics", id: "ORDERS-BY-CATEGORY" }],
    }),
    getProductSales: builder.query<ProductSalesResponse, AnalyticsProductParams>({
      query: (params) => ({
        url: ANALYTICS_ENDPOINTS.GET_PRODUCT_SALES,
        method: "GET",
        params: toProductParams(params),
      }),
      providesTags: [{ type: "Analytics", id: "PRODUCT-SALES" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAnalyticsSummaryQuery,
  useGetSalesTrendQuery,
  useGetOrdersByCategoryQuery,
  useGetProductSalesQuery,
} = analyticsApi;
