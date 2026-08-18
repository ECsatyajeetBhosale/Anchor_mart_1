// Public API for the marine-emergency spares feature — import only from here.
// Add and edit now go through the products feature's shared ProductFormModal
// with `catalogType="marine_emergency"` — same serializer, marine routes.
export { SparesPage } from "./components/SparesPage";
export {
  useGetSpareProductsQuery,
  useGetSpareStatsQuery,
  useGetSpareProductQuery,
  useCreateSpareProductMutation,
  useUpdateSpareProductMutation,
  useDeleteSpareProductMutation,
} from "./api/spareApi";
export type {
  SpareProductDetail,
  SpareProductImage,
  SpareStats,
  GetSpareProductsParams,
  AddSpareProductPayload,
  UpdateSpareProductPayload,
} from "./types/spare.types";
