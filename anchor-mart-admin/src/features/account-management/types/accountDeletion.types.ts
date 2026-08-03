import type { BadgeProps } from "@/components/ui/badge";

/**
 * Flow 31 §8–11 — Account-Deletion Review.
 *
 * A user asks to be erased; an admin agrees (`approve`), refuses (`reject`) or
 * carries it out (`complete`). Approve and complete are two separate steps by
 * design — see {@link AccountDeletionDecision}.
 */

/** Badge colour variant used for a deletion-request status pill. */
export type AccountDeletionBadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * The four states a request can hold. `rejected` and `completed` are terminal —
 * an answered request is not re-answerable, and trying is a 409.
 *
 * ```
 * pending ──approve──► approved ──complete──► completed  (terminal)
 *    └──────reject────► rejected                         (terminal)
 * ```
 */
export const ACCOUNT_DELETION_STATUS_KEYS = [
  "pending",
  "approved",
  "rejected",
  "completed",
] as const;

export type AccountDeletionStatus = (typeof ACCOUNT_DELETION_STATUS_KEYS)[number];

/**
 * Decision tokens accepted by `POST …/account-deletion/set-status/`.
 *
 * **`approve` ≠ `complete`.** Approving records agreement and leaves the account
 * untouched; completing erases it. Fusing them would let one click deactivate a
 * sailor with a delivery in flight, so the API keeps them apart and so does this
 * UI.
 */
export type AccountDeletionDecision = "approve" | "reject" | "complete";

/** The roles a requester can hold — used by the queue's role filter. */
export const ACCOUNT_DELETION_ROLE_KEYS = [
  "customer",
  "delivery_partner",
  "seller",
  "admin",
  "super_admin",
] as const;

export type AccountDeletionRole = (typeof ACCOUNT_DELETION_ROLE_KEYS)[number];

/**
 * Raw queue row from `GET …/account-deletion/requests/`.
 *
 * Every field is optional so a partial payload degrades to "-" rather than
 * blanking the table.
 */
export interface AccountDeletionRequestApi {
  /** **Integer**, not a UUID — `set-status` and the detail read both take it. */
  id: number | string;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  user_role?: string | null;
  /** Whether the account is still live. Erasure is what finally flips this. */
  user_is_active?: boolean | null;
  /** The requester's own words — searchable, and the reason to judge against. */
  reason?: string | null;
  status?: string | null;
  status_display?: string | null;
  reviewed_by_email?: string | null;
  reviewed_at?: string | null;
  admin_note?: string | null;
  processed_at?: string | null;
  created_at?: string | null;
}

/**
 * Detail from `GET …/account-deletion/request/?request_id=` — the queue row plus
 * the three figures an admin needs to judge whether erasing is safe.
 */
export interface AccountDeletionDetailApi extends AccountDeletionRequestApi {
  updated_at?: string | null;
  /** Orders **not** in a terminal state. Non-zero blocks completion (409). */
  open_order_count?: number | null;
  total_order_count?: number | null;
  /** Full points balance across both types (referral + loyalty). */
  outstanding_points?: number | null;
}

/**
 * UI row the queue table renders. Display strings are already "-"-guarded by the
 * API transform so columns render the value directly.
 */
export interface AccountDeletionRequest {
  /** Stringified integer id — the table's `rowKey` and the write key. */
  id: string;
  /** Requester's user UUID (blank when the payload omits it). */
  userId: string;
  /** Requester name, falling back to their email. */
  name: string;
  email: string;
  /** Raw role token (`customer`, `delivery_partner`, …). */
  role: string;
  /** Human label for {@link role}. */
  roleLabel: string;
  /** Whether the account is still active. */
  isActive: boolean | null;
  /** The requester's stated reason. */
  reason: string;
  /** Raw status token — drives which decisions the drawer offers. */
  status: string;
  /** Status label shown in the badge. */
  statusLabel: string;
  statusVariant: AccountDeletionBadgeVariant;
  /** Submission date label. */
  createdAt: string;
  /** Who answered it, and when — blank while pending. */
  reviewedBy: string;
  reviewedAt: string;
  /** The note the reviewer left (required on a rejection). */
  adminNote: string;
  /** When the erasure actually ran. */
  processedAt: string;
}

/** Query params for the review queue. Empty values are omitted, not sent blank. */
export interface GetAccountDeletionRequestsParams {
  page?: number;
  limit?: number;
  /** Free text over email, first/last name and the requester's `reason`. */
  search?: string;
  /** One of {@link ACCOUNT_DELETION_STATUS_KEYS}; anything else is a 400. */
  status?: string;
  /** A `User.Role` value; anything else is a 400. */
  role?: string;
  /** Exact match on the requester. A malformed UUID is a 400. */
  userId?: string;
}

/** Transformed queue result: server-side total + UI rows. */
export interface AccountDeletionListResult {
  count: number;
  requests: AccountDeletionRequest[];
}

/**
 * Queue counters from `GET …/account-deletion/stats/`. Optional so a partial
 * payload degrades to 0.
 */
export interface AccountDeletionStats {
  total?: number;
  pending?: number;
  approved?: number;
  rejected?: number;
  completed?: number;
}

/**
 * Body of `POST …/account-deletion/set-status/`.
 *
 * `adminNote` is **required** when `decision` is `"reject"` — the API 400s on a
 * blank one, so the drawer blocks it before firing.
 */
export interface SetAccountDeletionStatusPayload {
  requestId: string | number;
  decision: AccountDeletionDecision;
  adminNote?: string;
}
