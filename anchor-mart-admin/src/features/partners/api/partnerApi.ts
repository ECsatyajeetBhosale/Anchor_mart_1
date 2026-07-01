import { PARTNER_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  CreatePartnerPayload,
  PartnerApi,
  PartnerData,
  PartnerListResult,
  UpdatePartnerPayload,
} from "../types/partner.types";

/** Placeholder shown for any null/undefined/blank value. */
const FALLBACK = "-";

/** Returns a trimmed string, or "-" when the value is null/undefined/blank. */
function dash(value: unknown): string {
  if (value === null || value === undefined) return FALLBACK;
  const s = String(value).trim();
  return s === "" ? FALLBACK : s;
}

/** Coerces an unknown to a trimmed string; non-strings/numbers → "". */
function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

/** Safe property read off an unknown value. */
function getProp(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

/** Returns the value when it's an array, otherwise null. */
function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

/** Unwraps a `{ data }` envelope some detail responses use. */
function unwrap<T>(res: unknown): T {
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

/** Formats an ISO date to the "MMM YYYY" label the design uses; blanks → "-". */
function formatJoined(value?: string | null): string {
  if (!value) return FALLBACK;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return dash(value);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Derives the UI status label from the partner's active/on-duty flags. */
function deriveStatus(row: PartnerApi): string {
  if (row.is_active === false) return "Inactive";
  if (row.on_duty) return "On Duty";
  return "Available";
}

/** Maps a raw API row into the flat UI row the table columns render. */
function toPartner(row: PartnerApi): PartnerData {
  return {
    // Prefer the business partner id (shown in the ID column); fall back to the UUID.
    id: str(row.partner_id) || str(row.id),
    userId: str(row.user_id),
    n: dash(row.name),
    p: dash(row.port ?? row.assigned_port),
    j: formatJoined(row.joined),
    s: deriveStatus(row),
    // Active orders / weekly earnings / rating / vehicle are not in the list API.
    c: FALLBACK,
    w: FALLBACK,
    t: typeof row.total_deliveries === "number" ? row.total_deliveries : 0,
    r: FALLBACK,
    email: dash(row.email),
    phone: dash(row.whatsapp_number),
    vehicle: "",
  };
}

/**
 * Extracts the rows + total from the list envelope
 * (`{ count, results: { data: [...] } }`), staying defensive about variants.
 */
function extractList(res: unknown): { count: number; rows: PartnerApi[] } {
  const results = getProp(res, "results");
  const rows =
    asArray(getProp(results, "data")) ??
    asArray(results) ??
    asArray(getProp(res, "data")) ??
    asArray(res) ??
    [];
  const countRaw = getProp(res, "count") ?? getProp(results, "count");
  const count = typeof countRaw === "number" ? countRaw : rows.length;
  return { count, rows: rows as PartnerApi[] };
}

export const partnerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPartners: builder.query<PartnerListResult, void>({
      // Filtering/search is applied client-side, so fetch a generous page.
      query: () => ({
        url: PARTNER_ENDPOINTS.GET_LIST,
        method: "GET",
        params: { page_size: 100 },
      }),
      transformResponse: (res: unknown): PartnerListResult => {
        const { count, rows } = extractList(res);
        return { count, partners: rows.map(toPartner) };
      },
      providesTags: (result) =>
        result?.partners
          ? [
              ...result.partners.map(({ id }) => ({ type: "Partners" as const, id })),
              { type: "Partners", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Partners", id: "PARTIAL-LIST" }],
    }),

    // Detail for a single partner — the clicked row's user id is sent as `user_id`.
    // Returns the raw record so the edit form can prefill exact field values.
    getPartnerDetail: builder.query<PartnerApi, string>({
      query: (userId) => ({
        url: PARTNER_ENDPOINTS.GET_DETAIL,
        method: "GET",
        params: { user_id: userId },
      }),
      transformResponse: (res: unknown): PartnerApi => unwrap<PartnerApi>(res),
      providesTags: (result, _error, userId) => [
        { type: "Partners", id: result?.user_id || userId },
      ],
    }),

    // Create a new delivery partner.
    createPartner: builder.mutation<unknown, CreatePartnerPayload>({
      query: (body) => ({
        url: PARTNER_ENDPOINTS.CREATE,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Partners", id: "PARTIAL-LIST" }],
    }),

    // Update partner detail; user id sent as `user_id` query param + in the body.
    updatePartner: builder.mutation<unknown, { userId: string; body: UpdatePartnerPayload }>({
      query: ({ userId, body }) => ({
        url: PARTNER_ENDPOINTS.UPDATE,
        method: "PATCH",
        params: { user_id: userId },
        body,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: "Partners", id: "PARTIAL-LIST" },
        { type: "Partners", id: userId },
      ],
    }),

    // Delete a partner by user id; refreshes the list on success.
    deletePartner: builder.mutation<unknown, string>({
      query: (userId) => ({
        url: PARTNER_ENDPOINTS.DELETE,
        method: "DELETE",
        params: { user_id: userId },
      }),
      invalidatesTags: [{ type: "Partners", id: "PARTIAL-LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPartnersQuery,
  useGetPartnerDetailQuery,
  useCreatePartnerMutation,
  useUpdatePartnerMutation,
  useDeletePartnerMutation,
} = partnerApi;
