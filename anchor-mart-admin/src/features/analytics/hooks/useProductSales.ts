import { useMemo, useState } from "react";

import { useGetProductsQuery } from "@/features/products";

import { useGetProductSalesQuery } from "../api/analyticsApi";
import type { ChartBar } from "../components/AnalyticsBarChart";
import { bucketLabels, resolveGranularity } from "../lib/bucketLabel";
import type { AnalyticsParams } from "../types/analytics.types";

/**
 * Product-wise sales data access. The selector lists products from the same
 * source as the Products page (via {@link useGetProductsQuery}); clicking one
 * scopes the product-sales endpoint by `product_id`. Until the user picks, the
 * selector reflects the product the endpoint returns (its top product). Maps the
 * API `series` to the chart's `{ key, label, fullLabel, value }` shape (value =
 * units) and refetches when `params` or the product change.
 *
 * Tick labels follow the bucket width of the response, the same as the sales
 * trend — see {@link bucketLabels}.
 */
export function useProductSales(params: AnalyticsParams) {
  const [productId, setProductId] = useState<string | undefined>(undefined);

  // Product options mirror the Products page list (value = id, label = name).
  const { data: productsData } = useGetProductsQuery({ limit: 100 });
  const options = useMemo(
    () => (productsData?.results?.data ?? []).map((p) => ({ value: p.id, label: p.name })),
    [productsData],
  );

  const query = useGetProductSalesQuery({ ...params, product_id: productId });
  const data = query.data;

  const bars = useMemo<ChartBar[]>(() => {
    const raw = data?.series ?? [];
    const granularity = resolveGranularity(data?.granularity, raw[0]);
    return raw.map((s) => {
      const { label, fullLabel } = bucketLabels(s, granularity, raw.length);
      return { key: s.from || s.label, label, fullLabel, value: s.units };
    });
  }, [data?.series, data?.granularity]);

  return {
    revenue: data?.revenue,
    unitsSold: data?.units_sold,
    growth: data?.growth,
    bars,
    options,
    // Falls back to the endpoint's returned product until one is picked.
    selectedId: productId ?? data?.product?.id,
    setProductId,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isEmpty: !query.isLoading && !query.isError && bars.length === 0,
  };
}
