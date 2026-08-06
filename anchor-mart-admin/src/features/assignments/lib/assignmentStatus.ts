/**
 * Assignment statuses (Flow 28, extended 2026-08-03).
 *
 * A verify job and a delivery job used to be indistinguishable — every
 * assignment of either kind was written as `assigned`. Verify jobs are now
 * stamped `verifying` at creation and become **`verified`** when the report
 * lands, which is what lets the boards say what kind of work a partner is
 * holding.
 */
export const ASSIGNMENT_STATUSES = [
  "assigned",
  "verifying",
  "verified",
  "delivered",
  "failed",
  "rejected",
  "reassigned",
  "cancelled",
] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number] | (string & {});

/** Which half of the pipeline a job belongs to, or null when the status does not say. */
export type JobKind = "verify" | "deliver" | null;

/**
 * The kind of work an assignment status represents.
 *
 * ⚠️ `rejected` / `reassigned` / `cancelled` **overwrite** `verifying` /
 * `verified`, so they carry no record of which kind of job they were. They
 * return `null` rather than a guess — deriving a job kind from them is exactly
 * the mistake the flow doc warns against.
 */
export function jobKindForStatus(status: string): JobKind {
  const key = status.trim().toLowerCase();
  if (key === "verifying" || key === "verified") return "verify";
  if (key === "assigned" || key === "delivered" || key === "failed") return "deliver";
  return null;
}

/**
 * Whether a partner is still *working* this assignment.
 *
 * **`verified` is deliberately excluded.** A partner who has submitted their
 * availability report keeps the assignment — `is_active` stays true, since they
 * are still the one on the hook if the order comes back for re-verification —
 * but their work is done, so they are not on duty. Treating `verified` as live
 * is what made finished verifiers read as busy indefinitely.
 *
 * This answers "actively working right now". It is **not** the same question as
 * `is_active` ("still holds this order"), which is what the delete guard uses.
 * Swapping the two is how a partner still holding an order became deletable.
 */
export function isWorkInProgress(status: string): boolean {
  const key = status.trim().toLowerCase();
  return key === "assigned" || key === "verifying";
}
