export { SailorsPage } from "./components/SailorsPage";
export { SailorDetailDrawer } from "./components/SailorDetailDrawer";
// Add and Edit are separate self-contained drawers behind a hook-free switch,
// matching the Products pattern.
export { SailorFormModal } from "./components/SailorFormModal";
export { SailorAddDrawer } from "./components/SailorAddDrawer";
export { SailorEditDrawer } from "./components/SailorEditDrawer";
export {
  useGetSailorsQuery,
  useGetSailorStatsQuery,
  useGetSailorQuery,
  useCreateSailorMutation,
  useUpdateSailorMutation,
  useDeleteSailorMutation,
  useToggleSailorStatusMutation,
} from "./api/sailorApi";
export type {
  CreateSailorPayload,
  Sailor,
  SailorData,
  SailorStats,
  ToggleSailorStatusPayload,
  UpdateSailorPayload,
} from "./types/sailor.types";
