// Public API for the settings feature — import only from here.
export { SettingsPage } from "./components/SettingsPage";
export { FaqsPage } from "./components/FaqsPage";
export { UsersPage } from "./components/UsersPage";
export { FaqAccordionItem } from "./components/FaqAccordionItem";
export { FaqFormModal } from "./components/FaqFormModal";
export { FaqAddDrawer } from "./components/FaqAddDrawer";
export { FaqEditDrawer } from "./components/FaqEditDrawer";
export { FaqTypesCard } from "./components/FaqTypesCard";
export { PlatformConfigCard } from "./components/PlatformConfigCard";
export { CreateUserDrawer } from "./components/CreateUserDrawer";
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
export { useCreateUserMutation } from "./api/adminUserApi";
export type {
  Faq,
  FaqType,
  FaqListResponse,
  FaqTypeListResponse,
  AddFaqPayload,
  UpdateFaqPayload,
  FaqTypePayload,
  UserRole,
  CreateUserPayload,
} from "./types/settings.types";
