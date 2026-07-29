import { ORDER_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  ApplyLocationReportPayload,
  DeltaPayment,
  DismissLocationReportPayload,
  LocationReport,
  LocationReportStatus,
  RaiseDeltaPayload,
  WithdrawDeltaPayload,
} from "../types/delta.types";

/** Params for the review queue (Flow 11 §2). */
export interface GetLocationReportsParams {
  /** Omit for the cross-order pending queue; pass it for one order's history. */
  orderId?: string;
  status?: LocationReportStatus;
  page?: number;
  limit?: number;
}

export interface LocationReportListResult {
  count: number;
  reports: LocationReport[];
}

/** Safe property read off an unknown value. */
function getProp(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

/** Returns the value when it's an array, otherwise null. */
function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

/**
 * Flow 11 — the admin location-change and delta-surcharge writes.
 *
 * Every write here passes the Flow 27 ownership gate (409 unclaimed / 403
 * another admin's order) and mutates the order, so each invalidates the order's
 * detail cache — which is where `deltas[]` and `location_reports[]` are read
 * from — as well as the list and stats.
 */
export const orderDeltaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Flow 11 §2 — the review queue. With no `orderId` it returns pending
     * reports across all orders; with one, that order's full history.
     */
    getLocationReports: builder.query<LocationReportListResult, GetLocationReportsParams>({
      query: (params) => ({
        url: ORDER_ENDPOINTS.LOCATION_REPORTS,
        method: "GET",
        params: {
          order_id: params.orderId || undefined,
          status: params.status || undefined,
          page: params.page,
          page_size: params.limit,
        },
      }),
      transformResponse: (res: unknown): LocationReportListResult => {
        const results = getProp(res, "results");
        const rows =
          asArray(results) ??
          asArray(getProp(results, "data")) ??
          asArray(getProp(res, "data")) ??
          asArray(res) ??
          [];
        const countRaw = getProp(res, "count");
        return {
          count: typeof countRaw === "number" ? countRaw : rows.length,
          reports: rows as LocationReport[],
        };
      },
      providesTags: [{ type: "Orders", id: "LOCATION-REPORTS" }],
    }),

    /**
     * Flow 11 §3 — price the order's pending `delta` report. The location comes
     * from the report; the admin supplies only the surcharge and a note.
     *
     * **The move goes live immediately** — the order's port/anchorage/address
     * are rewritten at raise time, because the ship *is* there. Payment settles
     * the cost, not the location.
     */
    raiseDelta: builder.mutation<DeltaPayment, RaiseDeltaPayload>({
      query: ({ orderId, delta_amount, note }) => ({
        url: ORDER_ENDPOINTS.RAISE_DELTA(orderId),
        method: "POST",
        body: { delta_amount, note },
      }),
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: "Orders", id: orderId },
        { type: "Orders", id: "PARTIAL-LIST" },
        { type: "Orders", id: "LOCATION-REPORTS" },
      ],
    }),

    /** Flow 11 §4 — dismiss a location report of either kind. */
    dismissLocationReport: builder.mutation<LocationReport, DismissLocationReportPayload>({
      query: ({ orderId, reportId, reason }) => ({
        url: ORDER_ENDPOINTS.DISMISS_LOCATION_REPORT(orderId, reportId),
        method: "POST",
        body: { reason: reason ?? "" },
      }),
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: "Orders", id: orderId },
        { type: "Orders", id: "PARTIAL-LIST" },
        { type: "Orders", id: "LOCATION-REPORTS" },
      ],
    }),

    /**
     * Flow 11 §5 — apply a `rebill` report: relocate the order and expire the
     * stale Stripe session. The admin then re-prices with update-bill (Flow 7).
     */
    applyLocationReport: builder.mutation<LocationReport, ApplyLocationReportPayload>({
      query: ({ orderId, reportId }) => ({
        url: ORDER_ENDPOINTS.APPLY_LOCATION_REPORT(orderId, reportId),
        method: "POST",
      }),
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: "Orders", id: orderId },
        { type: "Orders", id: "PARTIAL-LIST" },
        { type: "Orders", id: "LOCATION-REPORTS" },
      ],
    }),

    /**
     * Flow 11 §13 — withdraw an open (`pending`/`initiated`) delta. Kills any
     * open Stripe link and lifts the delivery hold.
     */
    withdrawDelta: builder.mutation<DeltaPayment, WithdrawDeltaPayload>({
      query: ({ orderId, deltaId, reason }) => ({
        url: ORDER_ENDPOINTS.WITHDRAW_DELTA(orderId, deltaId),
        method: "POST",
        body: { reason: reason ?? "" },
      }),
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: "Orders", id: orderId },
        { type: "Orders", id: "PARTIAL-LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetLocationReportsQuery,
  useRaiseDeltaMutation,
  useDismissLocationReportMutation,
  useApplyLocationReportMutation,
  useWithdrawDeltaMutation,
} = orderDeltaApi;
