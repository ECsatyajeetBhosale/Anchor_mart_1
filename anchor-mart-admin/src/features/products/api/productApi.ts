import { PRODUCT_ENDPOINTS } from "@/lib/apiEndpoints";
// src/features/products/api/productApi.ts
import { baseApi } from "@/lib/fetchUtils";
import type {
  AddProductPayload,
  Product,
  ProductListResponse,
  ProductStats,
  UpdateProductPayload,
} from "../types/product.types";

/**
 * Query parameters for `get-products/`.
 *
 * **All filters AND together, and every one is a no-op when blank** — sending
 * the full set empty returns the unfiltered first page. So an omitted key and an
 * empty value mean the same thing, which is why each is dropped rather than
 * stringified below.
 *
 * Bad input is a **400**, never a silent fallback: an unparseable boolean used
 * to read as `false` and quietly serve the inverse screen.
 */
export interface GetProductsParams {
  page?: number;
  limit?: number;
  /**
   * Free-text, sent as `?search=`. Matches **`name` only** — not SKU and not
   * description — case-insensitively, on a trimmed substring. Never errors.
   */
  search?: string;
  // Status filter, sent as `?is_active=True|False`. Omit for "all".
  isActive?: boolean;
  /**
   * Category id, sent as `?category=<uuid>`. A malformed UUID is a 400; a
   * well-formed unknown one is a 200 with no rows.
   */
  category?: string;
  /**
   * Catalog scope, sent as `?catalog_type=`. **`regular` and `express` only** —
   * this list is the general catalog and `marine_emergency` is a 400 here, since
   * that catalog has its own endpoint. Omit for both.
   */
  catalogType?: string;
  // "Deal" filter, sent as `?on_deal=True|False`. Omit for "all".
  onDeal?: boolean;
  // "Top rated" filter, sent as `?is_top_rated=True|False`. Omit for "all".
  isTopRated?: boolean;
}

/**
 * Query params for `product-stats/` — **the same filter set the list takes**,
 * so passing the screen's current filter state through makes the cards describe
 * the rows in the table beneath them.
 *
 * Passing them at all is the point: the endpoint honoured no query params until
 * 2026-08-14, so filtering the table to 8 express rows left every card reading
 * the unfiltered totals.
 *
 * One asymmetry: stats accepts all three `catalog_type` values where the list
 * accepts two. It does not matter here — the filter bar can only offer what the
 * list can serve — but it means these params are a subset of what stats allows,
 * not a mirror of it.
 */
export type GetProductStatsParams = Pick<
  GetProductsParams,
  "search" | "isActive" | "category" | "catalogType" | "onDeal" | "isTopRated"
>;

/**
 * The get-product/{id}/ detail response can arrive wrapped a few ways across
 * this backend (`{ results: { data } }`, `{ data }`, or a flat object). Dig the
 * product object out of whichever envelope is used.
 */
function unwrapProduct(res: unknown): Product {
  let node: unknown = res;
  if (node && typeof node === "object" && "results" in node) {
    node = (node as { results: unknown }).results;
  }
  if (node && typeof node === "object" && "data" in node) {
    node = (node as { data: unknown }).data;
  }
  return node as Product;
}

