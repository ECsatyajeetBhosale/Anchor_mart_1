import { IconChartHistogram } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { DropdownSelect } from "@/components/common/DropdownSelect";
import { SectionCard } from "@/components/common/SectionCard";
import { MESSAGES } from "@/lib/messages";

import { PRODUCT_DAY_LABELS, PRODUCT_SALES } from "../data/analyticsData";
import { AnalyticsBarChart } from "./AnalyticsBarChart";

const M = MESSAGES.ANALYTICS;

const PRODUCT_OPTIONS = PRODUCT_SALES.map((p) => ({ value: p.id, label: p.name }));

/**
 * Product-wise weekly sales — a product picker drives the metric summary
 * (revenue / units / growth) and the daily units bar chart below it.
 */
export function ProductSalesCard() {
  const [productId, setProductId] = useState(PRODUCT_SALES[0].id);

  const product = useMemo(
    () => PRODUCT_SALES.find((p) => p.id === productId) ?? PRODUCT_SALES[0],
    [productId],
  );

  // Bars scale to the product's peak day, matching the reference renderer.
  const bars = useMemo(() => {
    const max = Math.max(...product.units);
    return product.units.map((units, i) => ({
      label: PRODUCT_DAY_LABELS[i],
      heightPct: max > 0 ? (units / max) * 100 : 0,
      title: `${PRODUCT_DAY_LABELS[i]}: ${M.UNITS_SUFFIX(units)}`,
    }));
  }, [product]);

  const totalUnits = useMemo(() => product.units.reduce((sum, n) => sum + n, 0), [product]);

  return (
    <SectionCard
      bodyPadding="none"
      icon={<IconChartHistogram size={17} className="text-[var(--t4)]" />}
      title={M.PRODUCT_SALES}
      actions={
        <DropdownSelect
          value={productId}
          onValueChange={setProductId}
          options={PRODUCT_OPTIONS}
          width="200px"
        />
      }
    >
      {/* Metric summary row */}
      <div className="metric-row">
        <div className="metric-item">
          <div className="metric-lbl">{M.PRODUCT_METRICS.REVENUE_7D}</div>
          <div className="metric-val text-[var(--teal-700)]!">{product.revenue}</div>
        </div>
        <div className="metric-sep" />
        <div className="metric-item">
          <div className="metric-lbl">{M.PRODUCT_METRICS.UNITS_SOLD}</div>
          <div className="metric-val">{M.UNITS_SUFFIX(totalUnits)}</div>
        </div>
        <div className="metric-sep" />
        <div className="metric-item">
          <div className="metric-lbl">{M.PRODUCT_METRICS.GROWTH}</div>
          <div className="metric-val text-[var(--green-text)]!">{product.growth}</div>
        </div>
      </div>

      {/* Daily units bar chart */}
      <div className="card-body">
        <AnalyticsBarChart bars={bars} variant="teal" />
      </div>
    </SectionCard>
  );
}

export default ProductSalesCard;
