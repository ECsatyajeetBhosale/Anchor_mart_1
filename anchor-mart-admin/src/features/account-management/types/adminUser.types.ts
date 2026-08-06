import type { BadgeProps } from "@/components/ui/badge";

/**
 * Admin-tier user administration.
 *
 * Flow 31 documents only `create-user` and says plainly that admins "cannot be
 * listed or removed at all". That is out of date: the API now exposes list,
 * detail, update, status, password-reset and soft-delete for admin accounts.
 * These types cover that surface.
 *
 * **Scope.** Unlike the six sailor endpoints (which are `role=customer` only),
 * these operate on the admin tiers. The `role` filter accepts any `User.Role`
 * value, so the same list can answer "every admin" or one specific tier.
 */

/** The two tiers this screen administers. */
export const ADMIN_TIER_ROLES = ["admin", "super_admin"] as const;
export type AdminTierRole = (typeof ADMIN_TIER_ROLES)[number];

/** True for the roles whose creation requires a super-admin caller (SEC-1). */
export function isAdminTierRole(role: string): role is AdminTierRole {
  return (ADMIN_TIER_ROLES as readonly string[]).includes(role);
}

/** Badge colour variant for an admin-user status pill. */
export type AdminUserBadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * Raw row from `GET /superadmin/admin/users/`.
 *
 * Every field is optional: the list and detail shapes are not documented in any
 * flow doc, so this reads defensively rather than against a contract. A missing
 * field degrades to "-" instead of blanking the row.
 */
export interface AdminUserApi {
  id?: string | null;
  email?: string | null;
  role?: string | null;
  role_display?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  country_code?: string | null;
  whatsapp_number?: string | null;
  contact_no?: string | null;
  is_active?: boolean | null;
  is_staff?: boolean | null;
  /** Pre-formatted display string on the list; ISO on some detail payloads. */
  joined?: string | null;
  date_joined?: string | null;
  created_at?: string | null;
  last_login?: string | null;
}

/** The flat row the table and drawer render. */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  /** Raw role token — what the API accepts, and what the filter sends. */
  role: string;
  roleLabel: string;
  contact: string;
  joined: string;
  lastLogin: string;
  /**
   * The edit form's fields, kept unjoined alongside the display strings.
   *
   * The drawer must not reconstruct these by parsing `name` and `contact`:
   * a two-word surname splits wrong, and a number stored without a country
   * code would be re-read as one. Carrying the raw values costs four keys and
   * removes a whole class of silent corruption on save.
   */
  firstName: string;
  lastName: string;
  countryCode: string;
  whatsappNumber: string;
  /** Absent reads as active — only an explicit `false` deactivates. */
  isActive: boolean;
  statusLabel: string;
  statusVariant: AdminUserBadgeVariant;
  /**
   * Django-admin access. Set at creation for admin-tier accounts with a real
   * email; read-only here, shown because it explains why the account has a
   * password at all.
   */
  isStaff: boolean;
}

/** Transformed list result the tab consumes. */
export interface AdminUserListResult {
  count: number;
  users: AdminUser[];
}

/** Query params for the list endpoint. */
export interface GetAdminUsersParams {
  page: number;
  limit: number;
  search?: string;
  /** Any `User.Role` value; omitted for "all". */
  role?: string;
  /** Sent as the literal string the API expects, not a boolean. */
  isActive?: "true" | "false";
}

/**
 * Update body. Every key is optional — both PUT and PATCH are partial, so only
 * what changed is sent.
 *
 * `role` is deliberately absent: the sailor equivalent 400s on a role change
 * ("roles are set when the account is created"), and there is no reason to
 * assume the admin endpoint is more permissive.
 */
export interface UpdateAdminUserPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  country_code?: string;
  whatsapp_number?: string;
}

/** Body of the status endpoint. Must be a real JSON boolean. */
export interface SetAdminUserStatusPayload {
  id: string;
  is_active: boolean;
}
