import { REWARD_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import { formatMoney } from "@/lib/money";
import type {
  AddBonusPointsPayload,
  AddCouponAssignmentPayload,
  BonusPoint,
  BonusPointHistoryResult,
  BonusPointListResult,
  CouponAssignment,
  CouponAssignmentListResult,
  CouponReportResult,
  Deal,
  DealListResult,
  DealPayload,
  DealStats,
  GetBonusPointsParams,
  GetCouponAssignmentsParams,
  GetCouponReportParams,
  GetDealsParams,
} from "../types/reward.types";

/** Safe property read off an unknown value. */
function getProp(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

/** Returns the value when it's an array, otherwise null. */
function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

/** First present key off an object, coerced to a trimmed string; else "". */
function pick(obj: unknown, ...keys: string[]): string {
  for (const k of keys) {
    const v = getProp(obj, k);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

/**
 * `$1,250.00`; a missing or unreadable amount → "-".
 *
 * Keeps this feature's hyphen fallback. The blank case used to slip through
 * `Number.isFinite` as a zero, and the locale was the ambient one rather than
 * the en-US every other screen formats in.
 */
function money(value: unknown): string {
  return formatMoney(value as string | number | null | undefined, { fallback: "-" });
}

/** ISO timestamp → "Aug 14, 2026, 07:09 AM". Blank input stays a dash. */
function formatDateTime(value: string): string {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

/** Extracts rows + total from whichever envelope the endpoint returns. */
function extractList(res: unknown): { count: number; rows: unknown[] } {
  const results = getProp(res, "results");
  const rows =
    asArray(getProp(results, "data")) ??
    asArray(results) ??
    asArray(getProp(res, "data")) ??
    asArray(res) ??
    [];
  const countRaw = getProp(res, "count") ?? getProp(results, "count");
  return { count: typeof countRaw === "number" ? countRaw : rows.length, rows };
}

/**
 * Maps a raw deal record onto the flat UI row.
 *
 * `product` and `variant` are UUID strings; the readable values arrive beside
 * them as `product_name` and `variant_sku`. Three fields the serializer sends
 * were previously dropped — `original_price`, `discount_percentage` and
 * `variant_images` — which left a deal row showing a price with nothing to
 * compare it against, on a screen whose entire subject is the size of a
 * discount.
 */
function toDeal(raw: unknown, index: number): Deal {
  const priceValue = Number(getProp(raw, "deal_price") ?? 0);
  const pct = getProp(raw, "discount_percentage");
  const images = asArray(getProp(raw, "variant_images")) ?? [];
  return {
    id: pick(raw, "id") || `deal-${index}`,
    productId: pick(raw, "product"),
    productName: pick(raw, "product_name") || "-",
    variantId: pick(raw, "variant"),
    variantSku: pick(raw, "variant_sku") || "-",
    dealPrice: money(priceValue),
    dealPriceValue: Number.isFinite(priceValue) ? priceValue : 0,
    // `original_price` is the variant's own price — the figure the backend
    // treats as authoritative and computes the percentage from.
    originalPrice: money(getProp(raw, "original_price")),
    discountPercentage: Number.isFinite(Number(pct)) ? `${Number(pct)}%` : "-",
    imageUrl: pick(images[0], "image", "url"),
    termsAndConditions: pick(raw, "terms_and_conditions") || "",
    startTime: pick(raw, "start_time") || "",
    endTime: pick(raw, "end_time") || "",
    isActive: getProp(raw, "is_active") !== false,
  };
}

/** Maps a raw bonus-point record onto the flat UI row. */
/**
 * Maps a raw bonus-points row onto the flat UI row.
 *
 * The row is **flat** — `first_name`, `last_name`, `user_email`,
 * `referral_points`, `loyalty_points`, `total_points`. This used to look for a
 * nested `user` object, a `user_name`, a `type` and a `points`, none of which
 * the endpoint sends, so three of the four columns rendered "-" or 0 on every
 * row while the data sat in the response untouched.
 */
function toBonusPoint(raw: unknown, index: number): BonusPoint {
  const userId = pick(raw, "user_id");
  const name = `${pick(raw, "first_name")} ${pick(raw, "last_name")}`.trim();
  const email = pick(raw, "user_email");
  return {
    id: pick(raw, "id") || userId || `bonus-${index}`,
    userId,
    // Seeded and self-registered accounts often carry no name at all; the email
    // identifies them where a dash would not.
    userName: name || email || "-",
    userEmail: email || "-",
    referralPoints: Number(getProp(raw, "referral_points") ?? 0),
    loyaltyPoints: Number(getProp(raw, "loyalty_points") ?? 0),
    totalPoints: Number(getProp(raw, "total_points") ?? 0),
  };
}

/** Maps a raw assignment record onto the flat UI row. */
/**
 * Maps a raw assignment row onto the flat UI row.
 *
 * `user` and `coupon` are **UUID strings**, not nested objects — the readable
 * values arrive alongside them as `user_email` and `coupon_code`. The dropped
 * `userName` and `isUsed` were never in the payload: the first rendered "-" on
 * every row, and the second defaulted `is_used` to `false` and printed a green
 * "Unused" badge, which asserted a redemption state the endpoint does not
 * report.
 */
function toAssignment(raw: unknown, index: number): CouponAssignment {
  const rawId = getProp(raw, "id");
  return {
    // Assignment ids are integers — preserved as-is so the delete URL matches.
    id: typeof rawId === "number" || typeof rawId === "string" ? rawId : `assignment-${index}`,
    userId: pick(raw, "user"),
    userEmail: pick(raw, "user_email") || "-",
    couponId: pick(raw, "coupon"),
    couponCode: pick(raw, "coupon_code") || "-",
    assignedAt: formatDateTime(pick(raw, "assigned_at")),
  };
}

export const promotionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ── Deal of the Day ──────────────────────────────────────────── */

    getDeals: builder.query<DealListResult, GetDealsParams>({
      query: (params) => ({
        url: REWARD_ENDPOINTS.GET_DEALS,
        method: "GET",
        params: {
          page: params?.page,
          page_size: params?.limit,
          // `search` matches variant SKU or product name; `status` is the
          // computed bucket the stat cards drill into. Both existed on the view
          // and neither was being sent.
          search: params?.search || undefined,
          status: params?.status || undefined,
          category: params?.category || undefined,
          sort_by_is_active: params?.sortByIsActive || undefined,
          sort_by_start_date: params?.sortByStartDate || undefined,
          sort_by_end_date: params?.sortByEndDate || undefined,
        },
      }),
      transformResponse: (res: unknown): DealListResult => {
        const { count, rows } = extractList(res);
        return { count, deals: rows.map(toDeal) };
      },
      providesTags: (result) =>
        result?.deals
          ? [
              ...result.deals.map(({ id }) => ({ type: "Deals" as const, id })),
              { type: "Deals", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Deals", id: "PARTIAL-LIST" }],
    }),

    getDeal: builder.query<Deal, string>({
      query: (id) => ({ url: REWARD_ENDPOINTS.GET_DEAL(id), method: "GET" }),
      transformResponse: (res: unknown): Deal => toDeal(getProp(res, "data") ?? res, 0),
      providesTags: (_r, _e, id) => [{ type: "Deals", id }],
    }),

    getDealStats: builder.query<DealStats, void>({
      query: () => ({ url: REWARD_ENDPOINTS.GET_DEAL_STATS, method: "GET" }),
      transformResponse: (res: unknown): DealStats =>
        ((getProp(res, "data") as DealStats) ?? (res as DealStats)) || {},
      providesTags: [{ type: "Deals", id: "STATS" }],
    }),

    /** Today's live deals — what a customer would actually see right now. */
    getDealsOfDay: builder.query<Deal[], void>({
      query: () => ({ url: REWARD_ENDPOINTS.GET_DEALS_OF_DAY, method: "GET" }),
      transformResponse: (res: unknown): Deal[] => extractList(res).rows.map(toDeal),
      providesTags: [{ type: "Deals", id: "TODAY" }],
    }),

    createDeal: builder.mutation<unknown, DealPayload>({
      query: (body) => ({ url: REWARD_ENDPOINTS.ADD_DEAL, method: "POST", body }),
      invalidatesTags: [
        { type: "Deals", id: "PARTIAL-LIST" },
        { type: "Deals", id: "STATS" },
        { type: "Deals", id: "TODAY" },
      ],
    }),

    updateDeal: builder.mutation<unknown, { id: string; body: DealPayload }>({
      query: ({ id, body }) => ({
        url: REWARD_ENDPOINTS.UPDATE_DEAL(id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Deals", id },
        { type: "Deals", id: "PARTIAL-LIST" },
        { type: "Deals", id: "STATS" },
        { type: "Deals", id: "TODAY" },
      ],
    }),

    deleteDeal: builder.mutation<unknown, string>({
      query: (id) => ({ url: REWARD_ENDPOINTS.DELETE_DEAL(id), method: "DELETE" }),
      invalidatesTags: [
        { type: "Deals", id: "PARTIAL-LIST" },
        { type: "Deals", id: "STATS" },
        { type: "Deals", id: "TODAY" },
      ],
    }),

    toggleDeal: builder.mutation<unknown, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: REWARD_ENDPOINTS.TOGGLE_DEAL(id),
        method: "POST",
        body: { is_active: isActive },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Deals", id },
        { type: "Deals", id: "PARTIAL-LIST" },
        { type: "Deals", id: "STATS" },
        { type: "Deals", id: "TODAY" },
      ],
    }),

    /* ── Bonus points ─────────────────────────────────────────────── */

    /**
     * Users ranked by bonus-point balance.
     *
     * Sent `?type=` until this was checked against `ListBonusPointsView`, which
     * reads `search` and `user_id` and nothing else: the tab's type dropdown
     * fired a request and got the same rows back, filtering nothing. Paging was
     * missing too, so the list stopped at the default 10 with 19 users to show.
     */
    getBonusPoints: builder.query<BonusPointListResult, GetBonusPointsParams>({
      query: (params) => ({
        url: REWARD_ENDPOINTS.GET_BONUS_POINTS,
        method: "GET",
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          user_id: params.userId || undefined,
        },
      }),
      transformResponse: (res: unknown): BonusPointListResult => {
        const { count, rows } = extractList(res);
        return { count, rows: rows.map(toBonusPoint) };
      },
      providesTags: [{ type: "BonusPoints", id: "PARTIAL-LIST" }],
    }),

    addBonusPoints: builder.mutation<unknown, AddBonusPointsPayload>({
      query: (body) => ({ url: REWARD_ENDPOINTS.ADD_BONUS_POINTS, method: "POST", body }),
      invalidatesTags: [
        { type: "BonusPoints", id: "PARTIAL-LIST" },
        // Granting points moves the loyalty issued/outstanding totals.
        { type: "Loyalty", id: "OVERVIEW" },
      ],
    }),

    /** Clears a user's bonus points. Keys on `user_id`, not a row id. */
    deleteBonusPoints: builder.mutation<unknown, string>({
      query: (userId) => ({
        url: REWARD_ENDPOINTS.DELETE_BONUS_POINTS,
        method: "DELETE",
        params: { user_id: userId },
      }),
      invalidatesTags: [
        { type: "BonusPoints", id: "PARTIAL-LIST" },
        { type: "Loyalty", id: "OVERVIEW" },
      ],
    }),

    getBonusPointHistory: builder.query<
      BonusPointHistoryResult,
      { userId: string; page?: number; limit?: number }
    >({
      query: ({ userId, page, limit }) => ({
        url: REWARD_ENDPOINTS.BONUS_POINT_HISTORY,
        method: "GET",
        params: { user_id: userId, page, page_size: limit },
      }),
      transformResponse: (res: unknown): BonusPointHistoryResult => {
        const { count, rows } = extractList(res);
        return {
          count,
          entries: rows.map((raw, index) => ({
            id: pick(raw, "id") || `history-${index}`,
            points: Number(getProp(raw, "points") ?? 0),
            type: pick(raw, "type") || "-",
            reason: pick(raw, "reason", "description") || "-",
            createdAt: pick(raw, "created_at", "timestamp") || "-",
          })),
        };
      },
      providesTags: (_r, _e, { userId }) => [{ type: "BonusPoints", id: `HISTORY-${userId}` }],
    }),

    /* ── Coupon assignments + report ──────────────────────────────── */

    getCouponAssignments: builder.query<CouponAssignmentListResult, GetCouponAssignmentsParams>({
      query: (params) => ({
        url: REWARD_ENDPOINTS.GET_COUPON_ASSIGNMENTS,
        method: "GET",
        // Both filters must be UUIDs — the view 400s on anything else, so blank
        // strings are dropped rather than sent as empty params.
        params: {
          page: params.page,
          page_size: params.limit,
          coupon_id: params.couponId || undefined,
          user_id: params.userId || undefined,
        },
      }),
      transformResponse: (res: unknown): CouponAssignmentListResult => {
        const { count, rows } = extractList(res);
        return { count, assignments: rows.map(toAssignment) };
      },
      providesTags: [{ type: "Coupons", id: "ASSIGNMENTS" }],
    }),

    addCouponAssignment: builder.mutation<unknown, AddCouponAssignmentPayload>({
      query: (body) => ({
        url: REWARD_ENDPOINTS.ADD_COUPON_ASSIGNMENT,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Coupons", id: "ASSIGNMENTS" }],
    }),

    deleteCouponAssignment: builder.mutation<unknown, number | string>({
      query: (id) => ({
        url: REWARD_ENDPOINTS.DELETE_COUPON_ASSIGNMENT(id),
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Coupons", id: "ASSIGNMENTS" }],
    }),

    /**
     * Per-coupon usage, aggregated from `CouponUsage` snapshots.
     *
     * Returns the page's `count` alongside its rows: the report is paginated
     * like every other list, and returning a bare array threw the total away —
     * which is what left the table showing 10 of N with no pager.
     */
    getCouponReport: builder.query<CouponReportResult, GetCouponReportParams>({
      query: (params) => ({
        url: REWARD_ENDPOINTS.COUPON_REPORT,
        method: "GET",
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
        },
      }),
      transformResponse: (res: unknown): CouponReportResult => {
        const { count, rows } = extractList(res);
        return {
          count,
          // Straight passthrough. `usage_limit` and `is_active` were read here
          // and are not in this response — the first rendered "Unlimited" on
          // every row and the second an ACTIVE badge on every row, neither
          // being anything the report said.
          rows: rows.map((raw) => ({
            couponId: pick(raw, "id"),
            code: pick(raw, "code") || "-",
            title: pick(raw, "title") || "-",
            discount: pick(raw, "discount") || "-",
            applicableTo: pick(raw, "applicable_to") || "-",
            timesUsed: Number(getProp(raw, "times_used") ?? 0),
            totalDiscount: money(getProp(raw, "total_discount_given")),
            revenueImpact: money(getProp(raw, "revenue_impact")),
            status: pick(raw, "status") || "-",
          })),
        };
      },
      providesTags: [{ type: "Coupons", id: "REPORT" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDealsQuery,
  useGetDealQuery,
  useGetDealStatsQuery,
  useGetDealsOfDayQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
  useDeleteDealMutation,
  useToggleDealMutation,
  useGetBonusPointsQuery,
  useAddBonusPointsMutation,
  useDeleteBonusPointsMutation,
  useGetBonusPointHistoryQuery,
  useGetCouponAssignmentsQuery,
  useAddCouponAssignmentMutation,
  useDeleteCouponAssignmentMutation,
  useGetCouponReportQuery,
} = promotionApi;
