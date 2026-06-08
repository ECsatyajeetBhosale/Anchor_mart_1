// src/features/products/api/productsApi.ts
import { baseApi } from '@/services/api/baseApi';
import type { Product } from '@/types/product';

// Define the shape of the response for paginated products
export interface PaginatedProductsResponse {
  results: Product[];
  total_pages: number;
  total_items: number;
}

// Query parameters for fetching products
export interface GetProductsParams {
  page?: number;
  limit?: number;
  name?: string;
}

export const productsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<PaginatedProductsResponse, GetProductsParams>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params.page) search.append('page', String(params.page));
        if (params.limit) search.append('limit', String(params.limit));
        if (params.name) search.append('name', params.name);
        return {
          url: `/products?${search.toString()}`,
          method: 'GET',
        };
      },
      // Provide a stable cache key based on parameters
      providesTags: (result, error, arg) =>
        result
          ? [
              ...result.results.map(({ id }) => ({ type: 'Products' as const, id })),
              { type: 'Products', id: 'PARTIAL-LIST' },
            ]
          : [{ type: 'Products', id: 'PARTIAL-LIST' }],
    }),
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      // Invalidate the list after a deletion
      invalidatesTags: [{ type: 'Products', id: 'PARTIAL-LIST' }],
    }),
  }),
  overrideExisting: false,
});

// Export hooks for usage in components
export const {
  useGetProductsQuery,
  useDeleteProductMutation,
} = productsApi;

// NOTE: Ensure that the server enforces HTTPS, proper authentication, and
// validates all incoming parameters to mitigate injection attacks. //TODO(security)
