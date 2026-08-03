import { AUDIT_ENDPOINTS } from "@/lib/apiEndpoints";
import { asNumber, asString, getProp, unwrapData, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import { MESSAGES } from "@/lib/messages";
import type {
  AuditBadgeVariant,
  AuditEntry,
  AuditEntryApi,
  AuditListResult,
  ChainVerification,
  GetAuditEntriesParams,
  VerifyChainParams,
} from "../types/audit.types";

const M = MESSAGES.AUDIT;

const FALLBACK = "-";

function dash(value: unknown): string {
  const s = asString(value).trim();
  return s === "" ? FALLBACK : s;
}

/**
 * Category → badge colour. Operational entries are the privileged half of the
 * trail (logins, role changes, config edits), so they read as `purple` against
 * the `navy` of routine order activity.
 */
const CATEGORY_VARIANT: Record<string, AuditBadgeVariant> = {
  order: "navy",
  operational: "purple",
};

export function auditCategoryVariant(category: string): AuditBadgeVariant {
  return CATEGORY_VARIANT[category.trim().toLowerCase()] ?? "neutral";
}

/** Turns `status_change` into `Status change` for actions the API didn't label. */
function humanizeAction(action: string): string {
  if (!action) return FALLBACK;
  const spaced = action.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function toAuditEntry(row: AuditEntryApi): AuditEntry {
  const action = asString(row.action).trim();
  const category = asString(row.category).trim();
  const subjectType = asString(row.subject_type).trim();
  const subjectId = asString(row.subject_id).trim();
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : null;

  return {
    id: asString(row.id),
    action,
    actionLabel: row.action_display?.trim() ? row.action_display.trim() : humanizeAction(action),
    category,
    categoryLabel: M.CATEGORY_LABELS[category] ?? (category || FALLBACK),
    categoryVariant: auditCategoryVariant(category),
    subjectType,
    subjectTypeLabel: M.SUBJECT_LABELS[subjectType] ?? (subjectType || FALLBACK),
    subjectId,
    // The label is the readable handle (order number, email, coupon code); fall
    // back to the raw id so the column is never blank.
    subjectLabel: row.subject_label?.trim() ? row.subject_label.trim() : dash(subjectId),
    actorEmail: dash(row.actor?.email),
    actorRole: dash(row.actor?.role),
    actorId: dash(row.actor?.id),
    summary: dash(row.summary),
    metadata: metadata && Object.keys(metadata).length > 0 ? metadata : null,
    createdAt: dash(row.created_at),
    entryHash: dash(row.entry_hash),
    prevHash: dash(row.prev_hash),
    hashVersion: row.hash_version != null ? `v${row.hash_version}` : FALLBACK,
  };
}

export const auditApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * §1 — the audit list, newest first.
     *
     * Every filter is validated server-side, so blanks are omitted rather than
     * sent empty. Note the response nests its rows under
     * `results.data` — `unwrapList` handles that envelope.
     */
    getAuditEntries: builder.query<AuditListResult, GetAuditEntriesParams>({
      query: (params) => ({
        url: AUDIT_ENDPOINTS.GET_ENTRIES,
        method: "GET",
        params: {
          page: params.page,
          page_size: params.limit,
          subject_type: params.subjectType || undefined,
          subject_id: params.subjectId || undefined,
          actor_id: params.actorId || undefined,
          action: params.action || undefined,
          category: params.category || undefined,
          from: params.from || undefined,
          to: params.to || undefined,
        },
      }),
      transformResponse: (res: unknown): AuditListResult => {
        const { count, items } = unwrapList<AuditEntry>(res, (row) =>
          toAuditEntry(row as AuditEntryApi),
        );
        return { count, entries: items };
      },
      providesTags: [{ type: "Audit", id: "PARTIAL-LIST" }],
    }),

    /**
     * §2 — recompute one subject's chain. **Super admin only** (403 otherwise).
     *
     * A tampered or broken chain is reported as `200` + `verified: false`, so
     * this must never be treated as a failure path — the verdict lives in the
     * payload. Lazy so it only runs when an admin asks for it, and never cached
     * (`keepUnusedDataFor: 0`) because a stale "intact" answer is worse than no
     * answer.
     */
    verifyAuditChain: builder.query<ChainVerification, VerifyChainParams>({
      query: ({ subjectType, subjectId }) => ({
        url: AUDIT_ENDPOINTS.VERIFY_CHAIN,
        method: "GET",
        params: { subject_type: subjectType, subject_id: subjectId },
      }),
      transformResponse: (res: unknown): ChainVerification => {
        const payload = unwrapData<unknown>(res);
        const error = getProp(payload, "error");
        const pruned = getProp(payload, "pruned_before");
        return {
          subjectType: asString(getProp(payload, "subject_type")),
          subjectId: asString(getProp(payload, "subject_id")),
          verified: getProp(payload, "verified") === true,
          error: error == null || error === "" ? null : asString(error),
          entries: asNumber(getProp(payload, "entries")),
          prunedBefore: pruned == null || pruned === "" ? null : asString(pruned),
        };
      },
      keepUnusedDataFor: 0,
    }),
  }),
  overrideExisting: false,
});

export const { useGetAuditEntriesQuery, useLazyVerifyAuditChainQuery } = auditApi;
