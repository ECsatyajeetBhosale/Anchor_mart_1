// Public API for the account-management feature (Flow 31) — import only from here.
//
// Covers an account's whole life: provisioning (§7) and the deletion-review
// queue (§8–11). Provisioning moved here from the settings feature so that the
// screen which creates an account is the screen that erases it.
export { AccountManagementPage } from "./components/AccountManagementPage";
export { DeletionRequestsTab } from "./components/DeletionRequestsTab";
export { ProvisionUsersTab } from "./components/ProvisionUsersTab";
export { AccountDeletionDetailDrawer } from "./components/AccountDeletionDetailDrawer";
export { CreateUserDrawer } from "./components/CreateUserDrawer";
export {
  useGetAccountDeletionRequestsQuery,
  useGetAccountDeletionStatsQuery,
  useGetAccountDeletionRequestQuery,
  useSetAccountDeletionStatusMutation,
  accountDeletionStatusVariant,
} from "./api/accountDeletionApi";
export { useCreateUserMutation } from "./api/adminUserApi";
export { ROLE_OPTIONS, ROLE_LABELS, ROLE_NOTES, ROLE_MANAGED_AT } from "./lib/roles";
export { createUserSchema, type CreateUserFormData } from "./schemas/createUser.schema";
export {
  ACCOUNT_DELETION_STATUS_KEYS,
  ACCOUNT_DELETION_ROLE_KEYS,
} from "./types/accountDeletion.types";
export type {
  AccountDeletionRequest,
  AccountDeletionRequestApi,
  AccountDeletionDetailApi,
  AccountDeletionListResult,
  AccountDeletionStats,
  AccountDeletionStatus,
  AccountDeletionDecision,
  SetAccountDeletionStatusPayload,
  GetAccountDeletionRequestsParams,
} from "./types/accountDeletion.types";
export type { UserRole, CreateUserPayload } from "./types/user.types";
