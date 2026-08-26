export { AnalyticsPage } from "./components/AnalyticsPage";
export { useAnalyticsFilters, type AnalyticsPeriod } from "./hooks/useAnalyticsFilters";
export { useSalesTrend } from "./hooks/useSalesTrend";
export { useOrdersByCategory } from "./hooks/useOrdersByCategory";
export { useProductSales } from "./hooks/useProductSales";
export { usePlatformBreakdown } from "./hooks/usePlatformBreakdown";
export { usePlatformTrend } from "./hooks/usePlatformTrend";
export { platformColor, platformFallbackLabel } from "./lib/platformSeries";
export {
  useGetAnalyticsSummaryQuery,
  useGetSalesTrendQuery,
  useGetOrdersByCategoryQuery,
  useGetOrdersByPlatformQuery,
  useGetPlatformTrendQuery,
  useGetProductSalesQuery,
} from "./api/analyticsApi";
export type {
  AnalyticsParams,
  AnalyticsPeriodParam,
  AnalyticsProductParams,
  AnalyticsSummaryResponse,
  OrdersByCategoryItem,
  OrdersByCategoryResponse,
  OrdersByPlatformResponse,
  OrdersByPlatformRow,
  PlatformKey,
  PlatformTrendBar,
  PlatformTrendResponse,
  ProductSalesGrowth,
  ProductSalesProduct,
  ProductSalesResponse,
  ProductSalesSeriesPoint,
  SalesTrendBar,
  SalesTrendResponse,
} from "./types/analytics.types";
