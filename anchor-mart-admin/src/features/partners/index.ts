export { PartnersPage } from "./components/PartnersPage";
export { PartnerDetailDrawer } from "./components/PartnerDetailDrawer";
export { PartnerFormDrawer } from "./components/PartnerFormDrawer";
export {
  useGetPartnersQuery,
  useGetPartnerStatsQuery,
  useGetPartnerDetailQuery,
  useCreatePartnerMutation,
  useUpdatePartnerMutation,
  useDeletePartnerMutation,
} from "./api/partnerApi";
export type {
  PartnerData,
  PartnerApi,
  PartnerListResult,
  PartnerStats,
} from "./types/partner.types";
