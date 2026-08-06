import { useAppSelector } from "@/hooks/useAppDispatch";

/**
 * The two admin tiers this console is issued to. `super_admin` is unrestricted;
 * `admin` (a "sub-admin") is the lower tier the backend gates several endpoints
 * against — see `features/audit/lib/auditAccess.ts` for the flow-34 case.
 */
export const SUPER_ADMIN_ROLE = "super_admin";

/** Normalises the role string the login/verify-otp response stores on the session. */
export function normaliseRole(role: string | null | undefined): string {
  return (role ?? "").trim().toLowerCase();
}

/** True only for `super_admin`. Anything unrecognised is treated as the lower tier. */
export function isSuperAdminRole(role: string | null | undefined): boolean {
  return normaliseRole(role) === SUPER_ADMIN_ROLE;
}

export interface AdminAccess {
  /** The session's normalised role, `""` when signed out. */
  role: string;
  /** True for `super_admin` — the only unrestricted tier. */
  isSuperAdmin: boolean;
  /**
   * Whether this admin may **create or delete** catalog entities — products,
   * categories, and their marine-emergency counterparts.
   *
   * Editing is deliberately *not* gated: a sub-admin still corrects a price or a
   * description. What they may not do is change the shape of the catalog, where
   * a mistaken delete cascades into orders and a stray create leaks to every
   * sailor. Creation and deletion are the two irreversible-in-practice verbs, so
   * they are the two this pins to the top tier.
   *
   * ⚠️ **A UX gate, never a security one.** It stops the console offering what
   * the operator should not reach; the server remains the authority. Nothing
   * here is trusted by the API, and hiding a button is not an access control.
   */
  canManageCatalog: boolean;
}

/**
 * The session's admin tier and what it unlocks.
 *
 * Reads the role off the auth slice, which is populated from the login /
 * verify-otp response and rehydrated from localStorage — so a hard refresh does
 * not briefly widen the UI while a profile call is in flight.
 */
export function useAdminAccess(): AdminAccess {
  const role = useAppSelector((s) => normaliseRole(s.auth.user?.role));
  const isSuperAdmin = role === SUPER_ADMIN_ROLE;
  return {
    role,
    isSuperAdmin,
    canManageCatalog: isSuperAdmin,
  };
}
