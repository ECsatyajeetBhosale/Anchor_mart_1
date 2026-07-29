import { ORDER_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  ClaimOrderResponse,
  ReassignOrderPayload,
  ReassignOrderResponse,
} from "../types/ownership.types";

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

    /**
     * Flow 27 API 2 — hand accountability to another admin.
     *
     * Callable by a super admin (any order) or the order's current owner. An
     * unassigned order cannot be reassigned by a sub-admin at all: there is no
     * current owner to match against. Reassigning to the account that already
     * owns it is a no-op 200.
     *
     * No UI calls this yet — the panel cannot source `admin_id`, because no
     * endpoint lists admin accounts (F-03). Wired up so it is ready the moment
     * one exists.
     */
    reassignOrder: builder.mutation<ReassignOrderResponse, ReassignOrderPayload>({
      query: ({ orderId, admin_id }) => ({
        url: ORDER_ENDPOINTS.REASSIGN_ORDER(orderId),
        method: "POST",
        body: { admin_id },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: "Intents", id: orderId },
        { type: "Intents", id: "PARTIAL-LIST" },
        { type: "Orders", id: orderId },
        { type: "Orders", id: "PARTIAL-LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const { useClaimOrderMutation, useReassignOrderMutation } = orderOwnershipApi;
