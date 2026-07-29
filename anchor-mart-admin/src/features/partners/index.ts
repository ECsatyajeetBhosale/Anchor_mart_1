export { PartnersPage } from "./components/PartnersPage";
export { PartnerDetailDrawer } from "./components/PartnerDetailDrawer";
export { PartnerFormDrawer } from "./components/PartnerFormDrawer";
export {
  useGetPartnersQuery,
  useGetPartnerDetailQuery,
  useCreatePartnerMutation,
  useUpdatePartnerMutation,
  useDeletePartnerMutation,
} from "./api/partnerApi";
export type { PartnerData, PartnerApi, PartnerListResult } from "./types/partner.types";
