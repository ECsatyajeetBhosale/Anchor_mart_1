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

// Query parameters for fetching products
export interface GetProductsParams {
  page?: number;
  limit?: number;
  // Free-text search term, sent to the backend as `?search=...`
  search?: string;
  // Status filter, sent as `?is_active=True|False`. Omit for "all".
  isActive?: boolean;
  // Category id filter, sent as `?category=<id>`. Omit for "all".
  category?: string;
  // "Deal" filter, sent as `?on_deal=True|False`. Omit for "all".
  onDeal?: boolean;
  // "Top rated" filter, sent as `?is_top_rated=True|False`. Omit for "all".
  isTopRated?: boolean;
}

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
    getProductStats: builder.query<ProductStats, void>({
      query: () => ({ url: PRODUCT_ENDPOINTS.GET_STATS, method: "GET" }),
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
  useGetProductsQuery,
  useGetProductQuery,
  useGetProductStatsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productsApi;

// NOTE: Ensure that the server enforces HTTPS, proper authentication, and
// validates all incoming parameters to mitigate injection attacks. //TODO(security)
