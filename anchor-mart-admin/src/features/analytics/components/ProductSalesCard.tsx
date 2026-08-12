import { IconChartHistogram } from "@tabler/icons-react";

import { SearchableSelect } from "@/components/common/SearchableSelect";
import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/messages";
import { formatCurrency } from "@/lib/utils";

import { useProductSales } from "../hooks/useProductSales";
import type { AnalyticsParams } from "../types/analytics.types";
import { AnalyticsBarChart } from "./AnalyticsBarChart";
import { ChartState } from "./ChartState";

const M = MESSAGES.ANALYTICS;

/** Placeholder shown in a metric while data is loading or unavailable. */
const PLACEHOLDER = "—";

/** Format a growth percentage with the existing ↑/↓ prefix. */
/**
 * Growth percentage, or a dash.
 *
 * `null` is meaningful here and distinct from `undefined`: the API returns it
 * when the previous period sold nothing, i.e. **no baseline to grow from** —
 * which is not zero growth. Both render as the placeholder rather than "0%".
 */
function formatGrowth(value: number | null | undefined): string {
  if (value === undefined || value === null) return PLACEHOLDER;
  const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "";
  return `${arrow} ${Math.abs(value)}%`.trim();
}

/**
 * Catalog-type chips for the picker. `""` is all three — `get-all-products/`
 * spans the whole catalog when `catalog_type` is omitted.
 */
const CATALOG_TYPE_FILTERS = [
  { label: M.CATALOG_TYPE_ALL, value: "" },
  { label: M.CATALOG_TYPE.regular, value: "regular" },
  { label: M.CATALOG_TYPE.express, value: "express" },
  { label: M.CATALOG_TYPE.marine_emergency, value: "marine_emergency" },
];

export interface ProductSalesCardProps {
  params: AnalyticsParams;
}

/**
 * Product-wise weekly sales — the product picker drives the metric summary
 * (revenue / units / growth) and the daily units bar chart below it, all wired
 * to the product-sales endpoint.
 */
export function ProductSalesCard({ params }: ProductSalesCardProps) {
  const {
    revenue,
    unitsSold,
    growth,
    bars,
    product,
    isAutoPicked,
    options,
    selectedId,
    setProductId,
    productSearch,
    setProductSearch,
    catalogType,
    setCatalogType,
    hasMore,
    loadMore,
    productsFetching,
    clearProduct,
    isLoading,
    isError,
    refetch,
    isEmpty,
  } = useProductSales(params);

  return (
    <SectionCard
      bodyPadding="none"
      icon={<IconChartHistogram size={17} className="text-[var(--t4)]" />}
      // `title` takes a node, so the badges ride with it rather than needing a
      // new SectionCard slot.
      title={
        <span className="flex flex-wrap items-center gap-2">
          {M.PRODUCT_SALES}
          {/* With no explicit pick the endpoint charts its own top product.
              Naming it here is what lets the picker stay a placeholder — the
              chart always says what it is about, wherever the subject came from. */}
          {isAutoPicked && product && (
            <span className="text-[12.5px] font-semibold text-[var(--t3)]">
              {M.PRODUCT_TOP_PREFIX} {product.name}
            </span>
          )}
          {product?.catalog_type && (
            <Badge variant="neutral">
              {M.CATALOG_TYPE[product.catalog_type] ?? product.catalog_type}
            </Badge>
          )}
          {/* A delisted product still reports its full history — the sales
              happened, and delisting does not undo them. Labelled, never
              hidden and never an error. */}
          {product?.is_deleted && <Badge variant="danger">{M.PRODUCT_DELISTED}</Badge>}
        </span>
      }
      actions={
        <SearchableSelect
          value={selectedId}
          onValueChange={setProductId}
          // Each row carries its catalog type, so the operator can tell a
          // marine-emergency spare from a regular product before picking.
          options={options.map((o) => ({
            value: o.value,
            label: o.label,
            meta: o.catalogType ? M.CATALOG_TYPE[o.catalogType] : undefined,
          }))}
          filters={CATALOG_TYPE_FILTERS}
          activeFilter={catalogType}
          onFilterChange={setCatalogType}
          search={productSearch}
          onSearchChange={setProductSearch}
          hasMore={hasMore}
          onLoadMore={loadMore}
          isLoading={productsFetching}
          // Clearing reverts to the endpoint's own top product rather than
          // emptying the chart — the card always has something to show.
          placeholder={M.PRODUCT_PLACEHOLDER}
          onClear={clearProduct}
          width="240px"
        />
      }
    >
      {/* Metric summary row */}
      <div className="metric-row">
        <div className="metric-item">
          <div className="metric-lbl">{M.PRODUCT_METRICS.REVENUE_7D}</div>
          <div className="metric-val text-[var(--teal-700)]!">
            {revenue === undefined ? PLACEHOLDER : formatCurrency(revenue)}
          </div>
        </div>
        <div className="metric-sep" />
        <div className="metric-item">
          <div className="metric-lbl">{M.PRODUCT_METRICS.UNITS_SOLD}</div>
          <div className="metric-val">
            {unitsSold === undefined ? PLACEHOLDER : M.UNITS_SUFFIX(unitsSold)}
          </div>
        </div>
        <div className="metric-sep" />
        <div className="metric-item">
          <div className="metric-lbl">{M.PRODUCT_METRICS.GROWTH}</div>
          <div className="metric-val text-[var(--green-text)]!">
            {formatGrowth(growth?.revenue)}
          </div>
        </div>
      </div>

      {/* Daily units bar chart */}
      <div className="card-body">
        <ChartState isLoading={isLoading} isError={isError} isEmpty={isEmpty} onRetry={refetch}>
          <AnalyticsBarChart
            bars={bars}
            color="var(--teal-200)"
            hoverColor="var(--teal-500)"
            tooltipFormatter={(value) => M.UNITS_SUFFIX(value)}
          />
        </ChartState>
      </div>
    </SectionCard>
  );
}

export default ProductSalesCard;
