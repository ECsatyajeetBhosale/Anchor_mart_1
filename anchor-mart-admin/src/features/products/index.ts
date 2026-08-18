export { ProductsPage } from "./components/ProductsPage";
export { SetCatalogTypeDialog } from "./components/SetCatalogTypeDialog";
// Shared with the express product catalog, which is the same view class with a
// different catalog type and therefore the same rows, form and actions.
export { ProductFormModal } from "./components/ProductFormModal";
export { useProductColumns } from "./components/productColumns";
export { useProducts } from "./hooks/useProducts";
// Schedules one refetch at a running deal's expiry — `on_deal` flips with the
// clock and has no write to invalidate against (C8).
export { useDealBoundaryRefetch } from "./hooks/useDealBoundaryRefetch";
// The whole-catalog picker: `get-all-products/` + server-side search, type
// chips and paging. Shared so no screen re-implements it against the
// general-catalog-only list and loses the marine-emergency products.
export { useProductPicker, type ProductPickerOption } from "./hooks/useProductPicker";
export { CATALOG_TYPE_FILTERS, catalogTypeLabel } from "./lib/catalogTypeFilters";
export {
  useGetAllProductsQuery,
  useGetProductsQuery,
  useGetProductQuery,
  useGetProductStatsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useSetProductCatalogTypeMutation,
  // The three row toggles are **catalog-wide**: the marine spares screen has no
  // toggle routes of its own and calls these with a marine product id.
  useSetProductTopRatedMutation,
  useSetProductSourceableMutation,
  useSetProductActiveMutation,
  useAnnounceProductAvailabilityMutation,
} from "./api/productApi";
export type {
  AddProductPayload,
  ProductListResponse,
  Product,
  ProductStats,
  UpdateProductPayload,
} from "./types/product.types";
