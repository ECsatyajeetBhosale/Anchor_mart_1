import { ORDER_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type { ClaimOrderResponse } from "../types/ownership.types";

export const orderOwnershipApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Flow 27 API 1 — become the single accountable owner of an order
     * ("Manage Order"). The body is ignored by the backend entirely.
     *
     * Idempotent: re-claiming an order you already own returns the same 200.
     * A 409 means another admin holds it, and carries that owner in
     * `assigned_admin` so the caller can name them.
     *
     * Invalidates both lists because ownership is serialized onto orders and
     * intents alike — a claim made from either screen must refresh the other.
     */
    claimOrder: builder.mutation<ClaimOrderResponse, string>({
      query: (orderId) => ({
        url: ORDER_ENDPOINTS.CLAIM_ORDER(orderId),
        method: "POST",
      }),
      invalidatesTags: (_result, _error, orderId) => [
        { type: "Intents", id: orderId },
        { type: "Intents", id: "PARTIAL-LIST" },
        { type: "Orders", id: orderId },
        { type: "Orders", id: "PARTIAL-LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const { useClaimOrderMutation } = orderOwnershipApi;
