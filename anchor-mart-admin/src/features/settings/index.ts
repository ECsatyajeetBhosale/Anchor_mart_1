// Public API for the settings feature — import only from here.
//
// User provisioning (CreateUserDrawer, adminUserApi, roles, createUserSchema)
// moved to `@/features/account-management`, where it sits beside the deletion
// queue. Settings keeps platform configuration and the help centre.
export { SettingsPage } from "./components/SettingsPage";
export { FaqsPage } from "./components/FaqsPage";
export { FaqAccordionItem } from "./components/FaqAccordionItem";
export { FaqFormModal } from "./components/FaqFormModal";
export { FaqAddDrawer } from "./components/FaqAddDrawer";
export { FaqEditDrawer } from "./components/FaqEditDrawer";
export { FaqTypesCard } from "./components/FaqTypesCard";
export { PlatformConfigCard } from "./components/PlatformConfigCard";
export {
  useGetFaqsQuery,
  useGetFaqQuery,
  useCreateFaqMutation,
  useUpdateFaqMutation,
  useDeleteFaqMutation,
  useGetFaqTypesQuery,
  useCreateFaqTypeMutation,
  useUpdateFaqTypeMutation,
  useDeleteFaqTypeMutation,
} from "./api/faqApi";
export type {
  Faq,
  FaqType,
  FaqListResponse,
  FaqTypeListResponse,
  AddFaqPayload,
  UpdateFaqPayload,
  FaqTypePayload,
} from "./types/settings.types";
