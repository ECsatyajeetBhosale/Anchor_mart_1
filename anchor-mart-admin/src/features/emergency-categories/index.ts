// Public API for the emergency-categories feature — import only from here.
export { EmergencyCategoriesPage } from "./components/EmergencyCategoriesPage";
export { EmergencyCategoryFormModal } from "./components/EmergencyCategoryFormModal";
export { EmergencyCategoryAddDrawer } from "./components/EmergencyCategoryAddDrawer";
export { EmergencyCategoryEditDrawer } from "./components/EmergencyCategoryEditDrawer";
export { useEmergencyCategoryColumns } from "./components/emergencyCategoryColumns";
export {
  useGetEmergencyCategoriesQuery,
  useGetEmergencyCategoryQuery,
  useGetEmergencyCategoryStatsQuery,
  useCreateEmergencyCategoryMutation,
  useUpdateEmergencyCategoryMutation,
  useDeleteEmergencyCategoryMutation,
} from "./api/emergencyCategoryApi";
export type {
  EmergencyCategory,
  EmergencyCategoryStats,
  AddEmergencyCategoryPayload,
  UpdateEmergencyCategoryPayload,
} from "./types/emergencyCategory.types";
