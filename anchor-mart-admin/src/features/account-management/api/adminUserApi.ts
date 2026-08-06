import { ADMIN_USER_ENDPOINTS } from "@/lib/apiEndpoints";
import { asString, unwrapData, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import { MESSAGES } from "@/lib/messages";
import type {
  AdminUser,
  AdminUserApi,
  AdminUserBadgeVariant,
  AdminUserListResult,
  GetAdminUsersParams,
  SetAdminUserStatusPayload,
  UpdateAdminUserPayload,
} from "../types/adminUser.types";
import type { CreateUserPayload } from "../types/user.types";

const A = MESSAGES.ACCOUNT_MANAGEMENT;
const M = A.ADMIN_USERS;

/** Placeholder for any null/undefined/blank value. */
const FALLBACK = "-";

/** Returns a trimmed string, or "-" when the value is null/undefined/blank. */
function dash(value: unknown): string {
  const s = asString(value).trim();
  return s === "" ? FALLBACK : s;
}

/** Joins a country code and number into one display string. */
function joinPhone(code: unknown, number: unknown): string {
  const num = asString(number).trim();
  if (!num) return "";
  const cc = asString(code).trim();
  if (!cc) return num;
  return `${cc.startsWith("+") ? cc : `+${cc}`} ${num}`;
}

/** Status → badge colour. Deactivated is neutral, not danger: it is reversible. */
export function adminUserStatusVariant(isActive: boolean): AdminUserBadgeVariant {
  return isActive ? "success" : "neutral";
}

/**
 * Maps a raw admin-user row into the flat row the table renders.
 *
 * Name resolution mirrors the rest of the app: an explicit full name wins,
 * then first+last, then the email. An admin account created WhatsApp-only
 * carries a synthesized `@wa.anchormart.invalid` login email, so falling back
 * to the email always yields something identifying.
 */
export function toAdminUser(row: AdminUserApi): AdminUser {
  const email = dash(row.email);
  const combined = `${asString(row.first_name).trim()} ${asString(row.last_name).trim()}`.trim();
  const name = asString(row.full_name).trim() || asString(row.name).trim() || combined || email;

  const role = asString(row.role).trim();
  // Absent reads as active — only an explicit `false` deactivates, matching the
  // rule the sailor list already uses.
  const isActive = row.is_active !== false;

  return {
    id: asString(row.id),
    name,
    email,
    role,
    roleLabel: asString(row.role_display).trim() || A.ROLE_LABELS[role] || role || FALLBACK,
    contact: joinPhone(row.country_code, row.whatsapp_number) || dash(row.contact_no),
    joined: dash(row.joined ?? row.date_joined ?? row.created_at),
    lastLogin: dash(row.last_login),
    isActive,
    statusLabel: isActive ? M.STATUS.ACTIVE : M.STATUS.INACTIVE,
    statusVariant: adminUserStatusVariant(isActive),
    isStaff: row.is_staff === true,
    // Kept raw for the edit form — see the note on `AdminUser`. Never derive
    // these back out of the joined `name` / `contact` display strings.
    firstName: asString(row.first_name).trim(),
    lastName: asString(row.last_name).trim(),
    countryCode: asString(row.country_code).trim(),
    whatsappNumber: asString(row.whatsapp_number).trim(),
  };
}

export const adminUserApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Flow 31 §7 — create a user of any role.
     *
     * Create is **not** admin-only: the `role` field picks the tier, and this
     * one endpoint provisions sailors, sellers and partners too. Admin-tier
     * roles require a super-admin caller (403 otherwise — SEC-1), which the
     * drawer gates client-side so the option is never offered.
     */
    createUser: builder.mutation<unknown, CreateUserPayload>({
      query: (body) => ({ url: ADMIN_USER_ENDPOINTS.CREATE_USER, method: "POST", body }),
      // A new admin-tier account belongs in the list immediately; a new sailor
      // does not affect it, but over-invalidating one small list is cheaper
      // than reading the role back out of the response to decide.
      invalidatesTags: [{ type: "AdminUsers", id: "PARTIAL-LIST" }],
    }),

    /** The admin-users table. Every filter is applied server-side. */
    getAdminUsers: builder.query<AdminUserListResult, GetAdminUsersParams>({
      query: (params) => ({
        url: ADMIN_USER_ENDPOINTS.GET_USERS,
        method: "GET",
        // Blank values are omitted rather than sent empty — an unrecognised
        // `role` is a 400 on every sibling endpoint, so assume the same here.
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          role: params.role || undefined,
          is_active: params.isActive || undefined,
        },
      }),
      transformResponse: (res: unknown): AdminUserListResult => {
        const { count, items } = unwrapList<AdminUser>(res, (row) =>
          toAdminUser(row as AdminUserApi),
        );
        return { count, users: items };
      },
      providesTags: (result) =>
        result?.users
          ? [
              ...result.users.map(({ id }) => ({ type: "AdminUsers" as const, id })),
              { type: "AdminUsers", id: "PARTIAL-LIST" },
            ]
          : [{ type: "AdminUsers", id: "PARTIAL-LIST" }],
    }),

    /** One admin user. The drawer opens on the row and upgrades when this lands. */
    getAdminUser: builder.query<AdminUser, string>({
      query: (id) => ({ url: ADMIN_USER_ENDPOINTS.GET_USER(id), method: "GET" }),
      transformResponse: (res: unknown): AdminUser => toAdminUser(unwrapData<AdminUserApi>(res)),
      providesTags: (_r, _e, id) => [{ type: "AdminUsers", id }],
    }),

    /**
     * Partial update. PATCH is used for both verbs the API accepts, since both
     * are partial and PATCH says so.
     */
    updateAdminUser: builder.mutation<unknown, { id: string; body: UpdateAdminUserPayload }>({
      query: ({ id, body }) => ({
        url: ADMIN_USER_ENDPOINTS.UPDATE_USER(id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "AdminUsers", id },
        { type: "AdminUsers", id: "PARTIAL-LIST" },
      ],
    }),

    /**
     * Activate / deactivate.
     *
     * Deactivating locks the account out of **both** OTP steps and the password
     * path immediately — a code issued a moment earlier stops working. It is
     * reversible, which is why the UI treats it as a toggle rather than a
     * destructive action.
     */
    setAdminUserStatus: builder.mutation<unknown, SetAdminUserStatusPayload>({
      query: ({ id, is_active }) => ({
        url: ADMIN_USER_ENDPOINTS.SET_USER_STATUS(id),
        method: "PATCH",
        body: { is_active },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "AdminUsers", id },
        { type: "AdminUsers", id: "PARTIAL-LIST" },
      ],
    }),

    /**
     * Generate a new password and email it.
     *
     * The password is **never returned** — there is nothing to display, copy or
     * reveal. The only honest confirmation is "we sent it to <email>".
     */
    resetAdminUserPassword: builder.mutation<unknown, string>({
      query: (id) => ({ url: ADMIN_USER_ENDPOINTS.RESET_USER_PASSWORD(id), method: "POST" }),
      // Nothing on the row changes, so no list invalidation.
    }),

    /** Soft-delete. The row stays; the account can no longer sign in. */
    deleteAdminUser: builder.mutation<unknown, string>({
      query: (id) => ({ url: ADMIN_USER_ENDPOINTS.DELETE_USER(id), method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "AdminUsers", id },
        { type: "AdminUsers", id: "PARTIAL-LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateUserMutation,
  useGetAdminUsersQuery,
  useGetAdminUserQuery,
  useUpdateAdminUserMutation,
  useSetAdminUserStatusMutation,
  useResetAdminUserPasswordMutation,
  useDeleteAdminUserMutation,
} = adminUserApi;
