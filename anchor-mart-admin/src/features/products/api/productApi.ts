// src/features/products/api/productApi.ts
import { baseApi } from '@/lib/fetchUtils';
import { PRODUCT_ENDPOINTS } from '@/lib/apiEndpoints';
import type { ProductListResponse } from '../types/product.types';

// Query parameters for fetching products
export interface GetProductsParams {
  page?: number;
  limit?: number;
  name?: string;
}

export const productsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<ProductListResponse, GetProductsParams>({
      query: (params) => {
        return {
          url: PRODUCT_ENDPOINTS.GET_PRODUCTS,
          method: 'GET',
          params: { page: params.page, limit: params.limit, name: params.name },
        };
      },
      // Provide a stable cache key based on parameters
      providesTags: (result) =>
        result && result.results.data
          ? [
              ...result.results.data.map(({ id }) => ({ type: 'Products' as const, id })),
              { type: 'Products', id: 'PARTIAL-LIST' },
            ]
          : [{ type: 'Products', id: 'PARTIAL-LIST' }],
    }),
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: PRODUCT_ENDPOINTS.DELETE_PRODUCT(id),
        method: 'DELETE',
      }),
      // Invalidate the deleted product and the list so the table refetches
      invalidatesTags: (_result, _error, id) => [
        { type: 'Products', id },
        { type: 'Products', id: 'PARTIAL-LIST' },
      ],
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
