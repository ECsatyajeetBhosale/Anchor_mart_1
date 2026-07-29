export { RewardsPage } from "./components/RewardsPage";
export { ActiveCouponsCard } from "./components/ActiveCouponsCard";
export type { ActiveCouponsCardProps } from "./components/ActiveCouponsCard";
export { CouponFormDrawer } from "./components/CouponFormDrawer";
export type { CouponFormDrawerProps } from "./components/CouponFormDrawer";
export { LoyaltyConfigDrawer } from "./components/LoyaltyConfigDrawer";
export type { LoyaltyConfigDrawerProps } from "./components/LoyaltyConfigDrawer";
export {
  useGetLoyaltyOverviewQuery,
  useGetLoyaltyConfigQuery,
  useUpdateLoyaltyConfigMutation,
} from "./api/loyaltyApi";
export { loyaltyConfigSchema } from "./schemas/loyaltyConfig.schema";
export type { LoyaltyConfigFormData } from "./schemas/loyaltyConfig.schema";
export {
  useGetActiveCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
} from "./api/couponApi";
export { couponSchema } from "./schemas/coupon.schema";
export type { CouponFormData } from "./schemas/coupon.schema";
export type {
  Activity,
  ApiCoupon,
  ApiCouponListResponse,
  Coupon,
  CreateCouponPayload,
  LoyaltyConfig,
  LoyaltyOverview,
  LoyaltyRules,
  UpdateCouponPayload,
  UpdateLoyaltyConfigPayload,
} from "./types/reward.types";

// Promotion surfaces: Deal of the Day, bonus points, coupon assignments, report.
export { DealsTab } from "./components/DealsTab";
export { DealFormDrawer } from "./components/DealFormDrawer";
export { BonusPointsTab } from "./components/BonusPointsTab";
export { CouponAssignmentsTab } from "./components/CouponAssignmentsTab";
export { CouponReportTab } from "./components/CouponReportTab";
export {
  useGetDealsQuery,
  useGetDealQuery,
  useGetDealStatsQuery,
  useGetDealsOfDayQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
  useDeleteDealMutation,
  useToggleDealMutation,
  useGetBonusPointsQuery,
  useAddBonusPointsMutation,
  useDeleteBonusPointsMutation,
  useGetBonusPointHistoryQuery,
  useGetCouponAssignmentsQuery,
  useAddCouponAssignmentMutation,
  useDeleteCouponAssignmentMutation,
  useGetCouponReportQuery,
} from "./api/promotionApi";
export type {
  AddBonusPointsPayload,
  AddCouponAssignmentPayload,
  BonusPoint,
  BonusPointHistoryEntry,
  BonusPointHistoryResult,
  BonusPointListResult,
  BonusPointType,
  CouponAssignment,
  CouponAssignmentListResult,
  CouponReportRow,
  Deal,
  DealListResult,
  DealPayload,
  DealStats,
  GetDealsParams,
} from "./types/reward.types";
