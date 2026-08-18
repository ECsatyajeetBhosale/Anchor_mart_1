import type { ProductListResponse } from "@/features/products";
import { SPARE_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  AddSpareProductPayload,
  GetSpareProductsParams,
  GetSpareStatsParams,
  SpareProductDetail,
  SpareStats,
  UpdateSpareProductPayload,
} from "../types/spare.types";

/** Unwraps a `{ data }` envelope used by some stats responses. */
function unwrap<T>(res: unknown): T {
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

export const spareApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Marine-emergency products. The backend shares a view *and serializer*
     * class with `get-products/`, so the rows arrive in the exact `Product`
     * shape and are handed to the products feature's own columns untransformed.
     *
     * There used to be a `toSpareProduct` mapper here producing a display-ready
     * row (`price: "$4750.00"`, category as a name). It was dropped so this
     * screen renders through the same columns as Products rather than a
     * parallel set that could drift from them.
     */
    getSpareProducts: builder.query<ProductListResponse, GetSpareProductsParams>({
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
          admin_sourceable:
            params.adminSourceable === undefined ? undefined : String(params.adminSourceable),
        },
      }),
      /**
       * Provides **both** tag families, because two sets of writes reach these
       * rows and each invalidates only its own.
       *
       * `Spares` covers this feature's scope-partitioned create / update /
       * delete. `Products` covers the three catalog-wide row toggles
       * (`set-top-rated/`, `set-admin-sourceable/`, `set-active/`), which the
       * marine surface borrows and which invalidate `Products` alone — so
       * before this the toggles reported success and the row never changed
       * until something else refetched.
       */
      providesTags: (result) =>
        result?.results?.data
          ? [
              ...result.results.data.flatMap(({ id }) => [
                { type: "Spares" as const, id },
                { type: "Products" as const, id },
              ]),
              { type: "Spares", id: "PARTIAL-LIST" },
              { type: "Products", id: "PARTIAL-LIST" },
            ]
          : [
              { type: "Spares", id: "PARTIAL-LIST" },
              { type: "Products", id: "PARTIAL-LIST" },
            ],
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
          admin_sourceable:
            params.adminSourceable === undefined ? undefined : String(params.adminSourceable),
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
