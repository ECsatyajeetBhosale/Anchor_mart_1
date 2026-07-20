import { useAppSelector } from "@/hooks/useAppDispatch";
import type { AssignedAdmin } from "../types/ownership.types";

/** How an order's ownership relates to the signed-in admin. */
export type OwnershipState =
  /** Nobody holds it — a sub-admin must claim before writing. */
  | "unassigned"
  /** The signed-in admin holds it. */
  | "mine"
  /** Another admin holds it. */
  | "other";

/**
 * Ownership rules for Flow 27, resolved against the signed-in admin.
 *
 * The gate has two distinct questions, and they do not have the same answer:
 *
 *   - **Who owns it?** (`stateOf`) — purely about `assigned_admin`.
 *   - **May I write to it?** (`canManage`) — a super admin may write regardless
 *     of who owns it; the gate has no `is_super_admin` branch to satisfy.
 *
 * Note a super admin still gets a 409 from the *claim* endpoint on someone
 * else's order — they simply never need to call it. Use reassign for a real
 * handover (currently unusable from the panel: no endpoint lists admins).
 */
export function useOrderOwnership() {
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.role === "super_admin";
  const currentEmail = user?.email?.trim().toLowerCase() ?? "";

  function stateOf(assignedAdmin?: AssignedAdmin | null): OwnershipState {
    if (!assignedAdmin) return "unassigned";
    const ownerEmail = assignedAdmin.email?.trim().toLowerCase() ?? "";
    // Identity is matched on email: it is the only field present on both the
    // owner descriptor and the token payload we persist at login.
    return ownerEmail && ownerEmail === currentEmail ? "mine" : "other";
  }

  /** May the signed-in admin perform gated writes on this order? */
  function canManage(assignedAdmin?: AssignedAdmin | null): boolean {
    return isSuperAdmin || stateOf(assignedAdmin) === "mine";
  }

  /** Should a "Manage Order" (claim) action be offered? */
  function canClaim(assignedAdmin?: AssignedAdmin | null): boolean {
    // Claiming only ever succeeds on an unassigned order — offering it on one
    // already held would produce a guaranteed 409.
    return stateOf(assignedAdmin) === "unassigned";
  }

  return { isSuperAdmin, currentEmail, stateOf, canManage, canClaim };
}
