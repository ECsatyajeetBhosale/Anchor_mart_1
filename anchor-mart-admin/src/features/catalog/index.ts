// Public API for the catalog (categories) feature — import only from here.
export { CategoriesPage } from "./components/CategoriesPage";
export { CategoryFormModal } from "./components/CategoryFormModal";
export { CategoryAddDrawer } from "./components/CategoryAddDrawer";
export { CategoryEditDrawer } from "./components/CategoryEditDrawer";
export { useCategoryColumns } from "./components/categoryColumns";
export {
  useGetCategoriesQuery,
  useGetCategoryStatsQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from "./api/categoryApi";
export type {
  Category,
  CategoryStats,
  AddCategoryPayload,
  UpdateCategoryPayload,
} from "./types/category.types";
