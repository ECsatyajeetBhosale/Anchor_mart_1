import { RATING_ENDPOINTS } from "@/lib/apiEndpoints";
import { type ListResult, asNumber, asString, getProp, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import type { AppRating, DeliveryRating, RatingsSummary } from "../types/rating.types";

/** Query params for the delivery-review list (Flow 16 §6). */
export interface GetDeliveryRatingsParams {
  page?: number;
  limit?: number;
  /** 1–5. A value outside that range is a 400, so blanks are dropped. */
  rating?: string;
  /** UUID of the snapshotted delivering partner. A malformed value is a 400. */
  partnerId?: string;
  /** Matches order number / sailor email / comment. */
  search?: string;
}

/** Query params for the app-review list (Flow 16 §7). */
export interface GetAppRatingsParams {
  page?: number;
  limit?: number;
  rating?: string;
  /** Case-insensitive exact match, e.g. "ios". */
  platform?: string;
  /** Exact match. */
  appVersion?: string;
  /** Matches user email / feedback. */
  search?: string;
}

/** Reads a nullable average: `null` (not rated) must survive as `null`, not become 0. */
function toNullableAverage(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDeliveryRating(row: unknown): DeliveryRating {
  return {
    id: asString(getProp(row, "id")),
    order: asString(getProp(row, "order")),
    order_number: asString(getProp(row, "order_number")),
    sailor_email: (getProp(row, "sailor_email") as string | null) ?? null,
    sailor_name: (getProp(row, "sailor_name") as string | null) ?? null,
    delivery_partner: (getProp(row, "delivery_partner") as string | null) ?? null,
    partner_email: (getProp(row, "partner_email") as string | null) ?? null,
    partner_name: (getProp(row, "partner_name") as string | null) ?? null,
    rating: asNumber(getProp(row, "rating")),
    tags: (getProp(row, "tags") as string[] | undefined) ?? [],
    comment: (getProp(row, "comment") as string | null) ?? null,
    created_at: asString(getProp(row, "created_at")),
  };
}

function toAppRating(row: unknown): AppRating {
  return {
    id: asString(getProp(row, "id")),
    user: asString(getProp(row, "user")),
    user_email: (getProp(row, "user_email") as string | null) ?? null,
    user_name: (getProp(row, "user_name") as string | null) ?? null,
    rating: asNumber(getProp(row, "rating")),
    feedback: (getProp(row, "feedback") as string | null) ?? null,
    platform: (getProp(row, "platform") as string | null) ?? null,
    app_version: (getProp(row, "app_version") as string | null) ?? null,
    created_at: asString(getProp(row, "created_at")),
  };
}

export const ratingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Flow 16 §6 — every delivery review, newest first. */
    getDeliveryRatings: builder.query<ListResult<DeliveryRating>, GetDeliveryRatingsParams>({
      query: (params) => ({
        url: RATING_ENDPOINTS.GET_DELIVERY_RATINGS,
        method: "GET",
        // Blank filters are omitted: the backend validates `rating` and
        // `partner_id` up front and answers 400 on an empty string.
        params: {
          page: params.page,
          page_size: params.limit,
          rating: params.rating || undefined,
          partner_id: params.partnerId || undefined,
          search: params.search || undefined,
        },
      }),
      transformResponse: (res: unknown) => unwrapList(res, toDeliveryRating),
      providesTags: [{ type: "Ratings", id: "DELIVERY-LIST" }],
    }),

    /** Flow 16 §7 — every app review, newest first. */
    getAppRatings: builder.query<ListResult<AppRating>, GetAppRatingsParams>({
      query: (params) => ({
        url: RATING_ENDPOINTS.GET_APP_RATINGS,
        method: "GET",
        params: {
          page: params.page,
          page_size: params.limit,
          rating: params.rating || undefined,
          platform: params.platform || undefined,
          app_version: params.appVersion || undefined,
          search: params.search || undefined,
        },
      }),
      transformResponse: (res: unknown) => unwrapList(res, toAppRating),
      providesTags: [{ type: "Ratings", id: "APP-LIST" }],
    }),

    /**
     * Flow 16 §8 — the platform-wide averages tile.
     *
     * `days` omitted → all-time. The response is cached ~5 min server-side, so a
     * just-submitted rating can be absent here while already in the lists.
     */
    getRatingsSummary: builder.query<RatingsSummary, { days?: string } | undefined>({
      query: (args) => ({
        url: RATING_ENDPOINTS.GET_RATINGS_SUMMARY,
        method: "GET",
        params: args?.days ? { days: args.days } : undefined,
      }),
      transformResponse: (res: unknown): RatingsSummary => {
        const window = getProp(res, "window");
        const delivery = getProp(res, "delivery");
        const app = getProp(res, "app");
        return {
          window: {
            days: toNullableAverage(getProp(window, "days")),
            start: (getProp(window, "start") as string | null) ?? null,
            end: (getProp(window, "end") as string | null) ?? null,
          },
          delivery: {
            average: toNullableAverage(getProp(delivery, "average")),
            count: asNumber(getProp(delivery, "count")),
          },
          app: {
            average: toNullableAverage(getProp(app, "average")),
            count: asNumber(getProp(app, "count")),
          },
        };
      },
      providesTags: [{ type: "Ratings", id: "SUMMARY" }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetDeliveryRatingsQuery, useGetAppRatingsQuery, useGetRatingsSummaryQuery } =
  ratingApi;
