import { SAILOR_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";

import type {
  CreateSailorPayload,
  GetSailorsParams,
  Sailor,
  SailorData,
  SailorStats,
  StatusVariant,
  ToggleSailorStatusPayload,
  UpdateSailorPayload,
} from "../types/sailor.types";

/** Transformed list result the page consumes: total count + UI rows. */
export interface SailorListResult {
  count: number;
  sailors: SailorData[];
}

/** Maps a status string to its badge colour variant. */
export function statusVariant(status: string): StatusVariant {
  const norm = status.trim().toLowerCase();
  if (norm === "active") return "success";
  if (norm === "new") return "info";
  if (norm === "blocked" || norm === "inactive") return norm === "blocked" ? "danger" : "neutral";
  return "neutral";
}

/** Coerces an unknown to a trimmed string; non-strings/numbers → "". */
function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

/** Coerces an unknown to a number; non-numbers → 0. */
function num(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

/** Reads a property off an unknown object value. */
function prop(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

/** Title-cases a raw status token (e.g. "active" → "Active"). */
function titleCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value;
}

/**
 * Display status. The list returns **both** `status` ("new" | "active" |
 * "inactive") and `is_active`, so precedence matters: blocking writes
 * `is_active`, and a blocked account must read as Inactive even while its
 * lifecycle status still says "new". Otherwise the textual status wins.
 */
function deriveStatus(sailor: Sailor): string {
  if (sailor.is_active === false) return "Inactive";
  if (sailor.status) return titleCase(str(sailor.status));
  return "Active";
}

/** Sailor's display name — `full_name` (list/detail) or first+last. */
function resolveName(sailor: Sailor): string {
  const full = str(sailor.full_name);
  if (full) return full;
  const combined = `${str(sailor.first_name)} ${str(sailor.last_name)}`.trim();
  return combined || str(sailor.email) || "—";
}

/** Email — top level (list) or nested in the detail `contact` object. */
function resolveEmail(sailor: Sailor): string {
  return str(sailor.email) || str(prop(sailor.contact, "email")) || "—";
}

/** Joins a country code + number into one string. */
function joinPhone(code: string, number: string): string {
  if (!number && !code) return "";
  const prefix = code ? (code.startsWith("+") ? code : `+${code}`) : "";
  return `${prefix} ${number}`.trim();
}

/**
 * Contact string. The list returns a flat `contact_no`; the detail endpoint
 * returns a nested `contact` object (whatsapp_number/number + country_code).
 */
function resolveContact(sailor: Sailor): string {
  const flat = str(sailor.contact_no);
  if (flat) return flat;

  const c = sailor.contact;
  if (typeof c === "string") return str(c) || "—";
  if (c && typeof c === "object") {
    const number =
      str(prop(c, "whatsapp_number")) ||
      str(prop(c, "number")) ||
      str(prop(c, "contact_no")) ||
      str(prop(c, "phone"));
    const fromContact = joinPhone(str(prop(c, "country_code")), number);
    if (fromContact) return fromContact;
  }

  const topLevel = joinPhone(str(sailor.country_code), str(sailor.whatsapp_number));
  return topLevel || "—";
}

/** Ship label — list returns a string/null; detail returns a `ship` object. */
function resolveShip(sailor: Sailor): string {
  const ship = sailor.ship;
  if (typeof ship === "string") return str(ship) || "—";
  if (ship && typeof ship === "object") {
    return str(prop(ship, "ship_name")) || str(prop(ship, "imo_number")) || "—";
  }
  return "—";
}

/** Join label — the list pre-formats `joined`; detail returns a raw date. */
function resolveJoined(sailor: Sailor): string {
  const joined = str(sailor.joined);
  if (joined) return joined;
  const raw = str(sailor.date_joined) || str(sailor.created_at);
  if (!raw) return "—";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Maps a raw API sailor (list OR detail shape) into the UI row model. Every
 * field is coerced to a primitive so a nested object can never reach the table
 * or drawer (which would crash React).
 */
export function toSailorData(sailor: Sailor): SailorData {
  const status = deriveStatus(sailor);
  return {
    id: str(sailor.id),
    n: resolveName(sailor),
    e: resolveEmail(sailor),
    w: resolveContact(sailor),
    j: resolveJoined(sailor),
    sh: resolveShip(sailor),
    o: num(sailor.orders),
    p: num(sailor.loyalty_pts),
    ca: num(sailor.cart_count),
    wi: num(sailor.wishlist_count),
    st: status,
    sc: statusVariant(status),
    // Absent means active — only an explicit `false` blocks the account.
    active: sailor.is_active !== false,
  };
}

/** Unwraps `{ data }` envelopes used by some detail/stats responses. */
function unwrap<T>(res: unknown): T {
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

/** Safe property read off an unknown value. */
function getProp(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

/** Returns the value when it's an array, otherwise null. */
function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

/**
 * `sailors-list/` returns standard DRF pagination — `{ count, next, previous,
 * results: [...] }` — which is the first branch below. The remaining branches
 * cover the envelopes other endpoints on this backend use
 * (`results: { data }`, bare `data`, a naked array) so one mapper serves the
 * detail read too.
 */
function extractList(res: unknown): { count: number; rows: Sailor[] } {
  const results = getProp(res, "results");
  const rows =
    asArray(results) ??
    asArray(getProp(results, "data")) ??
    asArray(getProp(res, "data")) ??
    asArray(res) ??
    [];
  const countRaw = getProp(res, "count") ?? getProp(results, "count");
  const count = typeof countRaw === "number" ? countRaw : rows.length;
  return { count, rows: rows as Sailor[] };
}

export const sailorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSailors: builder.query<SailorListResult, GetSailorsParams>({
      query: (params) => ({
        url: SAILOR_ENDPOINTS.GET_SAILORS,
        method: "GET",
        // DRF pagination uses `page_size`. Search/status are omitted when empty
        // so the URL stays clean and the backend returns the full list.
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          status: params.status || undefined,
        },
      }),
      transformResponse: (res: unknown): SailorListResult => {
        const { count, rows } = extractList(res);
        // If a non-empty payload yields no rows, the shape is unexpected — surface
        // it in dev so the real response structure is visible at a glance.
        if (
          import.meta.env.DEV &&
          rows.length === 0 &&
          res &&
          typeof res === "object" &&
          Object.keys(res as Record<string, unknown>).length > 0
        ) {
          console.warn("[sailors] sailors-list returned no parsable rows. Raw response:", res);
        }
        return { count, sailors: rows.map(toSailorData) };
      },
      providesTags: (result) =>
        result?.sailors
          ? [
              ...result.sailors.map(({ id }) => ({ type: "Sailors" as const, id })),
              { type: "Sailors", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Sailors", id: "PARTIAL-LIST" }],
    }),

    getSailorStats: builder.query<SailorStats, void>({
      // Stats is a plain GET — no query params are sent with it.
      query: () => ({ url: SAILOR_ENDPOINTS.GET_STATS, method: "GET" }),
      transformResponse: (res: unknown): SailorStats => unwrap<SailorStats>(res) ?? {},
      providesTags: [{ type: "Sailors", id: "STATS" }],
    }),

    getSailor: builder.query<SailorData, string>({
      query: (id) => ({ url: SAILOR_ENDPOINTS.GET_SAILOR(id), method: "GET" }),
      transformResponse: (res: unknown): SailorData => toSailorData(unwrap<Sailor>(res)),
      providesTags: (_result, _error, id) => [{ type: "Sailors", id }],
    }),

    createSailor: builder.mutation<unknown, CreateSailorPayload>({
      query: (body) => ({
        url: SAILOR_ENDPOINTS.CREATE_SAILOR,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Sailors", id: "PARTIAL-LIST" },
        { type: "Sailors", id: "STATS" },
      ],
    }),

    updateSailor: builder.mutation<unknown, { id: string; body: UpdateSailorPayload }>({
      query: ({ id, body }) => ({
        url: SAILOR_ENDPOINTS.UPDATE_SAILOR(id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Sailors", id },
        { type: "Sailors", id: "PARTIAL-LIST" },
        { type: "Sailors", id: "STATS" },
      ],
    }),

    /**
     * Soft-delete a sailor (Flow 31 §6).
     *
     * Sets all four soft-delete fields and **hard-deletes the sailor's coupon
     * assignments**, reporting how many in `coupon_assignments_revoked`. Points,
     * history and orders are untouched — orders are the accounting record, and
     * the points ledger has to survive a disputed deletion.
     *
     * The revoked count is typed here so whoever wires a delete action can
     * surface it: private coupons the sailor held are gone, and that is the only
     * place it is said.
     */
    deleteSailor: builder.mutation<
      { message?: string; coupon_assignments_revoked?: number },
      string
    >({
      query: (id) => ({
        url: SAILOR_ENDPOINTS.DELETE_SAILOR(id),
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Sailors", id },
        { type: "Sailors", id: "PARTIAL-LIST" },
        { type: "Sailors", id: "STATS" },
      ],
    }),

    toggleSailorStatus: builder.mutation<unknown, { id: string; body: ToggleSailorStatusPayload }>({
      query: ({ id, body }) => ({
        url: SAILOR_ENDPOINTS.TOGGLE_STATUS(id),
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Sailors", id },
        { type: "Sailors", id: "PARTIAL-LIST" },
        { type: "Sailors", id: "STATS" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSailorsQuery,
  useGetSailorStatsQuery,
  useGetSailorQuery,
  useCreateSailorMutation,
  useUpdateSailorMutation,
  useDeleteSailorMutation,
  useToggleSailorStatusMutation,
} = sailorApi;
