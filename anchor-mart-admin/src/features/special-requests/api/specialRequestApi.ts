import { SPECIAL_REQUEST_ENDPOINTS } from "@/lib/apiEndpoints";
import { shortDate } from "@/lib/dates";
import { baseApi } from "@/lib/fetchUtils";
import type {
  AllowChangesPayload,
  GenerateBillPayload,
  GetSpecialRequestStatsParams,
  GetSpecialRequestsParams,
  RejectSpecialRequestPayload,
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

/**
 * Maps a raw status token to its badge colour variant. Keys are the five
 * statuses of the Flow 13 state machine — anything else falls back to neutral.
 */
const STATUS_VARIANT: Record<string, SpecialRequestBadgeVariant> = {
  pending: "warning",
  sourcing_confirmed: "info",
  quote_sent: "info",
  accepted: "success",
  rejected: "danger",
};

export function specialRequestStatusVariant(status: string): SpecialRequestBadgeVariant {
  return STATUS_VARIANT[status.toLowerCase()] ?? "neutral";
}

/** Joins the parts that are present with a separator; "-" when none are. */
function join(parts: (string | null | undefined)[], separator = " · "): string {
  const kept = parts.map((p) => (p ?? "").trim()).filter(Boolean);
  return kept.length ? kept.join(separator) : FALLBACK;
}

/**
 * Maps a raw API row into the flat UI row the table columns render.
 *
 * The identity fields were unified across all four admin screens on 2026-08-19:
 * a single `sailor` carrying the email became `customer_name` + `customer_email`,
 * so the Sailor column shows a name rather than an address.
 */
export function toSpecialRequest(row: SpecialRequestApi): SpecialRequest {
  const status = row.status ? String(row.status).trim() : "";
  const address = row.shipping_address;
  return {
    id: row.id ? String(row.id) : "",
    r: dash(row.reference),
    // Name, then email, so a request from an account with no name still
    // identifies someone rather than reading "-".
    n: dash(row.customer_name ?? row.customer_email),
    email: dash(row.customer_email),
    // The sailor's account number. The delivery contact is
    // `shipping_address.phone`, which is a different question and can differ.
    ph: dash(row.phone),
    prod: dash(row.product_name),
    brand: dash(row.brand),
    qty: row.quantity ?? FALLBACK,
    // Display strings on the wire — read, never parsed. See `lib/dates.ts`.
    dt: dash(row.created_at),
    arrival: shortDate(row.ship_arrival_date),
    departure: shortDate(row.expected_departure),
    vessel: join([address?.vessel_name || address?.imo_number]),
    location: join([address?.port_name, address?.anchorage_name]),
    st: dash(row.status_display),
    status,
    sc: specialRequestStatusVariant(status),
    rebillRequested: row.rebill_requested === true,
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

    /**
     * Card counters, scoped by the screen's **search** and nothing else.
     *
     * `status` is deliberately not sent, matching the order and intent
     * dashboards: the five counts *are* the status breakdown, so filtering them
     * by status would zero four cards and leave the fifth restating the row
     * count. Search is a different kind of narrowing — it selects which
     * requests are on the screen at all — so the cards follow it.
     */
    getSpecialRequestStats: builder.query<SpecialRequestStats, GetSpecialRequestStatsParams>({
      query: (params) => ({
        url: SPECIAL_REQUEST_ENDPOINTS.GET_STATS,
        method: "GET",
        params: { search: params.search || undefined },
      }),
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
    /**
     * Flow 13 API 10 — quote the request. Allowed only from `pending` /
     * `sourcing_confirmed`; the backend 400s otherwise. On success the request
     * moves to `quote_sent` and the sailor gets an actionable inbox row.
     */
    generateBill: builder.mutation<SpecialRequestDetail, { id: string; body: GenerateBillPayload }>(
      {
        query: ({ id, body }) => ({
          url: SPECIAL_REQUEST_ENDPOINTS.GENERATE_BILL(id),
          method: "POST",
          body,
        }),
        // The row, the list and the per-status counters all move together.
        invalidatesTags: (_result, _error, { id }) => [
          { type: "SpecialRequests", id },
          { type: "SpecialRequests", id: "PARTIAL-LIST" },
          { type: "SpecialRequests", id: "STATS" },
        ],
      },
    ),

    /** Flow 13 API 11 — reject before quoting. Requires `admin_response`. */
    rejectSpecialRequest: builder.mutation<
      SpecialRequestDetail,
      { id: string; body: RejectSpecialRequestPayload }
    >({
      query: ({ id, body }) => ({
        url: SPECIAL_REQUEST_ENDPOINTS.REJECT(id),
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "SpecialRequests", id },
        { type: "SpecialRequests", id: "PARTIAL-LIST" },
        { type: "SpecialRequests", id: "STATS" },
      ],
    }),

    /**
     * Flow 13 API 12 — raise the rebill cap by `additional` (1–10). Not allowed
     * on a terminal request. The status doesn't change, so only the row and the
     * list need invalidating — the per-status counters are untouched.
     */
    allowSpecialRequestChanges: builder.mutation<
      SpecialRequestDetail,
      { id: string; body: AllowChangesPayload }
    >({
      query: ({ id, body }) => ({
        url: SPECIAL_REQUEST_ENDPOINTS.ALLOW_CHANGES(id),
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "SpecialRequests", id },
        { type: "SpecialRequests", id: "PARTIAL-LIST" },
      ],
    }),

    /**
     * Flow 29c §6 — export the requests as `.xlsx`.
     *
     * Mounted under `/catalog/export-to-excel/` and named as if it exported the
     * catalog; it does not. It exports `SpecialRequest` rows and nothing else,
     * which is why it lives on this feature rather than with the ports.
     *
     * The response is a binary attachment, so the same two guards the order-slip
     * download uses apply here: a **wildcard `Accept`** (DRF negotiates against
     * its JSON renderers before the view runs, so naming the xlsx type would
     * 406), and a `responseHandler` that only blobs a successful reply — a
     * failure returns JSON, and blobbing it would park a non-serializable value
     * in the store and hide the server's message from `getApiMessage`.
     */
    exportSpecialRequests: builder.query<Blob, { status?: string } | undefined>({
      query: (args) => ({
        url: SPECIAL_REQUEST_ENDPOINTS.EXPORT_EXCEL,
        method: "GET",
        headers: { Accept: "*/*" },
        params: { status: args?.status || undefined },
        responseHandler: async (response) => {
          if (!response.ok) {
            const text = await response.text();
            try {
              return JSON.parse(text);
            } catch {
              return { detail: text };
            }
          }
          return response.blob();
        },
      }),
      /** Second line of defence — a Blob must never reach the error slice. */
      transformErrorResponse: async (error: unknown) => {
        const data = (error as { data?: unknown })?.data;
        if (!(data instanceof Blob)) return error;
        const text = await data.text();
        try {
          return { ...(error as object), data: JSON.parse(text) };
        } catch {
          return { ...(error as object), data: { detail: text } };
        }
      },
      // The workbook is cached server-side for 5 minutes; caching it again here
      // would only widen the window in which the download is stale.
      keepUnusedDataFor: 0,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSpecialRequestsQuery,
  useGetSpecialRequestStatsQuery,
  useGetSpecialRequestDetailQuery,
  useGenerateBillMutation,
  useRejectSpecialRequestMutation,
  useAllowSpecialRequestChangesMutation,
  useLazyExportSpecialRequestsQuery,
} = specialRequestApi;
