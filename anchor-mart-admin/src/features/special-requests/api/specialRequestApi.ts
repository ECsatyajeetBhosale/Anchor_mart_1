import { SPECIAL_REQUEST_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  GetSpecialRequestsParams,
  SpecialRequest,
  SpecialRequestApi,
  SpecialRequestBadgeVariant,
  SpecialRequestDetail,
  SpecialRequestListResult,
  SpecialRequestStats,
} from "../types/specialRequest.types";

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
const STATUS_VARIANT: Record<string, SpecialRequestBadgeVariant> = {
  pending: "warning",
  sourcing: "info",
  sourcing_confirmed: "info",
  quote_sent: "info",
  approved: "success",
  fulfilled: "success",
  rejected: "danger",
};

export function specialRequestStatusVariant(status: string): SpecialRequestBadgeVariant {
  return STATUS_VARIANT[status.toLowerCase()] ?? "neutral";
}

/** Maps a raw API row into the flat UI row the table columns render. */
function toSpecialRequest(row: SpecialRequestApi): SpecialRequest {
  const status = row.status ? String(row.status).trim() : "";
  return {
    id: row.id ? String(row.id) : "",
    r: dash(row.reference),
    n: dash(row.sailor),
    ph: dash(row.phone),
    prod: dash(row.product),
    brand: dash(row.brand),
    qty: row.qty ?? FALLBACK,
    dt: dash(row.requested),
    st: dash(row.status_display),
    status,
    sc: specialRequestStatusVariant(status),
  };
}

/**
 * Extracts the rows + total from the list envelope
 * (`{ count, results: { data: [...] } }`), staying defensive about variants.
 */
function extractList(res: unknown): { count: number; rows: SpecialRequestApi[] } {
  const results = getProp(res, "results");
  const rows =
    asArray(getProp(results, "data")) ??
    asArray(results) ??
    asArray(getProp(res, "data")) ??
    asArray(res) ??
    [];
  const countRaw = getProp(res, "count") ?? getProp(results, "count");
  const count = typeof countRaw === "number" ? countRaw : rows.length;
  return { count, rows: rows as SpecialRequestApi[] };
}

export const specialRequestApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSpecialRequests: builder.query<SpecialRequestListResult, GetSpecialRequestsParams>({
      query: (params) => ({
        url: SPECIAL_REQUEST_ENDPOINTS.GET_LIST,
        method: "GET",
        // DRF pagination uses `page_size`; search/status omitted when empty.
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          status: params.status || undefined,
        },
      }),
      transformResponse: (res: unknown): SpecialRequestListResult => {
        const { count, rows } = extractList(res);
        return { count, requests: rows.map(toSpecialRequest) };
      },
      providesTags: (result) =>
        result?.requests
          ? [
              ...result.requests.map(({ id }) => ({ type: "SpecialRequests" as const, id })),
              { type: "SpecialRequests", id: "PARTIAL-LIST" },
            ]
          : [{ type: "SpecialRequests", id: "PARTIAL-LIST" }],
    }),

    getSpecialRequestStats: builder.query<SpecialRequestStats, void>({
      // Stats is a plain GET — no query params are sent with it.
      query: () => ({ url: SPECIAL_REQUEST_ENDPOINTS.GET_STATS, method: "GET" }),
      transformResponse: (res: unknown): SpecialRequestStats =>
        unwrap<SpecialRequestStats>(res) ?? {},
      providesTags: [{ type: "SpecialRequests", id: "STATS" }],
    }),

    // Detail for a single request — the clicked row id is sent as `product_id`.
    getSpecialRequestDetail: builder.query<SpecialRequestDetail, string>({
      query: (productId) => ({
        url: SPECIAL_REQUEST_ENDPOINTS.GET_DETAIL,
        method: "GET",
        params: { product_id: productId },
      }),
      transformResponse: (res: unknown): SpecialRequestDetail => unwrap<SpecialRequestDetail>(res),
      providesTags: (result, _error, productId) => [
        { type: "SpecialRequests", id: result?.id ?? productId },
      ],
    }),

    // Excel export — returns the file as a Blob; the optional `status` filter
    // mirrors the list query so the export matches the on-screen filter.
    exportSpecialRequests: builder.mutation<Blob, { status?: string }>({
      query: ({ status }) => ({
        url: SPECIAL_REQUEST_ENDPOINTS.EXPORT,
        method: "GET",
        params: { status: status || undefined },
        // Override the global JSON Accept so DRF serves the xlsx (else it 406s).
        headers: { Accept: "*/*" },
        responseHandler: (response) => response.blob(),
        cache: "no-cache",
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSpecialRequestsQuery,
  useGetSpecialRequestStatsQuery,
  useGetSpecialRequestDetailQuery,
  useExportSpecialRequestsMutation,
} = specialRequestApi;
