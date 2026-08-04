import { PAYMENT_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  CreateBillPayload,
  CreateBillResponse,
  GeneratePaymentLinkPayload,
  GeneratePaymentLinkResponse,
  UpdateBillPayload,
  UpdateBillResponse,
} from "../types/intent.types";

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

    /**
     * Flow 07 API 2 — re-price a bill that is already pending. `create-bill`
     * refuses a second call ("update it instead"), so this is the only way to
     * correct fees. Omitted fees keep their current value; any open payment
     * link is expired and the sailor is re-notified.
     *
     * PATCH per the API collection (the doc allows PUT or PATCH; both are
     * partial). Only valid while the order is `payment_pending` — a 400 comes
     * back otherwise ("No pending bill to update. Create the bill first.").
     */
    updateBill: builder.mutation<UpdateBillResponse, UpdateBillPayload>({
      query: (body) => ({
        url: PAYMENT_ENDPOINTS.UPDATE_BILL,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_res, _err, { order_id }) => [
        { type: "Intents", id: order_id },
        { type: "Intents", id: "PARTIAL-LIST" },
        { type: "Intents", id: "STATS" },
      ],
    }),

    /**
     * Flow 07 API 3 — set the fees, move the order to `payment_pending`, and
     * mint a Stripe Checkout link, which the backend also sends to the sailor by
     * email + WhatsApp + in-app.
     *
     * Unlike `create-bill` this is *not* once-only: it may be called at any
     * stage before the order is confirmed, and re-calling it while pending
     * regenerates. The backend reuses an open, same-amount session rather than
     * minting a second one — two live sessions for one order is a double-charge
     * — and reports which happened via `reused` (200 reuse / 201 new).
     *
     * Errors worth handling at the call site: 409 unclaimed / already paid /
     * unanswered substitutions, 403 owned by another admin, 400 confirmed-or-
     * later or a non-positive total, and **502 when Stripe itself failed** —
     * the only one of the three billing calls that can fail on a third party.
     */
    generatePaymentLink: builder.mutation<GeneratePaymentLinkResponse, GeneratePaymentLinkPayload>({
      query: (body) => ({
        url: PAYMENT_ENDPOINTS.GENERATE_LINK,
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

export const { useCreateBillMutation, useUpdateBillMutation, useGeneratePaymentLinkMutation } =
  billingApi;
