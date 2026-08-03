// Public API for the saved-products feature (Flow 29c §5) — import only from here.
export { SavedProductsPage } from "./components/SavedProductsPage";
export { useGetSavedProductsQuery } from "./api/savedProductApi";
export type {
  SavedProduct,
  SavedProductApi,
  SavedProductListResult,
  GetSavedProductsParams,
} from "./types/savedProduct.types";
