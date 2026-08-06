import { PARTNER_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  CapabilityChange,
  CreatePartnerPayload,
  GetPartnerHistoryParams,
  PartnerApi,
  PartnerData,
  PartnerHistoryHeader,
  PartnerHistoryResult,
  PartnerHistoryRow,
  PartnerHistorySummary,
  PartnerListResult,
  PartnerStats,
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

/**
 * Reads a capability flag, defaulting to **true** when the key is absent.
 *
 * `can_verify` / `can_deliver` shipped 2026-08-03; a row from before that
 * carries neither. Absent must mean "Both" — the documented default and the
 * common case — because reading a missing flag as `false` would strip every
 * pre-existing partner of the work they already do.
 *
 * ⚠️ Never write `row.can_verify === true` against this payload: `undefined
 * === true` is `false`, which is exactly the bug this exists to prevent.
 */
function capability(value: unknown): boolean {
  return typeof value === "boolean" ? value : true;
}

/** Maps a raw API row into the flat UI row the table columns render. */
function toPartner(row: PartnerApi): PartnerData {
  return {
    // Prefer the business partner id (shown in the ID column); fall back to the UUID.
    id: str(row.partner_id) || str(row.id),
    userId: str(row.user_id),
    // Partner's user id — the assign-order API expects this as delivery_partner_id
    // (like every other partner endpoint, which keys on user_id). Falls back to
    // the partner record UUID when user_id is absent.
    deliveryPartnerId: str(row.user_id) || str(row.id),
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
    canVerify: capability(row.can_verify),
    canDeliver: capability(row.can_deliver),
  };
}

/** Coerces to a finite number, falling back to 0. */
function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Reads a rate that must survive as `null`. The history endpoint returns `null`
 * (not `0`) when there are no samples — an untested partner is missing data,
 * not a failing one, and `0%` would read as the latter.
 */
function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Reads a timestamp that is legitimately absent, e.g. `failed_at` on a success. */
function nullableStr(value: unknown): string | null {
  const s = str(value);
  return s === "" ? null : s;
}

/**
 * Reads `on_time`, which is genuinely tri-state: anything that is not a real
 * boolean (including a missing key) means "no deadline applied", never "late".
 */
function nullableBool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/** Maps one raw history row (Flow 28 API 6b `results.data[]`). */
function toHistoryRow(row: unknown): PartnerHistoryRow {
  return {
    assignment_id: str(getProp(row, "assignment_id")),
    order_id: str(getProp(row, "order_id")),
    order_number: str(getProp(row, "order_number")),
    order_status: str(getProp(row, "order_status")),
    order_status_display: str(getProp(row, "order_status_display")),
    outcome: str(getProp(row, "outcome")),
    outcome_display: str(getProp(row, "outcome_display")),
    status: str(getProp(row, "status")),
    assigned_at: nullableStr(getProp(row, "assigned_at")),
    first_action_at: nullableStr(getProp(row, "first_action_at")),
    picked_up_at: nullableStr(getProp(row, "picked_up_at")),
    completed_at: nullableStr(getProp(row, "completed_at")),
    failed_at: nullableStr(getProp(row, "failed_at")),
    deliver_by: nullableStr(getProp(row, "deliver_by")),
    on_time: nullableBool(getProp(row, "on_time")),
    rejection_reason: str(getProp(row, "rejection_reason")),
    rating: nullableNumber(getProp(row, "rating")),
  };
}

/** Maps the `results.partner` header block. Returns null when absent. */
function toHistoryHeader(value: unknown): PartnerHistoryHeader | null {
  if (!value || typeof value !== "object") return null;
  return {
    user_id: str(getProp(value, "user_id")),
    partner_id: str(getProp(value, "partner_id")),
    name: str(getProp(value, "name")),
    email: str(getProp(value, "email")),
    port: str(getProp(value, "port")),
    can_verify: capability(getProp(value, "can_verify")),
    can_deliver: capability(getProp(value, "can_deliver")),
    is_available: getProp(value, "is_available") === true,
    // Absent means "not blocked" — only an explicit false marks a blocked account.
    is_active: getProp(value, "is_active") !== false,
  };
}

/** Maps the `results.summary` rollup. Returns null when absent. */
function toHistorySummary(value: unknown): PartnerHistorySummary | null {
  if (!value || typeof value !== "object") return null;
  return {
    total_jobs: num(getProp(value, "total_jobs")),
    delivered: num(getProp(value, "delivered")),
    failed: num(getProp(value, "failed")),
    verified: num(getProp(value, "verified")),
    in_progress: num(getProp(value, "in_progress")),
    rejected: num(getProp(value, "rejected")),
    reassigned: num(getProp(value, "reassigned")),
    cancelled: num(getProp(value, "cancelled")),
    delivery_success_rate: nullableNumber(getProp(value, "delivery_success_rate")),
    on_time_rate: nullableNumber(getProp(value, "on_time_rate")),
    sla_bound_deliveries: num(getProp(value, "sla_bound_deliveries")),
  };
}

/**
 * Reads the `capability_change` block off an update response.
 *
 * Present **only** when the request turned a capability off — granting one, or
 * editing any other field, returns the row unchanged, so `null` here is the
 * normal case rather than a parse failure.
 */
function toCapabilityChange(res: unknown): CapabilityChange | null {
  const block = getProp(res, "capability_change");
  if (!block || typeof block !== "object") return null;

  const inFlight = getProp(block, "unaffected_in_flight");
  const orders = asArray(getProp(inFlight, "orders")) ?? [];
  const revoked = asArray(getProp(block, "revoked")) ?? [];

  return {
    revoked: revoked.map(str).filter(Boolean),
    // `0` is reported deliberately — "nothing was running" is the answer, not
    // an omission — so it must survive as 0 rather than being treated as absent.
    inFlightCount: num(getProp(inFlight, "count")),
    truncated: getProp(inFlight, "truncated") === true,
    orders: orders.map((row) => ({
      orderId: str(getProp(row, "order_id")),
      orderNumber: str(getProp(row, "order_number")),
      status: str(getProp(row, "status")),
      statusDisplay: str(getProp(row, "status_display")),
      assignmentStatus: str(getProp(row, "assignment_status")),
    })),
    message: str(getProp(block, "message")),
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

    /** Flow 28 API 3 — total partners + in-progress deliveries. Takes no filters. */
    getPartnerStats: builder.query<PartnerStats, void>({
      query: () => ({ url: PARTNER_ENDPOINTS.GET_STATS, method: "GET" }),
      transformResponse: (res: unknown): PartnerStats => unwrap<PartnerStats>(res) ?? {},
      providesTags: [{ type: "Partners", id: "STATS" }],
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

    /**
     * Flow 28 API 6b — one partner's work history: the jobs behind the KPI
     * numbers. Defaults to **all time**; a period is only applied when the
     * reader asks for one, since silently hiding older work behind an
     * unrequested window is what makes a history screen untrustworthy.
     */
    getPartnerHistory: builder.query<PartnerHistoryResult, GetPartnerHistoryParams>({
      query: ({ userId, outcome, period, search, page, limit }) => ({
        url: PARTNER_ENDPOINTS.HISTORY,
        method: "GET",
        // Blank filters are dropped rather than sent empty: `outcome` is
        // validated server-side and an unrecognised value is a 400.
        params: {
          user_id: userId,
          outcome: outcome || undefined,
          period: period || undefined,
          search: search || undefined,
          page,
          page_size: limit,
        },
      }),
      transformResponse: (res: unknown): PartnerHistoryResult => {
        const results = getProp(res, "results");
        const rows = asArray(getProp(results, "data")) ?? [];
        const countRaw = getProp(res, "count") ?? getProp(results, "count");
        return {
          count: typeof countRaw === "number" ? countRaw : rows.length,
          period: str(getProp(results, "period")) || "all",
          partner: toHistoryHeader(getProp(results, "partner")),
          summary: toHistorySummary(getProp(results, "summary")),
          rows: rows.map(toHistoryRow),
        };
      },
      providesTags: (_result, _error, { userId }) => [
        { type: "Partners", id: `HISTORY-${userId}` },
      ],
    }),

    // Create a new delivery partner.
    createPartner: builder.mutation<unknown, CreatePartnerPayload>({
      query: (body) => ({
        url: PARTNER_ENDPOINTS.CREATE,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Partners", id: "PARTIAL-LIST" },
        { type: "Partners", id: "STATS" },
      ],
    }),

    /**
     * Update partner detail; user id sent as `user_id` query param + in the body.
     *
     * Resolves to the `capability_change` block when the request **revoked** a
     * capability, else null. That block is the only way an admin learns that
     * revoking is rostering rather than an emergency stop — work already in hand
     * runs to completion — so the caller is expected to show it.
     */
    updatePartner: builder.mutation<
      CapabilityChange | null,
      { userId: string; body: UpdatePartnerPayload }
    >({
      query: ({ userId, body }) => ({
        url: PARTNER_ENDPOINTS.UPDATE,
        method: "PATCH",
        params: { user_id: userId },
        body,
      }),
      transformResponse: toCapabilityChange,
      invalidatesTags: (_result, _error, { userId }) => [
        { type: "Partners", id: "PARTIAL-LIST" },
        { type: "Partners", id: "STATS" },
        { type: "Partners", id: userId },
        // The history response carries the partner's name/email/port in its
        // header block, so an edit makes the cached copy stale too.
        { type: "Partners", id: `HISTORY-${userId}` },
      ],
    }),

    // Delete a partner by user id; refreshes the list on success.
    deletePartner: builder.mutation<unknown, string>({
      query: (userId) => ({
        url: PARTNER_ENDPOINTS.DELETE,
        method: "DELETE",
        params: { user_id: userId },
      }),
      invalidatesTags: [
        { type: "Partners", id: "PARTIAL-LIST" },
        { type: "Partners", id: "STATS" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPartnersQuery,
  useGetPartnerStatsQuery,
  useGetPartnerDetailQuery,
  useGetPartnerHistoryQuery,
  useCreatePartnerMutation,
  useUpdatePartnerMutation,
  useDeletePartnerMutation,
} = partnerApi;
