import { VERIFICATION_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  ApiRawReport,
  ApiVerificationListResponse,
  ApiVerificationStats,
} from "../types/verification.types";

// Query parameters for fetching partner verification reports.
export interface GetVerificationReportsParams {
  page?: number;
  limit?: number;
  // Free-text search term, sent to the backend as `?search=...`.
  search?: string;
  /**
   * Order status to scope the queue to. Omitted → the server defaults to
   * `verification_submitted` (the pending-review queue).
   */
  orderStatus?: string;
}

/** Unwraps a `{ data }` envelope some responses use. */
function unwrap<T>(res: unknown): T {
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

export const verificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getVerificationReports: builder.query<
      ApiVerificationListResponse,
      GetVerificationReportsParams
    >({
      query: (params) => ({
        url: VERIFICATION_ENDPOINTS.GET_REPORTS,
        method: "GET",
        // DRF pagination uses `page_size` (not `limit`); empty params are omitted.
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          order_status: params.orderStatus || undefined,
        },
      }),
      providesTags: (result) =>
        result?.results
          ? [
              ...result.results.map(({ id }) => ({ type: "Verifications" as const, id })),
              { type: "Verifications", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Verifications", id: "PARTIAL-LIST" }],
    }),

    /** Flow 06 API 4 — the three console counters. Takes no parameters. */
    getVerificationStats: builder.query<ApiVerificationStats, void>({
      query: () => ({ url: VERIFICATION_ENDPOINTS.GET_STATS, method: "GET" }),
      transformResponse: (res: unknown): ApiVerificationStats =>
        unwrap<ApiVerificationStats>(res) ?? {},
      providesTags: [{ type: "Verifications", id: "STATS" }],
    }),

    /**
     * Flow 06 API 7 — every round for one order, newest first, unpaginated.
     * Returns a plain array; a `{ data }` envelope is unwrapped defensively.
     */
    getOrderReports: builder.query<ApiRawReport[], string>({
      query: (orderId) => ({
        url: VERIFICATION_ENDPOINTS.GET_ORDER_REPORTS,
        method: "GET",
        params: { order_id: orderId },
      }),
      transformResponse: (res: unknown): ApiRawReport[] => {
        const body = unwrap<unknown>(res);
        return Array.isArray(body) ? (body as ApiRawReport[]) : [];
      },
      providesTags: (_result, _error, orderId) => [{ type: "Verifications", id: orderId }],
    }),

    /**
     * Flow 06 API 8 — mark a report reviewed. Bookkeeping only: it transitions no
     * order and unblocks no billing, but it does move the `verified_today` counter,
     * so the stats tag is invalidated alongside the list.
     */
    markReportReviewed: builder.mutation<{ message?: string }, string>({
      query: (reportId) => ({
        url: VERIFICATION_ENDPOINTS.REVIEW_REPORT,
        method: "POST",
        body: { report_id: reportId },
      }),
      invalidatesTags: (_r, _e, reportId) => [
        { type: "Verifications", id: reportId },
        { type: "Verifications", id: "PARTIAL-LIST" },
        { type: "Verifications", id: "STATS" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetVerificationReportsQuery,
  useGetVerificationStatsQuery,
  useGetOrderReportsQuery,
  useMarkReportReviewedMutation,
} = verificationApi;
