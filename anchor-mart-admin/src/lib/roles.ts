import type { AdminFeature } from "@/features/auth/types/auth.types";
import { useAppSelector } from "@/hooks/useAppDispatch";

/**
 * The two admin tiers this console is issued to. `super_admin` is unrestricted;
 * `admin` (a "sub-admin") runs the business day to day.
 *
 * Kept for the places that genuinely need the *tier* rather than a capability —
 * order ownership, where "a super admin may act on anyone's order" is a rule
 * about seniority, not a named feature. For anything the backend labels with a
 * `Feature`, ask `can()` instead: see the note on `AdminAccess.canManageCatalog`
 * for what goes wrong when a capability is re-derived from the role here.
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
   * Whether the session holds `feature`, per the backend's own capability list.
   *
   * Fails closed: a session persisted by a build that predates `features`
   * rehydrates without one and holds nothing until the app-load `GET /admin/me/`
   * refresh lands (see `ProtectedRoute`). Briefly showing too little is
   * recoverable; briefly showing too much is not.
   */
  can: (feature: AdminFeature) => boolean;
  /**
   * Whether this admin may **create or delete** catalog entities — products,
   * categories, and their marine-emergency counterparts.
   *
   * This used to read `isSuperAdmin`, which was wrong in the restrictive
   * direction: `catalog.manage` sits in the backend's `OPERATIONAL` set, which
   * `ROLE_FEATURES` grants to the `admin` tier too. Sub-admins were entitled to
   * create and delete all along, and the console hid the controls from them.
   * That is precisely the drift the backend's feature list exists to prevent —
   * a role→capability map maintained on the client is a second source of truth
   * that goes stale the moment a capability moves tiers.
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
 * Capabilities come from the `features` list the backend issues with the
 * identity — never from the role. Reads off the auth slice, which is populated
 * from login / verify-otp, refreshed by `GET /admin/me/` on app load, and
 * rehydrated from localStorage in between, so a hard refresh does not flash a
 * differently-shaped UI while a request is in flight.
 */
export function useAdminAccess(): AdminAccess {
  const role = useAppSelector((s) => normaliseRole(s.auth.user?.role));
  const features = useAppSelector((s) => s.auth.user?.features);
  const isSuperAdmin = role === SUPER_ADMIN_ROLE;
  const can = (feature: AdminFeature) => !!features?.includes(feature);
  return {
    role,
    isSuperAdmin,
    can,
    canManageCatalog: can("catalog.manage"),
  };
}
