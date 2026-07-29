export { ProductsPage } from "./components/ProductsPage";
export { useProducts } from "./hooks/useProducts";
export {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from "./api/productApi";
export type { AddProductPayload, Product, UpdateProductPayload } from "./types/product.types";
