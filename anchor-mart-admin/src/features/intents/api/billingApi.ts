import { PAYMENT_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type { CreateBillPayload, CreateBillResponse } from "../types/intent.types";

export const billingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Flow 07 API 1 — create the payment bill. Sets the fee breakdown, moves
     * the order to `payment_pending`, and notifies the sailor (no Stripe link).
     * Gated by Flow 27 ownership (409 unclaimed / 403 wrong owner); 409 also for
     * an already-paid order or one that already has a pending bill.
     * Invalidates the intent list + stats so the row's status refreshes.
     */
    createBill: builder.mutation<CreateBillResponse, CreateBillPayload>({
      query: (body) => ({
        url: PAYMENT_ENDPOINTS.CREATE_BILL,
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, { order_id }) => [
        { type: "Intents", id: order_id },
        { type: "Intents", id: "PARTIAL-LIST" },
        { type: "Intents", id: "STATS" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const { useCreateBillMutation } = billingApi;
