import { VERIFICATION_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type { ApiVerificationListResponse } from "../types/verification.types";

// Query parameters for fetching partner verification reports.
export interface GetVerificationReportsParams {
  page?: number;
  limit?: number;
  // Free-text search term, sent to the backend as `?search=...`.
  search?: string;
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
  }),
  overrideExisting: false,
});

export const { useGetVerificationReportsQuery } = verificationApi;
