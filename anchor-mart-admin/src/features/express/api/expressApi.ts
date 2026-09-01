import type { ProductListResponse } from "@/features/products";
import { EXPRESS_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import { formatMoney } from "@/lib/money";
import type {
  ExpressItem,
  ExpressItemListResult,
  ExpressOrderListResponse,
  ExpressStats,
  GetExpressCatalogParams,
  GetExpressProductsParams,
  GetExpressStatsParams,
} from "../types/expressItem.types";

/**
 * Query parameters for the express **orders** list (Flow 09 API 2).
 *
 * Unlike the main Orders screen this list spans **both sides of payment** —
 * express has no intent funnel, so an unpaid express order appears on no other
 * screen. `?status=payment_pending` is therefore valid here and a 400 there.
 *
 * This list shares `_apply_order_list_filters()` with the main Orders screen,
 * so it accepts the same set and validates identically.
 */
export interface GetExpressOrdersParams {
  page?: number;
  limit?: number;
  // Free-text search term, sent to the backend as `?search=...`.
  search?: string;
  /**
   * Order status filter, sent as `?status=<value>`. Omit for "all".
   *
   * **`payment_pending` is accepted here** — the one place it is. The main
   * Orders screen is post-payment only and 400s on it; this list spans both
   * sides, so an unpaid express order is filterable rather than invisible.
   */
  status?: string;
  /**
   * Has the vessel's `expected_departure` passed? The deadline half of the
   * partial-delivery worklist, identical to the orders screen — express uses
   * the same delivery and refund machinery. Server-side because the row's date
   * is a pre-formatted wall-clock string with no offset to compare against.
   */
  departed?: boolean;
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

/**
 * Formats a decimal string as `$120.00`; a missing price → "-".
 *
 * A ninth copy of the same formatter, and it carried the same flaw: the
 * `Number.isFinite` guard passes `""` and `null` as a finite zero, so an
 * unpriced variant read as free.
 */
function formatPrice(value: unknown): string {
  return formatMoney(value as string | number | null | undefined, { fallback: "-" });
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
    // Nullable on purpose: `null` is "pending", 0 would read as free.
    expressPrice:
      getProp(raw, "express_price") === null || getProp(raw, "express_price") === undefined
        ? null
        : Number(getProp(raw, "express_price")),
    isPrimary: getProp(raw, "is_primary") === true,
    isActive: getProp(raw, "is_active") !== false,
    /**
     * Server-computed sailor visibility. Defaults to **true** when absent so a
     * deployment predating these fields shows no alarming blocker banners
     * everywhere; the blocker list is what actually drives the UI, and an empty
     * list renders nothing either way.
     */
    isSailorVisible: getProp(raw, "is_sailor_visible") !== false,
    visibilityBlockers: (asArray(getProp(raw, "sailor_visibility_blockers")) ?? [])
      .map((b) => (typeof b === "string" ? b : ""))
      .filter(Boolean),
    isSailorOrderable: getProp(raw, "is_sailor_orderable") !== false,
  };
}

export const expressApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExpressOrders: builder.query<ExpressOrderListResponse, GetExpressOrdersParams>({
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
          departed: params.departed === undefined ? undefined : String(params.departed),
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
     * Express catalog at **product** level (§2.1, 2026-08-17).
     *
     * Shares a view class with `get-products/` and `emergency-spares/products/`,
     * so the row shape and envelope are identical — hence `ProductListResponse`
     * and the products feature's own columns render it unchanged.
     *
     * Tagged `Products`, not `ExpressItems`: these rows *are* products, and every
     * write that touches them (update, delete, the three `set-*` toggles) lives
     * on the catalog-wide `products/` endpoints and invalidates that tag. Tagging
     * it otherwise would leave this list stale after an edit made from it.
     *
     * `catalog_type` / `is_express` are **not** accepted — the endpoint is
     * already scoped to one type, so there is nothing to narrow.
     */
    getExpressProducts: builder.query<ProductListResponse, GetExpressProductsParams>({
      query: (params) => ({
        url: EXPRESS_ENDPOINTS.GET_EXPRESS_PRODUCTS,
        method: "GET",
        params: {
          page: params.page,
          page_size: params.limit,
          // Widened 2026-08-17: name OR description OR the SKU of any live variant.
          search: params.search || undefined,
          category: params.category || undefined,
          // Django wants capitalised booleans; omit for "all".
          is_active: params.isActive === undefined ? undefined : params.isActive ? "True" : "False",
          admin_sourceable:
            params.adminSourceable === undefined
              ? undefined
              : params.adminSourceable
                ? "True"
                : "False",
          on_deal: params.onDeal === undefined ? undefined : params.onDeal ? "True" : "False",
          is_top_rated:
            params.isTopRated === undefined ? undefined : params.isTopRated ? "True" : "False",
          /**
           * Reads the **variants'** price, not `base_price` — a product matches
           * when at least one live variant is in range, and sorts on its
           * cheapest, so a row can never sort outside a range it was included by.
           */
          min_price: params.minPrice || undefined,
          max_price: params.maxPrice || undefined,
          sort_by_price: params.sortByPrice || undefined,
        },
      }),
      providesTags: (result) =>
        result?.results?.data
          ? [
              ...result.results.data.map(({ id }) => ({ type: "Products" as const, id })),
              { type: "Products", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Products", id: "PARTIAL-LIST" }],
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
          // The variant's own flag here — NOT the parent-product alias the same
          // param name carries on `get-product-variants/`.
          is_express: params.isExpress || undefined,
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

    /**
     * Flow 09 API 4 — product / variant / order-volume aggregates.
     *
     * **Takes the items filter bar since 2026-08-17.** It previously read no
     * query params at all, so filtering the table left every card frozen on the
     * whole-catalog figure. Pass the same filters the list got and the `items`
     * half narrows with it, param for param — both halves run one filter
     * function over one queryset, so they cannot drift apart.
     *
     * The `orders` half is deliberately *not* narrowed by item filters — an item
     * filter has no meaning for an order count. The Express **Orders** screen
     * renders that half and passes no item filters at all.
     */
    getExpressStats: builder.query<ExpressStats, GetExpressStatsParams>({
      query: (params) => ({
        url: EXPRESS_ENDPOINTS.GET_EXPRESS_STATS,
        method: "GET",
        params: {
          search: params.search || undefined,
          category_id: params.categoryId || undefined,
          product_id: params.productId || undefined,
          min_price: params.minPrice || undefined,
          max_price: params.maxPrice || undefined,
          admin_sourceable: params.adminSourceable || undefined,
          is_active: params.isActive || undefined,
          is_express: params.isExpress || undefined,
          on_deal: params.onDeal || undefined,
          is_top_rated: params.isTopRated || undefined,
        },
      }),
      transformResponse: (res: unknown): ExpressStats =>
        ((getProp(res, "data") as ExpressStats) ?? (res as ExpressStats)) || {},
      providesTags: [{ type: "ExpressItems", id: "STATS" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetExpressOrdersQuery,
  useGetExpressProductsQuery,
  useGetExpressCatalogQuery,
  useGetExpressStatsQuery,
} = expressApi;
