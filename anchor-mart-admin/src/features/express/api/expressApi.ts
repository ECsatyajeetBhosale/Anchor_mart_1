import { EXPRESS_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  ExpressItem,
  ExpressItemListResult,
  ExpressOrderListResponse,
  ExpressStats,
  GetExpressCatalogParams,
} from "../types/expressItem.types";

/**
 * Query parameters for the express **orders** list (Flow 09 API 2) — named for
 * the hook (`getExpressItems`) rather than the resource, unlike
 * `GetExpressCatalogParams` which covers `/express/items/`.
 *
 * This list shares `_apply_order_list_filters()` with the main Orders screen,
 * so it accepts the same set and validates identically.
 */
export interface GetExpressItemsParams {
  page?: number;
  limit?: number;
  // Free-text search term, sent to the backend as `?search=...`.
  search?: string;
  /**
   * Order status filter, sent as `?status=<value>`. Omit for "all".
   * **Post-payment statuses only** — a pre-payment value is a 400 with an
   * explanatory message, not an empty 200.
   */
  status?: string;
  /** `YYYY-MM-DD`, filtering on `payment_completed_at`. */
  dateFrom?: string;
  dateTo?: string;
  /** UUID of the assigned delivery partner. */
  partnerId?: string;
}

/** Safe property read off an unknown value. */
function getProp(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

/** Returns the value when it's an array, otherwise null. */
function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

/** First present key off an object, coerced to a trimmed string; else "". */
function pick(obj: unknown, ...keys: string[]): string {
  for (const k of keys) {
    const v = getProp(obj, k);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

/** Formats a decimal string as `$120.00`; unparseable input → "-". */
function formatPrice(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "-";
}

/**
 * Flattens a variant's `attributes` object into a readable summary,
 * e.g. `{ color: "red", size: "M" }` → `color: red · size: M`.
 */
function summariseAttributes(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "-";
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${v}`);
  return entries.length ? entries.join(" · ") : "-";
}

/**
 * Primary image URL off a variant's `images` array, falling back to the first
 * entry when none is flagged primary. `""` when there are no images, so the
 * column can render a placeholder instead of a broken `<img>`.
 */
function primaryImage(value: unknown): string {
  const images = asArray(value);
  if (!images?.length) return "";
  const primary = images.find((img) => getProp(img, "is_primary") === true);
  return pick(primary ?? images[0], "image", "image_url");
}

/** Maps a raw ProductVariant record onto the flat catalog row the table renders. */
function toExpressItem(raw: unknown, index: number): ExpressItem {
  const product = getProp(raw, "product");
  return {
    id: pick(raw, "id", "variant_id") || `variant-${index}`,
    // `product` may be a nested object or a bare UUID depending on the serializer.
    productId: typeof product === "string" ? product : pick(product, "id"),
    name: pick(raw, "product_name", "name") || pick(product, "name") || "-",
    sku: pick(raw, "sku") || "-",
    imageUrl: primaryImage(getProp(raw, "images")),
    price: formatPrice(getProp(raw, "price") ?? getProp(raw, "base_price")),
    attributes: summariseAttributes(getProp(raw, "attributes")),
    about: pick(raw, "about_product"),
    // The API already folds the product flag in, so this is the effective value.
    adminSourceable: getProp(raw, "admin_sourceable") !== false,
    // Defaults to false, unlike the two flags above: absent must not read as
    // "express" on the one column whose whole job is to flag the exceptions.
    isExpress: getProp(raw, "is_express") === true,
    isActive: getProp(raw, "is_active") !== false,
  };
}

export const expressApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExpressItems: builder.query<ExpressOrderListResponse, GetExpressItemsParams>({
      query: (params) => ({
        url: EXPRESS_ENDPOINTS.GET_EXPRESS_ORDERS,
        method: "GET",
        // DRF pagination uses `page_size` (not `limit`); empty params are omitted.
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          status: params.status || undefined,
          date_from: params.dateFrom || undefined,
          date_to: params.dateTo || undefined,
          partner_id: params.partnerId || undefined,
        },
      }),
      providesTags: (result) =>
        result?.results
          ? [
              ...result.results.map(({ id }) => ({ type: "ExpressItems" as const, id })),
              { type: "ExpressItems", id: "PARTIAL-LIST" },
            ]
          : [{ type: "ExpressItems", id: "PARTIAL-LIST" }],
    }),

    /**
     * Flow 09 API 3 — the express variant catalog. The response is
     * `{ message, data: [...] }` and paginated, so both that envelope and a bare
     * array are handled. Filters are server-validated (a malformed UUID or number
     * returns 400), so blank values are dropped rather than sent as empty strings.
     */
    getExpressCatalog: builder.query<ExpressItemListResult, GetExpressCatalogParams>({
      query: (params) => ({
        url: EXPRESS_ENDPOINTS.GET_EXPRESS_ITEMS,
        method: "GET",
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          category_id: params.categoryId || undefined,
          product_id: params.productId || undefined,
          min_price: params.minPrice || undefined,
          max_price: params.maxPrice || undefined,
          admin_sourceable: params.adminSourceable || undefined,
          is_active: params.isActive || undefined,
          sort_by_price: params.sortByPrice || undefined,
          sort_by_popularity: params.sortByPopularity || undefined,
          sort_by_relevance: params.sortByRelevance || undefined,
        },
      }),
      transformResponse: (res: unknown): ExpressItemListResult => {
        const results = getProp(res, "results");
        const rows =
          asArray(getProp(res, "data")) ??
          asArray(getProp(results, "data")) ??
          asArray(results) ??
          asArray(res) ??
          [];
        const countRaw = getProp(res, "count") ?? getProp(results, "count");
        return {
          count: typeof countRaw === "number" ? countRaw : rows.length,
          items: rows.map(toExpressItem),
        };
      },
      providesTags: [{ type: "ExpressItems", id: "CATALOG-LIST" }],
    }),

    /** Flow 09 API 4 — product / variant / order-volume aggregates. No params. */
    getExpressStats: builder.query<ExpressStats, void>({
      query: () => ({ url: EXPRESS_ENDPOINTS.GET_EXPRESS_STATS, method: "GET" }),
      transformResponse: (res: unknown): ExpressStats =>
        ((getProp(res, "data") as ExpressStats) ?? (res as ExpressStats)) || {},
      providesTags: [{ type: "ExpressItems", id: "STATS" }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetExpressItemsQuery, useGetExpressCatalogQuery, useGetExpressStatsQuery } =
  expressApi;
