export { IntentsPage } from "./components/IntentsPage";
export { IntentReviewDrawer } from "./components/IntentReviewDrawer";
export { RejectIntentDialog } from "./components/RejectIntentDialog";
export { CreateBillDialog } from "./components/CreateBillDialog";
export { SuggestReplacementPanel } from "./components/SuggestReplacementPanel";
export { IntentLifecycleRail } from "./components/IntentLifecycleRail";
// Shared with the Orders screen — the legend covers all 18 lifecycle statuses,
// not just the intent funnel.
export { StatusLegendDialog } from "./components/StatusLegendDialog";
export {
  useGetIntentsQuery,
  useGetIntentStatsQuery,
  useRejectIntentMutation,
  useGetIntentDetailQuery,
} from "./api/intentApi";
export {
  useGetVerificationDetailQuery,
  useGetSuggestedItemsQuery,
  useLazyGetSuggestionProductsQuery,
  useStageSuggestionMutation,
  useSuggestNewProductMutation,
  useReleaseSuggestionsMutation,
} from "./api/substitutionApi";
export {
  useCreateBillMutation,
  useUpdateBillMutation,
  useGeneratePaymentLinkMutation,
} from "./api/billingApi";
export { deriveIntentAction } from "./lib/intentAction";
export type {
  GeneratePaymentLinkPayload,
  GeneratePaymentLinkResponse,
  IntentAction,
  IntentData,
  IntentDetail,
  IntentStats,
  IntentStatusKey,
  IntentTypeKey,
} from "./types/intent.types";
