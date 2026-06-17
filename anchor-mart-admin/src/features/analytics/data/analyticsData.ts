/**
 * Static analytics fixtures.
 *
 * The Analytics page is a design-driven prototype — there is no backend
 * endpoint yet, so all figures live here as typed constants. When the API
 * lands, replace these with an RTK Query feature slice (see the dashboard
 * feature) without touching the presentational components.
 */

export type AnalyticsPeriod = "7 Days" | "30 Days" | "Quarter" | "Year";

/** Daily sales for the trend chart (May 16–29). `height` is the bar %; the
 *  reference mock derives the dollar figure from it (height × 3200). */
export interface SalesPoint {
  label: string;
  height: number;
  revenue: number;
}

export const SALES_TREND: SalesPoint[] = [
  55, 42, 70, 88, 60, 95, 78, 90, 65, 88, 95, 72, 100, 84,
].map((height, i) => ({ label: `May ${16 + i}`, height, revenue: height * 3200 }));

/** Order volume per product category. `orders` doubles as the bar % (0–100). */
export interface CategoryPoint {
  label: string;
  orders: number;
}

export const ORDERS_BY_CATEGORY: CategoryPoint[] = [
  { label: "Fashion", orders: 85 },
  { label: "Beauty", orders: 70 },
  { label: "Fitness", orders: 60 },
  { label: "Elec.", orders: 95 },
  { label: "Marine", orders: 50 },
  { label: "Living", orders: 75 },
  { label: "Games", orders: 40 },
  { label: "Express", orders: 88 },
  { label: "Special", orders: 65 },
];

/** Per-product weekly sales for the selectable Product-wise Sales card. */
export interface ProductSales {
  id: string;
  name: string;
  /** Units sold Mon → Sun. */
  units: number[];
  revenue: string;
  growth: string;
}

export const PRODUCT_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const PRODUCT_SALES: ProductSales[] = [
  {
    id: "bisleri",
    name: "Bisleri Water 1L",
    units: [42, 55, 48, 60, 52, 68, 75],
    revenue: "$2,568",
    growth: "↑ 22%",
  },
  {
    id: "lays",
    name: "Lay's Classic",
    units: [30, 45, 38, 50, 42, 55, 60],
    revenue: "$2,958",
    growth: "↑ 17%",
  },
  {
    id: "tetley",
    name: "Tetley Green Tea",
    units: [20, 28, 35, 40, 38, 48, 52],
    revenue: "$2,226",
    growth: "↑ 31%",
  },
  {
    id: "dettol",
    name: "Dettol Antiseptic",
    units: [50, 48, 55, 52, 60, 58, 65],
    revenue: "$3,726",
    growth: "↑ 14%",
  },
  {
    id: "amul",
    name: "Amul Taaza Milk",
    units: [60, 62, 58, 65, 63, 70, 68],
    revenue: "$2,920",
    growth: "↑ 8%",
  },
  {
    id: "echo",
    name: "Echo Dot 5th Gen",
    units: [15, 22, 18, 30, 25, 35, 40],
    revenue: "$4,120",
    growth: "↑ 27%",
  },
  {
    id: "titan",
    name: "Titan Quartz Watch",
    units: [8, 12, 10, 15, 11, 18, 20],
    revenue: "$3,000",
    growth: "↑ 12%",
  },
];

/** A row in the Express Item Performance table. */
export interface ExpressPerformanceRow {
  name: string;
  category: string;
  units: string;
  revenue: string;
  growth: string;
  /** 7-point sparkline series. */
  spark: number[];
}

export const EXPRESS_PERFORMANCE: ExpressPerformanceRow[] = [
  {
    name: "Bisleri Water 1L",
    category: "Beverages",
    units: "1,284",
    revenue: "$2,568",
    growth: "↑ 22%",
    spark: [3, 5, 4, 8, 7, 9, 8],
  },
  {
    name: "Lay's Classic",
    category: "Snacks",
    units: "986",
    revenue: "$2,958",
    growth: "↑ 17%",
    spark: [5, 4, 6, 7, 6, 8, 9],
  },
  {
    name: "Tetley Green Tea",
    category: "Beverages",
    units: "742",
    revenue: "$2,226",
    growth: "↑ 31%",
    spark: [2, 4, 5, 6, 8, 9, 10],
  },
  {
    name: "Dettol Antiseptic",
    category: "Personal Care",
    units: "621",
    revenue: "$3,726",
    growth: "↑ 14%",
    spark: [6, 7, 6, 8, 7, 9, 8],
  },
  {
    name: "Amul Taaza Milk",
    category: "Beverages",
    units: "584",
    revenue: "$2,920",
    growth: "↑ 8%",
    spark: [7, 8, 7, 8, 8, 9, 8],
  },
];
