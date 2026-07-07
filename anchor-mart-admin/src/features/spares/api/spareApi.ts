import { SPARE_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  GetSpareProductsParams,
  SpareProduct,
  SpareProductApi,
  SpareProductListResult,
  SpareStats,
} from "../types/spare.types";

/** Placeholder shown for any null/undefined/blank value. */
const FALLBACK = "-";

/** Returns a trimmed string, or "-" when the value is null/undefined/blank. */
function dash(value: unknown): string {
  if (value === null || value === undefined) return FALLBACK;
  const s = String(value).trim();
  return s === "" ? FALLBACK : s;
}

/** Safe property read off an unknown value. */
function getProp(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

/** Returns the value when it's an array, otherwise null. */
function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

/** Unwraps a `{ data }` envelope used by some stats responses. */
function unwrap<T>(res: unknown): T {
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

/** Formats the base price as "$<amount>", or "-" when absent/non-numeric. */
function formatPrice(value: SpareProductApi["base_price"]): string {
  if (value === null || value === undefined || value === "") return FALLBACK;
  const num = Number(value);
  return Number.isNaN(num) ? FALLBACK : `$${num.toFixed(2)}`;
}

/** Turns a catalog type token ("marine_emergency") into a label ("Marine Emergency"). */
function formatType(value: SpareProductApi["catalog_type"]): string {
  const raw = value ? String(value).trim() : "";
  if (!raw) return FALLBACK;
  return raw
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Maps a raw API product row into the flat UI row the table columns render. */
function toSpareProduct(row: SpareProductApi): SpareProduct {
  return {
    id: row.id ? String(row.id) : "",
    name: dash(row.name),
    image: row.image ? String(row.image) : "",
    category: dash(row.category_name ?? row.category),
    price: formatPrice(row.base_price),
    variants: row.variant_count ?? FALLBACK,
    rating: row.average_rating ?? FALLBACK,
    type: formatType(row.catalog_type),
    active: Boolean(row.is_active),
    created: dash(row.created_at),
  };
}

/**
 * Extracts the rows + total from the list envelope
 * (`{ count, results: { message, data: [...] } }`), staying defensive about variants.
 */
function extractList(res: unknown): { count: number; rows: SpareProductApi[] } {
  const results = getProp(res, "results");
  const rows =
    asArray(getProp(results, "data")) ??
    asArray(results) ??
    asArray(getProp(res, "data")) ??
    asArray(res) ??
    [];
  const countRaw = getProp(res, "count") ?? getProp(results, "count");
  const count = typeof countRaw === "number" ? countRaw : rows.length;
  return { count, rows: rows as SpareProductApi[] };
}

export const spareApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSpareProducts: builder.query<SpareProductListResult, GetSpareProductsParams>({
      query: (params) => ({
        url: SPARE_ENDPOINTS.GET_LIST,
        method: "GET",
        // DRF pagination uses `page_size`; search omitted when empty.
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
        },
      }),
      transformResponse: (res: unknown): SpareProductListResult => {
        const { count, rows } = extractList(res);
        return { count, products: rows.map(toSpareProduct) };
      },
      providesTags: (result) =>
        result?.products
          ? [
              ...result.products.map(({ id }) => ({ type: "Spares" as const, id })),
              { type: "Spares", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Spares", id: "PARTIAL-LIST" }],
    }),

    getSpareStats: builder.query<SpareStats, void>({
      query: () => ({ url: SPARE_ENDPOINTS.GET_STATS, method: "GET" }),
      transformResponse: (res: unknown): SpareStats => unwrap<SpareStats>(res) ?? {},
      providesTags: [{ type: "Spares", id: "STATS" }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetSpareProductsQuery, useGetSpareStatsQuery } = spareApi;
