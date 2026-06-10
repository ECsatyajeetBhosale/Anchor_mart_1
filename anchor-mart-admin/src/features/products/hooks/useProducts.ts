import { useDeleteProductMutation, useGetProductsQuery } from "../api/productApi";

/**
 * Hook encapsulating products data access (list + delete) with derived paging.
 */
export function useProducts(params: { page?: number; limit?: number; search?: string } = {}) {
  const limit = params.limit ?? 10;
  const { data, isLoading, isError, error, refetch } = useGetProductsQuery({
    page: params.page ?? 1,
    limit,
    search: params.search,
  });
  const [deleteProduct, deleteState] = useDeleteProductMutation();

  const totalItems = data?.count ?? 0;

  return {
    products: data?.results?.data ?? [],
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    isLoading,
    isError,
    error,
    refetch,
    deleteProduct,
    isDeleting: deleteState.isLoading,
  };
}
