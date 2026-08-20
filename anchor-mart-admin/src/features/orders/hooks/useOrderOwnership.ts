import { useAppSelector } from "@/hooks/useAppDispatch";
import type { AssignedAdmin } from "../types/ownership.types";

/** How an order's ownership relates to the signed-in admin. */
export type OwnershipState =
  /** Nobody holds it — only an Admin can put it into someone's hands. */
  | "unassigned"
  /** The signed-in admin holds it. */
  | "mine"
  /** Another admin holds it. */
  | "other";

/**
 * Ownership rules for Flow 27, resolved against the signed-in admin.
 *
 * **Assignment is an Admin-only power** (product decision, 2026-08-20). An
 * Operator (`admin`) never puts an order into anybody's hands — not their own,
 * not a colleague's. They work the orders an Admin (`super_admin`) hands them,
 * and the only ownership move left to them is handing one back (`canRelease`).
 * Self-service pickup used to be the norm here, which made "who is accountable
 * for this order" a first-come race rather than a decision someone made.
 *
 * The gate has several distinct questions, and they do not share an answer:
 *
 *   - **Who owns it?** (`stateOf`) — purely about `assigned_admin`.
 *   - **May I write to it?** (`canManage`) — a super admin may write regardless
 *     of who owns it; the gate has no `is_super_admin` branch to satisfy.
 *   - **May I decide who owns it?** (`canClaim` / `canReassign`) — super admin
 *     only, whether the destination is themselves or an operator.
 *   - **May I give it up?** (`canRelease`) — the current owner, or a super
 *     admin. Not an assignment: it names no recipient.
 *
 * ⚠️ **A UX gate, never a security one.** The server remains the authority;
 * these only decide what the console offers.
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

  /**
   * Should a "Manage Order" (claim) action be offered?
   *
   * Two conditions, and both are required:
   *  - **Super admin only.** Claiming is assigning the order to yourself, and
   *    that is the same authority as assigning it to anyone else. An Operator
   *    who reached this endpoint would take accountability nobody granted them.
   *  - **Unassigned only.** Claiming only ever succeeds on an order nobody
   *    holds — offering it on one already held would produce a guaranteed 409,
   *    for a super admin as much as anyone else.
   */
  function canClaim(assignedAdmin?: AssignedAdmin | null): boolean {
    return isSuperAdmin && stateOf(assignedAdmin) === "unassigned";
  }

  /**
   * May the signed-in admin hand this order to someone else?
   *
   * Super admin only. This used to also pass the current owner, which let an
   * Operator push accountability onto a colleague who never agreed to it — the
   * same power as assigning, reached from the other end. An Operator who wants
   * out uses `canRelease`, which returns the order to the pool and leaves the
   * choice of the next owner where it belongs.
   */
  function canReassign(_assignedAdmin?: AssignedAdmin | null): boolean {
    return isSuperAdmin;
  }

  /**
   * May the signed-in admin give this order up, with no destination?
   *
   * The owner (or a super admin). Deliberately still open to an Operator: it
   * assigns the order to nobody, so it grants no one anything, and without it
   * an Operator handed an order in error would have no way out of it.
   */
  function canRelease(assignedAdmin?: AssignedAdmin | null): boolean {
    return isSuperAdmin || stateOf(assignedAdmin) === "mine";
  }

  return {
    isSuperAdmin,
    currentEmail,
    stateOf,
    canManage,
    canClaim,
    canReassign,
    canRelease,
  };
}
