export { AnalyticsPage } from "./components/AnalyticsPage";
export { useAnalyticsFilters, type AnalyticsPeriod } from "./hooks/useAnalyticsFilters";
export { useSalesTrend } from "./hooks/useSalesTrend";
export { useOrdersByCategory } from "./hooks/useOrdersByCategory";
export { useProductSales } from "./hooks/useProductSales";
export {
  useGetAnalyticsSummaryQuery,
  useGetSalesTrendQuery,
  useGetOrdersByCategoryQuery,
  useGetProductSalesQuery,
} from "./api/analyticsApi";
export type {
  AnalyticsParams,
  AnalyticsPeriodParam,
  AnalyticsProductParams,
  AnalyticsSummaryResponse,
  OrdersByCategoryItem,
  OrdersByCategoryResponse,
  ProductSalesGrowth,
  ProductSalesProduct,
  ProductSalesResponse,
  ProductSalesSeriesPoint,
  SalesTrendBar,
  SalesTrendResponse,
} from "./types/analytics.types";
