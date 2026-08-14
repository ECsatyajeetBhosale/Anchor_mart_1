// Public API for the account-management feature (Flow 31) — import only from here.
//
// Covers an account's whole life: provisioning (§7) and the deletion-review
// queue (§8–11). Provisioning moved here from the settings feature so that the
// screen which creates an account is the screen that erases it.
// One screen per sidebar entry. The combined `AccountManagementPage` that held
// these as tabs is gone: Account Management is a sidebar section now, and
// `NavLink` matches on pathname, so `?tab=` links could not have driven it.
export { AdminUsersPage } from "./components/AdminUsersPage";
export { DeletionRequestsPage } from "./components/DeletionRequestsPage";
export { DeletionRequestsTab } from "./components/DeletionRequestsTab";
/**
 * **Currently rendered nowhere.** The role directory was the third tab of the
 * removed combined screen, and the new Account Management section does its
 * navigation job natively — each role now has its own sidebar entry, which is
 * exactly what its "managed at" links pointed to. Kept, not deleted: it also
 * carries the role reference notes and the statement that admin-tier accounts
 * cannot be listed or removed, and nothing else says that. Awaiting a decision
 * on whether that belongs somewhere or goes.
 */
export { ProvisionUsersTab } from "./components/ProvisionUsersTab";
export { AdminUsersTab } from "./components/AdminUsersTab";
export { AccountDeletionDetailDrawer } from "./components/AccountDeletionDetailDrawer";
export { AdminUserDetailDrawer } from "./components/AdminUserDetailDrawer";
export { CreateUserDrawer } from "./components/CreateUserDrawer";
export {
  useGetAccountDeletionRequestsQuery,
  useGetAccountDeletionStatsQuery,
  useGetAccountDeletionRequestQuery,
  useSetAccountDeletionStatusMutation,
  accountDeletionStatusVariant,
} from "./api/accountDeletionApi";
export {
  useCreateUserMutation,
  useGetAdminUsersQuery,
  useGetAdminUserQuery,
  useUpdateAdminUserMutation,
  useSetAdminUserStatusMutation,
  useResetAdminUserPasswordMutation,
  useDeleteAdminUserMutation,
  adminUserStatusVariant,
} from "./api/adminUserApi";
export { ROLE_OPTIONS, ROLE_LABELS, ROLE_NOTES, ROLE_MANAGED_AT } from "./lib/roles";
export { createUserSchema, type CreateUserFormData } from "./schemas/createUser.schema";
export { adminUserSchema, type AdminUserFormData } from "./schemas/adminUser.schema";
export { ADMIN_TIER_ROLES, isAdminTierRole } from "./types/adminUser.types";
export type {
  AdminUser,
  AdminUserApi,
  AdminUserListResult,
  AdminTierRole,
  GetAdminUsersParams,
  UpdateAdminUserPayload,
  SetAdminUserStatusPayload,
} from "./types/adminUser.types";
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
