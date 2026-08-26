import { ORDER_CONFIG_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";

import type { OrderConfig, UpdateOrderConfigPayload } from "../types/settings.types";

/**
 * The single order-configuration record.
 *
 * Read and update, and nothing else — there is one record, it always exists,
 * and no path creates or deletes it. Neither endpoint takes an id.
 */
export const orderConfigApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrderConfig: builder.query<OrderConfig, void>({
      query: () => ({ url: ORDER_CONFIG_ENDPOINTS.GET_ORDER_CONFIG, method: "GET" }),
      // A single record needs no id in its tag — there is nothing to tell apart.
      providesTags: [{ type: "OrderConfig", id: "RECORD" }],
    }),
    updateOrderConfig: builder.mutation<OrderConfig, UpdateOrderConfigPayload>({
      query: (body) => ({
        url: ORDER_CONFIG_ENDPOINTS.UPDATE_ORDER_CONFIG,
        method: "PATCH",
        body,
      }),
      // Returns the full updated record, so the form reseeds from the response
      // rather than trusting local state. The invalidation is for anything else
      // on the app holding a copy.
      invalidatesTags: [{ type: "OrderConfig", id: "RECORD" }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetOrderConfigQuery, useUpdateOrderConfigMutation } = orderConfigApi;
