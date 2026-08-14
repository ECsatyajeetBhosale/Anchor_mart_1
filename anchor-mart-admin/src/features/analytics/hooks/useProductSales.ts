import { useMemo, useState } from "react";

import { useProductPicker } from "@/features/products";

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

  /**
   * The picker itself lives in `useProductPicker` — the same hook the deal form
   * uses, so the two controls cannot drift.
   *
   * It exists because of two silent defects that met on this screen: a `limit`
   * above the 50-row page cap (silently ignored), and reading `get-products/`,
   * which serves the general catalog only and left the 14 marine-emergency
   * products unchartable. Both are fixed once, in one place.
   */
  const picker = useProductPicker();

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
    /** The product the endpoint actually charted — may differ from the pick when
     *  none was made, and may be soft-deleted when one was. */
    product: data?.product ?? null,
    revenue: data?.revenue,
    unitsSold: data?.units_sold,
    growth: data?.growth,
    bars,
    options: picker.options,
    /**
     * The **explicit** pick only — deliberately not falling back to the
     * endpoint's auto-picked product.
     *
     * It used to fall back, which made the picker read as though a filter were
     * applied the moment the screen loaded: an operator arriving at Analytics
     * saw a product name in the control and no way to tell it apart from one
     * they had chosen. The chart still has a subject — the card names it — but
     * the control now only claims a selection when one was made.
     */
    selectedId: productId,
    /** True while the chart is showing the endpoint's own top product. */
    isAutoPicked: !productId && !!data?.product,
    setProductId,
    productSearch: picker.search,
    setProductSearch: picker.setSearch,
    catalogType: picker.catalogType,
    setCatalogType: picker.setCatalogType,
    hasMore: picker.hasMore,
    loadMore: picker.loadMore,
    productsFetching: picker.isFetching,
    /** Drops the explicit pick, reverting to the endpoint's top product. */
    clearProduct: () => setProductId(undefined),
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isEmpty: !query.isLoading && !query.isError && bars.length === 0,
  };
}
