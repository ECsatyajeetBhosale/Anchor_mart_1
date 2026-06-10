import { PRODUCT_ENDPOINTS } from "@/lib/apiEndpoints";
// src/features/products/api/productApi.ts
import { baseApi } from "@/lib/fetchUtils";
import type {
  AddProductPayload,
  ProductListResponse,
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
    createProduct: builder.mutation<unknown, AddProductPayload>({
      query: (body) => ({
        url: PRODUCT_ENDPOINTS.ADD_PRODUCT,
        method: "POST",
        body,
      }),
      // Invalidate the list so the new product shows up without a manual refresh.
      invalidatesTags: [{ type: "Products", id: "PARTIAL-LIST" }],
    }),
    updateProduct: builder.mutation<unknown, { id: string; body: UpdateProductPayload }>({
      query: ({ id, body }) => ({
        url: PRODUCT_ENDPOINTS.UPDATE_PRODUCT(id),
        method: "PUT",
        body,
      }),
      // Refetch the updated product and the list so the table reflects changes.
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Products", id },
        { type: "Products", id: "PARTIAL-LIST" },
      ],
    }),
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: PRODUCT_ENDPOINTS.DELETE_PRODUCT(id),
        method: "DELETE",
      }),
      // Invalidate the deleted product and the list so the table refetches
      invalidatesTags: (_result, _error, id) => [
        { type: "Products", id },
        { type: "Products", id: "PARTIAL-LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks for usage in components
export const {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productsApi;

// NOTE: Ensure that the server enforces HTTPS, proper authentication, and
// validates all incoming parameters to mitigate injection attacks. //TODO(security)
