import { REWARD_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  AddBonusPointsPayload,
  AddCouponAssignmentPayload,
  BonusPoint,
  BonusPointHistoryResult,
  BonusPointListResult,
  CouponAssignment,
  CouponAssignmentListResult,
  CouponReportRow,
  Deal,
  DealListResult,
  DealPayload,
  DealStats,
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

/** Formats a decimal-ish value as `$1,250.00`; unparseable input → "-". */
function money(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n)
    ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "-";
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

/** Maps a raw deal record onto the flat UI row. */
function toDeal(raw: unknown, index: number): Deal {
  const product = getProp(raw, "product");
  const variant = getProp(raw, "variant");
  const priceValue = Number(getProp(raw, "deal_price") ?? 0);
  return {
    id: pick(raw, "id") || `deal-${index}`,
    productId: typeof product === "string" ? product : pick(product, "id"),
    productName: pick(raw, "product_name") || pick(product, "name") || "-",
    variantId: typeof variant === "string" ? variant : pick(variant, "id"),
    variantSku: pick(raw, "variant_sku") || pick(variant, "sku") || "-",
    dealPrice: money(priceValue),
    dealPriceValue: Number.isFinite(priceValue) ? priceValue : 0,
    termsAndConditions: pick(raw, "terms_and_conditions") || "",
    startTime: pick(raw, "start_time") || "",
    endTime: pick(raw, "end_time") || "",
    isActive: getProp(raw, "is_active") !== false,
  };
}

/** Maps a raw bonus-point record onto the flat UI row. */
function toBonusPoint(raw: unknown, index: number): BonusPoint {
  const user = getProp(raw, "user");
  const userId = pick(raw, "user_id") || pick(user, "id");
  return {
    id: pick(raw, "id") || userId || `bonus-${index}`,
    userId,
    userName: pick(raw, "user_name", "name") || pick(user, "first_name", "name", "email") || "-",
    userEmail: pick(raw, "user_email", "email") || pick(user, "email") || "-",
    type: pick(raw, "type") || "-",
    points: Number(getProp(raw, "points") ?? 0),
  };
}

/** Maps a raw assignment record onto the flat UI row. */
function toAssignment(raw: unknown, index: number): CouponAssignment {
  const user = getProp(raw, "user");
  const coupon = getProp(raw, "coupon");
  const rawId = getProp(raw, "id");
  return {
    // Assignment ids are integers — preserved as-is so the delete URL matches.
    id: typeof rawId === "number" || typeof rawId === "string" ? rawId : `assignment-${index}`,
    userId: typeof user === "string" ? user : pick(user, "id"),
    userName: pick(raw, "user_name") || pick(user, "first_name", "name", "email") || "-",
    userEmail: pick(raw, "user_email") || pick(user, "email") || "-",
    couponId: typeof coupon === "string" ? coupon : pick(coupon, "id"),
    couponCode: pick(raw, "coupon_code") || pick(coupon, "code") || "-",
    isUsed: getProp(raw, "is_used") === true,
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

    getBonusPoints: builder.query<BonusPointListResult, { type?: string }>({
      query: (params) => ({
        url: REWARD_ENDPOINTS.GET_BONUS_POINTS,
        method: "GET",
        params: { type: params?.type || undefined },
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

    getCouponAssignments: builder.query<CouponAssignmentListResult, void>({
      query: () => ({ url: REWARD_ENDPOINTS.GET_COUPON_ASSIGNMENTS, method: "GET" }),
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

    getCouponReport: builder.query<CouponReportRow[], void>({
      query: () => ({ url: REWARD_ENDPOINTS.COUPON_REPORT, method: "GET" }),
      transformResponse: (res: unknown): CouponReportRow[] =>
        extractList(res).rows.map((raw) => {
          const limit = getProp(raw, "usage_limit");
          return {
            couponId: pick(raw, "id", "coupon_id"),
            code: pick(raw, "code", "coupon_code") || "-",
            timesUsed: Number(getProp(raw, "times_used") ?? 0),
            usageLimit: typeof limit === "number" ? limit : null,
            totalDiscount: money(
              getProp(raw, "total_discount") ?? getProp(raw, "total_discount_amount"),
            ),
            isActive: getProp(raw, "is_active") !== false,
          };
        }),
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
