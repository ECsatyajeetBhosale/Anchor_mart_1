import { SELLER_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  GetSellerRequestsParams,
  RejectSellerPayload,
  SellerRequest,
  SellerRequestApi,
  SellerRequestBadgeVariant,
  SellerRequestListResult,
  SellerRequestStats,
} from "../types/sellerRequest.types";

/** Placeholder shown for any null/undefined/blank value. */
const FALLBACK = "-";

/** Returns a trimmed string, or "-" when the value is null/undefined/blank. */
function dash(value: unknown): string {
  if (value === null || value === undefined) return FALLBACK;
  const s = String(value).trim();
  return s === "" ? FALLBACK : s;
}

/** Safe property read off an unknown value. */
function getProp(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

/** Returns the value when it's an array, otherwise null. */
function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

/** Unwraps a `{ data }` envelope used by some stats responses. */
function unwrap<T>(res: unknown): T {
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

/** Maps a raw status token to its badge colour variant. */
const STATUS_VARIANT: Record<string, SellerRequestBadgeVariant> = {
  pending: "warning",
  reviewing: "info",
  under_review: "info",
  approved: "success",
  active: "success",
  rejected: "danger",
};

export function sellerStatusVariant(status: string): SellerRequestBadgeVariant {
  return STATUS_VARIANT[status.toLowerCase()] ?? "neutral";
}

/**
 * Normalises the many document-flag shapes into an uploaded boolean, or `null`
 * when the backend provides no document info (so the cell can render "-").
 */
function documentsUploaded(row: SellerRequestApi): boolean | null {
  if (typeof row.documents_uploaded === "boolean") return row.documents_uploaded;
  if (typeof row.documents === "boolean") return row.documents;
  const label = String(row.documents ?? "")
    .trim()
    .toLowerCase();
  if (label === "") return null;
  return label === "uploaded" || label === "complete" || label === "yes";
}

/** Maps a raw API row into the flat UI row the table columns render. */
function toSellerRequest(row: SellerRequestApi): SellerRequest {
  const status = row.status ? String(row.status).trim() : "";
  const docsOk = documentsUploaded(row);
  return {
    id: row.id != null ? String(row.id) : "",
    n: dash(row.full_name),
    e: dash(row.email),
    b: dash(row.business),
    // Products are not part of the list contract yet → "-".
    prod: dash(row.products),
    docs: docsOk === null ? FALLBACK : docsOk ? "Uploaded" : "Missing",
    docsOk,
    dt: dash(row.submitted_at),
    st: dash(row.status_display ?? row.status),
    status,
    sc: sellerStatusVariant(status),
  };
}

/**
 * Extracts the rows + total from the list envelope. The current contract is
 * `{ count, results: [...] }` (a plain array); older/DRF variants nest the
 * rows under `results.data`, so both are handled defensively.
 */
function extractList(res: unknown): { count: number; rows: SellerRequestApi[] } {
  const results = getProp(res, "results");
  const rows =
    asArray(getProp(results, "data")) ??
    asArray(results) ??
    asArray(getProp(res, "data")) ??
    asArray(res) ??
    [];
  const countRaw = getProp(res, "count") ?? getProp(results, "count");
  const count = typeof countRaw === "number" ? countRaw : rows.length;
  return { count, rows: rows as SellerRequestApi[] };
}

export const sellerRequestApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSellerRequests: builder.query<SellerRequestListResult, GetSellerRequestsParams>({
      query: (params) => ({
        url: SELLER_ENDPOINTS.GET_LIST,
        method: "GET",
        // DRF pagination uses `page_size`; search/status omitted when empty.
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          status: params.status || undefined,
        },
      }),
      transformResponse: (res: unknown): SellerRequestListResult => {
        const { count, rows } = extractList(res);
        return { count, requests: rows.map(toSellerRequest) };
      },
      providesTags: (result) =>
        result?.requests
          ? [
              ...result.requests.map(({ id }) => ({ type: "Sellers" as const, id })),
              { type: "Sellers", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Sellers", id: "PARTIAL-LIST" }],
    }),

    getSellerRequestStats: builder.query<SellerRequestStats, void>({
      // Stats is a plain GET — no query params are sent with it.
      query: () => ({ url: SELLER_ENDPOINTS.GET_STATS, method: "GET" }),
      transformResponse: (res: unknown): SellerRequestStats =>
        unwrap<SellerRequestStats>(res) ?? {},
      providesTags: [{ type: "Sellers", id: "STATS" }],
    }),

    approveSeller: builder.mutation<unknown, string>({
      query: (id) => ({ url: SELLER_ENDPOINTS.APPROVE(id), method: "POST" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Sellers", id },
        { type: "Sellers", id: "PARTIAL-LIST" },
        { type: "Sellers", id: "STATS" },
      ],
    }),

    rejectSeller: builder.mutation<unknown, RejectSellerPayload>({
      query: ({ id, reason, message }) => ({
        url: SELLER_ENDPOINTS.REJECT(id),
        method: "POST",
        body: { reason, message: message || undefined },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Sellers", id },
        { type: "Sellers", id: "PARTIAL-LIST" },
        { type: "Sellers", id: "STATS" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSellerRequestsQuery,
  useGetSellerRequestStatsQuery,
  useApproveSellerMutation,
  useRejectSellerMutation,
} = sellerRequestApi;
