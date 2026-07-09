import { REWARD_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  ApiCouponListResponse,
  CreateCouponPayload,
  UpdateCouponPayload,
} from "../types/reward.types";

// Coupon endpoints for the "Active Coupons" panel. The list is fetched without
// any status filter so both active and inactive coupons are returned.
export const couponApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActiveCoupons: builder.query<ApiCouponListResponse, void>({
      query: () => ({
        url: REWARD_ENDPOINTS.GET_COUPONS,
        method: "GET",
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
