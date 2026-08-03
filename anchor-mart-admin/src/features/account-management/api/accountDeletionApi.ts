import { ACCOUNT_DELETION_ENDPOINTS } from "@/lib/apiEndpoints";
import { unwrapData, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import { MESSAGES } from "@/lib/messages";
import type {
  AccountDeletionBadgeVariant,
  AccountDeletionDetailApi,
  AccountDeletionListResult,
  AccountDeletionRequest,
  AccountDeletionRequestApi,
  AccountDeletionStats,
  GetAccountDeletionRequestsParams,
  SetAccountDeletionStatusPayload,
} from "../types/accountDeletion.types";

const A = MESSAGES.ACCOUNT_MANAGEMENT;

/** Placeholder shown for any null/undefined/blank value. */
const FALLBACK = "-";

/** Returns a trimmed string, or "-" when the value is null/undefined/blank. */
function dash(value: unknown): string {
  if (value === null || value === undefined) return FALLBACK;
  const s = String(value).trim();
  return s === "" ? FALLBACK : s;
}

/**
 * Status → badge colour.
 *
 * `completed` is deliberately neutral rather than green: the account is gone,
 * which is an outcome to record, not a success to celebrate.
 */
const STATUS_VARIANT: Record<string, AccountDeletionBadgeVariant> = {
  pending: "warning",
  approved: "info",
  rejected: "danger",
  completed: "neutral",
};

export function accountDeletionStatusVariant(status: string): AccountDeletionBadgeVariant {
  return STATUS_VARIANT[status.trim().toLowerCase()] ?? "neutral";
}

/** Maps a raw queue row into the flat UI row the table columns render. */
export function toAccountDeletionRequest(row: AccountDeletionRequestApi): AccountDeletionRequest {
  const status = row.status ? String(row.status).trim() : "";
  const role = row.user_role ? String(row.user_role).trim() : "";
  const email = dash(row.user_email);
  const name = row.user_name?.trim() ? row.user_name.trim() : email;
  return {
    id: row.id != null ? String(row.id) : "",
    userId: row.user_id ? String(row.user_id) : "",
    name,
    email,
    role,
    roleLabel: A.ROLE_LABELS[role] ?? (role || FALLBACK),
    isActive: typeof row.user_is_active === "boolean" ? row.user_is_active : null,
    reason: dash(row.reason),
    status,
    statusLabel: dash(row.status_display ?? row.status),
    statusVariant: accountDeletionStatusVariant(status),
    createdAt: dash(row.created_at),
    reviewedBy: dash(row.reviewed_by_email),
    reviewedAt: dash(row.reviewed_at),
    adminNote: dash(row.admin_note),
    processedAt: dash(row.processed_at),
  };
}

export const accountDeletionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** §9 — the review queue. Every filter is validated server-side. */
    getAccountDeletionRequests: builder.query<
      AccountDeletionListResult,
      GetAccountDeletionRequestsParams
    >({
      query: (params) => ({
        url: ACCOUNT_DELETION_ENDPOINTS.GET_REQUESTS,
        method: "GET",
        // Blank values are omitted rather than sent empty — the API 400s on an
        // unrecognised `status`/`role` and a malformed `user_id`.
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          status: params.status || undefined,
          role: params.role || undefined,
          user_id: params.userId || undefined,
        },
      }),
      transformResponse: (res: unknown): AccountDeletionListResult => {
        const { count, items } = unwrapList<AccountDeletionRequest>(res, (row) =>
          toAccountDeletionRequest(row as AccountDeletionRequestApi),
        );
        return { count, requests: items };
      },
      providesTags: (result) =>
        result?.requests
          ? [
              ...result.requests.map(({ id }) => ({ type: "AccountDeletions" as const, id })),
              { type: "AccountDeletions", id: "PARTIAL-LIST" },
            ]
          : [{ type: "AccountDeletions", id: "PARTIAL-LIST" }],
    }),

    /** §8 — queue counters. No params. */
    getAccountDeletionStats: builder.query<AccountDeletionStats, void>({
      query: () => ({ url: ACCOUNT_DELETION_ENDPOINTS.GET_STATS, method: "GET" }),
      transformResponse: (res: unknown): AccountDeletionStats =>
        unwrapData<AccountDeletionStats>(res) ?? {},
      providesTags: [{ type: "AccountDeletions", id: "STATS" }],
    }),

    /**
     * §10 — one request plus the account footprint. Keyed on the **integer**
     * `request_id` query param, not a path segment.
     */
    getAccountDeletionRequest: builder.query<AccountDeletionDetailApi, string>({
      query: (requestId) => ({
        url: ACCOUNT_DELETION_ENDPOINTS.GET_REQUEST,
        method: "GET",
        params: { request_id: requestId },
      }),
      transformResponse: (res: unknown): AccountDeletionDetailApi =>
        unwrapData<AccountDeletionDetailApi>(res),
      providesTags: (_r, _e, requestId) => [{ type: "AccountDeletions", id: requestId }],
    }),

    /**
     * §11 — approve / reject / complete. One endpoint, three decisions.
     *
     * The server row-locks for the duration, so a 409 here is not a retryable
     * failure: either another admin answered first, the request is terminal, or
     * the account still has orders in flight. The body names which.
     */
    setAccountDeletionStatus: builder.mutation<
      AccountDeletionDetailApi,
      SetAccountDeletionStatusPayload
    >({
      query: ({ requestId, decision, adminNote }) => ({
        url: ACCOUNT_DELETION_ENDPOINTS.SET_STATUS,
        method: "POST",
        body: {
          request_id: Number(requestId),
          decision,
          ...(adminNote ? { admin_note: adminNote } : {}),
        },
      }),
      transformResponse: (res: unknown): AccountDeletionDetailApi =>
        unwrapData<AccountDeletionDetailApi>(res),
      invalidatesTags: (_r, _e, { requestId }) => [
        { type: "AccountDeletions", id: String(requestId) },
        { type: "AccountDeletions", id: "PARTIAL-LIST" },
        { type: "AccountDeletions", id: "STATS" },
        // A completion erases the account, which moves the sailor counters too.
        { type: "Sailors", id: "PARTIAL-LIST" },
        { type: "Sailors", id: "STATS" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAccountDeletionRequestsQuery,
  useGetAccountDeletionStatsQuery,
  useGetAccountDeletionRequestQuery,
  useSetAccountDeletionStatusMutation,
} = accountDeletionApi;
