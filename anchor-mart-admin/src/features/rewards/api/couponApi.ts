import { REWARD_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  ApiCouponListResponse,
  CreateCouponPayload,
  GetCouponsParams,
  UpdateCouponPayload,
} from "../types/reward.types";

/**
 * Coupons.
 *
 * The list takes no status filter by default, so both active and inactive
 * coupons come back — the panel labelled "Active Coupons" narrows to the live
 * ones itself, and the full table below it wants everything.
 */
export const couponApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Paginated, searchable coupon list.
     *
     * It used to take no arguments at all, which is not "give me everything":
     * `CustomPagination` answers with **10 rows** and reports the real total
     * only in `count`, which nothing read. The eleventh coupon was unreachable
     * from a table that showed no pager.
     */
    getActiveCoupons: builder.query<ApiCouponListResponse, GetCouponsParams>({
      query: (params) => ({
        url: REWARD_ENDPOINTS.GET_COUPONS,
        method: "GET",
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          is_active: params.isActive || undefined,
        },
      }),
      providesTags: [{ type: "Coupons", id: "ACTIVE-LIST" }],
    }),

    // Create a coupon; refreshes the active-coupons list.
    createCoupon: builder.mutation<unknown, CreateCouponPayload>({
      query: (body) => ({
        url: REWARD_ENDPOINTS.CREATE_COUPON,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Coupons", id: "ACTIVE-LIST" }],
    }),

    // Update a coupon by its UUID; refreshes the active-coupons list.
    updateCoupon: builder.mutation<unknown, { id: string; body: UpdateCouponPayload }>({
      query: ({ id, body }) => ({
        url: REWARD_ENDPOINTS.UPDATE_COUPON(id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "Coupons", id: "ACTIVE-LIST" }],
    }),

    // Delete a coupon by its UUID; refreshes the active-coupons list.
    deleteCoupon: builder.mutation<void, string>({
      query: (id) => ({
        url: REWARD_ENDPOINTS.DELETE_COUPON(id),
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Coupons", id: "ACTIVE-LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetActiveCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
} = couponApi;
