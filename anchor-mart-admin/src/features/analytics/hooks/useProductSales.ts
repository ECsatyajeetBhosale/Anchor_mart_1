import { useEffect, useMemo, useState } from "react";

import { useGetAllProductsQuery } from "@/features/products";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";

import { useGetProductSalesQuery } from "../api/analyticsApi";
import type { ChartBar } from "../components/AnalyticsBarChart";
import { bucketLabels, resolveGranularity } from "../lib/bucketLabel";
import type { AnalyticsParams } from "../types/analytics.types";

interface ProductOption {
  value: string;
  label: string;
  catalogType?: string;
}

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
  const [productSearch, setProductSearch] = useState("");
  /** Narrows the picker to one catalog type; "" is all three. */
  const [catalogType, setCatalogType] = useState("");
  const [page, setPage] = useState(1);

  /**
   * Product options for the picker — searched server-side and paged.
   *
   * Two defects met here, both silent.
   *
   * It asked for `limit: 100` against a list that caps a page at 50
   * (`CustomPagination`) — the extra 50 were never sent and no error raised, so
   * only the first 50 products were listed and the 51st could not be charted.
   *
   * And it read `get-products/`, which serves the **general catalog only**
   * (regular + express). The 14 marine-emergency products were absent from a
   * perfectly ordinary 200 — 13 of them with real sales. `get-all-products/`
   * spans all three types and carries `catalog_type` per row.
   *
   * Search runs server-side; further pages append on demand.
   */
  const { data: productsData, isFetching: productsFetching } = useGetAllProductsQuery({
    page,
    limit: API_MAX_PAGE_SIZE,
    search: productSearch || undefined,
    catalogType: catalogType || undefined,
  });

  // Pages accumulate so "Load more" extends the list rather than replacing it.
  // A new search term resets the accumulation — see the effect below.
  const [loaded, setLoaded] = useState<ProductOption[]>([]);
  const rows = productsData?.results?.data;
  useEffect(() => {
    if (!rows) return;
    // `catalog_type` rides along as the option's meta so the operator can tell
    // a marine-emergency spare from a regular product before selecting it.
    const mapped = rows.map((p) => ({
      value: p.id,
      label: p.name,
      catalogType: p.catalog_type,
    }));
    setLoaded((prev) => (page === 1 ? mapped : [...prev, ...mapped]));
  }, [rows, page]);

  /** A new term starts a fresh list rather than appending to the old results. */
  const setSearch = (value: string) => {
    setProductSearch(value);
    setPage(1);
  };

  /** Same for a type change — the accumulated pages belong to the old filter. */
  const setType = (value: string) => {
    setCatalogType(value);
    setPage(1);
  };

  const options = loaded;
  // `count` is on the envelope, not on `results` — `results` is the
  // `{ message, data }` wrapper this backend nests its rows in.
  const totalCount = productsData?.count ?? 0;
  const hasMore = options.length < totalCount;

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
    options,
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
    productSearch,
    setProductSearch: setSearch,
    catalogType,
    setCatalogType: setType,
    hasMore,
    loadMore: () => setPage((p) => p + 1),
    productsFetching,
    /** Drops the explicit pick, reverting to the endpoint's top product. */
    clearProduct: () => setProductId(undefined),
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isEmpty: !query.isLoading && !query.isError && bars.length === 0,
  };
}
