import { useGetProductsQuery, useDeleteProductMutation } from "../api/productApi";

/**
 * Hook encapsulating products data access.
 */
export function useProducts(params: { page?: number; limit?: number; name?: string } = {}) {
  const { data, isLoading, isError, error, refetch } = useGetProductsQuery({
    page: params.page ?? 1,
    limit: params.limit ?? 10,
    name: params.name,
  });
  const [deleteProduct, deleteState] = useDeleteProductMutation();

  return {
    products: data?.results ?? [],
    totalPages: data?.total_pages ?? 1,
    totalItems: data?.total_items ?? 0,
    isLoading,
    isError,
    error,
    refetch,
    deleteProduct,
    isDeleting: deleteState.isLoading,
  };
}
