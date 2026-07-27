export { IntentsPage } from "./components/IntentsPage";
export { IntentReviewDrawer } from "./components/IntentReviewDrawer";
export { RejectIntentDialog } from "./components/RejectIntentDialog";
export { CreateBillDialog } from "./components/CreateBillDialog";
export { SuggestReplacementPanel } from "./components/SuggestReplacementPanel";
export { IntentLifecycleRail } from "./components/IntentLifecycleRail";
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
export { useCreateBillMutation } from "./api/billingApi";
export { deriveIntentAction } from "./lib/intentAction";
export type { IntentAction, IntentData, IntentDetail, IntentStats } from "./types/intent.types";
