import { useAppSelector } from "@/hooks/useAppDispatch";

/**
 * Flow 34's role scoping, mirrored client-side.
 *
 * The server is the authority — a sub-admin asking for `category=operational`
 * gets a 403, and `/audit/verify/` refuses them outright. This hook exists so
 * the console doesn't *offer* what will be refused: a filter that always 403s
 * and a button that always fails are worse than not showing them at all.
 *
 * It is a UX gate, never a security one. Nothing here is trusted by the API.
 */
export interface AuditAccess {
  /** True for `super_admin` — the only role with unrestricted access. */
  isSuperAdmin: boolean;
  /** Sub-admins cannot read `operational` entries. */
  canReadOperational: boolean;
  /** Chain verification is super-admin only. */
  canVerify: boolean;
  /**
   * The category a sub-admin is pinned to, or `null` when the admin may choose.
   * Sent on every request for a sub-admin so the scoping is explicit in the
   * query rather than implied by the server's default.
   */
  forcedCategory: "order" | null;
}

export function useAuditAccess(): AuditAccess {
  const role = useAppSelector((s) => s.auth.user?.role ?? "");
  const isSuperAdmin = role.trim().toLowerCase() === "super_admin";
  return {
    isSuperAdmin,
    canReadOperational: isSuperAdmin,
    canVerify: isSuperAdmin,
    forcedCategory: isSuperAdmin ? null : "order",
  };
}
