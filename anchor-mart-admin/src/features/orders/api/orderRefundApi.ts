import { ORDER_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type { RefundOrderPayload, RefundOrderResponse, RefundQuote } from "../types/delta.types";

/**
 * Flow 12 — the admin refund surface.
 *
 * The quote (§3) and the executor (§4) both call the same server-side policy, so
 * the preview is exactly what the refund would do. Every write passes the Flow
 * 27 ownership gate (409 unclaimed / 403 another admin's order).
 */
export const orderRefundApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Flow 12 §3 — preview a refund. Pure: no side effects, so it is safe to
     * fetch whenever the dialog opens, and to re-fetch when the admin toggles
     * `override` to see what forcing it past the window would return.
     */
    getRefundQuote: builder.query<RefundQuote, { orderId: string; override?: boolean }>({
      query: ({ orderId, override }) => ({
        url: ORDER_ENDPOINTS.REFUND_QUOTE(orderId),
        method: "GET",
        // Only send the flag when set — the endpoint treats absence as false.
        params: override ? { override: "true" } : undefined,
      }),
      transformResponse: (res: unknown): RefundQuote => {
        const body = (
          res && typeof res === "object" && "data" in res ? (res as { data?: unknown }).data : res
        ) as RefundQuote | undefined;
        return body ?? { allowed: false };
      },
      providesTags: (_r, _e, { orderId }) => [{ type: "Orders", id: `REFUND-QUOTE-${orderId}` }],
    }),

    /**
     * Flow 12 §4 — refund a paid order.
     *
     * **Full** (no `amount`): applies the status + time policy, refunds the
     * initial payment plus every settled delta, reverses points and the coupon,
     * and moves the order to `refunded`.
     *
     * **Partial** (`amount` present): `partially_delivered` orders only. Refunds
     * the undelivered value against the initial payment; the order stays
     * partially delivered and coupon/points are untouched. The
     * `Idempotency-Key` header is **required** — a replay with the same key and
     * body returns the stored result instead of charging twice.
     */
    refundOrder: builder.mutation<RefundOrderResponse, RefundOrderPayload>({
      query: ({ orderId, reason, override, amount, idempotencyKey }) => ({
        url: ORDER_ENDPOINTS.REFUND(orderId),
        method: "POST",
        body: {
          reason,
          ...(override ? { override: true } : {}),
          ...(amount ? { amount } : {}),
        },
        // Per-request headers survive `prepareHeaders`, which only adds to the
        // Headers object it is handed.
        headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
      }),
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: "Orders", id: orderId },
        { type: "Orders", id: "PARTIAL-LIST" },
        { type: "Orders", id: "STATS" },
        { type: "Orders", id: `REFUND-QUOTE-${orderId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const { useGetRefundQuoteQuery, useRefundOrderMutation } = orderRefundApi;
