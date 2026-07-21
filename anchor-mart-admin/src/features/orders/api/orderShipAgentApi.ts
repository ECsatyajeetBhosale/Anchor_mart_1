import type { ShipAgent } from "@/features/ship-agents";
import { SHIP_AGENT_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";

export interface SetOrderShipAgentArgs {
  orderId: string;
  /** Agent UUID to bind, or `null` to clear. Never omit — the key is required. */
  shipAgentId: string | null;
}

export interface SetOrderShipAgentResponse {
  message: string;
  order_id: string;
  /** The bound agent (admin read body), or null when cleared. */
  ship_agent: ShipAgent | null;
}

export const orderShipAgentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Flow 02 · API 17 — bind or clear the ship agent on an order.
     *
     * `POST /superadmin/ship-agents/order/<order_id>/set/` with
     * `{ ship_agent_id }`. The key is **required but nullable**: pass the agent
     * UUID to bind, `null` to clear. Omitting it is a 400, so we always send it.
     *
     * Runs through the Flow 27 ownership gate (evaluation order: order lookup →
     * ownership → status → body). Documented failures the caller surfaces via
     * `getApiMessage`: 409 unclaimed, 403 other admin, 409 order closed,
     * 400 missing/unknown agent, 404 unknown order.
     *
     * Success re-snapshots `ship_agent_snapshot` on the order, so both lists are
     * invalidated to refresh the bound agent everywhere it is shown.
     */
    setOrderShipAgent: builder.mutation<SetOrderShipAgentResponse, SetOrderShipAgentArgs>({
      query: ({ orderId, shipAgentId }) => ({
        url: SHIP_AGENT_ENDPOINTS.SET_ORDER_SHIP_AGENT(orderId),
        method: "POST",
        body: { ship_agent_id: shipAgentId },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: "Orders", id: orderId },
        { type: "Orders", id: "PARTIAL-LIST" },
        { type: "Intents", id: orderId },
        { type: "Intents", id: "PARTIAL-LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const { useSetOrderShipAgentMutation } = orderShipAgentApi;