export const productsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<ProductListResponse, GetProductsParams>({
      query: (params) => {
        return {
          url: PRODUCT_ENDPOINTS.GET_PRODUCTS,
          method: "GET",
          // DRF pagination uses `page_size`, not `limit` — sending the wrong key
          // makes the backend fall back to its default page size and breaks paging.
          // Search goes through DRF's `search` param; omit it when empty so the
          // URL stays clean and the backend returns the full list.
          params: {
            page: params.page,
            page_size: params.limit,
            search: params.search || undefined,
            // Django expects capitalized booleans (True/False); omit for "all".
            is_active:
              params.isActive === undefined ? undefined : params.isActive ? "True" : "False",
            category: params.category || undefined,
            catalog_type: params.catalogType || undefined,
            on_deal: params.onDeal === undefined ? undefined : params.onDeal ? "True" : "False",
            is_top_rated:
              params.isTopRated === undefined ? undefined : params.isTopRated ? "True" : "False",
          },
        };
      },
      // Provide a stable cache key based on parameters
      providesTags: (result) =>
        result?.results.data
          ? [
              ...result.results.data.map(({ id }) => ({ type: "Products" as const, id })),
              { type: "Products", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Products", id: "PARTIAL-LIST" }],
    }),
    /**
     * Whole-catalog product list for pickers — all three catalog types, with
     * `catalog_type` on every row. Same filters as the scoped list; here
     * `catalog_type` additionally accepts `marine_emergency`.
     */
    getAllProducts: builder.query<
      ProductListResponse,
      GetProductsParams & { catalogType?: string }
    >({
      query: (params) => ({
        url: PRODUCT_ENDPOINTS.GET_ALL_PRODUCTS,
        method: "GET",
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          catalog_type: params.catalogType || undefined,
          is_active: params.isActive === undefined ? undefined : params.isActive ? "True" : "False",
          category: params.category || undefined,
        },
      }),
      providesTags: [{ type: "Products", id: "ALL-LIST" }],
    }),
    /**
     * Card counters, scoped by the same filters as the table beneath them.
     *
     * Bad input is a **400** here exactly as on the list — a card that silently
     * ignored a filter the table rejected would be the same defect, quieter.
     *
     * Two parts of the response deliberately do not follow these filters, and
     * must not be presented as if they did:
     * - the `*_categories` counts are the category **taxonomy**, not products;
     *   `?on_deal=true` does not make a category more or less existent.
     * - `total` spans all three catalog types while this list serves two, so it
     *   reads 50 against a table of 36. That gap is stated on the card.
     */
    getProductStats: builder.query<ProductStats, GetProductStatsParams>({
      query: (params) => ({
        url: PRODUCT_ENDPOINTS.GET_STATS,
        method: "GET",
        // Same encoding as the list: Django wants capitalised booleans, and an
        // omitted key means "all" rather than false.
        params: {
          search: params.search || undefined,
          is_active: params.isActive === undefined ? undefined : params.isActive ? "True" : "False",
          category: params.category || undefined,
          catalog_type: params.catalogType || undefined,
          on_deal: params.onDeal === undefined ? undefined : params.onDeal ? "True" : "False",
          is_top_rated:
            params.isTopRated === undefined ? undefined : params.isTopRated ? "True" : "False",
        },
      }),
      providesTags: [{ type: "Products", id: "STATS" }],
    }),
    // Full product detail — the list serializer omits description/images, so the
    // edit form must load the complete record from here before editing.
    getProduct: builder.query<Product, string>({
      query: (id) => ({ url: PRODUCT_ENDPOINTS.GET_PRODUCT(id), method: "GET" }),
      transformResponse: unwrapProduct,
      providesTags: (_result, _error, id) => [{ type: "Products", id }],
    }),
    createProduct: builder.mutation<unknown, AddProductPayload>({
      query: (body) => ({
        url: PRODUCT_ENDPOINTS.ADD_PRODUCT,
        method: "POST",
        body,
      }),
      // Invalidate the list + stats so the new product shows up without a manual refresh.
      invalidatesTags: [
        { type: "Products", id: "PARTIAL-LIST" },
        { type: "Products", id: "STATS" },
      ],
    }),
    updateProduct: builder.mutation<unknown, { id: string; body: UpdateProductPayload }>({
      query: ({ id, body }) => ({
        url: PRODUCT_ENDPOINTS.UPDATE_PRODUCT(id),
        // Backend contract is PATCH (partial update), per the Postman collection.
        method: "PATCH",
        body,
      }),
      // Refetch the updated product and the list so the table reflects changes.
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Products", id },
        { type: "Products", id: "PARTIAL-LIST" },
        { type: "Products", id: "STATS" },
      ],
    }),
    /**
     * Move a product between catalogs. `category` is **required** when the
     * target is `marine_emergency` (that catalog has its own category set) and
     * must be omitted for `express`, so it is only attached when supplied.
     */
    setProductCatalogType: builder.mutation<
      unknown,
      { id: string; catalogType: string; category?: string }
    >({
      query: ({ id, catalogType, category }) => ({
        url: PRODUCT_ENDPOINTS.SET_CATALOG_TYPE(id),
        method: "POST",
        body: { catalog_type: catalogType, ...(category ? { category } : {}) },
      }),
      // Catalog moves shift the per-catalog stat counts and the emergency lists.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Products", id },
        { type: "Products", id: "PARTIAL-LIST" },
        { type: "Products", id: "STATS" },
        { type: "Spares", id: "PARTIAL-LIST" },
        { type: "ExpressItems", id: "CATALOG-LIST" },
      ],
    }),

    /** Merchandising flag — surfaces the product in "top rated" listings. */
    setProductTopRated: builder.mutation<unknown, { id: string; isTopRated: boolean }>({
      query: ({ id, isTopRated }) => ({
        url: PRODUCT_ENDPOINTS.SET_TOP_RATED(id),
        method: "POST",
        body: { is_top_rated: isTopRated },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Products", id },
        { type: "Products", id: "PARTIAL-LIST" },
        { type: "Products", id: "STATS" },
      ],
    }),

    /**
     * The product-level sourceability master switch. Turning this off makes
     * **every** variant unorderable regardless of its own flag, since the
     * effective rule is product AND variant (Flow 17).
     */
    setProductSourceable: builder.mutation<unknown, { id: string; adminSourceable: boolean }>({
      query: ({ id, adminSourceable }) => ({
        url: PRODUCT_ENDPOINTS.SET_ADMIN_SOURCEABLE(id),
        method: "POST",
        body: { admin_sourceable: adminSourceable },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Products", id },
        { type: "Products", id: "PARTIAL-LIST" },
        { type: "Products", id: "STATS" },
        { type: "Variants", id: "PARTIAL-LIST" },
        { type: "ExpressItems", id: "CATALOG-LIST" },
      ],
    }),

    /**
     * Activate / deactivate — the reversible alternative to delete, and the one
     * operators actually want when they mean "stop selling this".
     *
     * Preferred over `PATCH update-product { is_active }` for a row toggle: this
     * writes a single column and returns ~20 bytes, where the PATCH re-serialises
     * the whole product behind a re-fetch that recomputes the deal subquery,
     * variant count and average rating. It also validates the bool strictly,
     * where DRF's `BooleanField` would accept `"yes"`.
     *
     * Deactivating does **not** cascade to variants — see the endpoint comment.
     * The row stays listed under `?is_active=false`, which is the whole point of
     * preferring it to delete.
     */
    setProductActive: builder.mutation<
      { message?: string; is_active?: boolean },
      { id: string; isActive: boolean }
    >({
      query: ({ id, isActive }) => ({
        url: PRODUCT_ENDPOINTS.SET_ACTIVE(id),
        method: "POST",
        body: { is_active: isActive },
      }),
      // Liveness gates orderability, so the same surfaces that follow the
      // sourceable switch follow this one.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Products", id },
        { type: "Products", id: "PARTIAL-LIST" },
        { type: "Products", id: "STATS" },
        { type: "Variants", id: "PARTIAL-LIST" },
        { type: "ExpressItems", id: "CATALOG-LIST" },
      ],
    }),

    /**
     * Flow 17 Build A / 29a §4 — broadcast "{product} is now available" to all
     * customers. No request body. Deliberately manual: flipping sourceable never
     * auto-notifies, so a bulk edit can't spam every sailor.
     *
     * 400 when the product isn't actually orderable (inactive, not sourceable,
     * or without a live sourceable variant) — make it sourceable first.
     *
     * **Read `announced`, not the status code.** A repeat announce for the same
     * product inside the dedupe window (120 s by default) is a **200 no-op**
     * carrying `announced: false` and `retry_after_seconds`, where a real send
     * is a 201 with `announced: true` and a `broadcast_id`. Both are successes
     * as far as RTK Query is concerned, so the caller has to branch on the flag
     * or it will claim every double-click reached every sailor.
     */
    announceProductAvailability: builder.mutation<
      {
        message?: string;
        /** Absent on older payloads — treat a missing flag as "it sent". */
        announced?: boolean;
        broadcast_id?: string;
        retry_after_seconds?: number;
      },
      string
    >({
      query: (id) => ({
        url: PRODUCT_ENDPOINTS.ANNOUNCE_AVAILABILITY(id),
        method: "POST",
      }),
      // Announcing writes an audit row but changes nothing about the product.
      invalidatesTags: [],
    }),

    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: PRODUCT_ENDPOINTS.DELETE_PRODUCT(id),
        method: "DELETE",
      }),
      // Invalidate the deleted product and the list + stats so the table refetches
      invalidatesTags: (_result, _error, id) => [
        { type: "Products", id },
        { type: "Products", id: "PARTIAL-LIST" },
        { type: "Products", id: "STATS" },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks for usage in components
export const {
  useGetAllProductsQuery,
  useGetProductsQuery,
  useGetProductQuery,
  useGetProductStatsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useSetProductCatalogTypeMutation,
  useSetProductTopRatedMutation,
  useSetProductSourceableMutation,
  useSetProductActiveMutation,
  useAnnounceProductAvailabilityMutation,
} = productsApi;

// NOTE: Ensure that the server enforces HTTPS, proper authentication, and
// validates all incoming parameters to mitigate injection attacks. //TODO(security)
