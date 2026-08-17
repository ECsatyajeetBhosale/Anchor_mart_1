import { SPARE_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  AddSpareProductPayload,
  GetSpareProductsParams,
  GetSpareStatsParams,
  SpareProduct,
  SpareProductApi,
  SpareProductDetail,
  SpareProductListResult,
  SpareStats,
  UpdateSpareProductPayload,
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
    // Kept raw alongside the display-guarded fields above: these drive the row
    // toggles and the zero-variant warning, and a "-" cannot be compared.
    variantCount: row.variant_count ?? 0,
    isTopRated: Boolean(row.is_top_rated),
    adminSourceable: row.admin_sourceable !== false,
    onDeal: Boolean(row.on_deal),
    updated: dash(row.updated_at),
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
        /**
         * DRF pagination uses `page_size`; a raw `limit` is silently ignored and
         * yields the default 10. Empty filters are omitted — the endpoint treats
         * a blank value as "no filter", so an omitted key and an empty one mean
         * the same thing.
         *
         * `catalog_type` is deliberately never sent: it is forced to
         * `marine_emergency` here and any other value is a 400.
         */
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          category: params.category || undefined,
          is_active: params.isActive === undefined ? undefined : String(params.isActive),
          on_deal: params.onDeal === undefined ? undefined : String(params.onDeal),
          is_top_rated: params.isTopRated === undefined ? undefined : String(params.isTopRated),
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

    /**
     * KPI counts, **given the table's own filters**.
     *
     * Sent none until 2026-08-17 — the third screen with this defect, after
     * products and categories. The endpoint now runs the same
     * `_apply_product_filters` over the same marine-scoped queryset as the list,
     * so one filter object serves both and the cards cannot describe a different
     * population than the table.
     */
    getSpareStats: builder.query<SpareStats, GetSpareStatsParams>({
      query: (params) => ({
        url: SPARE_ENDPOINTS.GET_STATS,
        method: "GET",
        params: {
          search: params.search || undefined,
          category: params.category || undefined,
          is_active: params.isActive === undefined ? undefined : String(params.isActive),
          on_deal: params.onDeal === undefined ? undefined : String(params.onDeal),
          is_top_rated: params.isTopRated === undefined ? undefined : String(params.isTopRated),
        },
      }),
      transformResponse: (res: unknown): SpareStats => unwrap<SpareStats>(res) ?? {},
      providesTags: [{ type: "Spares", id: "STATS" }],
    }),

    /**
     * Full detail for one spare. Carries fields the list row omits — the
     * description, the image gallery, the category id (not just its name) and
     * the ports it's stocked at — so the edit form prefills from here.
     */
    getSpareProduct: builder.query<SpareProductDetail, string>({
      query: (id) => ({ url: SPARE_ENDPOINTS.GET_PRODUCT(id), method: "GET" }),
      transformResponse: (res: unknown): SpareProductDetail => unwrap<SpareProductDetail>(res),
      providesTags: (result, _error, id) => [{ type: "Spares", id: result?.id ?? id }],
    }),

    createSpareProduct: builder.mutation<unknown, AddSpareProductPayload>({
      query: (body) => ({ url: SPARE_ENDPOINTS.ADD_PRODUCT, method: "POST", body }),
      // A new row changes both the table and the per-status counters.
      invalidatesTags: [
        { type: "Spares", id: "PARTIAL-LIST" },
        { type: "Spares", id: "STATS" },
        // The category's `product_count` moves with it.
        { type: "EmergencyCategories", id: "PARTIAL-LIST" },
      ],
    }),

    updateSpareProduct: builder.mutation<unknown, { id: string; body: UpdateSpareProductPayload }>({
      query: ({ id, body }) => ({
        url: SPARE_ENDPOINTS.UPDATE_PRODUCT(id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Spares", id },
        { type: "Spares", id: "PARTIAL-LIST" },
        { type: "Spares", id: "STATS" },
        { type: "EmergencyCategories", id: "PARTIAL-LIST" },
      ],
    }),

    deleteSpareProduct: builder.mutation<unknown, string>({
      query: (id) => ({ url: SPARE_ENDPOINTS.DELETE_PRODUCT(id), method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Spares", id },
        { type: "Spares", id: "PARTIAL-LIST" },
        { type: "Spares", id: "STATS" },
        { type: "EmergencyCategories", id: "PARTIAL-LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSpareProductsQuery,
  useGetSpareStatsQuery,
  useGetSpareProductQuery,
  useCreateSpareProductMutation,
  useUpdateSpareProductMutation,
  useDeleteSpareProductMutation,
} = spareApi;
