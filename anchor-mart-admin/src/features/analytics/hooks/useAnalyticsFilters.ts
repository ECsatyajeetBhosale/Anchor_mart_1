import { format } from "date-fns";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import type { AnalyticsParams, AnalyticsPeriodParam } from "../types/analytics.types";

/** Period pills shown in the Analytics header. */
export type AnalyticsPeriod = "7 Days" | "30 Days" | "Quarter" | "Year";

/** Maps a header pill to the value the analytics endpoints expect. */
const PERIOD_PARAM: Record<AnalyticsPeriod, AnalyticsPeriodParam> = {
  "7 Days": "7d",
  "30 Days": "30d",
  Quarter: "quarter",
  Year: "year",
};

/**
 * Analytics header filter state — the single source of truth shared by every
 * section. Owns the period toggle and custom date range, and derives the
 * `params` object every section query depends on. A complete custom range always
 * overrides the period (the two are never sent together); selecting a period
 * pill clears any active range — mirroring the dashboard exactly.
 */
export function useAnalyticsFilters() {
  // Year by default. A 7-day window is empty on most of this data, so the
  // screen opened on blank charts and read as broken rather than as a narrow
  // period — the operator had to widen it before seeing anything at all.
  const [period, setPeriod] = useState<AnalyticsPeriod>("Year");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // A complete custom range takes precedence over the period pills.
  const params: AnalyticsParams =
    dateRange?.from && dateRange?.to
      ? {
          from_date: format(dateRange.from, "yyyy-MM-dd"),
          to_date: format(dateRange.to, "yyyy-MM-dd"),
        }
      : { period: PERIOD_PARAM[period] };

  // Selecting a period pill clears any active custom range so `period` applies.
  const selectPeriod = (next: AnalyticsPeriod) => {
    setPeriod(next);
    setDateRange(undefined);
  };

  return { period, selectPeriod, dateRange, setDateRange, params };
}
