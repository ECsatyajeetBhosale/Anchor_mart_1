export { ProductsPage } from "./components/ProductsPage";
export { SetCatalogTypeDialog } from "./components/SetCatalogTypeDialog";
export { useProducts } from "./hooks/useProducts";
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
  Product,
  ProductStats,
  UpdateProductPayload,
} from "./types/product.types";
