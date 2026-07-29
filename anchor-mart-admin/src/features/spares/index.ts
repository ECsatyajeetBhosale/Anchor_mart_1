// Public API for the marine-emergency spares feature — import only from here.
export { SparesPage } from "./components/SparesPage";
export { SpareProductDetailDrawer } from "./components/SpareProductDetailDrawer";
export { SpareProductFormModal } from "./components/SpareProductFormModal";
export { SpareProductAddDrawer } from "./components/SpareProductAddDrawer";
export { SpareProductEditDrawer } from "./components/SpareProductEditDrawer";
export {
  useGetSpareProductsQuery,
  useGetSpareStatsQuery,
  useGetSpareProductQuery,
  useCreateSpareProductMutation,
  useUpdateSpareProductMutation,
  useDeleteSpareProductMutation,
} from "./api/spareApi";
export { spareAddSchema, spareUpdateSchema } from "./schemas/spare.schema";
export type { SpareAddFormData, SpareUpdateFormData } from "./schemas/spare.schema";
export type {
  SpareProduct,
  SpareProductApi,
  SpareProductDetail,
  SpareProductImage,
  SpareStats,
  SpareProductListResult,
  GetSpareProductsParams,
  AddSpareProductPayload,
  UpdateSpareProductPayload,
} from "./types/spare.types";
