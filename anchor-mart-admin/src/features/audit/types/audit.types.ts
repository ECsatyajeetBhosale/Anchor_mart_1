import type { BadgeProps } from "@/components/ui/badge";

/**
 * Flow 34 — Audit Trail & Tamper-Evidence.
 *
 * Entries are hash-chained: each row carries its own `entry_hash` and the
 * `prev_hash` of the one before it, so recomputing the chain detects an edited
 * row, a re-linked row, or a truncated tail.
 */

export type AuditBadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * The seven subject types the API accepts. Sending anything else is a 400
 * ("Must be one of [...]"), so the filter is built from this list rather than
 * from whatever happens to appear in the current page of results.
 */
export const AUDIT_SUBJECT_TYPES = [
  "order",
  "user",
  "coupon",
  "port",
  "product",
  "partner",
  "config",
] as const;

export type AuditSubjectType = (typeof AUDIT_SUBJECT_TYPES)[number];

/**
 * The two categories. This is also the access boundary: a sub-admin may only
 * read `order`, and explicitly asking for `operational` is a 403.
 */
export const AUDIT_CATEGORIES = ["order", "operational"] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

/**
 * Every registered action, grouped by the category it belongs to. Kept split
 * because the action filter is narrowed to the categories the signed-in admin
 * can actually read — offering `login_failed` to a sub-admin would only produce
 * an empty page (their query is force-scoped to `order`).
 */
export const AUDIT_ORDER_ACTIONS = [
  "status_change",
  "refund",
  "bill_generated",
  "payment_link",
  "gift_granted",
  // The partner's two pickup answers (2026-09-02). `gift_not_collected` is the
  // one worth filtering for: it means the gift is still open and waiting on an
  // admin, where `gift_collected` is just the parcel moving as expected.
  "gift_collected",
  "gift_not_collected",
] as const;

export const AUDIT_OPERATIONAL_ACTIONS = [
  "login_succeeded",
  "login_failed",
  "logout",
  "role_changed",
  "account_created",
  "account_blocked",
  "account_unblocked",
  "account_deletion_reviewed",
  "seller_request_reviewed",
  "seller_request_resubmitted",
  "coupon_created",
  "coupon_updated",
  "coupon_deleted",
  "port_config_changed",
  "price_changed",
  "partner_availability_changed",
  "partner_capability_changed",
  "points_adjusted",
  "loyalty_config_changed",
] as const;

export type AuditAction =
  | (typeof AUDIT_ORDER_ACTIONS)[number]
  | (typeof AUDIT_OPERATIONAL_ACTIONS)[number];

/** Who performed the action. Absent for system-raised entries. */
export interface AuditActorApi {
  id?: string | number | null;
  email?: string | null;
  role?: string | null;
}

/** Raw entry from `GET /superadmin/audit/`. */
export interface AuditEntryApi {
  id: string;
  action?: string | null;
  action_display?: string | null;
  category?: string | null;
  subject_type?: string | null;
  subject_id?: string | null;
  /** Human handle for the subject — an order number, an email, a coupon code. */
  subject_label?: string | null;
  actor?: AuditActorApi | null;
  summary?: string | null;
  /** Free-form per-action detail (`{from, to, note}` on a status change, …). */
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  entry_hash?: string | null;
  prev_hash?: string | null;
  /** `1` or `2` — the hashing scheme the row was written under. */
  hash_version?: number | null;
}

/** Flat UI row the audit table renders. */
export interface AuditEntry {
  id: string;
  /** Raw action token. */
  action: string;
  /** `action_display` when present, else the raw token. */
  actionLabel: string;
  category: string;
  categoryLabel: string;
  categoryVariant: AuditBadgeVariant;
  subjectType: string;
  subjectTypeLabel: string;
  subjectId: string;
  /** `subject_label` when present, else the id. */
  subjectLabel: string;
  actorEmail: string;
  actorRole: string;
  actorId: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  entryHash: string;
  prevHash: string;
  hashVersion: string;
}

/** Query params for the audit list. Empty values are omitted, not sent blank. */
export interface GetAuditEntriesParams {
  page?: number;
  limit?: number;
  subjectType?: string;
  subjectId?: string;
  actorId?: string;
  action?: string;
  category?: string;
  /** ISO-8601 lower bound on `created_at`. */
  from?: string;
  /** ISO-8601 upper bound on `created_at`. */
  to?: string;
}

export interface AuditListResult {
  count: number;
  entries: AuditEntry[];
}

/** Params for `GET /superadmin/audit/verify/` — both are required (400 otherwise). */
export interface VerifyChainParams {
  subjectType: string;
  subjectId: string;
}

/**
 * Verification verdict.
 *
 * **A broken chain still answers `200`** — `verified` is the verdict, not the
 * status code, so callers must read this payload rather than branching on
 * success/failure of the request.
 */
export interface ChainVerification {
  subjectType: string;
  subjectId: string;
  verified: boolean;
  /** Describes the first break found; null on a clean chain. */
  error: string | null;
  /** How many entries were recomputed. */
  entries: number;
  /**
   * When an authorised retention job truncated the head of the chain, the
   * cut-off timestamp. Not a tampering signal — a pruned chain still verifies.
   */
  prunedBefore: string | null;
}
